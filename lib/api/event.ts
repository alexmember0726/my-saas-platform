// lib/api/event.ts

import { apiFetch } from './client';
import { EventCountData } from '@/types/project';

export const getDashboardAnalytics = async (organizationId: string): Promise<EventCountData[]> => {
  return apiFetch<EventCountData[]>(`/organizations/${organizationId}/events`);
};