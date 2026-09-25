import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { FSMWorkflow } from '../types/fsm';

export interface SavedWorkflowMeta {
  id: string;
  name: string;
  description: string;
  domain: string;
  version: string;
  stateCount: number;
  transitionCount: number;
  updatedAt: string;
  authorEmail?: string;
  userId?: string;
}

const LOCAL_STORAGE_KEY = 'smartflow_saved_workflows';

// Helper for local storage fallback
function getLocalWorkflows(): (FSMWorkflow & { updatedAt: string; authorEmail?: string; userId?: string })[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read local workflows', err);
    return [];
  }
}

function saveLocalWorkflows(items: (FSMWorkflow & { updatedAt: string; authorEmail?: string; userId?: string })[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
}

export async function saveWorkflowToCloud(
  workflow: FSMWorkflow, 
  userId?: string, 
  userEmail?: string,
  saveAsNew: boolean = true
): Promise<{ success: boolean; id: string }> {
  // If saving as new snapshot, generate a distinct ID so it doesn't overwrite
  const workflowId = (saveAsNew || !workflow.id) 
    ? `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    : workflow.id;

  const payload = {
    ...workflow,
    id: workflowId,
    updatedAt: new Date().toISOString(),
    authorEmail: userEmail || 'Anonymous',
    userId: userId || 'local'
  };

  // 1. Immediately update local storage
  const existing = getLocalWorkflows();
  const index = existing.findIndex(w => w.id === workflowId);
  if (index >= 0) {
    existing[index] = payload;
  } else {
    existing.unshift(payload);
  }
  saveLocalWorkflows(existing);

  // 2. Save to Firestore in top-level 'workflows' collection for direct visibility
  if (db && isFirebaseConfigured) {
    try {
      console.log('Saving to Firestore collection "workflows", docId:', workflowId);
      const docRef = doc(db, 'workflows', workflowId);
      await setDoc(docRef, {
        ...payload,
        firestoreTimestamp: serverTimestamp()
      }, { merge: true });
      console.log('Successfully written to Firestore!');
    } catch (err) {
      console.error('Firestore save failed:', err);
    }
  } else {
    console.warn('Firebase DB is not initialized. isConfigured:', isFirebaseConfigured);
  }

  return { success: true, id: workflowId };
}

export async function loadUserWorkflows(userId?: string): Promise<SavedWorkflowMeta[]> {
  const list: SavedWorkflowMeta[] = [];

  // 1. Try fetching from Firestore top-level 'workflows' collection
  if (db && isFirebaseConfigured) {
    try {
      const q = userId
        ? query(collection(db, 'workflows'), where('userId', '==', userId))
        : collection(db, 'workflows');
      
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as FSMWorkflow & { updatedAt?: string; authorEmail?: string; userId?: string };
        list.push({
          id: docSnap.id,
          name: data.name || 'Untitled Workflow',
          description: data.description || '',
          domain: data.domain || 'General',
          version: data.version || '1.0.0',
          stateCount: data.states?.length || 0,
          transitionCount: data.transitions?.length || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
          authorEmail: data.authorEmail,
          userId: data.userId
        });
      });

      if (list.length > 0) return list;
    } catch (err) {
      console.error('Error querying Firestore workflows collection:', err);
    }
  }

  // 2. Fallback / merge with local storage
  const locals = getLocalWorkflows();
  return locals.map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    domain: w.domain,
    version: w.version,
    stateCount: w.states?.length || 0,
    transitionCount: w.transitions?.length || 0,
    updatedAt: w.updatedAt || new Date().toISOString(),
    authorEmail: w.authorEmail,
    userId: w.userId
  }));
}

export async function loadWorkflowById(workflowId: string, userId?: string): Promise<FSMWorkflow | null> {
  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'workflows', workflowId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as FSMWorkflow;
      }
    } catch (err) {
      console.warn('Error reading from Firestore:', err);
    }
  }

  const locals = getLocalWorkflows();
  const found = locals.find(w => w.id === workflowId);
  return found || null;
}

export async function deleteWorkflow(workflowId: string, userId?: string): Promise<boolean> {
  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'workflows', workflowId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Error deleting from Firestore:', err);
    }
  }

  const locals = getLocalWorkflows().filter(w => w.id !== workflowId);
  saveLocalWorkflows(locals);
  return true;
}
