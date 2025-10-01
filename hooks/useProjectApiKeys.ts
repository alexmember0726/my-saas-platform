// hooks/useProjectApiKeys.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiKeyListItem, NewApiKeyResponse, RotateApiKeyResponse } from '@/types/apikey';
import { apiFetch } from '@/lib/api/client';

export interface CreateKeyData {
    name?: string;
}

export const useProjectApiKeys = (projectId: string) => {
    const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- GET LIST: /projects/[projectId]/api-keys ---
    const fetchKeys = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const url = `/projects/${projectId}/api-keys`;
            const data = await apiFetch(url);
            
            // Assume the API response format is directly consumable as ApiKeyListItem[]
            setKeys(data as ApiKeyListItem[]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load API keys.");
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);
    
    // --- CREATE: /projects/[projectId]/api-keys ---
    const createKey = async (data: CreateKeyData) => {
        const url = `/projects/${projectId}/api-keys`;
        const newKeyResponse = await apiFetch(url, {
            method: 'POST',
            body: data,
        }) as NewApiKeyResponse;
        
        // After creation, we must immediately reload the list to get the masked keys
        // Alternatively, we add a mock masked version to the state for immediate UX
        await fetchKeys(); 

        return newKeyResponse; // Return the key/secret for one-time display
    };
    
    // --- ROTATE: /projects/[projectId]/api-keys/[apiKeyId]/rotate ---
    const rotateKey = async (apiKeyId: string) => {
        const url = `/projects/${projectId}/api-keys/${apiKeyId}/rotate`;
        const rotatedKeyResponse = await apiFetch(url, {
            method: 'PUT', // Rotation is usually a POST action
        }) as RotateApiKeyResponse;

        await fetchKeys(); // Refresh the list to reflect the new last 4 chars

        return rotatedKeyResponse; // Return the new key/secret for one-time display
    };

    // --- REVOKE: /projects/[projectId]/api-keys/[apiKeyId]/revoke ---
    const revokeKey = async (apiKeyId: string) => {
        const url = `/projects/${projectId}/api-keys/${apiKeyId}/revoke`;
        await apiFetch(url, {
            method: 'DELETE',
        });
        
        // Update the list immediately
        setKeys(prev => prev.map(k => k.id === apiKeyId ? { ...k, revoked: true } : k));
    };

    return { keys, isLoading, error, createKey, rotateKey, revokeKey, fetchKeys };
};