// app/organizations/[orgId]/dashboard/page.tsx
'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, LayoutDashboard } from 'lucide-react'; 

// Assuming these files exist/are used:
import { useOrganizations } from '@/hooks/useOrganizations'; 
import { useOrganizationDashboard } from '@/hooks/useOrganizationDashboard'; // Scoped hook
import { Project } from '@/types/project';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';

// --- Reusable Components (Same as before) ---
const Card = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-100">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
    {children}
  </div>
);

// Link updated to the global project detail route: /projects/[projectId]
const ProjectSummaryCard = ({ project, orgId }: { project: Project, orgId: string }) => (
  <Link href={`/organizations/${orgId}/projects/${project.id}/events`}> 
    <div className="hover:shadow-xl transition-shadow duration-300 p-4 border border-gray-200 rounded-lg cursor-pointer bg-white">
      <h4 className="text-md font-medium text-indigo-600 truncate">{project.name}</h4>
      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{project.description || 'No description provided.'}</p>
      <div className="mt-2 text-xs text-gray-400">
        Domains: {project.allowedDomains.length}
      </div>
    </div>
  </Link>
);
// ---------------------------------------------------------------------------------


export default function OrganizationDashboardPage({ params }: { params: Promise<{ orgId: string }>}) {
  const router = useRouter(); 
  const { orgId } = use(params);

  // Fetch contextual data for this organization
  // Assume this hook returns data SCOPED to the given orgId
  const { 
    projects, 
    analytics, 
    isLoading: isLoadingDashboard, 
    error 
  } = useOrganizationDashboard(orgId); // <-- The hook now takes orgId
  
  // Fetch organization list to get the organization's name
  const { organizations, isLoading: isLoadingOrgs } = useOrganizations();
  const organization = organizations.find(org => org.id === orgId);

  const isLoading = isLoadingDashboard || isLoadingOrgs;
  
  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Dashboard Data...</p>
      </div>
    );
  }

  // Handle case where organization is not found (404/Security)
  if (error || !organization) {
    router.replace('/organizations'); 
    return null; 
  }

  const totalEvents = analytics.reduce((sum, data) => sum + data.count, 0);
  
  // --- Dynamic HREFs ---
  const projectsHref = `/organizations/${orgId}/projects`;
  // -----------------------

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header / Context Title */}
      <div className="border-b pb-4">
        <Link 
          href="/organizations" 
          className="text-sm text-gray-500 hover:text-indigo-600 flex items-center"
        >
           <Briefcase className="w-4 h-4 mr-1" />
           All Organizations
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2 flex items-center space-x-2">
            <LayoutDashboard className="w-7 h-7 text-indigo-600"/>
            <span>{organization.name} Dashboard</span>
        </h1>
      </div>


      {/* 1. Simple Analytics (Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Total Projects">
          {/* Now directly using the length of the SCOPED projects list */}
          <p className="text-4xl font-extrabold text-indigo-600">{projects.length}</p>
        </Card>
        <Card title="Total Events (Last 5 Days)">
          {/* Now using the total events calculated from the SCOPED analytics */}
          <p className="text-4xl font-extrabold text-green-600">{totalEvents.toLocaleString()}</p>
        </Card>
        <Card title="Organization ID">
          {/* Retaining the Org ID for quick reference */}
          <p className="text-xl font-extrabold text-gray-500 truncate mt-2">{orgId}</p>
        </Card>
      </div>

      {/* 2. Analytics Chart/Table Area */}
      <Card title="Event Counts Over Time">
        <AnalyticsChart data={analytics} />
      </Card>

      {/* 3. Projects List Summary */}
      <Card title="Your Latest Projects">
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {projects.slice(0, 8).map(project => (
              <ProjectSummaryCard key={project.id} project={project} orgId={orgId} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            This organization doesn't have any projects yet. 
            <Link href={projectsHref} className="text-indigo-600 font-medium hover:underline ml-1">
              Create one now.
            </Link>
          </div>
        )}
        
        {projects.length > 8 && (
            <div className="mt-6 text-right">
              <Link 
                href={projectsHref}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View All Projects &rarr;
              </Link>
            </div>
        )}
      </Card>
    </div>
  );
}