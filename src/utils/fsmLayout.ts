import { FSMWorkflow, FSMState } from '../types/fsm';

/**
 * Hierarchical DAG layout algorithm for FSM states
 */
export function autoLayoutFSM(workflow: FSMWorkflow): FSMWorkflow {
  const states = [...workflow.states];
  const transitions = workflow.transitions;

  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  states.forEach((s) => {
    adj.set(s.id, []);
    inDegree.set(s.id, 0);
  });

  transitions.forEach((t) => {
    if (adj.has(t.from) && adj.has(t.to)) {
      adj.get(t.from)!.push(t.to);
      inDegree.set(t.to, (inDegree.get(t.to) || 0) + 1);
    }
  });

  // Find start state or states with lowest in-degree
  const initial = states.find((s) => s.type === 'initial') || states[0];
  if (!initial) return workflow;

  // Assign layers using BFS
  const layerMap = new Map<string, number>();
  const queue: { id: string; layer: number }[] = [{ id: initial.id, layer: 0 }];
  layerMap.set(initial.id, 0);

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    const neighbors = adj.get(id) || [];
    for (const nextId of neighbors) {
      const currentLayer = layerMap.get(nextId);
      const nextLayer = layer + 1;
      if (currentLayer === undefined || nextLayer > currentLayer) {
        layerMap.set(nextId, nextLayer);
        queue.push({ id: nextId, layer: nextLayer });
      }
    }
  }

  // Handle any unreached disconnected states
  let maxAssignedLayer = 0;
  layerMap.forEach((l) => {
    if (l > maxAssignedLayer) maxAssignedLayer = l;
  });

  states.forEach((s) => {
    if (!layerMap.has(s.id)) {
      layerMap.set(s.id, maxAssignedLayer + 1);
    }
  });

  // Group states by layer
  const layers: Map<number, FSMState[]> = new Map();
  states.forEach((s) => {
    const l = layerMap.get(s.id) || 0;
    const group = layers.get(l) || [];
    group.push(s);
    layers.set(l, group);
  });

  // Calculate coordinates
  const LAYER_WIDTH = 260;
  const START_X = 80;
  const ROW_HEIGHT = 160;
  const BASE_Y = 140;

  const newStates = states.map((s) => {
    const l = layerMap.get(s.id) || 0;
    const group = layers.get(l) || [s];
    const indexInGroup = group.findIndex((item) => item.id === s.id);
    const totalInGroup = group.length;

    const x = START_X + l * LAYER_WIDTH;
    const yOffset = (indexInGroup - (totalInGroup - 1) / 2) * ROW_HEIGHT;
    const y = Math.max(80, BASE_Y + yOffset + (totalInGroup > 1 ? 60 : 0));

    return {
      ...s,
      x,
      y,
    };
  });

  return {
    ...workflow,
    states: newStates,
  };
}

/**
 * Generate Graphviz DOT format
 */
export function exportToDOT(workflow: FSMWorkflow): string {
  let dot = `digraph "${workflow.name.replace(/"/g, '')}" {\n`;
  dot += '  rankdir=LR;\n';
  dot += '  node [shape=box, style="rounded,filled", fontname="Plus Jakarta Sans", fontsize=10];\n';
  dot += '  edge [fontname="JetBrains Mono", fontsize=8];\n\n';

  // Nodes
  workflow.states.forEach((s) => {
    let fill = '#1E293B';
    let fontColor = '#F8FAFC';
    let shape = 'box';

    if (s.type === 'initial') {
      fill = '#065F46';
      shape = 'circle';
    } else if (s.type === 'terminal_success') {
      fill = '#047857';
      shape = 'doublecircle';
    } else if (s.type === 'terminal_failure') {
      fill = '#991B1B';
      shape = 'doublecircle';
    } else if (s.type === 'gateway') {
      fill = '#5B21B6';
      shape = 'diamond';
    }

    dot += `  "${s.id}" [label="${s.name}\\n(${s.role})", fillcolor="${fill}", fontcolor="${fontColor}", shape="${shape}"];\n`;
  });

  dot += '\n';

  // Edges
  workflow.transitions.forEach((t) => {
    const label = `${t.event}${t.guard ? ' ' + t.guard : ''}`;
    dot += `  "${t.from}" -> "${t.to}" [label="${label.replace(/"/g, '\\"')}"];\n`;
  });

  dot += '}\n';
  return dot;
}

/**
 * Generate W3C SCXML format
 */
export function exportToSCXML(workflow: FSMWorkflow): string {
  const initial = workflow.states.find((s) => s.type === 'initial')?.id || workflow.states[0]?.id || '';
  let scxml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  scxml += `<scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" initial="${initial}" name="${workflow.name.replace(/[^a-zA-Z0-9_]/g, '_')}">\n`;

  workflow.states.forEach((s) => {
    const isFinal = s.type === 'terminal_success' || s.type === 'terminal_failure';
    const tag = isFinal ? 'final' : 'state';
    scxml += `  <${tag} id="${s.id}">\n`;
    if (s.description) {
      scxml += `    <!-- ${s.description} -->\n`;
    }

    // Transitions
    const outTransitions = workflow.transitions.filter((t) => t.from === s.id);
    outTransitions.forEach((t) => {
      const condAttr = t.guard ? ` cond="${t.guard.replace(/[[\]]/g, '').replace(/"/g, '&quot;')}"` : '';
      scxml += `    <transition event="${t.event}" target="${t.to}"${condAttr}/>\n`;
    });

    scxml += `  </${tag}>\n`;
  });

  scxml += `</scxml>\n`;
  return scxml;
}
