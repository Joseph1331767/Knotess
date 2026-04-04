import { get, set, del } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { FileRegistryEntry, Workspace } from './store';

const REGISTRY_KEY = 'knotess-file-registry';
const WORKSPACE_KEY = 'knotess-workspaces';

export const getRegistry = async (): Promise<FileRegistryEntry[]> => {
  const registry = await get<FileRegistryEntry[]>(REGISTRY_KEY);
  return registry || [];
};

export const saveRegistry = async (entries: FileRegistryEntry[]): Promise<void> => {
  await set(REGISTRY_KEY, entries);
};

export const listFiles = async (): Promise<FileRegistryEntry[]> => {
  return await getRegistry();
};

export const createFile = async (name: string): Promise<FileRegistryEntry> => {
  const id = uuidv4();
  const entry: FileRegistryEntry = {
    id,
    name,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    storageKey: `knotess-file-${id}`,
  };

  const registry = await getRegistry();
  registry.push(entry);
  await saveRegistry(registry);

  // Initialize empty data
  await set(entry.storageKey, { nodes: {}, rootNodeId: null, assets: [] });

  return entry;
};

export const openFile = async (id: string): Promise<{ nodes: any; rootNodeId: string | null; assets?: any[] } | null> => {
  const data = await get(`knotess-file-${id}`);
  return data || null;
};

export const saveFile = async (id: string, data: { nodes: any; rootNodeId: string | null; assets?: any[] }): Promise<void> => {
  await set(`knotess-file-${id}`, data);
  
  // Update modifiedAt
  const registry = await getRegistry();
  const index = registry.findIndex(e => e.id === id);
  if (index !== -1) {
    registry[index].modifiedAt = new Date().toISOString();
    await saveRegistry(registry);
  }
};

export const renameFile = async (id: string, name: string): Promise<void> => {
  const registry = await getRegistry();
  const index = registry.findIndex(e => e.id === id);
  if (index !== -1) {
    registry[index].name = name;
    registry[index].modifiedAt = new Date().toISOString();
    await saveRegistry(registry);
  }
};

export const deleteFile = async (id: string): Promise<void> => {
  const registry = await getRegistry();
  const filtered = registry.filter(e => e.id !== id);
  await saveRegistry(filtered);
  await del(`knotess-file-${id}`);
};

export const duplicateFile = async (id: string, newName: string): Promise<FileRegistryEntry | null> => {
  const data = await openFile(id);
  if (!data) return null;

  const newEntry = await createFile(newName);
  await saveFile(newEntry.id, data);

  // Copy overrides if any
  const registry = await getRegistry();
  const sourceEntry = registry.find(e => e.id === id);
  const targetIndex = registry.findIndex(e => e.id === newEntry.id);
  
  if (sourceEntry?.settingsOverrides && targetIndex !== -1) {
    registry[targetIndex].settingsOverrides = structuredClone(sourceEntry.settingsOverrides);
    await saveRegistry(registry);
    newEntry.settingsOverrides = registry[targetIndex].settingsOverrides;
  }

  return newEntry;
};

// Workspace operations (metadata only, files are tracked by ID)
export const getWorkspaces = async (): Promise<Workspace[]> => {
  const workspaces = await get<Workspace[]>(WORKSPACE_KEY);
  return workspaces || [];
};

export const saveWorkspaces = async (workspaces: Workspace[]): Promise<void> => {
  await set(WORKSPACE_KEY, workspaces);
};

export const listWorkspaces = async (): Promise<Workspace[]> => {
  return await getWorkspaces();
};

export const createWorkspace = async (name: string): Promise<Workspace> => {
  const workspaces = await getWorkspaces();
  const newWorkspace: Workspace = {
    id: uuidv4(),
    name,
    fileIds: [],
  };
  workspaces.push(newWorkspace);
  await saveWorkspaces(workspaces);
  return newWorkspace;
};

export const renameWorkspace = async (id: string, name: string): Promise<void> => {
  const workspaces = await getWorkspaces();
  const index = workspaces.findIndex(w => w.id === id);
  if (index !== -1) {
    workspaces[index].name = name;
    await saveWorkspaces(workspaces);
  }
};

export const deleteWorkspace = async (id: string): Promise<void> => {
  const workspaces = await getWorkspaces();
  const filtered = workspaces.filter(w => w.id !== id);
  await saveWorkspaces(filtered);
};

export const addFileToWorkspace = async (workspaceId: string, fileId: string): Promise<void> => {
  const workspaces = await getWorkspaces();
  const index = workspaces.findIndex(w => w.id === workspaceId);
  if (index !== -1 && !workspaces[index].fileIds.includes(fileId)) {
    workspaces[index].fileIds.push(fileId);
    await saveWorkspaces(workspaces);
  }
};

export const removeFileFromWorkspace = async (workspaceId: string, fileId: string): Promise<void> => {
  const workspaces = await getWorkspaces();
  const index = workspaces.findIndex(w => w.id === workspaceId);
  if (index !== -1) {
    workspaces[index].fileIds = workspaces[index].fileIds.filter(id => id !== fileId);
    await saveWorkspaces(workspaces);
  }
};
