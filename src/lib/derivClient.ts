/**
 * Deriv Browser Direct Client
 * Connects directly from client viewport / iPhone Safari to Deriv's real-time WebSocket.
 * Bypasses container network edge blocks for streaming ticks and symbols directly to the user.
 */

export interface DerivLiveTick {
  symbol: string;
  quote: number;
  bid: number;
  ask: number;
  spread: number;
  epoch: number;
  timeFormatted: string;
}

export class DerivBrowserClient {
  private ws: WebSocket | null = null;
  private appId: string;
  private status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR' = 'DISCONNECTED';
  private listeners: Set<(status: string) => void> = new Set();
  private tickSubscribers: Map<string, Set<(tick: DerivLiveTick) => void>> = new Map();
  private activeSubscriptionIds: Map<string, string> = new Map();
  private pendingRequests: Map<string, { resolve: (data: any) => void; reject: (err: any) => void }> = new Map();
  private reqId = 1;

  constructor(appId: string = '1089') {
    this.appId = appId;
  }

  public getStatus(): 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR' {
    return this.status;
  }

  public subscribeStatus(listener: (status: string) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private notifyStatus(status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR'): void {
    this.status = status;
    this.listeners.forEach((fn) => fn(status));
  }

  public connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this.notifyStatus('CONNECTING');

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.notifyStatus('CONNECTED');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Check if this is a response to a pending request
            if (data.req_id && this.pendingRequests.has(String(data.req_id))) {
              const { resolve, reject } = this.pendingRequests.get(String(data.req_id))!;
              this.pendingRequests.delete(String(data.req_id));
              if (data.error) {
                reject(new Error(data.error.message || 'Deriv API error'));
              } else {
                resolve(data);
              }
              return;
            }

            // Streamed tick event
            if (data.msg_type === 'tick' && data.tick) {
              const tick = data.tick;
              const sym = tick.symbol;
              const quote = Number(tick.quote);
              const bid = Number(tick.bid ?? quote);
              const ask = Number(tick.ask ?? quote + (sym.includes('R_') ? 0.2 : 0.00015));
              const spread = Number((ask - bid).toFixed(4));

              const liveTick: DerivLiveTick = {
                symbol: sym,
                quote,
                bid,
                ask,
                spread,
                epoch: tick.epoch,
                timeFormatted: new Date(tick.epoch * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              };

              const callbacks = this.tickSubscribers.get(sym);
              if (callbacks) {
                callbacks.forEach((cb) => cb(liveTick));
              }
            }
          } catch {
            // Ignore parse errors
          }
        };

        this.ws.onerror = (err) => {
          this.notifyStatus('ERROR');
          reject(err);
        };

        this.ws.onclose = () => {
          this.notifyStatus('DISCONNECTED');
        };
      } catch (err) {
        this.notifyStatus('ERROR');
        reject(err);
      }
    });
  }

  public async send<T = any>(payload: Record<string, any>): Promise<T> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const id = String(this.reqId++);
      const msg = { ...payload, req_id: Number(id) };

      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Deriv request timed out'));
        }
      }, 7000);

      try {
        this.ws!.send(JSON.stringify(msg));
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  public subscribeTick(symbol: string, onTick: (tick: DerivLiveTick) => void): () => void {
    const sym = symbol.toUpperCase();
    if (!this.tickSubscribers.has(sym)) {
      this.tickSubscribers.set(sym, new Set());
    }
    this.tickSubscribers.get(sym)!.add(onTick);

    // If first subscriber, send subscribe command to Deriv
    if (this.tickSubscribers.get(sym)!.size === 1) {
      this.connect().then(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
        }
      }).catch(() => {});
    }

    // Return unsubscribe callback
    return () => {
      const set = this.tickSubscribers.get(sym);
      if (set) {
        set.delete(onTick);
        if (set.size === 0) {
          this.tickSubscribers.delete(sym);
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ forget: sym }));
          }
        }
      }
    };
  }

  /**
   * Fetches historical OHLC candles directly through browser WebSocket connection
   * with chunked pagination for long ranges (e.g. 60 days of M15) exceeding Deriv limits.
   */
  public async fetchHistoricalCandles(
    rawSymbol: string,
    granularity: number,
    startEpoch: number,
    endEpoch: number,
    onProgress?: (fetched: number, stage: string) => void
  ): Promise<any[]> {
    const symbol = normalizeDerivSymbol(rawSymbol);
    const chunkCapacity = 4000;
    const chunkDurationSec = chunkCapacity * granularity;
    const allCandles: any[] = [];
    let currentStart = startEpoch;

    while (currentStart < endEpoch) {
      const currentEnd = Math.min(currentStart + chunkDurationSec, endEpoch);
      const count = Math.min(
        chunkCapacity,
        Math.ceil((currentEnd - currentStart) / granularity) + 10
      );

      const payload = {
        ticks_history: symbol,
        style: 'candles',
        granularity,
        start: currentStart,
        end: currentEnd,
        count,
        adjust_start_time: 1,
      };

      const response = await this.send<{ candles?: any[]; error?: { message: string } }>(payload);
      if (response.error) {
        throw new Error(`Deriv public market data error: ${response.error.message || 'Unknown error'}`);
      }

      const chunk = response.candles || [];
      if (chunk.length > 0) {
        for (const c of chunk) {
          if (c.epoch >= startEpoch && c.epoch <= endEpoch) {
            allCandles.push(c);
          }
        }
      } else {
        // No further candles returned in this segment
        break;
      }

      if (onProgress) {
        const tfLabel = granularity >= 14400 ? 'H4' : 'M15';
        onProgress(allCandles.length, `${tfLabel} (fetched ${allCandles.length} candles)`);
      }

      currentStart = currentEnd;
    }

    // Deduplicate and sort ascending by epoch
    const seenEpochs = new Set<number>();
    const deduplicated: any[] = [];
    for (const c of allCandles) {
      if (!seenEpochs.has(c.epoch)) {
        seenEpochs.add(c.epoch);
        deduplicated.push(c);
      }
    }
    return deduplicated.sort((a, b) => a.epoch - b.epoch);
  }

  public disconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.notifyStatus('DISCONNECTED');
    this.tickSubscribers.clear();
    this.pendingRequests.clear();
  }
}

export const derivBrowserClient = new DerivBrowserClient();

export function normalizeDerivSymbol(raw: string): string {
  const clean = raw.trim().toUpperCase();
  const symbolMap: Record<string, string> = {
    'BOOM 1000': 'BOOM1000',
    'BOOM1000': 'BOOM1000',
    'BOOM 500': 'BOOM500',
    'BOOM500': 'BOOM500',
    'BOOM 300': 'BOOM300',
    'BOOM300': 'BOOM300',
    'CRASH 1000': 'CRASH1000',
    'CRASH1000': 'CRASH1000',
    'CRASH 500': 'CRASH500',
    'CRASH500': 'CRASH500',
    'CRASH 300': 'CRASH300',
    'CRASH300': 'CRASH300',
    'VOLATILITY 75': 'R_75',
    'V75': 'R_75',
    'R_75': 'R_75',
    'VOLATILITY 100': 'R_100',
    'V100': 'R_100',
    'R_100': 'R_100',
    'VOLATILITY 50': 'R_50',
    'V50': 'R_50',
    'R_50': 'R_50',
    'VOLATILITY 25': 'R_25',
    'V25': 'R_25',
    'R_25': 'R_25',
    'VOLATILITY 10': 'R_10',
    'V10': 'R_10',
    'R_10': 'R_10',
    'EUR/USD': 'frxEURUSD',
    'EURUSD': 'frxEURUSD',
    'GBP/USD': 'frxGBPUSD',
    'GBPUSD': 'frxGBPUSD',
    'USD/JPY': 'frxUSDJPY',
    'USDJPY': 'frxUSDJPY',
  };
  return symbolMap[clean] || clean.replace(/\s+/g, '');
}
