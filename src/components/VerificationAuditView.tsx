import React, { useState } from 'react';
import { 
  FSMWorkflow, 
  VerificationResult, 
  VerificationIssue 
} from '../types/fsm';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wand2,
  Clock,
  ArrowRight,
  Layers,
  Sparkles,
  Play,
  FileCheck2,
  Activity,
  AlertOctagon,
  Check,
  ChevronRight
} from 'lucide-react';

interface VerificationAuditViewProps {
  workflow: FSMWorkflow;
  verificationResult: VerificationResult;
  onAutoRepair: () => void;
  onSelectState: (id: string) => void;
  onLoadCounterExample: (path: string[], events?: string[]) => void;
  onOpenAiModal: () => void;
}

export const VerificationAuditView: React.FC<VerificationAuditViewProps> = ({
  workflow,
  verificationResult,
  onAutoRepair,
  onSelectState,
  onLoadCounterExample,
  onOpenAiModal,
}) => {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    verificationResult.issues[0]?.id || null
  );

  const errors = verificationResult.issues.filter(i => i.severity === 'error');
  const warnings = verificationResult.issues.filter(i => i.severity === 'warning');
  const deadlocks = verificationResult.issues.filter(i => i.type === 'deadlock');
  const unreachables = verificationResult.issues.filter(i => i.type === 'unreachable');

  const selectedIssue = verificationResult.issues.find(i => i.id === selectedIssueId);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg ${
            verificationResult.isVerified
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {verificationResult.isVerified ? (
              <ShieldCheck className="w-8 h-8" />
            ) : (
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">
                Formal Verification & Compliance Audit
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                verificationResult.isVerified
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {verificationResult.isVerified ? 'VERIFIED (100% SAFE)' : 'DEFECTS DETECTED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {verificationResult.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!verificationResult.isVerified && (
            <button
              onClick={onAutoRepair}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>Auto-Repair All Defects</span>
            </button>
          )}
          <button
            onClick={onOpenAiModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Risk Assessment</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Formal Reliability</span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {verificationResult.score}<span className="text-sm font-normal text-slate-500">/100</span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
            verificationResult.score >= 90 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {verificationResult.score}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Deadlocks & Traps</span>
            <div className={`text-2xl font-black font-mono mt-1 ${deadlocks.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {deadlocks.length}
            </div>
          </div>
          <AlertOctagon className={`w-6 h-6 ${deadlocks.length > 0 ? 'text-rose-400' : 'text-slate-600'}`} />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reachability Rate</span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {verificationResult.metrics.reachableStates}/{verificationResult.metrics.totalStates}
            </div>
          </div>
          <Layers className="w-6 h-6 text-indigo-400" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg SLA Duration</span>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
              {verificationResult.metrics.averageSlaHours.toFixed(1)}<span className="text-xs text-slate-500 font-normal"> hrs</span>
            </div>
          </div>
          <Clock className="w-6 h-6 text-cyan-400" />
        </div>
      </div>

      {/* Main Analysis Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Detected Issues List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Audit Findings ({verificationResult.issues.length})
            </h3>
            <span className="text-xs text-slate-500">
              {errors.length} Critical • {warnings.length} Warnings
            </span>
          </div>

          {verificationResult.issues.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Defects Found</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                All states are live, reachable, and terminating safely. The state machine satisfies formal liveness and safety invariants.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {verificationResult.issues.map((issue) => {
                const isSelected = issue.id === selectedIssueId;
                const isError = issue.severity === 'error';
                return (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? isError
                          ? 'bg-rose-950/30 border-rose-500/50 shadow-lg'
                          : 'bg-amber-950/30 border-amber-500/50 shadow-lg'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isError ? (
                          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-white line-clamp-1">{issue.title}</h4>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                        isError ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {issue.type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {issue.description}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                      <span>Affected: {issue.affectedStateIds.join(', ')}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Deep Defect Inspector & Trace Visualizer */}
        <div className="lg:col-span-7 space-y-4">
          {selectedIssue ? (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      selectedIssue.severity === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {selectedIssue.severity.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-white">{selectedIssue.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {selectedIssue.description}
                  </p>
                </div>
              </div>

              {/* Counter-Example Execution Trace */}
              {selectedIssue.counterExamplePath && selectedIssue.counterExamplePath.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-rose-400" />
                      Counter-Example Fault Trace
                    </span>
                    <button
                      onClick={() => onLoadCounterExample(selectedIssue.counterExamplePath!)}
                      className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Replay in Simulator
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                    {selectedIssue.counterExamplePath.map((stateId, idx) => (
                      <React.Fragment key={idx}>
                        <button
                          onClick={() => onSelectState(stateId)}
                          className={`px-2.5 py-1 rounded-lg border cursor-pointer transition ${
                            idx === selectedIssue.counterExamplePath!.length - 1
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500'
                          }`}
                        >
                          {stateId}
                        </button>
                        {idx < selectedIssue.counterExamplePath!.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Formal Fix */}
              {selectedIssue.suggestedFix && (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Wand2 className="w-4 h-4 text-indigo-400" />
                      Recommended Remediation
                    </span>
                    <button
                      onClick={onAutoRepair}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
                    >
                      Apply Fix
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedIssue.suggestedFix.description}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Workflow Fully Verified</h4>
              <p className="text-xs text-slate-400">
                Select any metric or switch to FSM Graph to continue modeling.
              </p>
            </div>
          )}

          {/* Business Invariants Checklist */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              Business & Regulatory Invariants Check
            </h4>

            <div className="space-y-2">
              {(workflow.invariants || []).map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{inv.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{inv.formula}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{inv.description}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inv.passed !== false
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    {inv.passed !== false ? 'PASSED' : 'VIOLATION'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
