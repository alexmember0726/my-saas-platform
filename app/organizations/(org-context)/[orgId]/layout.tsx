// app/organizations/[orgId]/layout.tsx
// This SC resolves the ID and passes it to the CC shell.
import { OrganizationContextualLayoutClient } from '@/components/organization/OrganizationContextualLayoutClient';
import React, { use } from 'react';

export default function OrganizationContextualLayout({ children, params }: {
    children: React.ReactNode,
    params: Promise<{ orgId: string }>
}) {
    const { orgId } = use(params);
    return (
        <OrganizationContextualLayoutClient orgId={orgId}>
            {children}
        </OrganizationContextualLayoutClient>
    );
}