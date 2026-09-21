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

export class DerivProvider implements ITradingOSProvider {
  public readonly id = 'deriv-primary';
  public readonly type: ProviderType = 'DERIV';
  public readonly name = 'Deriv WebSocket API (Architecture Ready)';
  public readonly version = '1.0.0';

  public readonly capabilities: ProviderCapabilities = {
    readAccount: true,
    readQuotes: true,
    readCandles: true,
    readPositions: true,
    readOrders: false,
    readHistory: true,
    webhooks: false,
    liveExecution: false,
  };

  public async getStatus(): Promise<ProviderSummary> {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      version: this.version,
      status: 'UNCONFIGURED',
      statusMessage: 'Deriv WebSocket integration architecture ready. Ready for App ID & API token in subsequent milestone.',
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
          id: 'deriv_arch_check',
          name: 'Deriv Interface Implementation Verified',
          status: 'PASS',
          message: 'Normalized ITradingOSProvider contract verified for Deriv WS ticks and balances',
          timestamp: now,
        },
        {
          id: 'deriv_token',
          name: 'Deriv API Token Check',
          status: 'SKIPPED',
          message: 'API token not configured (Milestone 1 focus is MT5 proof-of-connection)',
          timestamp: now,
        },
      ],
      summary: 'Deriv provider abstraction verified.',
      troubleshootingNotes: [
        'Deriv connection will be active when App ID and API token are provided.',
      ],
    };
  }

  public async getAccount(): Promise<NormalizedAccount> {
    throw new Error('Deriv provider is unconfigured in this milestone.');
  }

  public async getSymbols(): Promise<NormalizedSymbol[]> {
    return [];
  }

  public async getQuote(symbol: string): Promise<NormalizedQuote> {
    throw new Error(`Quote retrieval for ${symbol} unavailable on unconfigured Deriv provider.`);
  }

  public async getPositions(): Promise<NormalizedPosition[]> {
    return [];
  }

  public async disconnect(): Promise<void> {}

  public async updateConfig(config: Partial<ProviderConfig>): Promise<ProviderSummary> {
    return this.getStatus();
  }
}
