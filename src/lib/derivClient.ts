/**
 * Deriv Browser Direct Client
 * Connects directly from client viewport / iPhone Safari to Deriv's real-time WebSocket.
 * Bypasses container network edge blocks for streaming ticks and historical candles directly to the user.
 * Unauthenticated, public market data only.
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
  private pendingRequests: Map<string, { resolve: (data: any) => void; reject: (err: any) => void }> = new Map();
  private reqId = 1;
  private connectPromise: Promise<void> | null = null;

  constructor(appId: string = '1089') {
    this.appId = appId;
  }

  public setAppId(appId: string): void {
    const trimmed = (appId || '').trim();
    if (trimmed && trimmed !== this.appId) {
      this.appId = trimmed;
      this.disconnect();
    }
  }

  public getAppId(): string {
    return this.appId;
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

  /**
   * Connects to Deriv WebSocket.
   * Handles in-flight promise deduplication to prevent sending commands during WebSocket.CONNECTING state.
   * Tries primary and fallback endpoints if handshake fails.
   */
  public connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.notifyStatus('CONNECTING');

    const candidateUrls = [
      `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`,
      `wss://ws.binaryws.com/websockets/v3?app_id=${this.appId}`,
      `wss://frontend.binaryws.com/websockets/v3?app_id=${this.appId}`,
    ];

    this.connectPromise = (async () => {
      let lastFailureDetail = 'Unknown connection error';

      for (let i = 0; i < candidateUrls.length; i++) {
        const wsUrl = candidateUrls[i];
        try {
          await this.attemptSingleConnection(wsUrl);
          this.notifyStatus('CONNECTED');
          this.connectPromise = null;
          return;
        } catch (err: any) {
          lastFailureDetail = err?.message || String(err);
          // Try next endpoint in candidate list
        }
      }

      this.notifyStatus('ERROR');
      this.connectPromise = null;
      throw new Error(
        `Deriv WebSocket connection failed across all endpoints (app_id=${this.appId}). Details: ${lastFailureDetail}`
      );
    })();

    return this.connectPromise;
  }

  private attemptSingleConnection(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let socket: WebSocket;

      try {
        socket = new WebSocket(wsUrl);
      } catch (e: any) {
        return reject(new Error(`Failed to instantiate WebSocket for ${wsUrl}: ${e?.message || String(e)}`));
      }

      // Close timeout if connection hangs indefinitely (e.g. mobile carrier drop)
      const connectTimeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            socket.close();
          } catch {}
          reject(new Error(`Connection to ${wsUrl} timed out after 8000ms.`));
        }
      }, 8000);

      socket.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(connectTimeout);
        this.ws = socket;
        this.attachSocketHandlers(socket);
        resolve();
      };

      socket.onerror = (evt: Event) => {
        if (settled) return;
        // Don't reject immediately on onerror: wait a tick for onclose to provide the CloseEvent code & reason
      };

      socket.onclose = (evt: CloseEvent) => {
        if (!settled) {
          settled = true;
          clearTimeout(connectTimeout);
          const reasonText = evt.reason ? ` - ${evt.reason}` : '';
          const codeInfo =
            evt.code === 1006
              ? 'Abnormal closure (network firewall, DNS failure, or disallowed origin)'
              : evt.code === 1008
              ? 'Policy violation'
              : evt.code === 1002
              ? 'Protocol error'
              : `Code ${evt.code}`;
          reject(
            new Error(
              `Deriv WebSocket connection to ${wsUrl} closed during handshake (${codeInfo}${reasonText}).`
            )
          );
        } else {
          // Socket was open, now closed
          if (this.ws === socket) {
            this.ws = null;
            this.notifyStatus('DISCONNECTED');
            // Reject any pending requests that were awaiting responses on this socket
            for (const [id, pending] of this.pendingRequests.entries()) {
              pending.reject(
                new Error(`Deriv WebSocket connection terminated unexpectedly (code ${evt.code}).`)
              );
            }
            this.pendingRequests.clear();
          }
        }
      };
    });
  }

  private attachSocketHandlers(socket: WebSocket): void {
    socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Check if this is a response to a pending request
        if (data.req_id && this.pendingRequests.has(String(data.req_id))) {
          const { resolve, reject } = this.pendingRequests.get(String(data.req_id))!;
          this.pendingRequests.delete(String(data.req_id));
          if (data.error) {
            const errCode = data.error.code ? `[${data.error.code}] ` : '';
            reject(new Error(`Deriv API error: ${errCode}${data.error.message || 'Unknown Deriv error'}`));
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
            timeFormatted: new Date(tick.epoch * 1000).toLocaleTimeString([], {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
          };

          const callbacks = this.tickSubscribers.get(sym);
          if (callbacks) {
            callbacks.forEach((cb) => cb(liveTick));
          }
        }
      } catch {
        // Ignore parse errors on malformed messages
      }
    };

    socket.onerror = () => {
      this.notifyStatus('ERROR');
    };
  }

  public async send<T = any>(payload: Record<string, any>, timeoutMs = 10000): Promise<T> {
    await this.connect();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(
        `Deriv WebSocket is not in OPEN state (readyState=${this.ws?.readyState ?? 'null'}).`
      );
    }

    return new Promise((resolve, reject) => {
      const id = String(this.reqId++);
      const msg = { ...payload, req_id: Number(id) };

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          const reqType = payload.ticks_history ? `ticks_history(${payload.ticks_history})` : 'query';
          reject(new Error(`Deriv request timed out after ${timeoutMs}ms for ${reqType}.`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      try {
        this.ws.send(JSON.stringify(msg));
      } catch (err: any) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(new Error(`Failed to transmit WebSocket message: ${err?.message || String(err)}`));
      }
    });
  }

  /**
   * Pre-flight probe: Requests the smallest possible ticks_history (1 candle)
   * to immediately verify WebSocket connectivity, App ID, symbol validity, and API acceptance
   * before initiating large multi-chunk historical downloads.
   */
  public async probeTicksHistory(rawSymbol: string): Promise<boolean> {
    const symbol = normalizeDerivSymbol(rawSymbol);
    const payload = {
      ticks_history: symbol,
      style: 'candles',
      granularity: 14400,
      count: 1,
      end: 'latest',
      adjust_start_time: 1,
    };

    const res = await this.send<{ candles?: any[]; error?: { code?: string; message?: string } }>(
      payload,
      8000
    );

    if (res.error) {
      const codeStr = res.error.code ? `[${res.error.code}] ` : '';
      throw new Error(`Deriv API rejected probe for ${symbol}: ${codeStr}${res.error.message || 'Unknown error'}`);
    }

    if (!res.candles || res.candles.length === 0) {
      throw new Error(`Deriv returned 0 candles for probe on symbol '${symbol}'. Verify market is active.`);
    }

    return true;
  }

  public subscribeTick(symbol: string, onTick: (tick: DerivLiveTick) => void): () => void {
    const sym = symbol.toUpperCase();
    if (!this.tickSubscribers.has(sym)) {
      this.tickSubscribers.set(sym, new Set());
    }
    this.tickSubscribers.get(sym)!.add(onTick);

    // If first subscriber, send subscribe command to Deriv
    if (this.tickSubscribers.get(sym)!.size === 1) {
      this.connect()
        .then(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
          }
        })
        .catch(() => {});
    }

    // Return unsubscribe callback
    return () => {
      const set = this.tickSubscribers.get(sym);
      if (set) {
        set.delete(onTick);
        if (set.size === 0) {
          this.tickSubscribers.delete(sym);
          if (this.ws?.readyState === WebSocket.OPEN) {
            try {
              this.ws.send(JSON.stringify({ forget: sym }));
            } catch {}
          }
        }
      }
    };
  }

  /**
   * Fetches historical OHLC candles directly through browser WebSocket connection
   * with chunked pagination for long ranges (e.g. 60 days of M15) exceeding Deriv limits.
   * Performs a 1-candle pre-flight probe first to verify connection and symbol integrity.
   */
  public async fetchHistoricalCandles(
    rawSymbol: string,
    granularity: number,
    startEpoch: number,
    endEpoch: number,
    onProgress?: (fetched: number, stage: string) => void
  ): Promise<any[]> {
    const symbol = normalizeDerivSymbol(rawSymbol);

    // Step 1: Pre-flight probe to verify public market data channel
    const tfLabel = granularity >= 14400 ? 'H4' : 'M15';
    if (onProgress) {
      onProgress(0, `Verifying Deriv public market data feed for ${symbol} (${tfLabel})...`);
    }

    await this.probeTicksHistory(symbol);

    // Step 2: Chunked pagination across requested epoch range
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

      const response = await this.send<{ candles?: any[]; error?: { code?: string; message?: string } }>(
        payload,
        12000
      );

      if (response.error) {
        const codeStr = response.error.code ? `[${response.error.code}] ` : '';
        throw new Error(`Deriv public market data error: ${codeStr}${response.error.message || 'Unknown error'}`);
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
    this.connectPromise = null;
    this.notifyStatus('DISCONNECTED');
    this.tickSubscribers.clear();
    for (const [, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error('Deriv browser client was disconnected.'));
    }
    this.pendingRequests.clear();
  }
}

export const derivBrowserClient = new DerivBrowserClient();

export function normalizeDerivSymbol(raw: string): string {
  const clean = (raw || '').trim().toUpperCase();
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
