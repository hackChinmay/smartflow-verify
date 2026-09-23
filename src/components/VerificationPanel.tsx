import React, { useState } from 'react';
import {
  FSMWorkflow,
  FSMState,
  FSMTransition,
  VerificationResult,
  VerificationIssue,
} from '../types/fsm';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  Wand2,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Code2,
  Sliders,
  Sparkles,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { exportToDOT, exportToSCXML } from '../utils/fsmLayout';

interface VerificationPanelProps {
  workflow: FSMWorkflow;
  onUpdateWorkflow: (updated: FSMWorkflow) => void;
  verificationResult: VerificationResult;
  selectedStateId: string | null;
  onSelectState: (id: string | null) => void;
  selectedTransitionId: string | null;
  onSelectTransition: (id: string | null) => void;
  onLoadCounterExample: (path: string[], events?: string[]) => void;
  onAutoRepair: () => void;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  workflow,
  onUpdateWorkflow,
  verificationResult,
  selectedStateId,
  onSelectState,
  selectedTransitionId,
  onSelectTransition,
  onLoadCounterExample,
  onAutoRepair,
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'inspector' | 'formal'>('issues');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const selectedState = workflow.states.find((s) => s.id === selectedStateId);
  const selectedTransition = workflow.transitions.find((t) => t.id === selectedTransitionId);

  // If a state or transition is selected, switch to inspector tab automatically
  React.useEffect(() => {
    if (selectedStateId || selectedTransitionId) {
      setActiveTab('inspector');
    }
  }, [selectedStateId, selectedTransitionId]);

  const filteredIssues = verificationResult.issues.filter((issue) => {
    if (filterSeverity === 'all') return true;
    return issue.severity === filterSeverity;
  });

  const errorCount = verificationResult.issues.filter((i) => i.severity === 'error').length;
  const warningCount = verificationResult.issues.filter((i) => i.severity === 'warning').length;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // State updates
  const handleUpdateSelectedState = (patch: Partial<FSMState>) => {
    if (!selectedState) return;
    onUpdateWorkflow({
      ...workflow,
      states: workflow.states.map((s) => (s.id === selectedState.id ? { ...s, ...patch } : s)),
    });
  };

  const handleDeleteState = (id: string) => {
    onUpdateWorkflow({
      ...workflow,
      states: workflow.states.filter((s) => s.id !== id),
      transitions: workflow.transitions.filter((t) => t.from !== id && t.to !== id),
    });
    onSelectState(null);
  };

  // Transition updates
  const handleUpdateSelectedTransition = (patch: Partial<FSMTransition>) => {
    if (!selectedTransition) return;
    onUpdateWorkflow({
      ...workflow,
      transitions: workflow.transitions.map((t) =>
        t.id === selectedTransition.id ? { ...t, ...patch } : t
      ),
    });
  };

  const handleDeleteTransition = (id: string) => {
    onUpdateWorkflow({
      ...workflow,
      transitions: workflow.transitions.filter((t) => t.id !== id),
    });
    onSelectTransition(null);
  };

  // Quick fix for single issue
  const handleApplyIssueFix = (issue: VerificationIssue) => {
    if (issue.suggestedFix?.patch) {
      onUpdateWorkflow({
        ...workflow,
        ...issue.suggestedFix.patch,
      });
    } else {
      // General auto repair
      onAutoRepair();
    }
  };

  return (
    <aside className="w-96 h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col z-20 select-none">
      {/* Top Panel Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-2 gap-1">
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'issues'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Diagnostics</span>
          {errorCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-mono">
              {errorCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'inspector'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab('formal')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'formal'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Formal FSM</span>
        </button>
      </div>

      {/* Tab 1: Verification Issues / Diagnostics */}
      {activeTab === 'issues' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Reliability Score Card */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Formal Reliability Score
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  verificationResult.score >= 90
                    ? 'text-emerald-400'
                    : verificationResult.score >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {verificationResult.score}/100
              </span>
            </div>

            {/* Score progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  verificationResult.score >= 90
                    ? 'bg-emerald-500'
                    : verificationResult.score >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${verificationResult.score}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              {verificationResult.summary}
            </p>

            {/* Auto-repair banner if issues exist */}
            {(errorCount > 0 || warningCount > 0) && (
              <button
                onClick={onAutoRepair}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer mt-2"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Repair All Identified Defects</span>
              </button>
            )}
          </div>

          {/* Severity filter pills */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                  filterSeverity === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                All ({verificationResult.issues.length})
              </button>
              <button
                onClick={() => setFilterSeverity('error')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                  filterSeverity === 'error'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                Errors ({errorCount})
              </button>
              <button
                onClick={() => setFilterSeverity('warning')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                  filterSeverity === 'warning'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                Warnings ({warningCount})
              </button>
            </div>
          </div>

          {/* List of Issues */}
          <div className="space-y-3">
            {filteredIssues.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-white">0 Defects Found</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Finite State Machine satisfies all safety, liveness, and deterministic properties.
                </p>
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-3 rounded-xl border backdrop-blur transition-all ${
                    issue.severity === 'error'
                      ? 'bg-rose-950/30 border-rose-900/60 shadow-lg shadow-rose-950/20'
                      : 'bg-amber-950/20 border-amber-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {issue.severity === 'error' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <h4 className="text-xs font-bold text-white leading-tight">
                        {issue.title}
                      </h4>
                    </div>

                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold shrink-0 ${
                        issue.severity === 'error'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {issue.type.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    {issue.description}
                  </p>

                  {/* Counter-example Path Stepper */}
                  {issue.counterExamplePath && issue.counterExamplePath.length > 0 && (
                    <div className="mt-2.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                      <div className="text-[10px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                        <span>Counter-Example Execution Path:</span>
                        <span className="font-mono text-[9px] text-rose-400">
                          {issue.counterExamplePath.length} steps
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                        {issue.counterExamplePath.map((stId, idx) => (
                          <React.Fragment key={idx}>
                            <span
                              onClick={() => onSelectState(stId)}
                              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                                idx === issue.counterExamplePath!.length - 1
                                  ? 'bg-rose-500 text-white font-bold'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {workflow.states.find((s) => s.id === stId)?.name || stId}
                            </span>
                            {idx < issue.counterExamplePath!.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Replay Counter-example button */}
                      <button
                        onClick={() =>
                          onLoadCounterExample(
                            issue.counterExamplePath!,
                            issue.counterExampleEvents
                          )
                        }
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-medium transition cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Replay Path in Token Simulator</span>
                      </button>
                    </div>
                  )}

                  {/* Suggested Fix Action */}
                  {issue.suggestedFix && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 truncate">
                        {issue.suggestedFix.description}
                      </span>
                      <button
                        onClick={() => handleApplyIssueFix(issue)}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold rounded shrink-0 shadow transition cursor-pointer"
                      >
                        Fix Issue
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: State / Transition Property Inspector */}
      {activeTab === 'inspector' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedState ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <h3 className="text-xs font-bold text-white">State Inspector</h3>
                </div>
                <button
                  onClick={() => handleDeleteState(selectedState.id)}
                  title="Delete State"
                  className="p-1 text-rose-400 hover:text-white hover:bg-rose-900/40 rounded transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  State Identifier (ID)
                </label>
                <input
                  type="text"
                  value={selectedState.id}
                  disabled
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Display Label / Name
                </label>
                <input
                  type="text"
                  value={selectedState.name}
                  onChange={(e) => handleUpdateSelectedState({ name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Formal State Type
                </label>
                <select
                  value={selectedState.type}
                  onChange={(e) =>
                    handleUpdateSelectedState({ type: e.target.value as any })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="initial">q₀ Initial Start State</option>
                  <option value="intermediate">Intermediate Task</option>
                  <option value="review">Human Specialist Review</option>
                  <option value="gateway">Automated Decision Gateway</option>
                  <option value="terminal_success">Terminal Success (Accept State F)</option>
                  <option value="terminal_failure">Terminal Failure (Reject State F)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Assigned Actor / Role
                </label>
                <input
                  type="text"
                  value={selectedState.role}
                  onChange={(e) => handleUpdateSelectedState({ role: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Dwell Time / SLA Threshold (Hours)
                </label>
                <input
                  type="number"
                  value={selectedState.slaHours}
                  onChange={(e) =>
                    handleUpdateSelectedState({ slaHours: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Description / Specification
                </label>
                <textarea
                  rows={2}
                  value={selectedState.description}
                  onChange={(e) => handleUpdateSelectedState({ description: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Outgoing Transitions list */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Outgoing Transitions ({workflow.transitions.filter((t) => t.from === selectedState.id).length})
                </label>
                <div className="space-y-1">
                  {workflow.transitions
                    .filter((t) => t.from === selectedState.id)
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onSelectTransition(t.id)}
                        className="px-2.5 py-1.5 bg-slate-950/70 hover:bg-slate-800 rounded-lg border border-slate-800 flex items-center justify-between cursor-pointer transition text-xs"
                      >
                        <span className="font-mono text-indigo-300">{t.event}</span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                          <span>→</span>
                          <span>{workflow.states.find((s) => s.id === t.to)?.name}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : selectedTransition ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <h3 className="text-xs font-bold text-white">Transition Inspector</h3>
                </div>
                <button
                  onClick={() => handleDeleteTransition(selectedTransition.id)}
                  title="Delete Transition"
                  className="p-1 text-rose-400 hover:text-white hover:bg-rose-900/40 rounded transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Trigger Event (Σ)
                </label>
                <input
                  type="text"
                  value={selectedTransition.event}
                  onChange={(e) => handleUpdateSelectedTransition({ event: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Source State (From)
                </label>
                <select
                  value={selectedTransition.from}
                  onChange={(e) => handleUpdateSelectedTransition({ from: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {workflow.states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Target State (To)
                </label>
                <select
                  value={selectedTransition.to}
                  onChange={(e) => handleUpdateSelectedTransition({ to: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {workflow.states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Guard Condition Expression
                </label>
                <input
                  type="text"
                  value={selectedTransition.guard || ''}
                  onChange={(e) => handleUpdateSelectedTransition({ guard: e.target.value })}
                  placeholder="e.g. [creditScore >= 720]"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Action Hook Function
                </label>
                <input
                  type="text"
                  value={selectedTransition.action || ''}
                  onChange={(e) => handleUpdateSelectedTransition({ action: e.target.value })}
                  placeholder="e.g. issueApprovalLetter()"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 space-y-3">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-xs font-bold text-white">No Element Selected</h4>
              <p className="text-[11px] leading-relaxed">
                Click on any state node or transition edge in the canvas to inspect and edit its properties, guards, and SLA rules.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Formal FSM Mathematical Specification */}
      {activeTab === 'formal' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-indigo-400 font-sans">
              Formal FSM Tuple: M = ⟨Q, Σ, δ, q₀, F⟩
            </div>
            <div className="text-slate-300 space-y-1 text-[11px]">
              <div>
                <span className="text-slate-400 font-bold">|Q|: </span>
                <span className="text-white">{workflow.states.length} states</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">|Σ|: </span>
                <span className="text-white">
                  {new Set(workflow.transitions.map((t) => t.event)).size} unique events
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">q₀: </span>
                <span className="text-emerald-400">
                  {workflow.states.find((s) => s.type === 'initial')?.id || 'None'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">F: </span>
                <span className="text-cyan-400">
                  {`{ ${workflow.states
                    .filter((s) => s.type.includes('terminal'))
                    .map((s) => s.id)
                    .join(', ')} }`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">Complexity (M): </span>
                <span className="text-amber-400">
                  {verificationResult.metrics.cyclomaticComplexity}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Copy Formats */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 font-sans">
              Export Representation:
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCopy(JSON.stringify(workflow, null, 2), 'json')}
                className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] transition cursor-pointer"
              >
                {copiedType === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy JSON</span>
              </button>

              <button
                onClick={() => handleCopy(exportToSCXML(workflow), 'scxml')}
                className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] transition cursor-pointer"
              >
                {copiedType === 'scxml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy SCXML</span>
              </button>
            </div>
          </div>

          {/* Raw DOT Graphviz */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1 font-sans">
              <span>Graphviz DOT</span>
              <button
                onClick={() => handleCopy(exportToDOT(workflow), 'dot')}
                className="text-indigo-400 hover:text-indigo-300 text-[10px] cursor-pointer"
              >
                {copiedType === 'dot' ? 'Copied!' : 'Copy DOT'}
              </button>
            </div>
            <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400 max-h-48 overflow-y-auto leading-tight">
              {exportToDOT(workflow)}
            </pre>
          </div>
        </div>
      )}
    </aside>
  );
};
