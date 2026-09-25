import React, { useEffect, useState } from 'react';
import { 
  X, 
  Cloud, 
  Save, 
  FolderOpen, 
  Trash2, 
  Plus, 
  Clock, 
  Layers, 
  ArrowRight, 
  Check, 
  AlertCircle,
  Share2,
  Copy
} from 'lucide-react';
import { FSMWorkflow } from '../types/fsm';
import { useAuth } from '../contexts/AuthContext';
import { 
  SavedWorkflowMeta, 
  loadUserWorkflows, 
  saveWorkflowToCloud, 
  loadWorkflowById, 
  deleteWorkflow 
} from '../services/workflowStorage';

interface CloudWorkflowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkflow: FSMWorkflow;
  onLoadWorkflow: (wf: FSMWorkflow) => void;
}

export const CloudWorkflowsModal: React.FC<CloudWorkflowsModalProps> = ({
  isOpen,
  onClose,
  currentWorkflow,
  onLoadWorkflow,
}) => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<SavedWorkflowMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState(currentWorkflow.name);
  const [saveDesc, setSaveDesc] = useState(currentWorkflow.description);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSaveName(currentWorkflow.name);
      setSaveDesc(currentWorkflow.description);
      refreshList();
    }
  }, [isOpen, user]);

  const refreshList = async () => {
    // Show cached immediately
    const cached = loadUserWorkflows(undefined);
    if (workflows.length === 0) {
      cached.then(list => { if (list.length > 0) setWorkflows(list); });
    }
    
    setLoading(workflows.length === 0);
    try {
      const list = await loadUserWorkflows(user?.uid);
      setWorkflows(list);
    } catch (err) {
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrent = async () => {
    setSaving(true);
    const newSnapshotId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const updatedWorkflow: FSMWorkflow = {
      ...currentWorkflow,
      id: newSnapshotId,
      name: saveName.trim() || 'Untitled Workflow',
      description: saveDesc.trim() || 'Custom workflow model',
    };

    // Instant optimistic update on UI
    const optimisticMeta: SavedWorkflowMeta = {
      id: newSnapshotId,
      name: updatedWorkflow.name,
      description: updatedWorkflow.description,
      domain: updatedWorkflow.domain || 'General',
      version: updatedWorkflow.version || '1.0.0',
      stateCount: updatedWorkflow.states.length,
      transitionCount: updatedWorkflow.transitions.length,
      updatedAt: new Date().toISOString(),
      authorEmail: user?.email || undefined
    };

    setWorkflows(prev => [optimisticMeta, ...prev]);
    setSaveSuccess(true);
    setSaving(false);
    setTimeout(() => setSaveSuccess(false), 2500);

    try {
      await saveWorkflowToCloud(updatedWorkflow, user?.uid, user?.email || undefined, true);
    } catch (err) {
      console.error('Failed to save workflow:', err);
    }
  };

  const handleLoad = async (meta: SavedWorkflowMeta) => {
    const full = await loadWorkflowById(meta.id, user?.uid);
    if (full) {
      onLoadWorkflow(full);
      onClose();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved workflow?')) return;
    await deleteWorkflow(id, user?.uid);
    await refreshList();
  };

  const handleCopyJson = (e: React.MouseEvent, meta: SavedWorkflowMeta) => {
    e.stopPropagation();
    loadWorkflowById(meta.id, user?.uid).then((full) => {
      if (full) {
        navigator.clipboard.writeText(JSON.stringify(full, null, 2));
        setCopiedId(meta.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Cloud Workflows & Library
                {user && (
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Cloud Synced
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {user 
                  ? `Saved workflows for ${user.email || user.uid.slice(0, 8)}`
                  : 'Local cache active. Sign in to sync across team members.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Save Current Workflow Bar */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Save className="w-4 h-4 text-indigo-400" />
                <span>Save Active Workflow Snapshot</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {currentWorkflow.states.length} states • {currentWorkflow.transitions.length} transitions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Workflow name..."
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                placeholder="Description or version notes..."
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveCurrent}
                disabled={saving}
                className="py-1.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" /> Saved!
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Save to Workspace
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Saved Workflows List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Saved Workflows ({workflows.length})
              </h4>
              <button
                onClick={refreshList}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Refresh List
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                Loading saved workflows...
              </div>
            ) : workflows.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
                <FolderOpen className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs text-slate-400 font-medium">No saved workflows yet</p>
                <p className="text-[11px] text-slate-500">
                  Save your active state machine above to build your library.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {workflows.map((wf) => (
                  <div
                    key={wf.id}
                    onClick={() => handleLoad(wf)}
                    className="p-4 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all group flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {wf.name}
                        </h5>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
                          v{wf.version}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {wf.description || 'No description provided'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-indigo-400" />
                          {wf.stateCount} states
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {new Date(wf.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleCopyJson(e, wf)}
                          title="Copy JSON representation"
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedId === wf.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, wf.id)}
                          title="Delete workflow"
                          className="p-1 rounded hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
