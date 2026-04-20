import { api } from './api';

export type Project = {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  tags: string[];
  prompt_additions: string;
  is_active: boolean;
};

export function listProjects(brand_id: string) {
  return api<Project[]>(`/v1/projects?brand_id=${encodeURIComponent(brand_id)}`);
}

export function createProject(body: {
  brand_id: string;
  name: string;
  description?: string;
  tags?: string[];
  prompt_additions?: string;
}) {
  return api<Project>('/v1/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateProject(
  projectId: string,
  body: {
    name?: string;
    description?: string;
    tags?: string[];
    prompt_additions?: string;
    is_active?: boolean;
  },
) {
  return api<Project>(`/v1/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
