import { FSMWorkflow } from '../types/fsm';

// 1. Export as XState v5 Machine Definition
export function exportToXState(workflow: FSMWorkflow): string {
  const initial = workflow.states.find(s => s.type === 'initial')?.id || workflow.states[0]?.id || 'start';

  const statesObj: Record<string, any> = {};
  for (const s of workflow.states) {
    const isFinal = s.type === 'terminal_success' || s.type === 'terminal_failure';
    const outTransitions = workflow.transitions.filter(t => t.from === s.id);
    
    const onObj: Record<string, any> = {};
    for (const t of outTransitions) {
      if (t.guard) {
        onObj[t.event] = {
          target: t.to,
          guard: t.guard.replace(/[\[\]]/g, '').trim()
        };
      } else {
        onObj[t.event] = t.to;
      }
    }

    statesObj[s.id] = {
      meta: {
        role: s.role,
        slaHours: s.slaHours,
        description: s.description
      },
      type: isFinal ? 'final' : undefined,
      on: Object.keys(onObj).length > 0 ? onObj : undefined
    };
  }

  return `import { setup, createMachine } from 'xstate';

export const ${workflow.name.replace(/[^a-zA-Z0-9]/g, '') || 'workflow'}Machine = createMachine({
  id: '${workflow.id}',
  initial: '${initial}',
  description: ${JSON.stringify(workflow.description)},
  states: ${JSON.stringify(statesObj, null, 2)}
});
`;
}

// 2. Export as Temporal.io Durable TypeScript Workflow
export function exportToTemporal(workflow: FSMWorkflow): string {
  const cleanName = workflow.name.replace(/[^a-zA-Z0-9]/g, '') || 'Workflow';
  
  return `import { proxyActivities, defineSignal, defineQuery, setHandler, condition } from '@temporalio/workflow';

// Define activities proxy
const activities = proxyActivities<{
  executeStateAction(stateId: string, role: string): Promise<void>;
  notifySlaBreach(stateId: string, slaHours: number): Promise<void>;
}>({
  startToCloseTimeout: '1 hour',
});

// Signals for incoming state machine events
${workflow.transitions.map(t => `export const ${t.event}Signal = defineSignal('${t.event}');`).filter((v, i, a) => a.indexOf(v) === i).join('\n')}

export const getStateQuery = defineQuery<string>('getState');

export async function ${cleanName}Workflow(input: Record<string, any> = {}): Promise<{ status: string; finalState: string }> {
  let currentState = '${workflow.states.find(s => s.type === 'initial')?.id || workflow.states[0]?.id}';
  let isComplete = false;

  setHandler(getStateQuery, () => currentState);

  while (!isComplete) {
    switch (currentState) {
${workflow.states.map(s => {
  const isFinal = s.type === 'terminal_success' || s.type === 'terminal_failure';
  const outTrans = workflow.transitions.filter(t => t.from === s.id);
  if (isFinal) {
    return `      case '${s.id}':
        // Terminal state (${s.type})
        await activities.executeStateAction('${s.id}', '${s.role}');
        isComplete = true;
        break;`;
  }
  return `      case '${s.id}':
        await activities.executeStateAction('${s.id}', '${s.role}');
        // Wait for next transition event
        await condition(() => ${outTrans.map(t => `currentState === '${t.to}'`).join(' || ') || 'false'});
        break;`;
}).join('\n')}
      default:
        isComplete = true;
        break;
    }
  }

  return { status: 'COMPLETED', finalState: currentState };
}
`;
}

// 3. Export as AWS Step Functions Amazon States Language (ASL JSON)
export function exportToStepFunctions(workflow: FSMWorkflow): string {
  const initial = workflow.states.find(s => s.type === 'initial')?.id || workflow.states[0]?.id || 'Start';

  const statesMap: Record<string, any> = {};

  for (const s of workflow.states) {
    const isSuccess = s.type === 'terminal_success';
    const isFailure = s.type === 'terminal_failure';
    const outTrans = workflow.transitions.filter(t => t.from === s.id);

    if (isSuccess) {
      statesMap[s.id] = {
        Type: 'Succeed',
        Comment: `${s.name} (${s.description})`
      };
    } else if (isFailure) {
      statesMap[s.id] = {
        Type: 'Fail',
        Error: 'ProcessFailed',
        Cause: `${s.name} (${s.description})`
      };
    } else if (outTrans.length > 1) {
      statesMap[s.id] = {
        Type: 'Choice',
        Comment: `${s.name} (Role: ${s.role}, SLA: ${s.slaHours}h)`,
        Choices: outTrans.map(t => ({
          Variable: `$.event`,
          StringEquals: t.event,
          Next: t.to
        })),
        Default: outTrans[0]?.to
      };
    } else if (outTrans.length === 1) {
      statesMap[s.id] = {
        Type: 'Task',
        Resource: 'arn:aws:states:::lambda:invoke',
        Comment: `${s.name} (Role: ${s.role})`,
        Parameters: {
          FunctionName: `arn:aws:lambda:us-east-1:123456789012:function:handle_${s.id}`,
          Payload: {
            "state.$": "$$",
            "execution.$": "$"
          }
        },
        Next: outTrans[0].to
      };
    } else {
      statesMap[s.id] = {
        Type: 'Pass',
        End: true
      };
    }
  }

  return JSON.stringify({
    Comment: `${workflow.name}: ${workflow.description}`,
    StartAt: initial,
    States: statesMap
  }, null, 2);
}

// 4. Export as Mermaid Diagram
export function exportToMermaid(workflow: FSMWorkflow): string {
  const lines: string[] = ['stateDiagram-v2'];
  const initial = workflow.states.find(s => s.type === 'initial');
  if (initial) {
    lines.push(`  [*] --> ${initial.id}`);
  }

  for (const s of workflow.states) {
    lines.push(`  ${s.id}: ${s.name} (${s.role})`);
  }

  for (const t of workflow.transitions) {
    const label = t.guard ? `${t.event} ${t.guard}` : t.event;
    lines.push(`  ${t.from} --> ${t.to}: ${label}`);
  }

  for (const s of workflow.states.filter(st => st.type === 'terminal_success' || st.type === 'terminal_failure')) {
    lines.push(`  ${s.id} --> [*]`);
  }

  return lines.join('\n');
}
