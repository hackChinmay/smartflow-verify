import React, { useState } from 'react';
import { FSMWorkflow, FSMInvariant, InvariantType } from '../types/fsm';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  FileCheck2,
  Code2,
  HelpCircle,
} from 'lucide-react';

interface InvariantManagerProps {
  workflow: FSMWorkflow;
  onUpdateWorkflow: (updated: FSMWorkflow) => void;
  onSelectState: (id: string) => void;
}

export const InvariantManager: React.FC<InvariantManagerProps> = ({
  workflow,
  onUpdateWorkflow,
  onSelectState,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<InvariantType>('precedence');
  const [description, setDescription] = useState('');
  const [formula, setFormula] = useState('');

  const invariants = workflow.invariants || [];

  const handleAddInvariant = () => {
    if (!name.trim()) return;
    const newInv: FSMInvariant = {
      id: `inv_${Date.now().toString(36)}`,
      name: name.trim(),
      type,
      description: description.trim() || `Enforce ${name}`,
      formula: formula.trim() || `AG (${name})`,
      passed: true,
    };

    onUpdateWorkflow({
      ...workflow,
      invariants: [...invariants, newInv],
    });

    setName('');
    setDescription('');
    setFormula('');
    setShowAddModal(false);
  };

  const handleDeleteInvariant = (id: string) => {
    onUpdateWorkflow({
      ...workflow,
      invariants: invariants.filter((i) => i.id !== id),
    });
  };

  return (
    <div className="flex-1 h-full bg-[#0a0d14] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Business Invariants & Temporal Logic Rules (LTL / CTL)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Formally verify safety constraints, regulatory separation of duties (SoD), and process invariants across all execution branches.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Invariant Rule</span>
        </button>
      </div>

      {/* Invariants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {invariants.map((inv) => {
          const isPassed = inv.passed !== false;

          return (
            <div
              key={inv.id}
              className={`p-4 rounded-xl border backdrop-blur transition-all ${
                isPassed
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-rose-950/20 border-rose-900/60 shadow-lg shadow-rose-950/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isPassed ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {inv.name}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Type: {inv.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isPassed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isPassed ? 'PASSED' : 'VIOLATED'}
                  </span>

                  <button
                    onClick={() => handleDeleteInvariant(inv.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    title="Delete Invariant"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                {inv.description}
              </p>

              {/* Mathematical Formula */}
              <div className="mt-3 p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-1.5 text-indigo-300">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{inv.formula}</span>
                </div>
                <span className="text-[10px] text-slate-400">Formal Logic</span>
              </div>

              {inv.violationDetails && (
                <div className="mt-2 text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900/60 font-mono">
                  {inv.violationDetails}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Invariant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Formal Invariant Rule</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mandatory KYC Before Disbursal"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rule Category
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="precedence">Precedence: State B requires prior completion of State A</option>
                  <option value="sod">Separation of Duties (SoD): Distinct roles required</option>
                  <option value="liveness">Liveness: Every path must reach terminal state</option>
                  <option value="safety">Safety: Bad state is never reachable</option>
                  <option value="sla">SLA Constraint: Cumulative dwell time limit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this invariant is required for enterprise compliance or business safety."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Temporal Logic Formula (LTL / CTL)
                </label>
                <input
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="e.g. AG (Disbursed -> AF KYC_Completed)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddInvariant}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
