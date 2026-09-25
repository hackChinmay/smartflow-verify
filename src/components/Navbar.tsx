import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  Sparkles,
  Download,
  RotateCcw,
  Network,
  CheckCircle2,
  Table,
  Cpu,
  FileCheck2,
  Wand2,
  Plus,
  ChevronDown,
  Cloud,
  User as UserIcon,
} from 'lucide-react';
import { FSMWorkflow, VerificationResult } from '../types/fsm';
import { WORKFLOW_TEMPLATES } from '../data/workflowTemplates';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentWorkflow: FSMWorkflow;
  onSelectWorkflow: (wf: FSMWorkflow) => void;
  onNewWorkflow: () => void;
  verificationResult: VerificationResult;
  onRunVerification: () => void;
  onOpenAiModal: () => void;
  onOpenExportModal: () => void;
  onAutoRepair: () => void;
  onAutoLayout: () => void;
  activeTab: 'canvas' | 'verification' | 'matrix' | 'simulator' | 'invariants';
  setActiveTab: (tab: 'canvas' | 'verification' | 'matrix' | 'simulator' | 'invariants') => void;
  onOpenCloudModal: () => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentWorkflow,
  onSelectWorkflow,
  onNewWorkflow,
  verificationResult,
  onRunVerification,
  onOpenAiModal,
  onOpenExportModal,
  onAutoRepair,
  onAutoLayout,
  activeTab,
  setActiveTab,
  onOpenCloudModal,
  onOpenAuthModal,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasErrors = verificationResult.issues.some((i) => i.severity === 'error');
  const hasWarnings = verificationResult.issues.some((i) => i.severity === 'warning');
  const deadlocks = verificationResult.issues.filter((i) => i.type === 'deadlock');

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Workflow Dropdown */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Network className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight font-sans">
                SmartFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Verify</span>
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded">
                FSM Verifier
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">
              Finite State Machine Formal Verification
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800" />

        {/* Workflow Preset Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition cursor-pointer group"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform" />
            <span className="max-w-[200px] truncate font-medium text-slate-100">
              {currentWorkflow.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform group-hover:text-slate-200" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                Preset Enterprise Workflows
              </div>
              {WORKFLOW_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    onSelectWorkflow(tmpl);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-600/15 transition flex flex-col gap-0.5 cursor-pointer ${
                    tmpl.id === currentWorkflow.id
                      ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500'
                      : 'text-slate-300'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>{tmpl.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {tmpl.states.length} states
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 line-clamp-1">
                    {tmpl.description}
                  </span>
                </button>
              ))}

              <div className="mt-1 pt-1 border-t border-slate-800 px-2">
                <button
                  onClick={() => {
                    onNewWorkflow();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-600/20 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Blank FSM Workflow</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center View Tabs */}
      <div className="flex items-center bg-slate-950/80 p-1 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab('canvas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'canvas'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>FSM Graph</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition relative cursor-pointer ${
            activeTab === 'verification'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Verification Audit</span>
          {hasErrors && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>State Matrix (δ)</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'simulator'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Token Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('invariants')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'invariants'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Invariants & Rules</span>
        </button>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2.5">
        {/* Verification Status Pill */}
        <button
          onClick={() => setActiveTab('verification')}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium border cursor-pointer transition ${
            deadlocks.length > 0
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
              : hasErrors
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
              : hasWarnings
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
          }`}
        >
          {deadlocks.length > 0 ? (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{deadlocks.length} DEADLOCK DETECTED</span>
            </>
          ) : hasErrors ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Formal Errors</span>
            </>
          ) : hasWarnings ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Warnings Flagged</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Formally Verified</span>
            </>
          )}
        </button>

        {/* Quick Auto-Repair button if issues exist */}
        {(hasErrors || hasWarnings) && (
          <button
            onClick={onAutoRepair}
            title="Auto-repair deadlocks and unreachables with formal fallback transitions"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Auto-Repair</span>
          </button>
        )}

        {/* Run Verification Button */}
        <button
          onClick={onRunVerification}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Verify FSM</span>
        </button>

        {/* AI Copilot & Optimizer */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-medium transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Copilot</span>
        </button>

        {/* Export Report / Model */}
        <button
          onClick={onOpenExportModal}
          title="Export Model as SCXML, JSON, DOT or Audit Report"
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Cloud Workflows */}
        <button
          onClick={onOpenCloudModal}
          title="Saved Cloud Workflows"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-cyan-500/30 rounded-lg text-xs font-medium transition cursor-pointer"
        >
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cloud Library</span>
        </button>

        {/* User Profile / Auth */}
        <UserNavButton onOpenAuthModal={onOpenAuthModal} />
      </div>
    </header>
  );
};

const UserNavButton: React.FC<{ onOpenAuthModal: () => void }> = ({ onOpenAuthModal }) => {
  const { user } = useAuth();
  return (
    <button
      onClick={onOpenAuthModal}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
        user
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <UserIcon className="w-3.5 h-3.5" />
      <span className="max-w-[100px] truncate">
        {user ? user.email?.split('@')[0] || 'Account' : 'Sign In'}
      </span>
    </button>
  );
};
