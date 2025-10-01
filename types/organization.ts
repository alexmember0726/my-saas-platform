// types/organization.ts

export interface Organization {
  id: string;
  name: string;
  description: string | null; // Based on 'String?' in schema
  ownerId: string; // New field from schema
  projects: any[]; // Placeholder for related projects (not fetched here)
  createdAt: string; // DateTime, usually stringified
  updatedAt: string; // DateTime, usually stringified
}

// Type for the data required to create or update an Organization
// When creating, the backend often infers ownerId from the authenticated user's JWT.
// We only need to send 'name' and 'description' from the frontend form.
export type OrganizationFormData = {
  name: string;
  description: string | null; // Allow null for optional field
};