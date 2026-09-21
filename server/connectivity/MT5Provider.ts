import {
  ITradingOSProvider,
  ProviderType,
  ProviderCapabilities,
  ProviderSummary,
  NormalizedAccount,
  NormalizedSymbol,
  NormalizedQuote,
  NormalizedPosition,
  ConnectionDiagnosticsReport,
  ProviderConfig,
} from '../../src/types/connectivity';

export class MT5Provider implements ITradingOSProvider {
  public readonly id = 'mt5-primary';
  public readonly type: ProviderType = 'MT5';
  public readonly name = 'MetaTrader 5 (Local Desktop)';
  public readonly version = '1.0.0';

  public readonly capabilities: ProviderCapabilities = {
    readAccount: true,
    readQuotes: true,
    readCandles: true,
    readPositions: true,
    readOrders: true,
    readHistory: true,
    webhooks: false,
    liveExecution: false, // STRICT READ-ONLY SAFETY GATE
  };

  private bridgeUrl: string;
  private bridgeToken: string;
  private enabled: boolean = true;
  private isSandboxOverride: boolean = false;

  constructor() {
    this.bridgeUrl = process.env.MT5_BRIDGE_URL || 'http://127.0.0.1:8001';
    this.bridgeToken = process.env.MT5_BRIDGE_TOKEN || '';
  }

  private async fetchBridge(endpoint: string, timeoutMs: number = 4000): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.bridgeToken) {
      headers['X-Bridge-Token'] = this.bridgeToken;
    }

    try {
      const url = `${this.bridgeUrl.replace(/\/$/, '')}${endpoint}`;
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Bridge responded with status ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  public async getStatus(): Promise<ProviderSummary> {
    const now = new Date().toISOString();

    if (this.isSandboxOverride) {
      return {
        id: this.id,
        type: this.type,
        name: this.name,
        version: this.version,
        status: 'CONNECTED',
        statusMessage: 'Sandbox Simulation Active (Development Verification Mode)',
        capabilities: this.capabilities,
        lastChecked: now,
        config: {
          bridgeUrl: this.bridgeUrl,
          hasToken: Boolean(this.bridgeToken),
          isLocal: true,
          readOnlyEnforced: true,
        },
        account: {
          id: 'acc-mt5-sandbox',
          providerId: this.id,
          providerType: 'MT5',
          broker: 'MetaQuotes Software Corp (Sandbox)',
          server: 'MetaQuotes-Demo',
          loginMasked: '***8492',
          accountName: 'TradingOS Sandbox Account',
          currency: 'USD',
          balance: 50000.0,
          equity: 50840.5,
          margin: 640.2,
          freeMargin: 50200.3,
          marginLevel: 7941.34,
          leverage: 100,
          tradeAllowed: false,
          updatedAt: now,
          dataSourceType: 'SIMULATED_SANDBOX',
        },
      };
    }

    try {
      const health = await this.fetchBridge('/health', 2500);
      const acc = await this.fetchBridge('/account', 2500).catch(() => null);

      return {
        id: this.id,
        type: this.type,
        name: this.name,
        version: this.version,
        status: health.status === 'ok' ? 'CONNECTED' : 'ERROR',
        statusMessage: health.status === 'ok' ? 'Connected to local MT5 bridge' : 'Bridge reporting issues',
        capabilities: this.capabilities,
        account: acc || undefined,
        lastChecked: now,
        config: {
          bridgeUrl: this.bridgeUrl,
          hasToken: Boolean(this.bridgeToken),
          isLocal: this.bridgeUrl.includes('localhost') || this.bridgeUrl.includes('127.0.0.1'),
          readOnlyEnforced: true,
        },
      };
    } catch (err: any) {
      return {
        id: this.id,
        type: this.type,
        name: this.name,
        version: this.version,
        status: 'DISCONNECTED',
        statusMessage: `Local bridge unreachable at ${this.bridgeUrl} (${err.name === 'AbortError' ? 'Timeout' : err.message || 'Connection refused'})`,
        capabilities: this.capabilities,
        lastChecked: now,
        config: {
          bridgeUrl: this.bridgeUrl,
          hasToken: Boolean(this.bridgeToken),
          isLocal: this.bridgeUrl.includes('localhost') || this.bridgeUrl.includes('127.0.0.1'),
          readOnlyEnforced: true,
        },
      };
    }
  }

  public async testConnection(): Promise<ConnectionDiagnosticsReport> {
    const now = new Date().toISOString();

    if (this.isSandboxOverride) {
      return {
        providerId: this.id,
        providerType: this.type,
        timestamp: now,
        overallStatus: 'SUCCESS',
        steps: [
          {
            id: 'bridge_reachable',
            name: 'Local Bridge Agent Reachable',
            status: 'PASS',
            message: `Sandbox verification mode active on ${this.bridgeUrl}`,
            timestamp: now,
          },
          {
            id: 'mt5_package',
            name: 'MetaTrader 5 Python Package Available',
            status: 'PASS',
            message: 'Virtual MetaTrader5 interface loaded in verified test mode',
            timestamp: now,
          },
          {
            id: 'terminal_init',
            name: 'Terminal Detection & Initialization',
            status: 'PASS',
            message: 'MetaTrader 5 Terminal initialized (Build 4150 x64)',
            timestamp: now,
          },
          {
            id: 'account_info',
            name: 'Account Information Retrieved',
            status: 'PASS',
            message: 'Account: ***8492 | Server: MetaQuotes-Demo | Balance: $50,000.00 USD',
            timestamp: now,
          },
          {
            id: 'symbols_retrieval',
            name: 'Symbols List Retrieved',
            status: 'PASS',
            message: 'Successfully indexed 120 broker symbols',
            timestamp: now,
          },
          {
            id: 'market_quote',
            name: 'Real Market Quote Verified',
            status: 'PASS',
            message: 'Verified live market tick for EURUSD — Bid: 1.08542 Ask: 1.08556 Spread: 1.4 pips',
            timestamp: now,
          },
        ],
        terminalInfo: {
          name: 'MetaTrader 5 (Sandbox Simulation)',
          build: 4150,
          company: 'MetaQuotes Ltd.',
          connected: true,
          ping: 8,
        },
        summary: 'All MT5 connection and diagnostic probes succeeded in sandbox verification mode.',
        troubleshootingNotes: [
          'This diagnostic ran against the verified sandbox bridge.',
          'To connect to your physical Windows MT5 terminal, start bridge.py on your PC and provide its URL.',
        ],
      };
    }

    try {
      const diagData = await this.fetchBridge('/diagnostics', 6000);
      return {
        providerId: this.id,
        providerType: this.type,
        timestamp: now,
        overallStatus: diagData.overallStatus || 'SUCCESS',
        steps: diagData.steps || [],
        terminalInfo: diagData.terminalInfo,
        summary: diagData.summary || 'MT5 diagnostic checks complete.',
        troubleshootingNotes: diagData.troubleshootingNotes || [],
      };
    } catch (err: any) {
      // Genuine connection failure report
      return {
        providerId: this.id,
        providerType: this.type,
        timestamp: now,
        overallStatus: 'FAILED',
        steps: [
          {
            id: 'bridge_reachable',
            name: 'Local Bridge Agent Reachable',
            status: 'FAIL',
            message: `Could not reach local bridge at ${this.bridgeUrl}`,
            timestamp: now,
            errorDetails: err.name === 'AbortError' ? 'Connection timed out after 6000ms' : err.message || 'Connection refused',
          },
          {
            id: 'mt5_package',
            name: 'MetaTrader 5 Python Package Available',
            status: 'SKIPPED',
            message: 'Prerequisite bridge connection failed',
            timestamp: now,
          },
          {
            id: 'terminal_init',
            name: 'Terminal Detection & Initialization',
            status: 'SKIPPED',
            message: 'Prerequisite bridge connection failed',
            timestamp: now,
          },
          {
            id: 'account_info',
            name: 'Account Information Retrieved',
            status: 'SKIPPED',
            message: 'Prerequisite bridge connection failed',
            timestamp: now,
          },
          {
            id: 'symbols_retrieval',
            name: 'Symbols List Retrieved',
            status: 'SKIPPED',
            message: 'Prerequisite bridge connection failed',
            timestamp: now,
          },
          {
            id: 'market_quote',
            name: 'Real Market Quote Verified',
            status: 'SKIPPED',
            message: 'Prerequisite bridge connection failed',
            timestamp: now,
          },
        ],
        summary: `Local MT5 bridge agent is offline or unreachable at ${this.bridgeUrl}.`,
        troubleshootingNotes: [
          'Ensure Python 3.8+ is installed on the computer where MetaTrader 5 is installed.',
          'Start the bridge from the terminal: python mt5-bridge/bridge.py --port 8001',
          'If running TradingOS in a remote/cloud browser preview, use a local tunnel (e.g. ngrok or Cloudflare tunnel) to point to your PC\'s bridge port.',
          'Verify firewall allows connections on port 8001.',
          'You can enable Sandbox Mode in Connection Settings to test the UI flow without an active MT5 terminal.',
        ],
      };
    }
  }

  public async getAccount(): Promise<NormalizedAccount> {
    if (this.isSandboxOverride) {
      return {
        id: 'acc-mt5-sandbox',
        providerId: this.id,
        providerType: 'MT5',
        broker: 'MetaQuotes Software Corp (Sandbox)',
        server: 'MetaQuotes-Demo',
        loginMasked: '***8492',
        accountName: 'TradingOS Sandbox Account',
        currency: 'USD',
        balance: 50000.0,
        equity: 50840.5,
        margin: 640.2,
        freeMargin: 50200.3,
        marginLevel: 7941.34,
        leverage: 100,
        tradeAllowed: false,
        updatedAt: new Date().toISOString(),
        dataSourceType: 'SIMULATED_SANDBOX',
      };
    }

    return await this.fetchBridge('/account', 3500);
  }

  public async getSymbols(search?: string): Promise<NormalizedSymbol[]> {
    if (this.isSandboxOverride) {
      const mockSymbols: NormalizedSymbol[] = [
        { symbol: 'EURUSD', description: 'Euro vs US Dollar', path: 'Forex/Majors', digits: 5, point: 0.00001, minLot: 0.01, maxLot: 100.0, lotStep: 0.01, tradeMode: 'READ_ONLY' },
        { symbol: 'GBPUSD', description: 'Great Britain Pound vs US Dollar', path: 'Forex/Majors', digits: 5, point: 0.00001, minLot: 0.01, maxLot: 100.0, lotStep: 0.01, tradeMode: 'READ_ONLY' },
        { symbol: 'USDJPY', description: 'US Dollar vs Japanese Yen', path: 'Forex/Majors', digits: 3, point: 0.001, minLot: 0.01, maxLot: 100.0, lotStep: 0.01, tradeMode: 'READ_ONLY' },
        { symbol: 'XAUUSD', description: 'Gold vs US Dollar', path: 'Commodities/Metals', digits: 2, point: 0.01, minLot: 0.01, maxLot: 50.0, lotStep: 0.01, tradeMode: 'READ_ONLY' },
        { symbol: 'BTCUSD', description: 'Bitcoin vs US Dollar', path: 'Crypto', digits: 2, point: 0.01, minLot: 0.01, maxLot: 10.0, lotStep: 0.01, tradeMode: 'READ_ONLY' },
        { symbol: 'US30', description: 'Dow Jones Industrial Average', path: 'Indices/US', digits: 1, point: 0.1, minLot: 0.1, maxLot: 50.0, lotStep: 0.1, tradeMode: 'READ_ONLY' },
        { symbol: 'NAS100', description: 'Nasdaq 100 Stock Index', path: 'Indices/US', digits: 1, point: 0.1, minLot: 0.1, maxLot: 50.0, lotStep: 0.1, tradeMode: 'READ_ONLY' },
      ];
      if (search) {
        const q = search.toUpperCase();
        return mockSymbols.filter((s) => s.symbol.includes(q) || s.description.toUpperCase().includes(q));
      }
      return mockSymbols;
    }

    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return await this.fetchBridge(`/symbols${query}`, 4000);
  }

  public async getQuote(symbol: string): Promise<NormalizedQuote> {
    const sym = symbol.toUpperCase().trim() || 'EURUSD';

    if (this.isSandboxOverride) {
      const bid = sym.includes('EUR') ? 1.08542 : sym.includes('XAU') ? 2340.50 : 154.20;
      const ask = sym.includes('EUR') ? 1.08556 : sym.includes('XAU') ? 2340.85 : 154.22;
      return {
        symbol: sym,
        bid,
        ask,
        spread: 1.4,
        last: bid,
        high24h: bid * 1.005,
        low24h: bid * 0.995,
        volume: 14200,
        time: Math.floor(Date.now() / 1000),
        timeUtc: new Date().toISOString(),
        providerId: this.id,
        providerType: this.type,
      };
    }

    return await this.fetchBridge(`/quote?symbol=${encodeURIComponent(sym)}`, 3500);
  }

  public async getPositions(): Promise<NormalizedPosition[]> {
    if (this.isSandboxOverride) {
      return [
        {
          id: 'pos-mt5-sandbox-1',
          ticket: 78491022,
          symbol: 'EURUSD',
          type: 'BUY',
          volume: 0.5,
          openPrice: 1.08250,
          currentPrice: 1.08542,
          sl: 1.07950,
          tp: 1.08850,
          swap: -1.20,
          profit: 146.00,
          openTime: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
          comment: 'TradingOS Read-Only Audit',
          readOnly: true,
        },
      ];
    }

    return await this.fetchBridge('/positions', 3500);
  }

  public async disconnect(): Promise<void> {
    // Read-only disconnect clears cached session or flags
    this.enabled = false;
  }

  public async updateConfig(config: Partial<ProviderConfig & { isSandboxOverride?: boolean }>): Promise<ProviderSummary> {
    if (config.bridgeUrl !== undefined) {
      this.bridgeUrl = config.bridgeUrl;
    }
    if (config.bridgeToken !== undefined) {
      this.bridgeToken = config.bridgeToken;
    }
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
    if (config.isSandboxOverride !== undefined) {
      this.isSandboxOverride = Boolean(config.isSandboxOverride);
    }
    return this.getStatus();
  }
}
