// components/project/ProjectForm.tsx
'use client';

import React, { useState } from 'react';
import { Project, ProjectFormData } from '@/types/project';

interface ProjectFormProps {
    initialData?: Project;
    orgId: string;
    onSubmit: (data: ProjectFormData) => void;
    onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, orgId, onSubmit, onCancel }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    // Simple state for allowed domains (will be joined/split on submit/load)
    const [allowedDomains, setAllowedDomains] = useState(initialData?.allowedDomains.join(', ') || '');
    const isEdit = !!initialData;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Simple data validation
        if (!name.trim()) {
            alert("Project name is required.");
            return;
        }

        const domainArray = allowedDomains
            .split(',')
            .map(d => d.trim())
            .filter(d => d.length > 0);

        const formData: ProjectFormData = {
            organizationId: orgId,
            name: name.trim(),
            description: description.trim(),
            allowedDomains: domainArray,
        };
        
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name</label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
            </div>
            <div>
                <label htmlFor="domains" className="block text-sm font-medium text-gray-700">Allowed Domains (Comma separated)</label>
                <input
                    id="domains"
                    type="text"
                    value={allowedDomains}
                    onChange={(e) => setAllowedDomains(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="e.g., app.example.com, www.another.com"
                />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                >
                    {isEdit ? 'Save Changes' : 'Create Project'}
                </button>
            </div>
        </form>
    );
};