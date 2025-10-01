// types/project.ts (Updated to reflect Prisma Schema)

// The main Project structure
export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  allowedDomains: string[];
  featureToggles: Record<string, any> | null;
  apiKeys: string[]; 
  isArchived: boolean; // Assuming this exists for project lifecycle
  createdAt: string; 
}

// Data required for creation/update from the form (No change needed here)
export type ProjectFormData = {
  organizationId: string;
  name: string;
  description: string | null;
  allowedDomains: string[]; // Stored as a comma-separated string from the form
};

// Data returned after regenerating a key (No change needed here)
export interface ApiKeyResponse {
  newApiKey: string;
}

// Analytics type (from previous steps)
export interface EventCountData {
  date: string; // YYYY-MM-DD
  count: number;
}