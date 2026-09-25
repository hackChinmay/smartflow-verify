import React, { useState, useMemo, useCallback } from 'react';
import { FSMWorkflow, SimulationStep } from './types/fsm';
import { WORKFLOW_TEMPLATES } from './data/workflowTemplates';
import { FSMVerifierEngine } from './services/fsmVerifier';
import { autoLayoutFSM } from './utils/fsmLayout';
import { Navbar } from './components/Navbar';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { VerificationPanel } from './components/VerificationPanel';
import { SimulationDock } from './components/SimulationDock';
import { StateMatrixView } from './components/StateMatrixView';
import { InvariantManager } from './components/InvariantManager';
import { AiOptimizerModal } from './components/AiOptimizerModal';
import { ExportReportModal } from './components/ExportReportModal';
import { AuthModal } from './components/AuthModal';
import { CloudWorkflowsModal } from './components/CloudWorkflowsModal';
import { VerificationAuditView } from './components/VerificationAuditView';
import { TokenSimulatorView } from './components/TokenSimulatorView';
import { AuthProvider } from './contexts/AuthContext';

function MainApp() {
  // Current active workflow
  const [workflow, setWorkflow] = useState<FSMWorkflow>(WORKFLOW_TEMPLATES[0]);

  // Selection states
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);

  // Active top view tab
  const [activeTab, setActiveTab] = useState<'canvas' | 'verification' | 'matrix' | 'simulator' | 'invariants'>('canvas');

  // Simulation state
  const [simulatingStateId, setSimulatingStateId] = useState<string | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationStep[]>([]);
  const [externalCounterExample, setExternalCounterExample] = useState<{ path: string[]; events?: string[] } | null>(null);

  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Formal verification run automatically whenever workflow changes
  const verificationResult = useMemo(() => {
    return FSMVerifierEngine.verify(workflow);
  }, [workflow]);

  // Switch workflow preset
  const handleSelectWorkflow = useCallback((tmpl: FSMWorkflow) => {
    setWorkflow(tmpl);
    setSelectedStateId(null);
    setSelectedTransitionId(null);
    const startState = tmpl.states.find((s) => s.type === 'initial') || tmpl.states[0];
    setSimulatingStateId(startState?.id || null);
    setSimulationHistory([]);
    setExternalCounterExample(null);
  }, []);

  // Create new blank workflow
  const handleNewWorkflow = useCallback(() => {
    const blank: FSMWorkflow = {
      id: `wf_${Date.now().toString(36)}`,
      name: 'New Custom Workflow',
      description: 'Custom business workflow modeled with Finite State Machines.',
      domain: 'Custom',
      version: '1.0.0',
      states: [
        {
          id: 's0_init',
          name: 'Process Initiated',
          type: 'initial',
          role: 'Requester',
          slaHours: 2,
          description: 'Initial intake trigger.',
          x: 100,
          y: 220,
        },
        {
          id: 's1_review',
          name: 'Manager Review',
          type: 'review',
          role: 'Manager',
          slaHours: 24,
          description: 'Approval review step.',
          x: 400,
          y: 220,
        },
        {
          id: 's2_approved',
          name: 'Completed & Approved',
          type: 'terminal_success',
          role: 'System',
          slaHours: 0,
          description: 'Successfully resolved.',
          x: 720,
          y: 150,
        },
        {
          id: 's3_rejected',
          name: 'Declined / Cancelled',
          type: 'terminal_failure',
          role: 'System',
          slaHours: 0,
          description: 'Process terminated.',
          x: 720,
          y: 330,
        },
      ],
      transitions: [
        {
          id: 't1',
          from: 's0_init',
          to: 's1_review',
          event: 'submit_for_review',
          guard: '[isValid == true]',
        },
        {
          id: 't2',
          from: 's1_review',
          to: 's2_approved',
          event: 'manager_approve',
          guard: '[approved == true]',
        },
        {
          id: 't3',
          from: 's1_review',
          to: 's3_rejected',
          event: 'manager_decline',
          guard: '[approved == false]',
        },
      ],
      invariants: [
        {
          id: 'inv_blank_liveness',
          name: 'Termination Liveness',
          type: 'liveness',
          description: 'Every path reaches approval or denial.',
          formula: 'AF (s2_approved v s3_rejected)',
        },
      ],
    };

    setWorkflow(blank);
    setSelectedStateId('s0_init');
    setSimulatingStateId('s0_init');
    setSimulationHistory([]);
  }, []);

  // Run verification
  const handleRunVerification = useCallback(() => {
    const res = FSMVerifierEngine.verify(workflow);
    if (!res.isVerified) {
      setActiveTab('verification');
    }
  }, [workflow]);

  // Auto-Repair issues
  const handleAutoRepair = useCallback(() => {
    const repaired = FSMVerifierEngine.autoRepair(workflow);
    setWorkflow(repaired);
  }, [workflow]);

  // Auto-Layout
  const handleAutoLayout = useCallback(() => {
    const laidOut = autoLayoutFSM(workflow);
    setWorkflow(laidOut);
  }, [workflow]);

  // Load counter-example path into simulator
  const handleLoadCounterExample = useCallback((path: string[], events?: string[]) => {
    setExternalCounterExample({ path, events });
    if (path.length > 0) {
      setSimulatingStateId(path[path.length - 1]);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100 font-sans">
      {/* Top Navigation */}
      <Navbar
        currentWorkflow={workflow}
        onSelectWorkflow={handleSelectWorkflow}
        onNewWorkflow={handleNewWorkflow}
        verificationResult={verificationResult}
        onRunVerification={handleRunVerification}
        onOpenAiModal={() => setShowAiModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        onAutoRepair={handleAutoRepair}
        onAutoLayout={handleAutoLayout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCloudModal={() => setShowCloudModal(true)}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left / Center View Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'canvas' ? (
            <div className="flex-1 relative">
              <WorkflowCanvas
                workflow={workflow}
                onUpdateWorkflow={setWorkflow}
                selectedStateId={selectedStateId}
                onSelectState={(id) => {
                  setSelectedStateId(id);
                  if (id) setSelectedTransitionId(null);
                }}
                selectedTransitionId={selectedTransitionId}
                onSelectTransition={(id) => {
                  setSelectedTransitionId(id);
                  if (id) setSelectedStateId(null);
                }}
                verificationResult={verificationResult}
                simulatingStateId={simulatingStateId}
              />
            </div>
          ) : activeTab === 'verification' ? (
            <VerificationAuditView
              workflow={workflow}
              verificationResult={verificationResult}
              onAutoRepair={handleAutoRepair}
              onSelectState={(id) => {
                setSelectedStateId(id);
                setActiveTab('canvas');
              }}
              onLoadCounterExample={handleLoadCounterExample}
              onOpenAiModal={() => setShowAiModal(true)}
            />
          ) : activeTab === 'matrix' ? (
            <StateMatrixView
              workflow={workflow}
              verificationResult={verificationResult}
              onSelectState={(id) => {
                setSelectedStateId(id);
                setActiveTab('canvas');
              }}
              onSelectTransition={(id) => {
                setSelectedTransitionId(id);
                setActiveTab('canvas');
              }}
            />
          ) : activeTab === 'simulator' ? (
            <TokenSimulatorView
              workflow={workflow}
              onUpdateWorkflow={setWorkflow}
              verificationResult={verificationResult}
              simulatingStateId={simulatingStateId}
              onSimulateStateChange={setSimulatingStateId}
              simulationHistory={simulationHistory}
              onStepHistoryChange={setSimulationHistory}
            />
          ) : (
            <InvariantManager
              workflow={workflow}
              onUpdateWorkflow={setWorkflow}
              onSelectState={(id) => {
                setSelectedStateId(id);
                setActiveTab('canvas');
              }}
            />
          )}

          {/* Bottom Simulation Dock (Shown only in Canvas view) */}
          {activeTab === 'canvas' && (
            <SimulationDock
              workflow={workflow}
              simulatingStateId={simulatingStateId}
              onSimulateStateChange={setSimulatingStateId}
              onStepHistoryChange={setSimulationHistory}
              externalCounterExample={externalCounterExample}
              onClearCounterExample={() => setExternalCounterExample(null)}
            />
          )}
        </div>

        {/* Right Verification & Inspector Panel (Shown in Canvas mode) */}
        {activeTab === 'canvas' && (
          <VerificationPanel
            workflow={workflow}
            onUpdateWorkflow={setWorkflow}
            verificationResult={verificationResult}
            selectedStateId={selectedStateId}
            onSelectState={(id) => {
              setSelectedStateId(id);
              if (id) setSelectedTransitionId(null);
            }}
            selectedTransitionId={selectedTransitionId}
            onSelectTransition={(id) => {
              setSelectedTransitionId(id);
              if (id) setSelectedStateId(null);
            }}
            onLoadCounterExample={handleLoadCounterExample}
            onAutoRepair={handleAutoRepair}
          />
        )}
      </div>

      {/* AI Assistant Modal */}
      {showAiModal && (
        <AiOptimizerModal
          workflow={workflow}
          verificationResult={verificationResult}
          onApplyWorkflow={setWorkflow}
          onClose={() => setShowAiModal(false)}
        />
      )}

      {/* Export Report & Model Modal */}
      {showExportModal && (
        <ExportReportModal
          workflow={workflow}
          verificationResult={verificationResult}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Cloud Workflows Library Modal */}
      {showCloudModal && (
        <CloudWorkflowsModal
          isOpen={showCloudModal}
          onClose={() => setShowCloudModal(false)}
          currentWorkflow={workflow}
          onLoadWorkflow={handleSelectWorkflow}
        />
      )}

      {/* Auth Profile Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
