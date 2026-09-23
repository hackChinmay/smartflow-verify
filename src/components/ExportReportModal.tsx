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
} from 'lucide-react';
import { exportToDOT, exportToSCXML } from '../utils/fsmLayout';

interface ExportReportModalProps {
  workflow: FSMWorkflow;
  verificationResult: VerificationResult;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  workflow,
  verificationResult,
  onClose,
}) => {
  const [activeFormat, setActiveFormat] = useState<'report' | 'json' | 'scxml' | 'dot'>('report');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Export Formal Verification Audit & FSM Models
              </h3>
              <p className="text-[11px] text-slate-400">
                Formal proof report, W3C SCXML, JSON state machine schema, or Graphviz
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

        {/* Format Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveFormat('report')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeFormat === 'report'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Formal Audit Report (.md)
          </button>

          <button
            onClick={() => setActiveFormat('json')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeFormat === 'json'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            FSM JSON Schema (.json)
          </button>

          <button
            onClick={() => setActiveFormat('scxml')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeFormat === 'scxml'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            W3C SCXML (.scxml)
          </button>

          <button
            onClick={() => setActiveFormat('dot')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeFormat === 'dot'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Graphviz (.dot)
          </button>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
          <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
            {getFormatContent()}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => handleCopy(getFormatContent())}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy to Clipboard'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownloadActive}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
