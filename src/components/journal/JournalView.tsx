import React, { useState } from 'react';
import { BookOpen, Plus, Star, CheckCircle2, XCircle } from 'lucide-react';
import { JournalEntry } from '../../types';
import { api } from '../../lib/api';

interface JournalViewProps {
  entries: JournalEntry[];
  onRefresh: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ entries, onRefresh }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    strategyName: 'London Breakout & Liquidity Sweep',
    instrument: 'EURUSD',
    direction: 'BUY' as 'BUY' | 'SELL',
    entryPrice: 1.085,
    exitPrice: 1.091,
    stopLoss: 1.082,
    takeProfit: 1.091,
    pnlDollar: 1000,
    pnlRMultiple: 2.0,
    result: 'WIN' as 'WIN' | 'LOSS' | 'BREAKEVEN',
    marketConditions: 'London session expansion',
    technicalSetup: 'Asian range low sweep + M15 BOS',
    fundamentalContext: 'No red folder news',
    userNotes: 'Followed execution plan cleanly',
    lessonsLearned: 'Patience on the candle close',
    disciplineRating: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addJournalEntry(form);
    setIsAdding(false);
    onRefresh();
  };

  return (
    <div className="space-y-4 pb-16 font-mono text-xs">
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white tracking-wider">
            TRADE LOGBOOK & DISCIPLINE AUDIT
          </span>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded bg-[#16212b] text-[#c6f135] border border-[#233342] hover:bg-[#1d2b38]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>LOG NEW TRADE</span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-[#0d1216] rounded border border-[#1b252f] space-y-3"
        >
          <div className="font-bold text-white border-b border-[#1b252f] pb-2">
            RECORD TRADE AUDIT
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-gray-500">Instrument</label>
              <input
                type="text"
                value={form.instrument}
                onChange={(e) => setForm({ ...form, instrument: e.target.value })}
                className="w-full bg-[#12181f] border border-[#1f2a36] rounded px-2 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Result</label>
              <select
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value as any })}
                className="w-full bg-[#12181f] border border-[#1f2a36] rounded px-2 py-1 text-white"
              >
                <option value="WIN">WIN</option>
                <option value="LOSS">LOSS</option>
                <option value="BREAKEVEN">BREAKEVEN</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500">P&L (R-Multiple)</label>
              <input
                type="number"
                step="0.1"
                value={form.pnlRMultiple}
                onChange={(e) => setForm({ ...form, pnlRMultiple: Number(e.target.value) })}
                className="w-full bg-[#12181f] border border-[#1f2a36] rounded px-2 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Discipline Rating (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={form.disciplineRating}
                onChange={(e) => setForm({ ...form, disciplineRating: Number(e.target.value) })}
                className="w-full bg-[#12181f] border border-[#1f2a36] rounded px-2 py-1 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500">Trader Notes & Discipline Audit</label>
            <textarea
              rows={2}
              value={form.userNotes}
              onChange={(e) => setForm({ ...form, userNotes: e.target.value })}
              className="w-full bg-[#12181f] border border-[#1f2a36] rounded px-2 py-1 text-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 rounded bg-[#162028] text-gray-400"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded bg-[#c6f135] text-black font-bold"
            >
              SAVE TO JOURNAL
            </button>
          </div>
        </form>
      )}

      {/* Entries List */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                    entry.result === 'WIN'
                      ? 'bg-[#c6f135]/20 text-[#c6f135]'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {entry.result} ({entry.pnlRMultiple}R)
                </span>
                <span className="font-bold text-white">{entry.instrument}</span>
                <span className="text-gray-400 text-[11px]">{entry.strategyName}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                {'★'.repeat(entry.disciplineRating)}
                {'☆'.repeat(5 - entry.disciplineRating)}
              </div>
            </div>

            <div className="text-gray-300 text-[11px] italic bg-[#0a0e11] p-2 rounded border border-[#162028]">
              "{entry.userNotes}"
            </div>

            {entry.lessonsLearned && (
              <div className="text-[10px] text-gray-400">
                <strong className="text-gray-300">Key takeaway: </strong>
                {entry.lessonsLearned}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
