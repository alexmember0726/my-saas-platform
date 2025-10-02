// components/project/ApiKeyManagementClient.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useProjectApiKeys } from '@/hooks/useProjectApiKeys';
import { RotateCcw, Trash2, Check, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/common/Modal'; // Use your existing Modal component
import { NewApiKeyResponse, RotateApiKeyResponse } from '@/types/apikey';
import { CopyToClipboard } from '@/components/common/CopyToClipboard'; // Requires a helper component

// --- State Definitions for Modals ---
type KeyDisplayModalData = NewApiKeyResponse | RotateApiKeyResponse | null;


interface ApiKeyManagementClientProps {
    orgId: string;
    projectId: string;
}

export const ApiKeyManagementClient: React.FC<ApiKeyManagementClientProps> = ({ orgId, projectId }) => {
    const { keys, isLoading, error, createKey, rotateKey, revokeKey } = useProjectApiKeys(projectId);
    
    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [keyToDisplay, setKeyToDisplay] = useState<KeyDisplayModalData>(null);
    const [isRotating, setIsRotating] = useState<string | null>(null);

    // --- Handlers ---
    
    const handleCreateKey = async (name: string) => {
        try {
            const newKeyData = await createKey({ name });
            setKeyToDisplay(newKeyData); // Show the full key/secret
            setIsCreateModalOpen(false);
        } catch (e) {
            alert(`Error creating key: ${(e as Error).message}`);
        }
    };

    const handleRotateKey = async (keyId: string) => {
        if (!confirm("Are you sure you want to rotate this key? The old key will be immediately revoked.")) return;
        
        setIsRotating(keyId);
        try {
            const rotatedKeyData = await rotateKey(keyId);
            setKeyToDisplay(rotatedKeyData); // Show the new full key/secret
        } catch (e) {
            alert(`Error rotating key: ${(e as Error).message}`);
        } finally {
            setIsRotating(null);
        }
    };
    
    const handleRevokeKey = async (keyId: string, name: string) => {
        if (!confirm(`Are you sure you want to revoke key "${name}"? This action cannot be undone and will immediately stop tracking events for this key.`)) return;

        try {
            await revokeKey(keyId);
        } catch (e) {
            alert(`Error revoking key: ${(e as Error).message}`);
        }
    };
    
    const breadcrumbHref = `/organizations/${orgId}/projects/${projectId}/events`;

    if (isLoading) return <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading API keys...</p>
        </div>;
    if (error) return <div className="p-8 text-red-600 text-center">Error: {error}</div>;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            
            {/* Header and Context */}
            <div className="border-b pb-4">
                <Link 
                    href={breadcrumbHref} 
                    className="text-sm text-gray-500 hover:text-indigo-600"
                >
                    &larr; Back to Project Detail
                </Link>
                <div className="flex justify-between items-center mt-2">
                    <h1 className="text-3xl font-bold text-gray-900">API Key Management</h1>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 transition"
                    >
                        Create New Key
                    </button>
                </div>
            </div>

            {/* API Key List */}
            <div className="bg-white shadow-xl rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key / Secret</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="relative px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {keys.map((key) => (
                            <tr key={key.id} className={key.revoked ? 'bg-red-50 opacity-70' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key.name || 'Untitled Key'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <p><code className="bg-gray-100 p-1 rounded text-xs">{key.key}</code></p>
                                    <p><code className="bg-gray-100 p-1 rounded text-xs">{key.secret}</code></p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(key.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${key.revoked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                        {key.revoked ? <AlertTriangle className="w-3 h-3 mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                                        {key.revoked ? 'Revoked' : 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {!key.revoked && (
                                        <button
                                            onClick={() => handleRotateKey(key.id)}
                                            disabled={isRotating === key.id}
                                            className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-1" /> 
                                            {isRotating === key.id ? 'Rotating...' : 'Rotate'}
                                        </button>
                                    )}
                                    {!key.revoked && (
                                        <button
                                            onClick={() => handleRevokeKey(key.id, key.name || 'Untitled Key')}
                                            className="text-red-600 hover:text-red-900 flex items-center justify-end"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" /> Revoke
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal for Creating/Renaming Key */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New API Key"
            >
                <CreateKeyForm onCancel={() => setIsCreateModalOpen(false)} onSubmit={handleCreateKey} />
            </Modal>
            
            {/* Modal for One-Time Key Display (The crucial part) */}
            <Modal
                isOpen={!!keyToDisplay}
                onClose={() => setKeyToDisplay(null)}
                title="API Key Created/Rotated"
            >
                <div className="p-4 space-y-4">
                    <p className="text-red-600 bg-red-50 p-3 rounded border border-red-200">
                        <AlertTriangle className="w-5 h-5 inline mr-2" />
                        **WARNING:** This is the only time you will see the full key and secret. Store them securely!
                    </p>
                    <KeyDetailDisplay label="Public Key (Key)" value={keyToDisplay?.key || ''} />
                    <KeyDetailDisplay label="Private Secret (Secret)" value={keyToDisplay?.secret || ''} isSecret={true} />
                </div>
                <div className="flex justify-end pt-4">
                    <button
                        onClick={() => setKeyToDisplay(null)}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700"
                    >
                        I have saved the keys
                    </button>
                </div>
            </Modal>
        </div>
    );
};

// --- Sub Components ---

const CreateKeyForm: React.FC<{ onCancel: () => void, onSubmit: (name: string) => void }> = ({ onCancel, onSubmit }) => {
    const [name, setName] = useState('');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(name); }} className="space-y-4">
            <div>
                <label htmlFor="keyName" className="block text-sm font-medium text-gray-700">Key Name (Optional)</label>
                <input
                    id="keyName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="e.g., Development Key"
                />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={onCancel} className="text-sm font-medium text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md">Create Key</button>
            </div>
        </form>
    );
};

const KeyDetailDisplay: React.FC<{ label: string, value: string, isSecret?: boolean }> = ({ label, value, isSecret = false }) => (
    <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <div className="flex items-center mt-1 bg-gray-900 text-white rounded-md overflow-hidden">
            <code className={`flex-1 p-3 text-sm ${isSecret ? 'font-mono break-all' : ''}`}>
                {value}
            </code>
            <div className="px-3">
                <CopyToClipboard value={value} />
            </div>
        </div>
    </div>
);