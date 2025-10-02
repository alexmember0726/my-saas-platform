// components/project/ProjectEventsClient.tsx
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { List, AlertTriangle, Key } from 'lucide-react';
import { useOrganizationProjects } from '@/hooks/useOrganizationProjects';
import { useProjectEvents } from '@/hooks/useProjectEvents'; // NEW HOOK for fetching events
// Assuming you use a library like 'react-window' or 'react-virtual' for virtualization
// For this example, we'll implement a simplified manual scroll/pagination structure
import { VirtualizedEventList } from '@/components/project/VirtualizedEventList'; 

interface ProjectEventsClientProps {
    orgId: string;
    projectId: string;
}

export function ProjectEventsClient({ orgId, projectId }: ProjectEventsClientProps) {
    // 1. Get Project Context (e.g., project name)
    const { projects = [], isLoading: isLoadingProjects } = useOrganizationProjects(orgId);
    const project = projects.find(p => p.id === projectId);
    
    // 2. Events Fetching Hook (Infinite Scroll Logic)
    const { 
        events, 
        isLoading: isLoadingEvents, 
        isFetchingNextPage, 
        error, 
        hasNextPage, 
        fetchNextPage 
    } = useProjectEvents(projectId);

    // Combine event pages into a single flat array for virtualization
    const flatEvents = useMemo(() => events.flatMap(page => page), [events]);

    // --- Dynamic Paths ---
    const projectsListHref = `/organizations/${orgId}/projects`;
    const apiKeysHref = `/organizations/${orgId}/projects/${projectId}/settings`;
    // -----------------------

    // --- Loading & Error States ---
    if (isLoadingProjects || !project) {
        return <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Project...</p>
        </div>;
    }
    
    if (error) {
        return <div className="text-center py-10 text-red-600">Error: {error}</div>;
    }
    
    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header / Navigation */}
            <div className="border-b pb-4">
                <Link 
                    href={projectsListHref} 
                    className="text-sm text-gray-500 hover:text-indigo-600 flex items-center"
                >
                    &larr; Back to Projects List
                </Link>
                <div className="flex justify-between items-center mt-2">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
                        <List className="w-7 h-7 text-indigo-600"/>
                        <span>{project.name} Events</span>
                    </h1>
                    
                    {/* API Keys Button */}
                    <Link
                        href={apiKeysHref}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 transition flex items-center"
                    >
                        <Key className="w-4 h-4 mr-1" />
                        API Keys
                    </Link>
                </div>
                <p className="text-sm text-gray-500 mt-1">{project.description}</p>
            </div>

            {/* Event Table Area */}
            <div className="min-h-[500px] bg-white shadow-xl rounded-xl">
                <VirtualizedEventList 
                    events={flatEvents}
                    hasNextPage={hasNextPage}
                    loadNextPage={fetchNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    initialLoading={isLoadingEvents}
                />
            </div>
            
            {/* Displaying API Key Status */}
            {project.apiKeys?.length === 0 && (
                 <div className="flex items-center p-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 border border-yellow-200" role="alert">
                    <AlertTriangle className="flex-shrink-0 inline w-4 h-4 mr-3" />
                    <div>
                        No **API Keys** are currently configured for this project. Events cannot be tracked without an active key.
                    </div>
                </div>
            )}
        </div>
    );
}