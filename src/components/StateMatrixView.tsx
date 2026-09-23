import React, { useState } from 'react';
import { FSMWorkflow, FSMState, FSMTransition, VerificationResult } from '../types/fsm';
import { Table, AlertTriangle, CheckCircle2, Copy, Check, Download } from 'lucide-react';

interface StateMatrixViewProps {
  workflow: FSMWorkflow;
  verificationResult: VerificationResult;
  onSelectState: (id: string) => void;
  onSelectTransition: (id: string) => void;
}

export const StateMatrixView: React.FC<StateMatrixViewProps> = ({
  workflow,
  verificationResult,
  onSelectState,
  onSelectTransition,
}) => {
  const [copied, setCopied] = useState(false);

  // Extract unique events (Σ)
  const uniqueEvents = Array.from(
    new Set(workflow.transitions.map((t) => t.event))
  ).sort();

  // Deadlock states set
  const deadlockStateIds = new Set(
    verificationResult.issues
      .filter((i) => i.type === 'deadlock')
      .flatMap((i) => i.affectedStateIds)
  );

  // Unreachable states set
  const unreachableStateIds = new Set(
    verificationResult.issues
      .filter((i) => i.type === 'unreachable')
      .flatMap((i) => i.affectedStateIds)
  );

  // Matrix cell lookup: Map<`${fromId}_${event}`, FSMTransition[]>
  const cellMap = new Map<string, FSMTransition[]>();
  workflow.transitions.forEach((t) => {
    const key = `${t.from}_${t.event}`;
    const list = cellMap.get(key) || [];
    list.push(t);
    cellMap.set(key, list);
  });

  const generateMarkdownTable = () => {
    let md = `| State Q \\ Event Σ | ${uniqueEvents.join(' | ')} |\n`;
    md += `| ${'--- | '.repeat(uniqueEvents.length + 1)}\n`;

    workflow.states.forEach((s) => {
      const row = uniqueEvents.map((evt) => {
        const matches = cellMap.get(`${s.id}_${evt}`) || [];
        return matches.map((m) => m.to).join(', ') || '—';
      });
      md += `| **${s.id}** (${s.name}) | ${row.join(' | ')} |\n`;
    });
    return md;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdownTable());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 h-full bg-[#0a0d14] overflow-y-auto p-6 space-y-6">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              State Transition Matrix (δ: Q × Σ → Q)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal mathematical mapping of system state transformations across all discrete input alphabet events.
          </p>
        </div>

        <button
          onClick={handleCopyMarkdown}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied Markdown' : 'Export Table (MD)'}</span>
        </button>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400">
              <th className="p-3 font-semibold text-slate-300 min-w-[200px] border-r border-slate-800 sticky left-0 bg-slate-950/95 z-10">
                State Set (Q)
              </th>
              {uniqueEvents.map((evt) => (
                <th key={evt} className="p-3 font-semibold text-cyan-300 border-r border-slate-800/80 min-w-[130px]">
                  {evt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workflow.states.map((state) => {
              const isDeadlock = deadlockStateIds.has(state.id);
              const isUnreachable = unreachableStateIds.has(state.id);
              const isInitial = state.type === 'initial';
              const isTerminal = state.type.includes('terminal');

              return (
                <tr
                  key={state.id}
                  className={`border-b border-slate-800/60 hover:bg-slate-800/40 transition ${
                    isDeadlock
                      ? 'bg-rose-950/20'
                      : isUnreachable
                      ? 'bg-amber-950/20'
                      : ''
                  }`}
                >
                  {/* Row Header (State) */}
                  <td
                    onClick={() => onSelectState(state.id)}
                    className="p-3 border-r border-slate-800 font-sans cursor-pointer sticky left-0 bg-slate-900/95 z-10 hover:text-indigo-400 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isInitial && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Start State (q0)" />
                        )}
                        {isTerminal && (
                          <span className="w-2 h-2 rounded-full border-2 border-cyan-400 shrink-0" title="Terminal State (F)" />
                        )}
                        <span className="font-bold text-white text-xs">{state.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400">{state.id}</span>
                        {isDeadlock && (
                          <span className="px-1 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40">
                            DEADLOCK
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Transition Cells */}
                  {uniqueEvents.map((evt) => {
                    const transitions = cellMap.get(`${state.id}_${evt}`) || [];

                    if (transitions.length === 0) {
                      return (
                        <td
                          key={evt}
                          className="p-3 border-r border-slate-800/60 text-slate-400 text-center select-none"
                        >
                          —
                        </td>
                      );
                    }

                    const isNonDeterministic = transitions.length > 1;

                    return (
                      <td
                        key={evt}
                        className={`p-2.5 border-r border-slate-800/60 ${
                          isNonDeterministic ? 'bg-amber-950/40 border-amber-600' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          {transitions.map((t) => {
                            const targetState = workflow.states.find((s) => s.id === t.to);
                            return (
                              <button
                                key={t.id}
                                onClick={() => onSelectTransition(t.id)}
                                className="w-full text-left px-2 py-1 rounded bg-slate-800/90 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700/80 hover:border-indigo-400 transition text-[11px] font-mono block cursor-pointer"
                              >
                                <div className="font-bold text-indigo-300 hover:text-white">
                                  → {targetState?.name || t.to}
                                </div>
                                {t.guard && (
                                  <div className="text-[9px] text-amber-400 truncate">
                                    {t.guard}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Matrix Mathematical Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-sans">Formal Determinism Check</div>
          <div className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
            {verificationResult.metrics.isDeterministic ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">100% Deterministic (DFA)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400">Non-Deterministic Branches (NFA)</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {verificationResult.metrics.isDeterministic
              ? 'Every state and event pair defines at most one unique target state.'
              : 'Ambiguous guards or identical event triggers detected on multiple outgoing branches.'}
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-sans">Total State Space (|Q|)</div>
          <div className="text-sm font-bold text-white font-mono">
            {workflow.states.length} Active Machine States
          </div>
          <p className="text-[11px] text-slate-400">
            {verificationResult.metrics.reachableStates} reachable from q₀ ({Math.round(
              (verificationResult.metrics.reachableStates / (workflow.states.length || 1)) * 100
            )}% coverage).
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-sans">Terminal Absorbing States (|F|)</div>
          <div className="text-sm font-bold text-cyan-400 font-mono">
            {verificationResult.metrics.terminalStates} Designated Final States
          </div>
          <p className="text-[11px] text-slate-400">
            States representing formal transaction resolution (Approval / Denial).
          </p>
        </div>
      </div>
    </div>
  );
};
