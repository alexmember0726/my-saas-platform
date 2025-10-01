// components/organizations/OrganizationProjectsClient.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Code } from 'lucide-react';

// Assuming these files/hooks exist:
import { useOrganizations } from '@/hooks/useOrganizations';
import { useOrganizationProjects } from '@/hooks/useOrganizationProjects'; // Fetches and Mutates projects for a given orgId
import { Project, ProjectFormData } from '@/types/project';
import { ProjectForm } from '@/components/project/ProjectForm';
import { Modal } from '@/components/common/Modal';

// --- Dummy Component (Replace with your actual card/ui component) ---
const ProjectCard = ({ project, onEdit, onDelete }: {
    project: Project,
    onEdit: (p: Project) => void,
    onDelete: (id: string, name: string) => void
}) => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition duration-150 ease-in-out group">
        <Link
            href={`/organizations/${project.organizationId}/projects/${project.id}/events`}
            className="p-6 block"
        >
            <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                {project.name}
            </h2>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{project.description || 'No description provided.'}</p>
        </Link>
        <div className="flex justify-end items-center px-6 py-3 border-t bg-gray-50 rounded-b-xl space-x-3">
            <button
                onClick={() => onEdit(project)}
                className="flex items-center text-indigo-600 hover:text-indigo-900 text-xs font-medium"
            >
                <Pencil className="w-3 h-3 mr-1" /> Edit
            </button>
            <button
                onClick={() => onDelete(project.id, project.name)}
                className="flex items-center text-red-600 hover:text-red-900 text-xs font-medium"
            >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
            </button>
        </div>
    </div>
);
// ------------------------------------------------------------------

interface OrganizationProjectsClientProps {
    orgId: string;
}


export const OrganizationProjectsClient: React.FC<OrganizationProjectsClientProps> = ({ orgId }) => {

    // State for modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    // Data fetching & Mutations
    const {
        projects = [], // Default to empty array
        isLoading: isLoadingProjects,
        error: projectsError,
        createProject,
        updateProject,
        deleteProject
    } = useOrganizationProjects(orgId);

    // Fetch the organization name for the header title
    const { organizations = [], isLoading: isLoadingOrgs } = useOrganizations();
    const organization = organizations.find(org => org.id === orgId);

    const isLoading = isLoadingProjects || isLoadingOrgs;

    // Handlers
    const openCreateModal = () => { setEditingProject(null); setIsModalOpen(true); };
    const openEditModal = (project: Project) => { setEditingProject(project); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingProject(null); };

    const handleCreate = async (data: ProjectFormData) => {
        // Ensure the new project is correctly linked to the current orgId
        await createProject({ ...data, organizationId: orgId });
        closeModal();
    };

    const handleUpdate = async (data: ProjectFormData) => {
        if (!editingProject) return;
        // The hook logic should handle the update for the specific project ID
        await updateProject(editingProject.id, data);
        closeModal();
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete project "${name}"? This cannot be undone.`)) {
            deleteProject(id);
        }
    };

    if (isLoading) {
        return <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Projects...</p>
        </div>;
    }

    if (projectsError || !organization) {
        return <div className="text-center py-10 text-red-600">Could not load organization or projects.</div>;
    }

    const orgDashboardHref = `/organizations/${orgId}/dashboard`;

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Header / Context Title */}
            <div className="border-b pb-4">
                <Link
                    href={orgDashboardHref}
                    className="text-sm text-gray-500 hover:text-indigo-600 flex items-center"
                >
                    &larr; Back to {organization.name} Dashboard
                </Link>
                <div className="flex justify-between items-center mt-2">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
                        <Code className="w-7 h-7 text-indigo-600" />
                        <span>{organization.name} Projects ({projects.length})</span>
                    </h1>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 transition flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        New Project
                    </button>
                </div>
            </div>

            {/* Projects List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {projects.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-md border border-gray-100 text-gray-500">
                        No projects found.
                    </div>
                ) : (
                    projects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onEdit={openEditModal}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            {/* Project Creation/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingProject ? `Edit ${editingProject.name}` : `New Project for ${organization.name}`}
            >
                <ProjectForm
                    initialData={editingProject || undefined}
                    orgId={orgId}
                    onSubmit={editingProject ? handleUpdate : handleCreate}
                    onCancel={closeModal}
                />
            </Modal>
        </div>
    );
};