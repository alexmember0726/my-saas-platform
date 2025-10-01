// app/organizations/(org-context)/[orgId]/projects/page.tsx
'use client';

import { OrganizationProjectsClient } from '@/components/project/OrganizationProjectsClient';
import { notFound } from 'next/navigation';
import React, { use } from 'react';


// This is a Server Component. It is lean and only responsible for parameter resolution.
export default function OrganizationProjectsPage({ params }: {
    params: Promise<{
        orgId: string;
    }>
}) {
    const { orgId } = use(params);

    if (!orgId) {
        // Should not happen if the Route Group structure is correct, but safe check
        notFound();
    }

    // Pass the resolved orgId to the interactive Client Component
    return (
        <OrganizationProjectsClient orgId={orgId} />
    );
}