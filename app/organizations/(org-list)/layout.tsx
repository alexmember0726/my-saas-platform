// app/organizations/layout.tsx
// This is the parent layout. It only wraps the children, passing null for orgId.
import { OrganizationContextualLayoutClient } from '@/components/organization/OrganizationContextualLayoutClient';
import React from 'react';

// This is a Server Component, but it doesn't have the [orgId] param defined.
export default function OrganizationRootLayout({ children }: { children: React.ReactNode }) {
    // Passes null because we are on the top-level /organizations page
    return (
        <OrganizationContextualLayoutClient orgId={null}>
            {children}
        </OrganizationContextualLayoutClient>
    );
}