import React, { useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded border border-[#c6f135]/40 bg-[#c6f135]/10 text-[#c6f135] hover:bg-[#c6f135]/20 active:scale-95 transition-all shadow-[0_0_12px_rgba(198,241,53,0.15)]"
        title="Install TradingOS on device"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">INSTALL PWA</span>
        <span className="sm:hidden">PWA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded border border-[#00f5ff]/40 bg-[#00f5ff]/10 text-[#00f5ff] hover:bg-[#00f5ff]/20 active:scale-95 transition-all"
          title="Install on iPhone / iOS"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ADD TO HOME</span>
          <span className="sm:hidden">iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-lg bg-[#0e1419] border border-[#1f2933] p-5 shadow-2xl font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-[#1f2933]">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#00f5ff]" />
                  <span className="text-sm font-semibold text-white">INSTALL ON iPHONE</span>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-gray-300 leading-relaxed">
                <div className="flex items-start gap-3 bg-[#141b22] p-2.5 rounded border border-[#212b35]">
                  <span className="px-1.5 py-0.5 rounded bg-[#00f5ff]/20 text-[#00f5ff] font-bold">1</span>
                  <span>
                    Tap the <strong className="text-white">Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-[#00f5ff]" /> in the Safari bottom toolbar.
                  </span>
                </div>
                <div className="flex items-start gap-3 bg-[#141b22] p-2.5 rounded border border-[#212b35]">
                  <span className="px-1.5 py-0.5 rounded bg-[#00f5ff]/20 text-[#00f5ff] font-bold">2</span>
                  <span>
                    Scroll down and select <strong className="text-[#c6f135]">"Add to Home Screen"</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-3 bg-[#141b22] p-2.5 rounded border border-[#212b35]">
                  <span className="px-1.5 py-0.5 rounded bg-[#00f5ff]/20 text-[#00f5ff] font-bold">3</span>
                  <span>
                    Launch <strong className="text-white">TradingOS</strong> directly from your home screen with native full-screen terminal experience.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2 text-xs font-semibold rounded bg-[#1c2630] hover:bg-[#253240] text-gray-200 border border-[#2b3a4a] transition-colors"
              >
                GOT IT
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
