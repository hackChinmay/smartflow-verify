import {
  FSMWorkflow,
  FSMState,
  FSMTransition,
  VerificationResult,
  VerificationIssue,
  FSMInvariant,
} from '../types/fsm';

export class FSMVerifierEngine {
  /**
   * Run full formal verification suite on the FSM workflow
   */
  public static verify(workflow: FSMWorkflow): VerificationResult {
    const issues: VerificationIssue[] = [];
    const stateMap = new Map<string, FSMState>();
    workflow.states.forEach((s) => stateMap.set(s.id, s));

    const transitions = workflow.transitions || [];
    const states = workflow.states || [];

    // Adjacency lists
    const adj = new Map<string, FSMTransition[]>();
    const revAdj = new Map<string, FSMTransition[]>();
    states.forEach((s) => {
      adj.set(s.id, []);
      revAdj.set(s.id, []);
    });

    transitions.forEach((t) => {
      if (adj.has(t.from)) {
        adj.get(t.from)!.push(t);
      }
      if (revAdj.has(t.to)) {
        revAdj.get(t.to)!.push(t);
      }
    });

    // 1. Initial State Check
    const initialStates = states.filter((s) => s.type === 'initial');
    let q0: FSMState | null = null;

    if (initialStates.length === 0) {
      issues.push({
        id: 'issue-no-initial',
        type: 'invariant_violation',
        severity: 'error',
        title: 'Missing Initial State (q₀)',
        description: 'The finite state machine has no designated initial state (q₀). Execution cannot begin.',
        affectedStateIds: [],
        suggestedFix: {
          action: 'connect_initial',
          description: 'Designate the first logical state as type "initial".',
        },
      });
    } else if (initialStates.length > 1) {
      issues.push({
        id: 'issue-multiple-initial',
        type: 'nondeterministic',
        severity: 'error',
        title: 'Multiple Initial States Detected',
        description: `Found ${initialStates.length} initial states (${initialStates.map((s) => s.name).join(', ')}). A deterministic FSM requires exactly one start state q₀.`,
        affectedStateIds: initialStates.map((s) => s.id),
      });
      q0 = initialStates[0];
    } else {
      q0 = initialStates[0];
    }

    // 2. Terminal States Check
    const terminalStates = states.filter(
      (s) => s.type === 'terminal_success' || s.type === 'terminal_failure'
    );
    if (terminalStates.length === 0) {
      issues.push({
        id: 'issue-no-terminal',
        type: 'livelock',
        severity: 'error',
        title: 'No Terminal / Final States (F = ∅)',
        description: 'The workflow has no terminal states (Accept/Reject). The process will run indefinitely without formal resolution.',
        affectedStateIds: [],
      });
    }

    // 3. Reachability Analysis (BFS from q0)
    const reachable = new Set<string>();
    const parentMap = new Map<string, { stateId: string; event: string }>();

    if (q0) {
      const queue: string[] = [q0.id];
      reachable.add(q0.id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const outEdges = adj.get(curr) || [];
        for (const edge of outEdges) {
          if (!reachable.has(edge.to) && stateMap.has(edge.to)) {
            reachable.add(edge.to);
            parentMap.set(edge.to, { stateId: curr, event: edge.event });
            queue.push(edge.to);
          }
        }
      }
    }

    // Flag unreachable states
    states.forEach((s) => {
      if (!reachable.has(s.id)) {
        issues.push({
          id: `issue-unreachable-${s.id}`,
          type: 'unreachable',
          severity: 'warning',
          title: `Unreachable State: "${s.name}"`,
          description: `State "${s.name}" (${s.id}) cannot be reached from initial state "${q0 ? q0.name : 'START'}". This is dead workflow logic.`,
          affectedStateIds: [s.id],
          suggestedFix: {
            action: 'delete_state',
            description: `Connect a transition to "${s.name}" or remove this orphaned state.`,
          },
        });
      }
    });

    // Helper to extract shortest counter-example trace to a state
    const getTraceTo = (targetId: string): { path: string[]; events: string[] } => {
      if (!q0 || !reachable.has(targetId)) return { path: [], events: [] };
      const path: string[] = [targetId];
      const events: string[] = [];
      let curr = targetId;

      while (curr !== q0.id && parentMap.has(curr)) {
        const step = parentMap.get(curr)!;
        events.unshift(step.event);
        path.unshift(step.stateId);
        curr = step.stateId;
      }
      return { path, events };
    };

    // 4. Deadlock Detection (Reachability to non-terminal state with out-degree 0)
    states.forEach((s) => {
      if (reachable.has(s.id)) {
        const isTerminal =
          s.type === 'terminal_success' || s.type === 'terminal_failure';
        const outEdges = adj.get(s.id) || [];

        if (!isTerminal && outEdges.length === 0) {
          const { path, events } = getTraceTo(s.id);
          const fallbackTarget =
            states.find((st) => st.type === 'terminal_failure')?.id ||
            states.find((st) => st.type === 'terminal_success')?.id ||
            q0?.id;

          issues.push({
            id: `issue-deadlock-${s.id}`,
            type: 'deadlock',
            severity: 'error',
            title: `Critical Deadlock Detected at "${s.name}"`,
            description: `State "${s.name}" (${s.id}) is reachable but has 0 outgoing transitions and is not a designated Terminal state. Work items entering this state become permanently stuck!`,
            affectedStateIds: [s.id],
            counterExamplePath: path,
            counterExampleEvents: events,
            suggestedFix: {
              action: 'add_transition',
              description: `Add an exit transition from "${s.name}" to fallback resolution or rejection.`,
              patch: fallbackTarget
                ? {
                    transitions: [
                      ...workflow.transitions,
                      {
                        id: `t_fix_${s.id}_${Date.now()}`,
                        from: s.id,
                        to: fallbackTarget,
                        event: 'sla_timeout_escalate',
                        guard: '[timeoutExpired == true]',
                        action: 'logEscalationTimeout()',
                      },
                    ],
                  }
                : undefined,
            },
          });
        }
      }
    });

    // 5. Livelock & Infinite Trap Cycles (states that cannot reach any terminal state)
    const canReachTerminal = new Set<string>();
    const revQueue: string[] = [];

    terminalStates.forEach((t) => {
      canReachTerminal.add(t.id);
      revQueue.push(t.id);
    });

    while (revQueue.length > 0) {
      const curr = revQueue.shift()!;
      const incomingEdges = revAdj.get(curr) || [];
      for (const inEdge of incomingEdges) {
        if (!canReachTerminal.has(inEdge.from) && stateMap.has(inEdge.from)) {
          canReachTerminal.add(inEdge.from);
          revQueue.push(inEdge.from);
        }
      }
    }

    // Reachable states that cannot reach any terminal state (and are not already flagged as deadlocks)
    states.forEach((s) => {
      if (
        reachable.has(s.id) &&
        !canReachTerminal.has(s.id) &&
        (adj.get(s.id) || []).length > 0
      ) {
        const { path, events } = getTraceTo(s.id);
        issues.push({
          id: `issue-livelock-${s.id}`,
          type: 'livelock',
          severity: 'error',
          title: `Livelock / Infinite Trap Cycle via "${s.name}"`,
          description: `Once execution reaches "${s.name}", there exists NO theoretical path to reach any terminal final state. The process is trapped in a closed loop.`,
          affectedStateIds: [s.id],
          counterExamplePath: path,
          counterExampleEvents: events,
          suggestedFix: {
            action: 'add_transition',
            description: `Add an exit escape condition from this cycle leading to a terminal state.`,
          },
        });
      }
    });

    // 6. Non-Determinism Check (Conflicting identical event triggers without guards)
    states.forEach((s) => {
      const outEdges = adj.get(s.id) || [];
      const eventGroups = new Map<string, FSMTransition[]>();

      outEdges.forEach((e) => {
        const group = eventGroups.get(e.event) || [];
        group.push(e);
        eventGroups.set(e.event, group);
      });

      eventGroups.forEach((edgeList, eventName) => {
        if (edgeList.length > 1) {
          const hasEmptyGuard = edgeList.some((e) => !e.guard || e.guard.trim() === '');
          if (hasEmptyGuard) {
            issues.push({
              id: `issue-nondet-${s.id}-${eventName}`,
              type: 'nondeterministic',
              severity: 'warning',
              title: `Non-Deterministic Choice at "${s.name}" on event "${eventName}"`,
              description: `State "${s.name}" has ${edgeList.length} outgoing transitions sharing event "${eventName}" without mutually exclusive guards. The FSM cannot deterministically decide which path to take.`,
              affectedStateIds: [s.id],
              affectedTransitionIds: edgeList.map((e) => e.id),
              suggestedFix: {
                action: 'adjust_guard',
                description: 'Add explicit, mutually exclusive guard expressions (e.g. [score >= 700] and [score < 700]).',
              },
            });
          }
        }
      });
    });

    // 7. Business Invariant & Temporal Logic Verification
    const updatedInvariants: FSMInvariant[] = (workflow.invariants || []).map((inv) => {
      let passed = true;
      let violationDetails = '';

      if (inv.type === 'precedence') {
        // e.g. KYC verification must precede Disbursal
        // Look for states matching keywords in the formula or description
        const formulaLower = inv.formula.toLowerCase();
        const descLower = inv.description.toLowerCase();

        let reqKeyword = 'kyc';
        let targetKeyword = 'disburs';

        if (formulaLower.includes('kyc') || descLower.includes('kyc')) {
          reqKeyword = 'kyc';
          targetKeyword = 'disburs';
        }

        const targetState = states.find(
          (s) =>
            s.name.toLowerCase().includes(targetKeyword) ||
            s.id.toLowerCase().includes(targetKeyword)
        );
        const reqState = states.find(
          (s) =>
            s.name.toLowerCase().includes(reqKeyword) ||
            s.id.toLowerCase().includes(reqKeyword)
        );

        if (targetState && reqState && reachable.has(targetState.id)) {
          // Check if there is ANY path from q0 to targetState that avoids reqState
          const visitedWithoutReq = new Set<string>();
          const q: string[] = [q0 ? q0.id : ''];
          if (q0 && q0.id !== reqState.id) {
            visitedWithoutReq.add(q0.id);
          }

          let pathBypassesReq = false;
          while (q.length > 0) {
            const curr = q.shift()!;
            if (curr === targetState.id) {
              pathBypassesReq = true;
              break;
            }
            const outs = adj.get(curr) || [];
            for (const out of outs) {
              if (out.to !== reqState.id && !visitedWithoutReq.has(out.to)) {
                visitedWithoutReq.add(out.to);
                q.push(out.to);
              }
            }
          }

          if (pathBypassesReq) {
            passed = false;
            violationDetails = `Execution path found that reaches "${targetState.name}" without passing through mandatory prerequisite "${reqState.name}".`;
            issues.push({
              id: `issue-inv-${inv.id}`,
              type: 'invariant_violation',
              severity: 'error',
              title: `Invariant Violation: ${inv.name}`,
              description: violationDetails,
              affectedStateIds: [targetState.id, reqState.id],
            });
          }
        }
      } else if (inv.type === 'sod') {
        // Separation of Duties: Ensure Maker and Checker roles are strictly distinct
        const creatorRole = states.find((s) => s.type === 'initial')?.role;
        const approvalStates = states.filter(
          (s) => s.type === 'review' || s.name.toLowerCase().includes('approv')
        );

        approvalStates.forEach((ap) => {
          if (creatorRole && ap.role && ap.role.toLowerCase() === creatorRole.toLowerCase()) {
            passed = false;
            violationDetails = `Separation of Duties violated: Approval state "${ap.name}" is assigned to same role ("${ap.role}") as Creator.`;
            issues.push({
              id: `issue-sod-${ap.id}`,
              type: 'invariant_violation',
              severity: 'warning',
              title: `Separation of Duties (SoD) Risk at "${ap.name}"`,
              description: violationDetails,
              affectedStateIds: [ap.id],
            });
          }
        });
      } else if (inv.type === 'liveness') {
        if (!issues.some((i) => i.type === 'deadlock' || i.type === 'livelock')) {
          passed = true;
        } else {
          passed = false;
          violationDetails = 'Liveness broken due to detected deadlocks or unresolvable trap cycles.';
        }
      }

      return {
        ...inv,
        passed,
        violationDetails: passed ? undefined : violationDetails,
      };
    });

    // 8. Metrics Calculation
    const totalStates = states.length;
    const reachableStates = reachable.size;
    const totalTransitions = transitions.length;
    // Cyclomatic Complexity: M = E - V + 2P (assuming P=1 connected component)
    const cyclomaticComplexity = Math.max(1, totalTransitions - totalStates + 2);
    const hasDeadlocks = issues.some((i) => i.type === 'deadlock');
    const isDeterministic = !issues.some((i) => i.type === 'nondeterministic');
    const avgSla =
      states.reduce((acc, s) => acc + (s.slaHours || 0), 0) / (totalStates || 1);

    // Score calculation (0 to 100)
    let score = 100;
    issues.forEach((i) => {
      if (i.severity === 'error') score -= 25;
      else if (i.severity === 'warning') score -= 10;
      else score -= 5;
    });
    score = Math.max(0, Math.min(100, score));

    const isVerified = issues.filter((i) => i.severity === 'error').length === 0;

    let summary = '';
    if (isVerified && issues.length === 0) {
      summary = `Formal verification passed with 0 defects. Machine satisfies safety, reachability, determinism, and liveness properties.`;
    } else if (hasDeadlocks) {
      summary = `Verification FAILED: ${issues.filter((i) => i.type === 'deadlock').length} critical deadlock(s) detected. Work items can become permanently stranded.`;
    } else {
      summary = `Verification identified ${issues.length} issue(s) (${issues.filter((i) => i.severity === 'error').length} errors, ${issues.filter((i) => i.severity === 'warning').length} warnings).`;
    }

    return {
      isVerified,
      score,
      summary,
      issues,
      metrics: {
        totalStates,
        reachableStates,
        terminalStates: terminalStates.length,
        totalTransitions,
        cyclomaticComplexity,
        isDeterministic,
        hasDeadlocks,
        averageSlaHours: Number(avgSla.toFixed(1)),
      },
    };
  }

  /**
   * Automatically repairs common structural issues (deadlocks, unreachables)
   */
  public static autoRepair(workflow: FSMWorkflow): FSMWorkflow {
    const verification = this.verify(workflow);
    const newWorkflow: FSMWorkflow = JSON.parse(JSON.stringify(workflow));

    // Fix deadlocks: connect deadlocked state to terminal_failure or new rejection transition
    const deadlockIssues = verification.issues.filter((i) => i.type === 'deadlock');
    const fallbackTerminal =
      newWorkflow.states.find((s) => s.type === 'terminal_failure') ||
      newWorkflow.states.find((s) => s.type === 'terminal_success');

    deadlockIssues.forEach((issue) => {
      const stateId = issue.affectedStateIds[0];
      if (stateId && fallbackTerminal) {
        newWorkflow.transitions.push({
          id: `t_repair_${stateId}_${Date.now().toString(36)}`,
          from: stateId,
          to: fallbackTerminal.id,
          event: 'sla_timeout_escalate',
          guard: '[slaBreached == true]',
          action: 'notifyComplianceAndClose()',
          slaHours: 24,
        });
      }
    });

    // Fix unreachables: connect from initial state if appropriate
    const unreachableIssues = verification.issues.filter((i) => i.type === 'unreachable');
    const initialState = newWorkflow.states.find((s) => s.type === 'initial');

    unreachableIssues.forEach((issue) => {
      const stateId = issue.affectedStateIds[0];
      if (stateId && initialState) {
        newWorkflow.transitions.push({
          id: `t_repair_reach_${stateId}_${Date.now().toString(36)}`,
          from: initialState.id,
          to: stateId,
          event: 'route_auxiliary_audit',
          guard: '[requiresSpecialAudit == true]',
          action: 'initiateAuditBranch()',
        });
      }
    });

    return newWorkflow;
  }
}
