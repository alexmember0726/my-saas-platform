// app/organizations/(org-context)/[orgId]/projects/[projectId]/events/page.tsx
'use client';

import { ProjectEventsClient } from '@/components/project/ProjectEventsClient';
import { notFound } from 'next/navigation';
import React, { use } from 'react';

// Server Component: Resolves parameters and passes them down.
export default function ProjectEventsPage({ params }: {params: Promise<{ orgId: string, projectId: string }>}) {
    
    const { orgId, projectId } = use(params);

    if (!orgId || !projectId) {
        notFound();
    }

    // Pass the resolved IDs and set the main entry point to be the Events view
    return (
        <ProjectEventsClient orgId={orgId} projectId={projectId} />
    );
}