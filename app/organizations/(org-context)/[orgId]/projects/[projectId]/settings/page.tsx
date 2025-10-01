// app/organizations/(org-context)/[orgId]/projects/[projectId]/settings/api-keys/page.tsx
'use client';

import { ApiKeyManagementClient } from '@/components/project/ApiKeyManagementClient';
import { notFound } from 'next/navigation';
import React, { use } from 'react';

// Server Component: Resolves parameters and passes them down.
export default function ApiKeyManagementPage({ params }: {params: Promise<{ orgId: string, projectId: string}>}) {
    const { orgId, projectId } = use(params);

    if (!orgId || !projectId) {
        // IDs are required to scope the API keys correctly.
        notFound();
    }

    // Pass the resolved IDs to the interactive Client Component
    return (
        <ApiKeyManagementClient orgId={orgId} projectId={projectId} />
    );
}