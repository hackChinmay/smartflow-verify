import React, { useState, useEffect, useRef } from 'react';
import {
  FSMWorkflow,
  FSMState,
  FSMTransition,
  SimulationStep,
  SimulationSession,
} from '../types/fsm';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  StepBack,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  History,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface SimulationDockProps {
  workflow: FSMWorkflow;
  simulatingStateId: string | null;
  onSimulateStateChange: (stateId: string) => void;
  onStepHistoryChange: (steps: SimulationStep[]) => void;
  externalCounterExample?: { path: string[]; events?: string[] } | null;
  onClearCounterExample?: () => void;
}

export const SimulationDock: React.FC<SimulationDockProps> = ({
  workflow,
  simulatingStateId,
  onSimulateStateChange,
  onStepHistoryChange,
  externalCounterExample,
  onClearCounterExample,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1000); // ms per step
  const [history, setHistory] = useState<SimulationStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  const initial = workflow.states.find((s) => s.type === 'initial') || workflow.states[0];
  const currentStateId = simulatingStateId || initial?.id || '';
  const currentState = workflow.states.find((s) => s.id === currentStateId);

  // Available outgoing transitions from current state
  const availableTransitions = workflow.transitions.filter((t) => t.from === currentStateId);

  // Status computation
  const isTerminalSuccess = currentState?.type === 'terminal_success';
  const isTerminalFailure = currentState?.type === 'terminal_failure';
  const isTerminal = isTerminalSuccess || isTerminalFailure;
  const isDeadlock = !isTerminal && availableTransitions.length === 0;

  // Handle external counter-example load
  useEffect(() => {
    if (externalCounterExample && externalCounterExample.path.length > 0) {
      handleReset();
      const newHistory: SimulationStep[] = [];
      const path = externalCounterExample.path;
      const events = externalCounterExample.events || [];

      for (let i = 0; i < path.length - 1; i++) {
        newHistory.push({
          stepNumber: i + 1,
          timestamp: new Date().toLocaleTimeString(),
          fromStateId: path[i],
          toStateId: path[i + 1],
          event: events[i] || 'counter_step',
          variablesSnapshot: {},
        });
      }

      setHistory(newHistory);
      setStepIndex(newHistory.length);
      onSimulateStateChange(path[path.length - 1]);
      onStepHistoryChange(newHistory);
      if (onClearCounterExample) onClearCounterExample();
    }
  }, [externalCounterExample]);

  // Auto-play timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      if (isTerminal || isDeadlock || availableTransitions.length === 0) {
        setIsPlaying(false);
        return;
      }

      timer = setTimeout(() => {
        // Pick the first available transition
        handleFireTransition(availableTransitions[0]);
      }, speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStateId, speed, availableTransitions, isTerminal, isDeadlock]);

  const handleFireTransition = (t: FSMTransition) => {
    const nextStep: SimulationStep = {
      stepNumber: history.length + 1,
      timestamp: new Date().toLocaleTimeString(),
      fromStateId: t.from,
      toStateId: t.to,
      event: t.event,
      guardEvaluated: t.guard,
      actionExecuted: t.action,
      variablesSnapshot: {},
    };

    const updatedHistory = [...history, nextStep];
    setHistory(updatedHistory);
    setStepIndex(updatedHistory.length);
    onSimulateStateChange(t.to);
    onStepHistoryChange(updatedHistory);
  };

  const handleStepBack = () => {
    if (history.length === 0) return;
    const updated = history.slice(0, -1);
    const previousStateId = updated.length > 0 ? updated[updated.length - 1].toStateId : (initial?.id || '');
    setHistory(updated);
    setStepIndex(updated.length);
    onSimulateStateChange(previousStateId);
    onStepHistoryChange(updated);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setHistory([]);
    setStepIndex(0);
    const startId = initial?.id || '';
    onSimulateStateChange(startId);
    onStepHistoryChange([]);
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 transition-all duration-200 z-30 select-none">
      {/* Header Bar */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white font-mono">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>EXECUTION SIMULATOR</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Current State Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Current State:</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-cyan-300 border border-slate-700">
              {currentState?.name || currentStateId}
            </span>
          </div>

          {/* Status Badge */}
          {isDeadlock && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>DEADLOCK ENCOUNTERED (TRAPPED)</span>
            </span>
          )}

          {isTerminalSuccess && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>TERMINAL ACCEPT REACHED</span>
            </span>
          )}

          {isTerminalFailure && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <XCircle className="w-3.5 h-3.5" />
              <span>TERMINAL REJECT REACHED</span>
            </span>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mr-2">
            <span>Speed:</span>
            <button
              onClick={() => setSpeed(1600)}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                speed === 1600 ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'
              }`}
            >
              0.5x
            </button>
            <button
              onClick={() => setSpeed(1000)}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                speed === 1000 ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => setSpeed(450)}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                speed === 450 ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'
              }`}
            >
              2x
            </button>
          </div>

          <button
            onClick={handleStepBack}
            disabled={history.length === 0}
            title="Step Backward"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded-lg transition cursor-pointer"
          >
            <StepBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isTerminal || isDeadlock}
            title={isPlaying ? 'Pause Auto-Simulation' : 'Play Auto-Simulation'}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Auto-Step</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            title="Reset Simulation to Initial State (q₀)"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Dock' : 'Expand Dock'}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer ml-1"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Area: Next Available Events & Timeline */}
      {isExpanded && (
        <div className="p-3 grid grid-cols-12 gap-3 h-32 overflow-hidden">
          {/* Available Next Events (Left column) */}
          <div className="col-span-5 border-r border-slate-800/80 pr-3 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Trigger Available Transitions from ({currentState?.name}):
              </div>

              {availableTransitions.length === 0 ? (
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 text-center">
                  {isTerminal ? (
                    <span className="text-emerald-400 font-medium">Process finished formally at terminal node.</span>
                  ) : (
                    <span className="text-rose-400 font-bold">
                      DEADLOCK: No outgoing transitions defined for this state!
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableTransitions.map((t) => {
                    const toState = workflow.states.find((s) => s.id === t.to);
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleFireTransition(t)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg border border-slate-700/80 hover:border-indigo-400 transition cursor-pointer text-xs font-mono group"
                      >
                        <span className="font-bold text-cyan-300 group-hover:text-white">
                          {t.event}
                        </span>
                        <span className="text-slate-400 text-[10px]">→ {toState?.name}</span>
                        {t.guard && (
                          <span className="text-[9px] text-amber-400 bg-slate-900 px-1 rounded">
                            {t.guard}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-400 font-mono mt-1">
              Click any event above to advance state along that path.
            </div>
          </div>

          {/* Execution Trace Timeline (Right column) */}
          <div className="col-span-7 pl-1 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <div className="flex items-center gap-1">
                <History className="w-3 h-3 text-slate-400" />
                <span>Execution Trace Log ({history.length} steps)</span>
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleReset}
                  className="text-[10px] text-indigo-400 hover:underline cursor-pointer lowercase"
                >
                  clear trace
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px] pr-1">
              {history.length === 0 ? (
                <div className="p-3 text-slate-400 text-center italic">
                  No execution steps recorded yet. Fire an event to begin.
                </div>
              ) : (
                history.map((step) => {
                  const fromS = workflow.states.find((s) => s.id === step.fromStateId);
                  const toS = workflow.states.find((s) => s.id === step.toStateId);
                  return (
                    <div
                      key={step.stepNumber}
                      className="px-2 py-1 bg-slate-950/70 rounded border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-400 font-bold">#{step.stepNumber}</span>
                        <span className="text-slate-300">{fromS?.name || step.fromStateId}</span>
                        <span className="text-indigo-400 font-bold">
                          —({step.event})→
                        </span>
                        <span className="text-cyan-300 font-semibold">{toS?.name || step.toStateId}</span>
                        {step.guardEvaluated && (
                          <span className="text-amber-400 text-[9px] bg-slate-900 px-1 rounded">
                            {step.guardEvaluated}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[9px] shrink-0">
                        {step.timestamp}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
