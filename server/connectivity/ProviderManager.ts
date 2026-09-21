import { ITradingOSProvider, ProviderSummary, ConnectionDiagnosticsReport, NormalizedAccount, NormalizedSymbol, NormalizedQuote, NormalizedPosition, ProviderConfig } from '../../src/types/connectivity';
import { MT5Provider } from './MT5Provider';
import { CTraderProvider } from './CTraderProvider';
import { DerivProvider } from './DerivProvider';
import { TradingViewProvider } from './TradingViewProvider';

export class ProviderManager {
  private providers: Map<string, ITradingOSProvider> = new Map();

  constructor() {
    this.registerProvider(new MT5Provider());
    this.registerProvider(new CTraderProvider());
    this.registerProvider(new DerivProvider());
    this.registerProvider(new TradingViewProvider());
  }

  public registerProvider(provider: ITradingOSProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): ITradingOSProvider | undefined {
    return this.providers.get(id);
  }

  public getDerivProvider(): DerivProvider | undefined {
    return this.providers.get('deriv-primary') as DerivProvider | undefined;
  }

  public async getAllSummaries(): Promise<ProviderSummary[]> {
    const summaries: ProviderSummary[] = [];
    for (const provider of this.providers.values()) {
      try {
        const summary = await provider.getStatus();
        summaries.push(summary);
      } catch (err: any) {
        summaries.push({
          id: provider.id,
          type: provider.type,
          name: provider.name,
          version: provider.version,
          status: 'ERROR',
          statusMessage: err.message || 'Failed to query provider status',
          capabilities: provider.capabilities,
          lastChecked: new Date().toISOString(),
          config: {
            readOnlyEnforced: true,
          },
        });
      }
    }
    return summaries;
  }

  public async testProvider(id: string): Promise<ConnectionDiagnosticsReport> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider with id '${id}' not found`);
    }
    return await provider.testConnection();
  }

  public async getAccount(id: string): Promise<NormalizedAccount> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' not found`);
    }
    return await provider.getAccount();
  }

  public async getSymbols(id: string, search?: string): Promise<NormalizedSymbol[]> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' not found`);
    }
    return await provider.getSymbols(search);
  }

  public async getQuote(id: string, symbol: string): Promise<NormalizedQuote> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' not found`);
    }
    return await provider.getQuote(symbol);
  }

  public async getPositions(id: string): Promise<NormalizedPosition[]> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' not found`);
    }
    return await provider.getPositions();
  }

  public async updateConfig(id: string, config: Partial<ProviderConfig & { isSandboxOverride?: boolean }>): Promise<ProviderSummary> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' not found`);
    }
    return await provider.updateConfig(config);
  }

  public async disconnect(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (provider) {
      await provider.disconnect();
    }
  }
}

export const providerManager = new ProviderManager();
