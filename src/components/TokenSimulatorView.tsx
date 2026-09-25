import React, { useState, useEffect, useRef } from 'react';
import { 
  FSMWorkflow, 
  FSMState, 
  FSMTransition, 
  SimulationStep, 
  VerificationResult 
} from '../types/fsm';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  FastForward,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  AlertOctagon,
  Sliders,
  Clock,
  History,
  Check,
  XCircle,
  BarChart3,
  Cpu
} from 'lucide-react';
import { WorkflowCanvas } from './WorkflowCanvas';

interface TokenSimulatorViewProps {
  workflow: FSMWorkflow;
  onUpdateWorkflow: (wf: FSMWorkflow) => void;
  verificationResult: VerificationResult;
  simulatingStateId: string | null;
  onSimulateStateChange: (stateId: string) => void;
  simulationHistory: SimulationStep[];
  onStepHistoryChange: (steps: SimulationStep[]) => void;
}

export const TokenSimulatorView: React.FC<TokenSimulatorViewProps> = ({
  workflow,
  onUpdateWorkflow,
  verificationResult,
  simulatingStateId,
  onSimulateStateChange,
  simulationHistory,
  onStepHistoryChange,
}) => {
  const initial = workflow.states.find((s) => s.type === 'initial') || workflow.states[0];
  const currentStateId = simulatingStateId || initial?.id || '';
  const currentState = workflow.states.find((s) => s.id === currentStateId);

  // Variable context payload state
  const [variables, setVariables] = useState<Record<string, any>>(
    workflow.variables || {
      loanAmount: 75000,
      creditScore: 710,
      kycPassed: true,
      fraudRiskScore: 0.12,
      documentsUploaded: true,
      dissentVotes: 0,
    }
  );

  // Simulator playback controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState<number>(1000);
  const timerRef = useRef<number | null>(null);

  // Monte Carlo Stress Test State
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressResults, setStressResults] = useState<{
    totalRuns: number;
    successRate: number;
    failureRate: number;
    deadlockRate: number;
    avgSteps: number;
    avgSlaHours: number;
    stateVisits: Record<string, number>;
  } | null>(null);

  // Available transitions from current state
  const availableTransitions = workflow.transitions.filter((t) => t.from === currentStateId);

  // Evaluate simple guard expression against variables context
  const evaluateGuard = (guard?: string): boolean => {
    if (!guard || !guard.trim()) return true;
    try {
      // Clean brackets [ ... ]
      const expr = guard.replace(/[\[\]]/g, '').trim();
      // Safe context evaluation
      const func = new Function(...Object.keys(variables), `return Boolean(${expr});`);
      return Boolean(func(...Object.values(variables)));
    } catch {
      return true; // fallback
    }
  };

  // Step transition
  const handleFireTransition = (transition: FSMTransition) => {
    const isGuardPassed = evaluateGuard(transition.guard);
    const targetState = workflow.states.find((s) => s.id === transition.to);
    if (!targetState) return;

    const newStep: SimulationStep = {
      stepNumber: simulationHistory.length + 1,
      timestamp: new Date().toLocaleTimeString(),
      fromStateId: currentStateId,
      toStateId: transition.to,
      event: transition.event,
      guardEvaluated: transition.guard ? `${transition.guard} -> ${isGuardPassed ? 'TRUE' : 'FALSE'}` : undefined,
      variablesSnapshot: { ...variables },
    };

    onSimulateStateChange(transition.to);
    onStepHistoryChange([...simulationHistory, newStep]);
  };

  // Auto-step timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        const eligible = availableTransitions.filter((t) => evaluateGuard(t.guard));
        if (eligible.length > 0) {
          // Pick first enabled or random enabled branch
          const chosen = eligible[Math.floor(Math.random() * eligible.length)];
          handleFireTransition(chosen);
        } else {
          setIsPlaying(false);
        }
      }, speedMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStateId, variables, speedMs, availableTransitions]);

  const handleReset = () => {
    setIsPlaying(false);
    onSimulateStateChange(initial?.id || '');
    onStepHistoryChange([]);
  };

  // Run 1,000 Monte Carlo simulations
  const runMonteCarloStressTest = () => {
    setIsStressTesting(true);
    setTimeout(() => {
      const TOTAL_RUNS = 1000;
      let successes = 0;
      let failures = 0;
      let deadlocks = 0;
      let totalSteps = 0;
      let totalSla = 0;
      const stateVisits: Record<string, number> = {};

      for (let i = 0; i < TOTAL_RUNS; i++) {
        let cur = initial?.id || '';
        let steps = 0;
        let sla = 0;
        const maxSteps = 40;

        while (steps < maxSteps) {
          const stateObj = workflow.states.find((s) => s.id === cur);
          if (stateObj) {
            stateVisits[cur] = (stateVisits[cur] || 0) + 1;
            sla += stateObj.slaHours || 0;
          }

          if (stateObj?.type === 'terminal_success') {
            successes++;
            break;
          }
          if (stateObj?.type === 'terminal_failure') {
            failures++;
            break;
          }

          const outs = workflow.transitions.filter((t) => t.from === cur);
          if (outs.length === 0) {
            deadlocks++;
            break;
          }

          const nextTrans = outs[Math.floor(Math.random() * outs.length)];
          cur = nextTrans.to;
          steps++;
        }

        totalSteps += steps;
        totalSla += sla;
      }

      setStressResults({
        totalRuns: TOTAL_RUNS,
        successRate: (successes / TOTAL_RUNS) * 100,
        failureRate: (failures / TOTAL_RUNS) * 100,
        deadlockRate: (deadlocks / TOTAL_RUNS) * 100,
        avgSteps: Number((totalSteps / TOTAL_RUNS).toFixed(1)),
        avgSlaHours: Number((totalSla / TOTAL_RUNS).toFixed(1)),
        stateVisits,
      });
      setIsStressTesting(false);
    }, 400);
  };

  const isTerminal = currentState?.type === 'terminal_success' || currentState?.type === 'terminal_failure';
  const isDeadlock = !isTerminal && availableTransitions.length === 0;

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col lg:flex-row bg-[#0a0d14]">
      {/* Left Canvas Preview Area */}
      <div className="flex-1 relative flex flex-col border-r border-slate-800/80">
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Interactive State Machine Graph
            </span>
          </div>
          <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
            Active: {currentState?.name || currentStateId}
          </span>
        </div>

        <div className="flex-1 relative">
          <WorkflowCanvas
            workflow={workflow}
            onUpdateWorkflow={onUpdateWorkflow}
            selectedStateId={currentStateId}
            onSelectState={(id) => {
              if (id) onSimulateStateChange(id);
            }}
            selectedTransitionId={null}
            onSelectTransition={() => {}}
            verificationResult={verificationResult}
            simulatingStateId={currentStateId}
          />
        </div>
      </div>

      {/* Right Control & Diagnostics Sidebar */}
      <div className="w-full lg:w-[460px] h-full overflow-y-auto bg-slate-950 p-5 space-y-5 border-l border-slate-800/80 select-none">
        {/* Playback Control Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Token Execution Engine
              </h3>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              isTerminal
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : isDeadlock
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : isPlaying
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {isTerminal ? 'TERMINAL REACHED' : isDeadlock ? 'DEADLOCK TRAP' : isPlaying ? 'AUTO-PLAYING' : 'IDLE / STEPPING'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={isTerminal || isDeadlock}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Auto Step'}</span>
            </button>

            <button
              onClick={handleReset}
              title="Reset simulation to initial state"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-[10px] font-mono">
              {[1500, 1000, 500].map((spd, idx) => (
                <button
                  key={spd}
                  onClick={() => setSpeedMs(spd)}
                  className={`px-2 py-1 rounded-lg transition ${
                    speedMs === spd ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {idx === 0 ? '0.5x' : idx === 1 ? '1x' : '2x'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Outgoing Transitions */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Available Transitions ({availableTransitions.length})
            </h4>
            <span className="text-[10px] text-slate-500">Click event to step</span>
          </div>

          {availableTransitions.length === 0 ? (
            <div className={`p-4 rounded-xl text-center border ${
              isTerminal
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 text-xs'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-400 text-xs'
            }`}>
              {isTerminal ? 'Process Terminated Successfully' : 'Deadlock Detected: No outgoing exit transitions!'}
            </div>
          ) : (
            <div className="space-y-2">
              {availableTransitions.map((t) => {
                const targetState = workflow.states.find((s) => s.id === t.to);
                const isPassed = evaluateGuard(t.guard);
                return (
                  <button
                    key={t.id}
                    onClick={() => handleFireTransition(t)}
                    disabled={!isPassed}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                      isPassed
                        ? 'bg-slate-800/80 hover:bg-slate-800 border-indigo-500/40 hover:border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-500 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-indigo-300">
                          {t.event}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {isPassed ? 'GUARD PASS' : 'BLOCKED'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        $\to$ <span className="font-semibold text-slate-300">{targetState?.name || t.to}</span>
                        {t.guard && <span className="text-slate-500 font-mono ml-2">{t.guard}</span>}
                      </div>
                    </div>
                    <StepForward className="w-4 h-4 text-indigo-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Context & Variable Editor */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              State Context & Variable Payload
            </h4>
            <span className="text-[10px] text-slate-500">Live Guard Inputs</span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(variables).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-xs font-mono text-slate-300">{key}</span>
                {typeof val === 'boolean' ? (
                  <button
                    onClick={() => setVariables({ ...variables, [key]: !val })}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold transition ${
                      val ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {val ? 'TRUE' : 'FALSE'}
                  </button>
                ) : typeof val === 'number' ? (
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => setVariables({ ...variables, [key]: Number(e.target.value) })}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-right font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(val)}
                    onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-right font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Monte Carlo Stress Tester */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              Monte Carlo SLA Stress Test (1k Runs)
            </h4>
          </div>

          <p className="text-xs text-slate-400">
            Simulate 1,000 automated runs with randomized paths to detect SLA bottlenecks and failure probabilities.
          </p>

          <button
            onClick={runMonteCarloStressTest}
            disabled={isStressTesting}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            {isStressTesting ? (
              <span>Simulating 1,000 runs...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" /> Run 1,000 Stochastic Executions
              </>
            )}
          </button>

          {stressResults && (
            <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 block font-sans">Success</span>
                <span className="font-bold text-white">{stressResults.successRate.toFixed(1)}%</span>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] text-rose-400 block font-sans">Rejection</span>
                <span className="font-bold text-white">{stressResults.failureRate.toFixed(1)}%</span>
              </div>
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 block font-sans">Avg SLA</span>
                <span className="font-bold text-white">{stressResults.avgSlaHours}h</span>
              </div>
            </div>
          )}
        </div>

        {/* Step History Trace */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              Execution Trace ({simulationHistory.length} steps)
            </h4>
            <button
              onClick={() => onStepHistoryChange([])}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {simulationHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No steps taken yet</p>
            ) : (
              simulationHistory.map((s, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono flex items-center justify-between"
                >
                  <span className="text-indigo-300 font-bold">#{s.stepNumber} {s.event}</span>
                  <span className="text-slate-400">{s.toStateId}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
