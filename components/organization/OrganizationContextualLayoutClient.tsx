// components/organizations/OrganizationContextualLayoutClient.tsx
'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

interface OrganizationContextualLayoutClientProps {
    children: React.ReactNode;
    // orgId is passed as a simple string or null from the server component
    orgId: string | null; 
}

export function OrganizationContextualLayoutClient({ children, orgId }: OrganizationContextualLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // The activeOrgId is now correctly resolved in the Server Component and passed down
    const activeOrgId = orgId;
    
    console.log("activeOrgId (Client)", activeOrgId); 
    
    // Sidebar logic applies whether orgId is null or present
    const contentShiftClass = isSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'; 

    return (
        <div className="min-h-screen bg-gray-50">
            
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)}
                // This will be a string ID (on dashboard) or null (on list page)
                organizationId={activeOrgId} 
            />

            <div className={`transition-all duration-300 ${contentShiftClass}`}>
                
                <Header 
                    isSidebarOpen={isSidebarOpen} 
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                />
                
                <main className="py-8 px-4 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}