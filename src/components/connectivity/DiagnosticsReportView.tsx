import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock, Terminal, RefreshCw } from 'lucide-react';
import { ConnectionDiagnosticsReport, DiagnosticStepStatus } from '../../types/connectivity';

interface DiagnosticsReportViewProps {
  report: ConnectionDiagnosticsReport | null;
  isRunning: boolean;
  onRerun: () => void;
}

export const DiagnosticsReportView: React.FC<DiagnosticsReportViewProps> = ({
  report,
  isRunning,
  onRerun,
}) => {
  if (isRunning) {
    return (
      <div className="bg-[#090d10] border border-[#1b252f] rounded-lg p-5 font-mono text-xs">
        <div className="flex items-center gap-2.5 text-[#00f5ff] mb-4">
          <RefreshCw className="w-4 h-4 animate-spin text-[#00f5ff]" />
          <span className="font-bold tracking-wide">PROBING CONNECTION PIPELINE...</span>
        </div>
        <div className="space-y-2 text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f5ff] animate-ping" />
            <span>Sending handshake to local bridge agent...</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <span>Inspecting MetaTrader 5 terminal process...</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <span>Verifying broker login and tick quote feed...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-[#090d10] border border-[#182026] rounded-lg p-5 font-mono text-xs text-gray-400 flex flex-col items-center justify-center text-center py-8">
        <Terminal className="w-8 h-8 text-gray-500 mb-2" />
        <p className="text-gray-300 font-medium">No diagnostic probe has been executed yet.</p>
        <p className="text-[11px] text-gray-500 mt-1 max-w-sm">
          Click below to initiate the step-by-step diagnostic probe to verify the local MT5 bridge, terminal, and market feed.
        </p>
        <button
          onClick={onRerun}
          className="mt-4 px-4 py-2 rounded bg-[#162028] hover:bg-[#1f2c38] text-[#c6f135] border border-[#c6f135]/40 text-xs font-mono font-semibold transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Run Connection Diagnostics</span>
        </button>
      </div>
    );
  }

  const getStatusIcon = (status: DiagnosticStepStatus) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="w-4 h-4 text-[#c6f135] shrink-0" />;
      case 'FAIL':
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'RUNNING':
        return <RefreshCw className="w-4 h-4 text-[#00f5ff] animate-spin shrink-0" />;
      case 'SKIPPED':
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500 shrink-0" />;
    }
  };

  const isSuccess = report.overallStatus === 'SUCCESS';
  const isWarning = report.overallStatus === 'WARNING';

  return (
    <div className="bg-[#090d10] border border-[#1b252f] rounded-lg p-4 font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1b252f]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#c6f135]" />
          <span className="font-bold text-white tracking-wide">DIAGNOSTIC PROBE REPORT</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isSuccess
                ? 'bg-[#c6f135]/15 text-[#c6f135] border border-[#c6f135]/30'
                : isWarning
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            {report.overallStatus}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            {new Date(report.timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={onRerun}
            className="px-2.5 py-1 rounded bg-[#141b21] hover:bg-[#1a232b] text-gray-300 hover:text-white border border-[#232f3b] text-[11px] transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Re-Probe</span>
          </button>
        </div>
      </div>

      {/* Summary message */}
      <div
        className={`p-3 rounded-md text-[11px] leading-relaxed ${
          isSuccess
            ? 'bg-[#0f1813] text-emerald-200 border border-emerald-900/50'
            : isWarning
            ? 'bg-[#18150d] text-amber-200 border border-amber-900/50'
            : 'bg-[#180f12] text-rose-200 border border-rose-900/50'
        }`}
      >
        <span className="font-bold mr-1.5">Outcome:</span>
        {report.summary}
      </div>

      {/* Terminal Info if available */}
      {report.terminalInfo && (
        <div className="bg-[#0d1216] border border-[#1b252f] rounded p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
          <div>
            <span className="text-gray-400 block">Terminal:</span>
            <span className="text-gray-200 font-semibold">{report.terminalInfo.name || 'MetaTrader 5'}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Build:</span>
            <span className="text-gray-200 font-semibold">{report.terminalInfo.build || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Broker:</span>
            <span className="text-gray-200 font-semibold truncate block">{report.terminalInfo.company || 'MetaQuotes'}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Ping:</span>
            <span className="text-[#00f5ff] font-semibold">{report.terminalInfo.ping ? `${report.terminalInfo.ping} ms` : '< 20 ms'}</span>
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-2">
        <div className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">
          Pipeline Verification Steps
        </div>
        <div className="space-y-1.5">
          {report.steps.map((step) => (
            <div
              key={step.id}
              className="flex items-start gap-2.5 p-2 rounded bg-[#0b0f13] border border-[#172028]"
            >
              {getStatusIcon(step.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-200 text-[11px] truncate">{step.name}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      step.status === 'PASS'
                        ? 'text-[#c6f135] bg-[#c6f135]/10'
                        : step.status === 'FAIL'
                        ? 'text-rose-400 bg-rose-500/10'
                        : 'text-gray-400 bg-gray-700/20'
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">{step.message}</p>
                {step.errorDetails && (
                  <p className="text-[10px] text-rose-300/90 mt-1 bg-rose-950/30 p-1.5 rounded border border-rose-900/40">
                    {step.errorDetails}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting hints if failed */}
      {report.troubleshootingNotes && report.troubleshootingNotes.length > 0 && (
        <div className="p-3 bg-[#0d1318] border border-[#1f2b37] rounded-md space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Remediation & Next Steps:</span>
          </div>
          <ul className="list-disc list-inside text-[10px] text-gray-300 space-y-1 pl-1">
            {report.troubleshootingNotes.map((note, idx) => (
              <li key={idx} className="leading-normal">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
