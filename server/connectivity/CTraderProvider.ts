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

export class CTraderProvider implements ITradingOSProvider {
  public readonly id = 'ctrader-primary';
  public readonly type: ProviderType = 'CTRADER';
  public readonly name = 'cTrader Open API (Architecture Ready)';
  public readonly version = '1.0.0';

  public readonly capabilities: ProviderCapabilities = {
    readAccount: true,
    readQuotes: true,
    readCandles: true,
    readPositions: true,
    readOrders: true,
    readHistory: true,
    webhooks: true,
    liveExecution: false,
  };

  public async getStatus(): Promise<ProviderSummary> {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      version: this.version,
      status: 'UNCONFIGURED',
      statusMessage: 'cTrader Open API integration architecture ready. Provider will be activated in subsequent milestone.',
      capabilities: this.capabilities,
      lastChecked: new Date().toISOString(),
      config: {
        readOnlyEnforced: true,
      },
    };
  }

  public async testConnection(): Promise<ConnectionDiagnosticsReport> {
    const now = new Date().toISOString();
    return {
      providerId: this.id,
      providerType: this.type,
      timestamp: now,
      overallStatus: 'WARNING',
      steps: [
        {
          id: 'ctrader_arch_check',
          name: 'cTrader Protocol Contract Validated',
          status: 'PASS',
          message: 'Normalized ITradingOSProvider interface implemented',
          timestamp: now,
        },
        {
          id: 'ctrader_oauth',
          name: 'cTrader Open API OAuth Credentials',
          status: 'SKIPPED',
          message: 'Client credentials not configured (Milestone 1 focus is MT5 proof-of-connection)',
          timestamp: now,
        },
      ],
      summary: 'cTrader provider interface verified. Connection awaiting OAuth configuration in future milestone.',
      troubleshootingNotes: [
        'TradingOS is currently in Milestone 1: MT5 Proof of Connection.',
        'cTrader Open API client credentials can be configured once this milestone completes.',
      ],
    };
  }

  public async getAccount(): Promise<NormalizedAccount> {
    throw new Error('cTrader provider is unconfigured in this milestone.');
  }

  public async getSymbols(): Promise<NormalizedSymbol[]> {
    return [];
  }

  public async getQuote(symbol: string): Promise<NormalizedQuote> {
    throw new Error(`Quote retrieval for ${symbol} unavailable on unconfigured cTrader provider.`);
  }

  public async getPositions(): Promise<NormalizedPosition[]> {
    return [];
  }

  public async disconnect(): Promise<void> {}

  public async updateConfig(config: Partial<ProviderConfig>): Promise<ProviderSummary> {
    return this.getStatus();
  }
}
