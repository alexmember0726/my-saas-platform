// hooks/useOrganizationDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { getProjects } from '@/lib/api/project';
import { Project, EventCountData } from '@/types/project';
import { getDashboardAnalytics } from '@/lib/api/event';

interface DashboardData {
  projects: Project[];
  analytics: EventCountData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useOrganizationDashboard = (orgId: string): DashboardData => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [analytics, setAnalytics] = useState<EventCountData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = () => {
    setFetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [projectList, analyticData] = await Promise.all([
          getProjects(orgId),
          getDashboardAnalytics(orgId)
        ]);
        setProjects(projectList);
        setAnalytics(analyticData);
      } catch (err) {
        // Clear data on failure to prevent stale data display
        setProjects([]); 
        setAnalytics([]);
        setError((err as Error).message || 'Failed to fetch dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fetchTrigger]); // Dependency on fetchTrigger for manual refetch

  return { projects, analytics, isLoading, error, refetch };
};