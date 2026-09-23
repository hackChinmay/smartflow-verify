export type FSMStateType =
  | 'initial'
  | 'intermediate'
  | 'review'
  | 'gateway'
  | 'terminal_success'
  | 'terminal_failure';

export interface FSMState {
  id: string;
  name: string;
  type: FSMStateType;
  role: string;
  slaHours: number;
  description: string;
  x: number;
  y: number;
  entryActions?: string[];
  exitActions?: string[];
}

export interface FSMTransition {
  id: string;
  from: string;
  to: string;
  event: string;
  guard?: string;
  action?: string;
  slaHours?: number;
}

export type InvariantType = 'safety' | 'liveness' | 'sod' | 'precedence' | 'sla';

export interface FSMInvariant {
  id: string;
  name: string;
  type: InvariantType;
  description: string;
  formula: string; // e.g., "AG (Disbursed -> AF KYC_Completed)"
  passed?: boolean;
  violationDetails?: string;
}

export type IssueType =
  | 'deadlock'
  | 'unreachable'
  | 'livelock'
  | 'nondeterministic'
  | 'invariant_violation'
  | 'sla_risk';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface VerificationIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  affectedStateIds: string[];
  affectedTransitionIds?: string[];
  counterExamplePath?: string[]; // sequence of state IDs
  counterExampleEvents?: string[]; // sequence of events triggering this path
  suggestedFix?: {
    action: 'add_transition' | 'delete_state' | 'connect_initial' | 'adjust_guard' | 'auto_repair';
    description: string;
    patch?: Partial<FSMWorkflow>;
  };
}

export interface VerificationResult {
  isVerified: boolean;
  score: number; // 0 to 100
  summary: string;
  issues: VerificationIssue[];
  metrics: {
    totalStates: number;
    reachableStates: number;
    terminalStates: number;
    totalTransitions: number;
    cyclomaticComplexity: number;
    isDeterministic: boolean;
    hasDeadlocks: boolean;
    averageSlaHours: number;
  };
}

export interface FSMWorkflow {
  id: string;
  name: string;
  description: string;
  domain: string;
  version: string;
  states: FSMState[];
  transitions: FSMTransition[];
  invariants: FSMInvariant[];
  variables?: Record<string, any>;
}

export interface SimulationStep {
  stepNumber: number;
  timestamp: string;
  fromStateId: string;
  toStateId: string;
  event: string;
  guardEvaluated?: string;
  actionExecuted?: string;
  variablesSnapshot: Record<string, any>;
}

export interface SimulationSession {
  currentStateId: string;
  history: SimulationStep[];
  variables: Record<string, any>;
  status: 'idle' | 'running' | 'paused' | 'deadlocked' | 'completed';
}
