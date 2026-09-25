import React, { useState } from 'react';
import { FSMWorkflow, VerificationResult } from '../types/fsm';
import {
  Download,
  FileText,
  Code2,
  CheckCircle2,
  ShieldAlert,
  Printer,
  X,
  Copy,
  Check,
  Cpu,
  Workflow as WorkflowIcon,
  Layers,
} from 'lucide-react';
import { exportToDOT, exportToSCXML } from '../utils/fsmLayout';
import { 
  exportToXState, 
  exportToTemporal, 
  exportToStepFunctions, 
  exportToMermaid 
} from '../utils/codeGenerators';

interface ExportReportModalProps {
  workflow: FSMWorkflow;
  verificationResult: VerificationResult;
  onClose: () => void;
}

type ExportType = 'report' | 'xstate' | 'temporal' | 'stepfunctions' | 'mermaid' | 'json' | 'scxml' | 'dot';

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  workflow,
  verificationResult,
  onClose,
}) => {
  const [activeFormat, setActiveFormat] = useState<ExportType>('report');
  const [copied, setCopied] = useState(false);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateAuditReportMarkdown = () => {
    return `# SmartFlow Verify: Formal Workflow Verification Audit Report
Generated: ${new Date().toISOString()}
Target Workflow: ${workflow.name} (v${workflow.version})
Domain: ${workflow.domain}

=======================================================
1. EXECUTIVE VERIFICATION SUMMARY
=======================================================
Verification Status: ${verificationResult.isVerified ? 'VERIFIED (PASS)' : 'FAILED / UNVERIFIED'}
Formal Reliability Score: ${verificationResult.score}/100
Total Detected Defects: ${verificationResult.issues.length}
- Critical Errors: ${verificationResult.issues.filter((i) => i.severity === 'error').length}
- Warnings: ${verificationResult.issues.filter((i) => i.severity === 'warning').length}

Formal Assessment:
${verificationResult.summary}

=======================================================
2. MATHEMATICAL FSM TUPLE SPECIFICATION
=======================================================
Model Tuple M = ⟨Q, Σ, δ, q₀, F⟩
- Total Machine States (|Q|): ${workflow.states.length}
- Reachable States: ${verificationResult.metrics.reachableStates}
- Terminal Absorbing States (|F|): ${verificationResult.metrics.terminalStates}
- Total Input Alphabet (|Σ|): ${new Set(workflow.transitions.map((t) => t.event)).size} unique events
- Transition Relations (|δ|): ${workflow.transitions.length}
- Cyclomatic Complexity (M): ${verificationResult.metrics.cyclomaticComplexity}
- Machine Determinism (DFA): ${verificationResult.metrics.isDeterministic ? 'YES (100% Deterministic)' : 'NO (Contains Nondeterministic Branches)'}
- Deadlocks Present: ${verificationResult.metrics.hasDeadlocks ? 'YES (Critical Liveness Violation)' : 'NO (Satisfies Liveness)'}

=======================================================
3. DETAILED DEFECTS & AUDIT FINDINGS
=======================================================
${
  verificationResult.issues.length === 0
    ? 'No formal defects detected. Machine is safe and deterministic.'
    : verificationResult.issues
        .map(
          (issue, idx) => `
[Finding #${idx + 1}] [${issue.severity.toUpperCase()}] ${issue.title}
Category: ${issue.type}
Description: ${issue.description}
Affected States: ${issue.affectedStateIds.join(', ')}
${
  issue.counterExamplePath
    ? `Counter-Example Trace: ${issue.counterExamplePath.join(' -> ')}`
    : ''
}
Suggested Remediation: ${issue.suggestedFix?.description || 'N/A'}
`
        )
        .join('\n')
}

=======================================================
4. BUSINESS INVARIANTS CHECK
=======================================================
${(workflow.invariants || [])
  .map(
    (inv) => `
Rule: ${inv.name}
Formula: ${inv.formula}
Status: ${inv.passed !== false ? 'PASSED' : 'VIOLATED'}
Details: ${inv.violationDetails || 'Constraint successfully held on all traces.'}
`
  )
  .join('\n')}
`;
  };

  const getFormatContent = () => {
    switch (activeFormat) {
      case 'report':
        return generateAuditReportMarkdown();
      case 'xstate':
        return exportToXState(workflow);
      case 'temporal':
        return exportToTemporal(workflow);
      case 'stepfunctions':
        return exportToStepFunctions(workflow);
      case 'mermaid':
        return exportToMermaid(workflow);
      case 'json':
        return JSON.stringify(workflow, null, 2);
      case 'scxml':
        return exportToSCXML(workflow);
      case 'dot':
        return exportToDOT(workflow);
      default:
        return '';
    }
  };

  const handleDownloadActive = () => {
    const content = getFormatContent();
    const safeName = workflow.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    switch (activeFormat) {
      case 'report':
        downloadFile(content, `${safeName}_audit_report.md`, 'text/markdown');
        break;
      case 'xstate':
        downloadFile(content, `${safeName}_xstate.ts`, 'application/typescript');
        break;
      case 'temporal':
        downloadFile(content, `${safeName}_temporal_workflow.ts`, 'application/typescript');
        break;
      case 'stepfunctions':
        downloadFile(content, `${safeName}_asl.json`, 'application/json');
        break;
      case 'mermaid':
        downloadFile(content, `${safeName}_diagram.mmd`, 'text/plain');
        break;
      case 'json':
        downloadFile(content, `${safeName}_fsm.json`, 'application/json');
        break;
      case 'scxml':
        downloadFile(content, `${safeName}_model.scxml`, 'application/xml');
        break;
      case 'dot':
        downloadFile(content, `${safeName}_graph.dot`, 'text/vnd.graphviz');
        break;
    }
  };

  const formats: { id: ExportType; label: string; icon: React.ReactNode; tag?: string }[] = [
    { id: 'report', label: 'Audit Report (MD)', icon: <FileText className="w-4 h-4" /> },
    { id: 'temporal', label: 'Temporal.io (TS)', icon: <WorkflowIcon className="w-4 h-4" />, tag: 'Workflow' },
    { id: 'stepfunctions', label: 'AWS Step Functions', icon: <Layers className="w-4 h-4" />, tag: 'ASL JSON' },
    { id: 'xstate', label: 'XState v5 (TS)', icon: <Code2 className="w-4 h-4" />, tag: 'Statechart' },
    { id: 'mermaid', label: 'Mermaid.js', icon: <Code2 className="w-4 h-4" /> },
    { id: 'json', label: 'FSM JSON Schema', icon: <Code2 className="w-4 h-4" /> },
    { id: 'scxml', label: 'W3C SCXML', icon: <Cpu className="w-4 h-4" /> },
    { id: 'dot', label: 'Graphviz DOT', icon: <Code2 className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Export Workflow & Code Artifacts</h3>
              <p className="text-xs text-slate-400">
                Generate production orchestrations, formal verification audits, and statecharts
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

        {/* Format Selector Bar */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-950/60 border-b border-slate-800 overflow-x-auto">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setActiveFormat(fmt.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                activeFormat === fmt.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {fmt.icon}
              <span>{fmt.label}</span>
              {fmt.tag && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                  {fmt.tag}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Code / Content Viewer */}
        <div className="flex-1 p-5 overflow-hidden flex flex-col bg-slate-950">
          <div className="flex items-center justify-between pb-3 text-xs text-slate-400 font-mono">
            <span>
              {activeFormat === 'report'
                ? 'Formal Verification Audit Certificate'
                : `Generated Code Preview (${activeFormat})`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(getFormatContent())}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownloadActive}
                className="flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-900/90 p-4">
            <pre className="text-xs font-mono text-slate-300 whitespace-pre leading-relaxed select-text">
              {getFormatContent()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
