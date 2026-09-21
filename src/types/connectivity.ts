/**
 * TradingOS — Connectivity & Provider Abstraction Layer
 * Normalized domain models for Broker / Terminal integrations.
 * Supports: MT5, cTrader, Deriv, TradingView, Sandbox/Demo.
 */

export type ProviderType = 'MT5' | 'CTRADER' | 'DERIV' | 'TRADINGVIEW' | 'SANDBOX_DEMO';

export type ConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'ERROR'
  | 'UNCONFIGURED';

export interface ProviderCapabilities {
  readAccount: boolean;
  readQuotes: boolean;
  readCandles: boolean;
  readPositions: boolean;
  readOrders: boolean;
  readHistory: boolean;
  webhooks: boolean;
  liveExecution: boolean; // MUST BE FALSE in this milestone (strict read-only)
}

export interface NormalizedAccount {
  id: string;
  providerId: string;
  providerType: ProviderType;
  broker: string;
  server: string;
  loginMasked: string;
  accountName: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number | null; // e.g. 1540.5%
  leverage: number;
  tradeAllowed: boolean; // false in this milestone
  updatedAt: string;
  dataSourceType: 'REAL_TERMINAL' | 'DEMO_TERMINAL' | 'SIMULATED_SANDBOX';
  accountEnvironment?: 'DEMO' | 'REAL' | 'UNKNOWN';
}

export interface NormalizedQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  last?: number;
  high24h?: number;
  low24h?: number;
  volume?: number;
  time: number;
  timeUtc: string;
  providerId: string;
  providerType: ProviderType;
}

export interface NormalizedPosition {
  id: string;
  ticket: string | number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number; // in lots
  openPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  swap: number;
  profit: number;
  openTime: string;
  comment?: string;
  readOnly: true; // Explicitly marked as read-only view
}

export interface NormalizedSymbol {
  symbol: string;
  description: string;
  path: string;
  digits: number;
  point: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  tradeMode: string;
}

export type DiagnosticStepStatus = 'PASS' | 'FAIL' | 'WARNING' | 'SKIPPED' | 'RUNNING';

export interface ConnectionDiagnosticStep {
  id: string;
  name: string;
  status: DiagnosticStepStatus;
  message: string;
  timestamp: string;
  errorDetails?: string;
}

export interface ConnectionDiagnosticsReport {
  providerId: string;
  providerType: ProviderType;
  timestamp: string;
  overallStatus: 'SUCCESS' | 'WARNING' | 'FAILED';
  steps: ConnectionDiagnosticStep[];
  summary: string;
  troubleshootingNotes: string[];
  terminalInfo?: {
    name?: string;
    version?: string;
    build?: number;
    company?: string;
    connected?: boolean;
    ping?: number;
  };
}

export interface ProviderConfig {
  id: string;
  type: ProviderType;
  name: string;
  enabled: boolean;
  bridgeUrl?: string; // Default e.g. 'http://127.0.0.1:8001'
  bridgeToken?: string;
  appId?: string; // Deriv Application ID
  apiToken?: string; // Deriv direct API token
  oauthRedirectUri?: string;
  environment?: 'PRODUCTION' | 'DEMO' | 'SANDBOX';
  readOnlyEnforced: true;
}

export interface ProviderSummary {
  id: string;
  type: ProviderType;
  name: string;
  version: string;
  status: ConnectionStatus;
  statusMessage: string;
  capabilities: ProviderCapabilities;
  account?: NormalizedAccount;
  accountEnvironment?: 'DEMO' | 'REAL' | 'UNKNOWN';
  lastChecked?: string;
  config: {
    bridgeUrl?: string;
    hasToken?: boolean;
    isLocal?: boolean;
    appId?: string;
    tokenMasked?: string;
    accountEnvironment?: 'DEMO' | 'REAL' | 'UNKNOWN';
    readOnlyEnforced: true;
  };
}

/**
 * Interface that all TradingOS connectivity providers must implement.
 * Ensures the Strategy Engine and UI remain completely agnostic of MT5,
 * cTrader, or Deriv specific wire protocols.
 */
export interface ITradingOSProvider {
  readonly id: string;
  readonly type: ProviderType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: ProviderCapabilities;

  getStatus(): Promise<ProviderSummary>;
  testConnection(): Promise<ConnectionDiagnosticsReport>;
  getAccount(): Promise<NormalizedAccount>;
  getSymbols(search?: string): Promise<NormalizedSymbol[]>;
  getQuote(symbol: string): Promise<NormalizedQuote>;
  getPositions(): Promise<NormalizedPosition[]>;
  disconnect(): Promise<void>;
  updateConfig(config: Partial<ProviderConfig>): Promise<ProviderSummary>;
}
