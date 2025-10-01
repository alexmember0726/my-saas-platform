import { apiFetch } from "@/lib/api/client";
import { Project, ProjectFormData } from "@/types/project";
import { useCallback, useEffect, useState } from "react";

export const useOrganizationProjects = (orgId: string) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching Logic (GET) ---
    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const url = `/organizations/${orgId}/projects`;
            const data = await apiFetch(url);
            
            setProjects(data as Project[]);
        } catch (err) {
            console.error('Fetch Projects Error:', err);
            setError(err instanceof Error ? err.message : "Failed to load projects.");
        } finally {
            setIsLoading(false);
        }
    }, [orgId]); // Re-fetch only when orgId changes

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);


    // --- CRUD Functions (Mutations) ---

    // API: POST api/projects (create)
    const createProject = async (data: ProjectFormData & { organizationId: string }) => {
        try {
            const newProject = await apiFetch('/api/projects', {
                method: 'POST',
                body: data,
            }) as Project;

            // Optimistically update the UI after a successful API call
            setProjects(prev => [...prev, newProject]);
            return newProject;
        } catch (err) {
            console.error('Create Project Error:', err);
            setError(err instanceof Error ? err.message : "Failed to create project.");
            throw err; // Re-throw to allow the caller (e.g., form) to handle failure
        }
    };

    // API: PUT api/projects/[projectId] (update)
    const updateProject = async (projectId: string, data: ProjectFormData) => {
        try {
            const updatedProject = await apiFetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                body: data,
            }) as Project;
            
            // Update the UI
            setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
            return updatedProject;
        } catch (err) {
            console.error('Update Project Error:', err);
            setError(err instanceof Error ? err.message : "Failed to update project.");
            throw err;
        }
    };

    // API: DELETE api/projects/[projectId] (delete)
    const deleteProject = async (projectId: string) => {
        try {
            await apiFetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
            });
            
            // Update the UI
            setProjects(prev => prev.filter(p => p.id !== projectId));
        } catch (err) {
            console.error('Delete Project Error:', err);
            setError(err instanceof Error ? err.message : "Failed to delete project.");
            throw err;
        }
    };


    return { projects, isLoading, error, createProject, updateProject, deleteProject };
};