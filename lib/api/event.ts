// lib/api/project.ts

import { apiFetch } from './client';
import { Project, EventCountData } from '@/types/project';

/**
 * Fetches a list of all projects for the authenticated user.
 * Corresponds to: GET /api/projects
 */
export const getDashboardAnalytics = async (organizationId: string): Promise<EventCountData[]> => {
  return apiFetch<EventCountData[]>(`/organizations/${organizationId}/events`);
};