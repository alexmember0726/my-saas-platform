// lib/api/project.ts

import { apiFetch } from './client';
import { Project, ProjectFormData } from '@/types/project';

/**
 * Corresponds to: GET /api/projects - Gets a list of all projects the user can access.
 */
export const getProjects = async (organizationId: string): Promise<Project[]> => {
  return apiFetch<Project[]>(`/organizations/${organizationId}/projects`);
};

/**
 * Corresponds to: GET /api/projects/[projectId] - Gets a single project's details.
 */
export const getProjectDetails = async (id: string): Promise<Project> => {
  return apiFetch<Project>(`/projects/${id}`);
};

/**
 * Helper to transform ProjectFormData domains string to array for the API.
 */
const transformFormData = (data: ProjectFormData) => ({
    ...data,
    allowedDomains: data.allowedDomains.map(d => d.trim()).filter(d => d.length > 0),
    description: data.description === '' ? null : data.description // Ensure empty string becomes null if backend expects it
});

/**
 * Corresponds to: POST /api/projects
 */
export const createProject = async (data: ProjectFormData): Promise<Project> => {
  const apiData = transformFormData(data);
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: apiData,
  });
};

/**
 * Corresponds to: PUT /api/projects/[projectId]
 */
export const updateProject = async (id: string, data: ProjectFormData): Promise<Project> => {
  // NOTE: organizationId is included but often ignored by the backend on PUT/UPDATE
  const apiData = transformFormData(data);
  return apiFetch<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: apiData,
  });
};

/**
 * Corresponds to: DELETE /api/projects/[projectId]
 */
export const deleteProject = async (id: string): Promise<void> => {
  await apiFetch<void>(`/projects/${id}`, {
    method: 'DELETE',
  });
};