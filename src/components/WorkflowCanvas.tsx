import React, { useState, useRef, useEffect } from 'react';
import {
  FSMWorkflow,
  FSMState,
  FSMTransition,
  VerificationResult,
} from '../types/fsm';
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ArrowRight,
  GitCommit,
  Sparkles,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';

interface WorkflowCanvasProps {
  workflow: FSMWorkflow;
  onUpdateWorkflow: (updated: FSMWorkflow) => void;
  selectedStateId: string | null;
  onSelectState: (stateId: string | null) => void;
  selectedTransitionId: string | null;
  onSelectTransition: (transitionId: string | null) => void;
  verificationResult: VerificationResult;
  simulatingStateId: string | null;
  onOpenStateEditor?: (state: FSMState) => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  onUpdateWorkflow,
  selectedStateId,
  onSelectState,
  selectedTransitionId,
  onSelectTransition,
  verificationResult,
  simulatingStateId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Transition Drawing state
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [connectMousePos, setConnectMousePos] = useState<{ x: number; y: number } | null>(null);

  // New State Modal / Inline quick add
  const [showAddStateModal, setShowAddStateModal] = useState(false);
  const [newStateName, setNewStateName] = useState('');
  const [newStateType, setNewStateType] = useState<FSMState['type']>('intermediate');
  const [newStateRole, setNewStateRole] = useState('System');

  // Issues lookup
  const deadlockStateIds = new Set(
    verificationResult.issues
      .filter((i) => i.type === 'deadlock')
      .flatMap((i) => i.affectedStateIds)
  );

  const unreachableStateIds = new Set(
    verificationResult.issues
      .filter((i) => i.type === 'unreachable')
      .flatMap((i) => i.affectedStateIds)
  );

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 2.5);
    setZoom(newZoom);
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectState(null);
      onSelectTransition(null);
      setConnectingFromId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingNodeId) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const mouseCanvasX = (e.clientX - containerRect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - containerRect.top - pan.y) / zoom;

      const newX = Math.round(mouseCanvasX - dragOffset.x);
      const newY = Math.round(mouseCanvasY - dragOffset.y);

      onUpdateWorkflow({
        ...workflow,
        states: workflow.states.map((s) =>
          s.id === draggingNodeId ? { ...s, x: Math.max(10, newX), y: Math.max(10, newY) } : s
        ),
      });
    } else if (connectingFromId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setConnectMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node drag start
  const handleNodeMouseDown = (e: React.MouseEvent, state: FSMState) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    if (connectingFromId) {
      // Complete connection
      if (connectingFromId !== state.id) {
        const newTrans: FSMTransition = {
          id: `t_${connectingFromId}_${state.id}_${Date.now().toString(36)}`,
          from: connectingFromId,
          to: state.id,
          event: `transition_to_${state.id.replace(/^s\d*_?/, '')}`,
          guard: '[isValid == true]',
          slaHours: 12,
        };
        onUpdateWorkflow({
          ...workflow,
          transitions: [...workflow.transitions, newTrans],
        });
        onSelectTransition(newTrans.id);
      }
      setConnectingFromId(null);
      setConnectMousePos(null);
      return;
    }

    onSelectState(state.id);
    onSelectTransition(null);

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const mouseCanvasX = (e.clientX - containerRect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - containerRect.top - pan.y) / zoom;

    setDraggingNodeId(state.id);
    setDragOffset({
      x: mouseCanvasX - state.x,
      y: mouseCanvasY - state.y,
    });
  };

  // Fit all nodes into view
  const handleFitView = () => {
    if (workflow.states.length === 0 || !containerRef.current) return;
    const xs = workflow.states.map((s) => s.x);
    const ys = workflow.states.map((s) => s.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + 240;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + 140;

    const rect = containerRef.current.getBoundingClientRect();
    const contentW = maxX - minX || 800;
    const contentH = maxY - minY || 500;

    const scaleX = (rect.width - 120) / contentW;
    const scaleY = (rect.height - 120) / contentH;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.3);

    setZoom(newZoom);
    setPan({
      x: 60 - minX * newZoom,
      y: 60 - minY * newZoom,
    });
  };

  // Add state logic
  const handleCreateState = () => {
    if (!newStateName.trim()) return;
    const cleanId = `s_${Date.now().toString(36)}`;
    const newState: FSMState = {
      id: cleanId,
      name: newStateName.trim(),
      type: newStateType,
      role: newStateRole || 'System',
      slaHours: newStateType.includes('terminal') ? 0 : 24,
      description: `State: ${newStateName}`,
      x: Math.round((-pan.x + 300) / zoom),
      y: Math.round((-pan.y + 200) / zoom),
    };

    onUpdateWorkflow({
      ...workflow,
      states: [...workflow.states, newState],
    });

    onSelectState(newState.id);
    setNewStateName('');
    setShowAddStateModal(false);
  };

  // Calculate Bezier curves between states
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;

  const getConnectorPoints = (from: FSMState, to: FSMState) => {
    // Centers
    const fromCenter = { x: from.x + NODE_WIDTH / 2, y: from.y + NODE_HEIGHT / 2 };
    const toCenter = { x: to.x + NODE_WIDTH / 2, y: to.y + NODE_HEIGHT / 2 };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    let startX = from.x + NODE_WIDTH;
    let startY = fromCenter.y;
    let endX = to.x;
    let endY = toCenter.y;

    // Backward transition (target is to the left)
    if (dx < -40) {
      startX = from.x;
      endX = to.x + NODE_WIDTH;
    } else if (Math.abs(dx) <= 40) {
      if (dy > 0) {
        startY = from.y + NODE_HEIGHT;
        endY = to.y;
        startX = fromCenter.x;
        endX = toCenter.x;
      } else {
        startY = from.y;
        endY = to.y + NODE_HEIGHT;
        startX = fromCenter.x;
        endX = toCenter.x;
      }
    }

    return { startX, startY, endX, endY, dx, dy };
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full bg-[#0a0d14] overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: `radial-gradient(circle, #1e293b 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* SVG Canvas for Bezier Transitions */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          {/* Arrowhead marker default */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#64748B" />
          </marker>
          {/* Arrowhead marker selected */}
          <marker
            id="arrow-selected"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#818CF8" />
          </marker>
          {/* Arrowhead marker active simulation */}
          <marker
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#22D3EE" />
          </marker>
        </defs>

        {/* Render transitions */}
        {workflow.transitions.map((t) => {
          const fromState = workflow.states.find((s) => s.id === t.from);
          const toState = workflow.states.find((s) => s.id === t.to);

          if (!fromState || !toState) return null;

          const isSelected = selectedTransitionId === t.id;
          const isSimulatingFrom = simulatingStateId === t.from;

          // Self loop
          if (t.from === t.to) {
            const loopX = fromState.x + NODE_WIDTH / 2;
            const loopY = fromState.y;
            const pathData = `M ${loopX - 25} ${loopY} C ${loopX - 40} ${loopY - 60}, ${loopX + 40} ${loopY - 60}, ${loopX + 25} ${loopY}`;

            return (
              <g key={t.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectTransition(t.id); }}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#818CF8' : '#64748B'}
                  strokeWidth={isSelected ? 3 : 1.8}
                  markerEnd={isSelected ? 'url(#arrow-selected)' : 'url(#arrow)'}
                />
                <text
                  x={loopX}
                  y={loopY - 45}
                  textAnchor="middle"
                  fill={isSelected ? '#C7D2FE' : '#94A3B8'}
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  className="font-medium"
                >
                  {t.event}
                </text>
              </g>
            );
          }

          const { startX, startY, endX, endY, dx, dy } = getConnectorPoints(fromState, toState);

          // Control points for cubic bezier
          const distance = Math.hypot(dx, dy);
          const curvature = Math.min(distance * 0.4, 140);

          let cp1X = startX + (dx >= 0 ? curvature : -curvature);
          let cp1Y = startY;
          let cp2X = endX - (dx >= 0 ? curvature : -curvature);
          let cp2Y = endY;

          // If backwards edge (e.g. loops back), route vertically
          if (dx < -60) {
            const vOffset = dy >= 0 ? -70 : 70;
            cp1X = startX;
            cp1Y = startY + vOffset;
            cp2X = endX;
            cp2Y = endY + vOffset;
          }

          const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;

          return (
            <g
              key={t.id}
              className="pointer-events-auto cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTransition(t.id);
                onSelectState(null);
              }}
            >
              {/* Invisible thicker stroke for easy clicking */}
              <path
                d={pathData}
                fill="none"
                stroke="transparent"
                strokeWidth={18}
              />

              {/* Visible edge line */}
              <path
                d={pathData}
                fill="none"
                stroke={isSelected ? '#818CF8' : isSimulatingFrom ? '#38BDF8' : '#475569'}
                strokeWidth={isSelected ? 3 : 1.8}
                strokeDasharray={t.guard?.includes('timeout') ? '4 3' : undefined}
                markerEnd={
                  isSelected
                    ? 'url(#arrow-selected)'
                    : isSimulatingFrom
                    ? 'url(#arrow-active)'
                    : 'url(#arrow)'
                }
                className="transition-colors group-hover:stroke-indigo-400"
              />

              {/* Edge label badge */}
              <foreignObject
                x={midX - 70}
                y={midY - 14}
                width={140}
                height={28}
                className="overflow-visible"
              >
                <div className="flex items-center justify-center">
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border backdrop-blur shadow-sm truncate max-w-[130px] transition ${
                      isSelected
                        ? 'bg-indigo-900/90 text-indigo-200 border-indigo-400'
                        : 'bg-slate-900/85 text-slate-300 border-slate-700/80 group-hover:border-indigo-500 group-hover:text-white'
                    }`}
                    title={`${t.event} ${t.guard || ''}`}
                  >
                    <span className="font-semibold">{t.event}</span>
                    {t.guard && (
                      <span className="text-amber-400 ml-1 font-mono text-[9px]">{t.guard}</span>
                    )}
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Live connecting transition line while user drags handle */}
        {connectingFromId && connectMousePos && (
          <line
            x1={
              (workflow.states.find((s) => s.id === connectingFromId)?.x || 0) +
              NODE_WIDTH
            }
            y1={
              (workflow.states.find((s) => s.id === connectingFromId)?.y || 0) +
              NODE_HEIGHT / 2
            }
            x2={connectMousePos.x}
            y2={connectMousePos.y}
            stroke="#818CF8"
            strokeWidth={2}
            strokeDasharray="4 4"
            markerEnd="url(#arrow-selected)"
          />
        )}
      </svg>

      {/* HTML Layer for Interactive State Cards */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {workflow.states.map((state) => {
          const isSelected = selectedStateId === state.id;
          const isDeadlock = deadlockStateIds.has(state.id);
          const isUnreachable = unreachableStateIds.has(state.id);
          const isSimulatingActive = simulatingStateId === state.id;

          // Type styling badges
          let typeColor = 'border-slate-700 bg-slate-900/90';
          let headerBadge = 'bg-slate-800 text-slate-300';
          let typeLabel = 'Intermediate';

          if (state.type === 'initial') {
            typeColor = 'border-emerald-500/80 shadow-emerald-500/10';
            headerBadge = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
            typeLabel = 'q₀ Initial';
          } else if (state.type === 'review') {
            typeColor = 'border-amber-500/70 shadow-amber-500/10';
            headerBadge = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
            typeLabel = 'Human Review';
          } else if (state.type === 'gateway') {
            typeColor = 'border-purple-500/70 shadow-purple-500/10';
            headerBadge = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
            typeLabel = 'Decision Gateway';
          } else if (state.type === 'terminal_success') {
            typeColor = 'border-emerald-400 ring-2 ring-emerald-500/30 shadow-emerald-500/20';
            headerBadge = 'bg-emerald-500 text-slate-950 font-bold';
            typeLabel = 'Accept Final (F)';
          } else if (state.type === 'terminal_failure') {
            typeColor = 'border-rose-500/80 ring-2 ring-rose-500/20 shadow-rose-500/20';
            headerBadge = 'bg-rose-500 text-white font-bold';
            typeLabel = 'Reject Final (F)';
          }

          return (
            <div
              key={state.id}
              onMouseDown={(e) => handleNodeMouseDown(e, state)}
              style={{
                left: state.x,
                top: state.y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
              }}
              className={`absolute pointer-events-auto rounded-xl border backdrop-blur-md bg-slate-900/95 shadow-xl transition-all duration-150 cursor-grab active:cursor-grabbing flex flex-col justify-between p-2.5 ${typeColor} ${
                isSelected
                  ? 'ring-2 ring-indigo-400 border-indigo-400 scale-[1.02] shadow-indigo-500/25 z-20'
                  : 'hover:border-slate-500 hover:shadow-2xl'
              } ${
                isDeadlock
                  ? 'ring-4 ring-rose-500/80 animate-pulse border-rose-500 shadow-rose-600/30'
                  : ''
              } ${
                isUnreachable
                  ? 'border-dashed border-amber-400/90 shadow-amber-500/10'
                  : ''
              }`}
            >
              {/* Active Token Simulator Orb */}
              {isSimulatingActive && (
                <div className="absolute -top-3 -right-3 z-30 flex items-center justify-center">
                  <span className="relative flex h-6 w-6">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-6 w-6 bg-cyan-500 items-center justify-center shadow-lg shadow-cyan-400/50">
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    </span>
                  </span>
                </div>
              )}

              {/* Card Header: Type Badge & ID */}
              <div className="flex items-center justify-between gap-1 border-b border-slate-800/80 pb-1.5">
                <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${headerBadge}`}>
                  {typeLabel}
                </span>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-slate-400">{state.id}</span>
                  {/* Connect handle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingFromId(connectingFromId === state.id ? null : state.id);
                    }}
                    title="Drag transition to another state"
                    className={`p-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                      connectingFromId === state.id ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card Body: State Title */}
              <div className="my-1">
                <h3 className="text-xs font-bold text-white tracking-tight leading-tight line-clamp-1">
                  {state.name}
                </h3>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{state.role}</span>
                </div>
              </div>

              {/* Card Footer: SLA & Diagnostics Warning */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{state.slaHours > 0 ? `${state.slaHours}h SLA` : 'Immediate'}</span>
                </div>

                {isDeadlock ? (
                  <span className="flex items-center gap-1 text-rose-400 font-bold animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    DEADLOCK
                  </span>
                ) : isUnreachable ? (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    UNREACHABLE
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {workflow.transitions.filter((t) => t.from === state.id).length} out
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Canvas Controls Toolbar */}
      <div className="absolute bottom-6 left-6 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl z-30 select-none">
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.2, 2.5))}
          title="Zoom In"
          className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.4))}
          title="Zoom Out"
          className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleFitView}
          title="Fit All States into View"
          className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        <button
          onClick={() => setShowAddStateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add State</span>
        </button>

        {connectingFromId && (
          <div className="flex items-center gap-2 pl-2 text-xs text-indigo-300 bg-indigo-950/60 py-1 px-2 rounded-lg border border-indigo-500/30">
            <span>Click destination node to connect</span>
            <button
              onClick={() => setConnectingFromId(null)}
              className="text-slate-400 hover:text-white font-bold ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Mini Legend */}
      <div className="absolute top-4 left-4 p-2.5 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 rounded-xl text-[11px] text-slate-400 flex flex-col gap-1 z-20 pointer-events-none shadow-lg">
        <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider mb-0.5">
          FSM Visual Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Initial State (q₀)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span>Human Review / Task</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rotate-45 bg-purple-500" />
          <span>Gateway / Branch</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 bg-emerald-500/20" />
          <span>Terminal Final (F)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-rose-400 font-semibold">Deadlock State</span>
        </div>
      </div>

      {/* Quick Add State Modal */}
      {showAddStateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add New FSM State</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">State Name</label>
                <input
                  type="text"
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                  placeholder="e.g. Risk Underwrite Review"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">State Type</label>
                <select
                  value={newStateType}
                  onChange={(e) => setNewStateType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="intermediate">Intermediate (Automated Task)</option>
                  <option value="review">Review (Human Specialist)</option>
                  <option value="gateway">Gateway (Decision Branch)</option>
                  <option value="terminal_success">Terminal Success (Accept State)</option>
                  <option value="terminal_failure">Terminal Failure (Reject State)</option>
                  <option value="initial">Initial State (Start)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role</label>
                <input
                  type="text"
                  value={newStateRole}
                  onChange={(e) => setNewStateRole(e.target.value)}
                  placeholder="e.g. Compliance Officer"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddStateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateState}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                Create State
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
