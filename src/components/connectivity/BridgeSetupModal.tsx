import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Shield, ExternalLink } from 'lucide-react';

interface BridgeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  bridgeUrl: string;
}

export const BridgeSetupModal: React.FC<BridgeSetupModalProps> = ({
  isOpen,
  onClose,
  bridgeUrl,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. Prerequisites on Windows / MT5 Host',
      description: 'Ensure Windows has 64-bit Python 3.8+ installed, and your MetaTrader 5 desktop terminal is open and logged into your broker demo or live account.',
      code: 'python --version',
    },
    {
      title: '2. Install the Official MetaTrader 5 Python Library',
      description: 'Inside your command prompt or PowerShell, install the MetaTrader 5 client package:',
      code: 'pip install MetaTrader5',
    },
    {
      title: '3. Enable Automated Trading in MT5',
      description: 'Inside MetaTrader 5, navigate to Tools → Options → Expert Advisors. Check "Allow algorithmic trading" and "Allow DLL imports". Click OK.',
      code: null,
    },
    {
      title: '4. Start the TradingOS Bridge Agent',
      description: 'Navigate to the mt5-bridge directory and launch the bridge (or double-click run-bridge.bat):',
      code: 'python mt5-bridge/bridge.py --port 8001',
    },
    {
      title: '5. For Cloud or Remote Testing (Optional)',
      description: 'If TradingOS is running in a cloud preview or on your mobile phone on a different network, forward your local bridge port via tunnel (e.g., ngrok or cloudflare):',
      code: 'ngrok http 8001',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-mono">
      <div
        className="bg-[#0b1014] border border-[#1d2730] rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1d2730] sticky top-0 bg-[#0b1014] z-10">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#c6f135]" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">MT5 LOCAL BRIDGE SETUP GUIDE</h3>
              <p className="text-[10px] text-gray-400">Desktop Terminal Connection Procedure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#162028] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 text-xs">
          {/* Safety Notice */}
          <div className="p-3 rounded-lg bg-[#0d161a] border border-[#162e3b] text-cyan-200 flex items-start gap-2.5 text-[11px]">
            <Shield className="w-4 h-4 text-[#00f5ff] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#00f5ff]">STRICT READ-ONLY SAFETY ARCHITECTURE</div>
              <p className="text-gray-300 mt-0.5">
                The local bridge does not store passwords and cannot place, alter, or close trades. It reads account balance, tick quotes, and positions for analysis only.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3.5">
            {steps.map((step, idx) => (
              <div key={idx} className="bg-[#0e1419] border border-[#19232c] rounded-lg p-3 space-y-2">
                <div className="font-semibold text-gray-200 text-xs">{step.title}</div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{step.description}</p>
                {step.code && (
                  <div className="flex items-center justify-between bg-[#06090c] border border-[#141d24] rounded p-2 text-[11px] text-[#c6f135] overflow-x-auto">
                    <code>{step.code}</code>
                    <button
                      onClick={() => copyToClipboard(step.code!, idx)}
                      className="ml-2 p-1 rounded hover:bg-[#162028] text-gray-400 hover:text-gray-200 shrink-0"
                      title="Copy command"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-[#c6f135]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1d2730] bg-[#0c1115] flex items-center justify-between">
          <span className="text-[10px] text-gray-400 truncate">
            Target URL: <span className="text-[#00f5ff]">{bridgeUrl}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#162028] hover:bg-[#1f2c38] text-white text-xs font-semibold transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
