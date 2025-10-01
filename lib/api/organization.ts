// lib/api/organization.ts

import { apiFetch } from './client';
import { Organization, OrganizationFormData } from '@/types/organization';

/**
 * Corresponds to: GET /api/organizations
 */
export const getOrganizations = async (): Promise<Organization[]> => {
  return apiFetch<Organization[]>('/organizations');
};

/**
 * Corresponds to: POST /api/organizations
 */
export const createOrganization = async (data: OrganizationFormData): Promise<Organization> => {
  return apiFetch<Organization>('/organizations', {
    method: 'POST',
    body: data,
  });
};

/**
 * Corresponds to: PUT /api/organizations/[organizationId]
 */
export const updateOrganization = async (id: string, data: OrganizationFormData): Promise<Organization> => {
  return apiFetch<Organization>(`/organizations/${id}`, {
    method: 'PUT',
    body: data,
  });
};

/**
 * Corresponds to: DELETE /api/organizations/[organizationId]
 */
export const deleteOrganization = async (id: string): Promise<void> => {
  // Assuming a 204 No Content response for successful deletion
  await apiFetch<void>(`/organizations/${id}`, {
    method: 'DELETE',
  });
};