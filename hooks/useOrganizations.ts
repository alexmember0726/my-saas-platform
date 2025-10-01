// hooks/useOrganizations.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Organization, OrganizationFormData } from '@/types/organization';
import { 
  getOrganizations, 
  createOrganization, 
  updateOrganization, 
  deleteOrganization 
} from '@/lib/api/organization';

interface UseOrganizationsResult {
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  
  create: (data: OrganizationFormData) => Promise<Organization>;
  update: (id: string, data: OrganizationFormData) => Promise<Organization>;
  remove: (id: string) => Promise<void>;
}

export const useOrganizations = (): UseOrganizationsResult => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setFetchTrigger(prev => prev + 1);
  }, []);

  // 1. Fetching Logic
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const list = await getOrganizations();
        setOrganizations(list);
      } catch (err) {
        setError((err as Error).message || 'Failed to fetch organizations.');
        setOrganizations([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchTrigger]);

  // 2. CRUD Wrappers
  const create = useCallback(async (data: OrganizationFormData) => {
    try {
      const newOrg = await createOrganization(data);
      refetch(); // Refresh list after creation
      return newOrg;
    } catch (err) {
      setError((err as Error).message || 'Failed to create organization.');
      throw err;
    }
  }, [refetch]);

  const update = useCallback(async (id: string, data: OrganizationFormData) => {
    try {
      const updatedOrg = await updateOrganization(id, data);
      refetch(); // Refresh list after update
      return updatedOrg;
    } catch (err) {
      setError((err as Error).message || 'Failed to update organization.');
      throw err;
    }
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteOrganization(id);
      refetch(); // Refresh list after deletion
    } catch (err) {
      setError((err as Error).message || 'Failed to delete organization.');
      throw err;
    }
  }, [refetch]);

  return { organizations, isLoading, error, refetch, create, update, remove };
};