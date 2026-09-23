import React, { useState } from 'react';
import { FSMWorkflow, VerificationResult } from '../types/fsm';
import {
  Sparkles,
  Wand2,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Check,
  Loader2,
  X,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { autoLayoutFSM } from '../utils/fsmLayout';

interface AiOptimizerModalProps {
  workflow: FSMWorkflow;
  verificationResult: VerificationResult;
  onApplyWorkflow: (wf: FSMWorkflow) => void;
  onClose: () => void;
}

export const AiOptimizerModal: React.FC<AiOptimizerModalProps> = ({
  workflow,
  verificationResult,
  onApplyWorkflow,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'generate'>('audit');

  // Audit state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  // Generate state
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick prompt presets
  const samplePrompts = [
    'Create an Employee Travel Expense Reimbursement flow with receipt OCR, manager approval for >$500, finance audit, and direct deposit.',
    'Build a High-Value Wire Transfer workflow with sanctions screening, dual officer authorization over $100k, and SWIFT dispatch.',
    'Design a Healthcare Prior Authorization pipeline with clinical criteria check, doctor peer review, and expedited appeal branch.',
  ];

  const handleRunAiAudit = async () => {
    setIsAuditing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow,
          formalResults: verificationResult,
        }),
      });
      const data = await res.json();
      setAuditResult(data);
    } catch (err: any) {
      setErrorMsg('Failed to run AI verification: ' + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleGenerateWorkflow = async (customPrompt?: string) => {
    const textToUse = customPrompt || prompt;
    if (!textToUse.trim()) return;

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToUse }),
      });
      const data = await res.json();
      if (data && data.states && data.transitions) {
        // Layout newly generated workflow cleanly
        const laidOut = autoLayoutFSM({
          ...data,
          id: `wf_${Date.now().toString(36)}`,
          version: '1.0.0',
        });
        onApplyWorkflow(laidOut);
        onClose();
      } else {
        setErrorMsg('Invalid FSM model received from generator.');
      }
    } catch (err: any) {
      setErrorMsg('Generation failed: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAiSuggestion = (suggestion: any) => {
    if (suggestion.action === 'add_transition' && suggestion.suggestedTransition) {
      const newTrans = {
        id: `t_ai_${Date.now().toString(36)}`,
        ...suggestion.suggestedTransition,
      };
      onApplyWorkflow({
        ...workflow,
        transitions: [...workflow.transitions, newTrans],
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                AI FSM Workflow Copilot & Optimizer
              </h3>
              <p className="text-[11px] text-slate-400">
                Powered by Gemini 2.5 Flash formal analysis engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Deep Business & Compliance Audit
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'generate'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Natural Language → FSM Generator
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-900/80 rounded-xl text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              {!auditResult ? (
                <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-3">
                  <Cpu className="w-10 h-10 text-indigo-400 mx-auto animate-pulse" />
                  <h4 className="text-sm font-bold text-white">
                    Formal Semantic Risk & Compliance Analysis
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    The AI analyzer inspects state guards, role assignments (Maker-Checker SoD), regulatory requirements (KYC, AML, SOX), and SLA bottleneck traps.
                  </p>
                  <button
                    onClick={handleRunAiAudit}
                    disabled={isAuditing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                  >
                    {isAuditing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing Workflow State Machine...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Start AI Formal Audit</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary card */}
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Executive Analysis
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          auditResult.riskRating === 'CRITICAL' || auditResult.riskRating === 'HIGH'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        RISK: {auditResult.riskRating}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {auditResult.summary}
                    </p>
                  </div>

                  {/* Compliance & Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Compliance & Policy Findings</span>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                        {(auditResult.complianceObservations || []).map((obs: string, i: number) => (
                          <li key={i}>{obs}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                        <Lightbulb className="w-4 h-4" />
                        <span>Optimization Recommendations</span>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                        {(auditResult.optimizations || []).map((opt: string, i: number) => (
                          <li key={i}>{opt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Auto Fix Suggestions */}
                  {auditResult.autoFixSuggestions?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        AI Recommended State Machine Patches:
                      </h4>
                      {auditResult.autoFixSuggestions.map((sug: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 bg-indigo-950/30 border border-indigo-800/60 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{sug.title}</div>
                            <div className="text-[11px] text-slate-300">{sug.description}</div>
                          </div>
                          <button
                            onClick={() => handleApplyAiSuggestion(sug)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition shrink-0 cursor-pointer"
                          >
                            Apply Patch
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <button
                      onClick={handleRunAiAudit}
                      disabled={isAuditing}
                      className="text-xs text-indigo-400 hover:underline cursor-pointer"
                    >
                      Re-run AI Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Describe Your Business Workflow in Natural Language:
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Create a Procurement Requisition workflow that routes requests under $1,000 for auto-approval, requests between $1,000 and $10,000 to Department Manager, and requests over $10,000 to CFO and Compliance before PO dispatch."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Sample Prompts */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Or pick a pre-tested business template prompt:
                </span>
                <div className="space-y-1.5">
                  {samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(p);
                        handleGenerateWorkflow(p);
                      }}
                      className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 rounded-lg text-xs text-slate-300 hover:text-white transition flex items-center justify-between group cursor-pointer"
                    >
                      <span className="line-clamp-1">{p}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleGenerateWorkflow()}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Finite State Machine...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Generate & Load Verified FSM</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
