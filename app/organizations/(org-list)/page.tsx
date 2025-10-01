// app/organizations/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Pencil, Trash2 } from 'lucide-react';

// Assuming these files exist from previous steps:
import { useOrganizations } from '@/hooks/useOrganizations';
import { Organization, OrganizationFormData } from '@/types/organization'; // <-- Ensure OrganizationFormData is imported
import { OrganizationForm } from '@/components/organization/OrganizationForm';
import { formatDate } from '@/utils/date';
import { Modal } from '@/components/common/Modal';


export default function OrganizationsPage() {
    const router = useRouter();
    const { organizations, isLoading, error, create, update, remove } = useOrganizations();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

    // --- CORRECTED Placeholder Logic ---
    // The input parameter must be OrganizationFormData, which the form provides.
    const handleCreate = async (data: OrganizationFormData) => {
        console.log('Creating', data);
        await create(data);
        closeModal();
    };

    const handleUpdate = async (id: string, data: OrganizationFormData) => {
        console.log('Updating', id, data);
        await update(id, data);
        closeModal();
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete organization "${name}"? This action cannot be undone.`)) {
            remove(id); 
            console.log('Deleting', id);
        }
    };

    const openEditModal = (org: Organization) => { setIsModalOpen(true); setEditingOrg(org); };
    const closeModal = () => { setIsModalOpen(false); setEditingOrg(null); };
    // ------------------------------------

    if (isLoading) {
        return <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Organizations...</p>
        </div>;
    }

    // --- Click Handler: Navigates to the specific organization's dashboard ---
    const handleOrgClick = (orgId: string) => {
        router.push(`/organizations/${orgId}/dashboard`);
    };
    // ------------------------------------------------------------------------

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Your Organizations</h1>
                <button
                    onClick={() => { setIsModalOpen(true); setEditingOrg(null); }}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 transition"
                >
                    <Briefcase className="w-4 h-4 mr-1" />
                    + New Organization
                </button>
            </div>

            {error && <p className="text-md text-red-600 bg-red-50 p-3 rounded-md">Error: {error}</p>}

            {/* Organization Cards (remains the same) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {organizations.length === 0 ? (
                    <p className="col-span-full text-center text-gray-500 py-10 bg-white rounded-xl shadow-md">
                        No organizations found. Click **'+ New Organization'** to create one.
                    </p>
                ) : (
                    organizations.map((org) => (
                        <div
                            key={org.id}
                            className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition duration-150 ease-in-out cursor-pointer group"
                        >
                            {/* Card Body - Clickable Area */}
                            <div
                                className="p-6"
                                onClick={() => handleOrgClick(org.id)}
                            >
                                <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                    {org.name}
                                </h2>
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{org.description || 'No description provided.'}</p>
                            </div>

                            {/* Card Footer - Actions (remains the same) */}
                            <div className="flex justify-between items-center px-6 py-3 border-t bg-gray-50 rounded-b-xl">
                                <span className="text-xs text-gray-500">
                                    Created: **{formatDate(org.createdAt)}**
                                </span>
                                <div className="space-x-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditModal(org); }}
                                        className="flex items-center text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                                    >
                                        <Pencil className="w-3 h-3 mr-1" /> Edit
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(org.id, org.name); }}
                                        className="flex items-center text-red-600 hover:text-red-900 text-xs font-medium"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Organization Creation/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingOrg ? `Edit ${editingOrg.name}` : 'Create New Organization'}
            >
                <OrganizationForm
                    initialData={editingOrg || undefined}
                    // The onSubmit types are now correctly OrganizationFormData
                    onSubmit={editingOrg ? (data) => handleUpdate(editingOrg.id, data) : handleCreate}
                    onCancel={closeModal} isSubmitting={false} />
            </Modal>
        </div>
    );
}