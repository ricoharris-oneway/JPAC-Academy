export type LocalToolProject<T extends object = object> = {
  id: string;
  toolType: string;
  title: string;
  notes: string;
  savedAt: string;
  data: T;
};

const STORAGE_KEY = 'jpac.creator-tools.projects.v1';

function readAll(): LocalToolProject[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((item): item is LocalToolProject => Boolean(item && typeof item === 'object')) : [];
}

export function listLocalProjects(toolType: string): LocalToolProject[] {
  return readAll().filter((project) => project.toolType === toolType).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveLocalProject<T extends object>(project: Omit<LocalToolProject<T>, 'id' | 'savedAt'> & { id?: string }): LocalToolProject<T> {
  const projects = readAll();
  const saved: LocalToolProject<T> = {
    ...project,
    id: project.id || crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  const next = projects.filter((item) => item.id !== saved.id);
  next.push(saved);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return saved;
}

export function deleteLocalProject(id: string) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readAll().filter((project) => project.id !== id)));
}

export function projectAsText(project: { title: string; notes: string; savedAt: string; data: object }, toolLabel: string) {
  const details = Object.entries(project.data).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${Array.isArray(value) ? value.join(', ') : String(value ?? '')}`);
  return [`JPAC ${toolLabel} Project`, `Title: ${project.title || 'Untitled project'}`, `Saved: ${new Date(project.savedAt).toLocaleString()}`, `Notes: ${project.notes || 'No notes added'}`, '', ...details].join('\n');
}
