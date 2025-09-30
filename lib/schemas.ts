import { z } from "zod";
// User
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(50, "Password is too long"),
});

// Organization
export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

// Project
export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  organizationId: z.string().min(1, "organizationId is required"),
  allowedDomains: z.array(z.string()).optional(),
  featureToggles: z.record(z.string(), z.any()).optional()
});

// Project update (partial)
export const updateProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  allowedDomains: z.array(z.string()).optional(),
  featureToggles: z.record(z.string(), z.any()).optional()
});
