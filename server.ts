import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini SDK if API key is provided
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI with key, using fallback reasoning engine:', err);
  }
}

// POST /api/ai/verify - Deep AI analysis of FSM workflow for subtle business risks and invariants
app.post('/api/ai/verify', async (req, res) => {
  const { workflow, formalResults } = req.body;
  if (!workflow) {
    return res.status(400).json({ error: 'Missing workflow data' });
  }

  if (aiClient) {
    try {
      const prompt = `You are a formal methods and business process verification expert for SmartFlow Verify.
Analyze the following Finite State Machine (FSM) business workflow:
Workflow Name: ${workflow.name}
Description: ${workflow.description}
States: ${JSON.stringify(workflow.states.map((s: any) => ({ id: s.id, name: s.name, type: s.type, role: s.role, slaHours: s.slaHours })))}
Transitions: ${JSON.stringify(workflow.transitions.map((t: any) => ({ from: t.from, to: t.to, event: t.event, guard: t.guard })))}
Invariants: ${JSON.stringify(workflow.invariants || [])}
Formal verification detected issues: ${JSON.stringify(formalResults?.issues || [])}

Provide:
1. Executive summary of workflow safety and business integrity.
2. Compliance & regulatory risks (e.g. Separation of Duties, KYC/AML, audit trails, SLA bottlenecks).
3. Specific recommendations to optimize the state machine.
4. If there are deadlocks or unreachable states, explain the business root cause and how to fix it.

Respond strictly in valid JSON with this structure:
{
  "summary": "...",
  "riskRating": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "complianceObservations": ["..."],
  "businessRisks": ["..."],
  "optimizations": ["..."],
  "autoFixSuggestions": [
    {
      "title": "...",
      "description": "...",
      "affectedStateId": "...",
      "action": "add_transition" | "remove_state" | "update_guard",
      "suggestedTransition": { "from": "...", "to": "...", "event": "...", "guard": "..." }
    }
  ]
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (error: any) {
      console.error('Gemini verification error, using fallback:', error?.message);
    }
  }

  // Smart fallback when Gemini is unavailable or not configured
  const issues = formalResults?.issues || [];
  const hasDeadlocks = issues.some((i: any) => i.type === 'deadlock');
  const hasUnreachable = issues.some((i: any) => i.type === 'unreachable');

  return res.json({
    summary: `FSM Workflow "${workflow.name}" analyzed with ${workflow.states.length} states and ${workflow.transitions.length} transitions. ${
      hasDeadlocks ? 'Identified critical liveness violations (deadlocks) requiring fallback transition paths.' : 'Core control flow is live and progressing towards terminal states.'
    }`,
    riskRating: hasDeadlocks ? 'HIGH' : hasUnreachable ? 'MEDIUM' : 'LOW',
    complianceObservations: [
      'Separation of Duties (SoD) requires independent review for high-risk approval transitions.',
      'Audit log hooks should be attached to all state exit actions.',
      'SLA timeouts must have definite escalation fallback paths.'
    ],
    businessRisks: hasDeadlocks
      ? ['A transaction in escalation can become permanently stuck with no exit transition, stranding capital and breaching customer SLAs.']
      : ['Guard conditions depend on external scoring APIs which must handle timeouts gracefully.'],
    optimizations: [
      'Consolidate parallel automated validation states to reduce end-to-end cycle dwell time.',
      'Add fast-path conditional bypass for low-risk, verified entities.'
    ],
    autoFixSuggestions: hasDeadlocks
      ? [
          {
            title: 'Add Resolution Transition for Deadlock',
            description: 'Connect stranded escalation state to either an approval or rejection terminal state with a timeout guard.',
            affectedStateId: issues.find((i: any) => i.type === 'deadlock')?.affectedStateIds?.[0] || workflow.states[0]?.id,
            action: 'add_transition',
            suggestedTransition: {
              from: issues.find((i: any) => i.type === 'deadlock')?.affectedStateIds?.[0] || workflow.states[0]?.id,
              to: workflow.states.find((s: any) => s.type === 'terminal_failure')?.id || workflow.states[workflow.states.length - 1]?.id,
              event: 'escalation_resolved_or_rejected',
              guard: '[investigationComplete == true]'
            }
          }
        ]
      : []
  });
});

// POST /api/ai/generate - Generate complete FSM workflow from natural language business requirements
app.post('/api/ai/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  if (aiClient) {
    try {
      const aiPrompt = `You are a formal workflow designer. Create a verified Finite State Machine (FSM) for this business requirement:
"${prompt}"

Design a clean, realistic business workflow with 5 to 8 states:
- 1 initial state (type: "initial")
- Several intermediate or review or gateway states (types: "intermediate", "review", "gateway")
- 1 or 2 terminal states (types: "terminal_success", "terminal_failure")
- Logical transitions connecting initial to terminal states with clear event triggers and guards.
- Assign roles and SLA hours.
- Set x, y coordinates for clean left-to-right DAG layout:
  e.g., initial at x: 80, y: 250, next column x: 320, next x: 560, terminal x: 840.

Respond strictly in valid JSON:
{
  "name": "Workflow Name",
  "description": "Short description",
  "domain": "Finance | Logistics | HR | Legal | Healthcare",
  "states": [
    {
      "id": "s0_name",
      "name": "Readable Name",
      "type": "initial" | "intermediate" | "review" | "gateway" | "terminal_success" | "terminal_failure",
      "role": "System | Manager | Underwriter | Customer",
      "slaHours": 24,
      "description": "...",
      "x": 80,
      "y": 250
    }
  ],
  "transitions": [
    {
      "id": "t1",
      "from": "s0_name",
      "to": "s1_name",
      "event": "event_name",
      "guard": "[condition]",
      "action": "actionHook()"
    }
  ],
  "invariants": [
    {
      "id": "inv_1",
      "name": "Audit Safety",
      "description": "...",
      "expression": "ALWAYS(approved -> KYC_completed)"
    }
  ]
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: aiPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (err: any) {
      console.error('Gemini generation error, falling back to smart template generator:', err?.message);
    }
  }

  // Smart fallback template generation based on prompt keywords
  const promptLower = prompt.toLowerCase();
  let generatedFSM;

  if (promptLower.includes('expense') || promptLower.includes('reimburse') || promptLower.includes('travel')) {
    generatedFSM = {
      name: 'Employee Expense Reimbursement FSM',
      description: 'Automated policy compliance check, manager threshold approval, and direct deposit reimbursement.',
      domain: 'Finance',
      states: [
        { id: 's0_submit', name: 'Claim Submitted', type: 'initial', role: 'Employee', slaHours: 2, description: 'Receipts and claim metadata captured.', x: 80, y: 220 },
        { id: 's1_ocr_policy', name: 'Receipt OCR & Policy Check', type: 'intermediate', role: 'System', slaHours: 1, description: 'Automated receipt parsing and expense policy verification.', x: 300, y: 220 },
        { id: 's2_mgr_review', name: 'Department Manager Review', type: 'review', role: 'Department Manager', slaHours: 48, description: 'Manager review required for claims exceeding $250.', x: 540, y: 150 },
        { id: 's3_finance_audit', name: 'Finance Pre-Audit', type: 'review', role: 'Finance Comptroller', slaHours: 24, description: 'Secondary audit for high-value claims >$2,500.', x: 740, y: 150 },
        { id: 's4_paid', name: 'Reimbursed & Disbursed', type: 'terminal_success', role: 'System ACH', slaHours: 24, description: 'Direct deposit funds transferred to employee account.', x: 960, y: 150 },
        { id: 's5_rejected', name: 'Claim Rejected', type: 'terminal_failure', role: 'Manager / Finance', slaHours: 0, description: 'Claim flagged for policy violation or missing documentation.', x: 740, y: 350 }
      ],
      transitions: [
        { id: 't1', from: 's0_submit', to: 's1_ocr_policy', event: 'validate_policy', guard: '[receiptsAttached == true]', action: 'runOCR()' },
        { id: 't2', from: 's1_ocr_policy', to: 's2_mgr_review', event: 'policy_passed', guard: '[amount > 250]', action: 'notifyManager()' },
        { id: 't3', from: 's1_ocr_policy', to: 's4_paid', event: 'auto_approve_micro', guard: '[amount <= 250 && policyCompliant == true]', action: 'queueACH()' },
        { id: 't4', from: 's1_ocr_policy', to: 's5_rejected', event: 'policy_failed', guard: '[policyViolations > 0]', action: 'sendRejectionNotice()' },
        { id: 't5', from: 's2_mgr_review', to: 's3_finance_audit', event: 'manager_approved', guard: '[amount >= 2500]', action: 'escalateFinance()' },
        { id: 't6', from: 's2_mgr_review', to: 's4_paid', event: 'manager_approved', guard: '[amount < 2500]', action: 'queueACH()' },
        { id: 't7', from: 's2_mgr_review', to: 's5_rejected', event: 'manager_rejected', guard: '[rejectReason != null]', action: 'notifyEmployee()' },
        { id: 't8', from: 's3_finance_audit', to: 's4_paid', event: 'finance_cleared', guard: '[taxCompliance == true]', action: 'releasePayment()' },
        { id: 't9', from: 's3_finance_audit', to: 's5_rejected', event: 'finance_rejected', guard: '[fraudDetected == true]', action: 'freezeAccount()' }
      ],
      invariants: [
        { id: 'inv1', name: 'Separation of Duties', description: 'Employee cannot self-approve expenses exceeding $250', expression: 'ALWAYS(s4_paid -> manager_approved)' }
      ]
    };
  } else {
    generatedFSM = {
      name: 'Custom Intelligent Business Workflow',
      description: `Formally modeled FSM for: "${prompt.slice(0, 70)}..."`,
      domain: 'Operations',
      states: [
        { id: 's0_init', name: 'Request Initialized', type: 'initial', role: 'Client', slaHours: 4, description: 'Initial request submission and validation.', x: 80, y: 220 },
        { id: 's1_validate', name: 'Automated Verification', type: 'intermediate', role: 'System', slaHours: 2, description: 'Rule engine validation and input sanitization.', x: 320, y: 220 },
        { id: 's2_review', name: 'Operational Review', type: 'review', role: 'Specialist', slaHours: 24, description: 'Human-in-the-loop compliance and risk sign-off.', x: 560, y: 160 },
        { id: 's3_executed', name: 'Completed & Executed', type: 'terminal_success', role: 'System', slaHours: 0, description: 'Request successfully fulfilled.', x: 820, y: 160 },
        { id: 's4_terminated', name: 'Declined / Terminated', type: 'terminal_failure', role: 'System', slaHours: 0, description: 'Request failed validation or was rejected.', x: 620, y: 340 }
      ],
      transitions: [
        { id: 't1', from: 's0_init', to: 's1_validate', event: 'submit_payload', guard: '[payloadValid == true]', action: 'logAudit()' },
        { id: 't2', from: 's1_validate', to: 's2_review', event: 'requires_manual_check', guard: '[riskLevel == "MEDIUM"]', action: 'assignReviewer()' },
        { id: 't3', from: 's1_validate', to: 's3_executed', event: 'auto_clear', guard: '[riskLevel == "LOW"]', action: 'executeTask()' },
        { id: 't4', from: 's1_validate', to: 's4_terminated', event: 'validation_error', guard: '[riskLevel == "CRITICAL"]', action: 'logError()' },
        { id: 't5', from: 's2_review', to: 's3_executed', event: 'specialist_approved', guard: '[approved == true]', action: 'executeTask()' },
        { id: 't6', from: 's2_review', to: 's4_terminated', event: 'specialist_declined', guard: '[approved == false]', action: 'notifyUser()' }
      ],
      invariants: [
        { id: 'inv1', name: 'Deterministic Completion', description: 'Every valid request terminates in s3_executed or s4_terminated', expression: 'LIVENESS(TerminationReachable)' }
      ]
    };
  }

  return res.json(generatedFSM);
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, () => {
    console.log(`SmartFlow Verify server running on http://localhost:${PORT}`);
  });
}

startServer();
