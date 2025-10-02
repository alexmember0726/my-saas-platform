// tests/api/organizations/[organizationId]/projects.test.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { GET } from '@/app/api/organizations/[organizationId]/projects/route';

// --- Mock Data ---
const MOCK_USER_ID = 'user_owner_123';
const MOCK_OTHER_USER_ID = 'user_stranger_456';
const MOCK_ORG_ID = 'org_abc_789';

const MOCK_ORGANIZATION = {
    id: MOCK_ORG_ID,
    ownerId: MOCK_USER_ID,
    // Add other minimal fields to satisfy the mock structure
    name: 'Org Name',
};

const MOCK_PROJECTS_LIST = [
    { id: 'proj_001', name: 'Project Alpha', organizationId: MOCK_ORG_ID },
    { id: 'proj_002', name: 'Project Beta', organizationId: MOCK_ORG_ID },
];

// --- Global Module Mocks ---

// Mock Prisma DB
jest.mock('@/lib/db', () => ({
    prisma: {
        organization: {
            findUnique: jest.fn(),
        },
        project: {
            findMany: jest.fn(),
        },
    },
}));


// --- Test Helper Functions ---

// Helper to create the required route parameters object structure
const createMockParams = (organizationId: string) => ({
    params: Promise.resolve({ organizationId }),
});

// Helper to create a Request object with the required 'x-user-id' header
const createMockRequest = (userId: string | null = MOCK_USER_ID) => {
    const headers = new Headers();
    if (userId) {
        headers.set("x-user-id", userId);
    }
    return {
        headers,
        method: 'GET',
    } as unknown as Request;
};


describe('API: /organizations/[organizationId]/projects (GET)', () => {
    
    // Create the parameters object once
    const mockParams = createMockParams(MOCK_ORG_ID);

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default prisma mock for authorization: success finding the organization and owner match
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue(MOCK_ORGANIZATION);
        // Default prisma mock for data retrieval
        (prisma.project.findMany as jest.Mock).mockResolvedValue(MOCK_PROJECTS_LIST);
    });

    // ======================================================================
    // AUTHORIZATION / VALIDATION
    // ======================================================================

    it('should return 401 if x-user-id header is missing', async () => {
        const req = createMockRequest(null);
        const response = await GET(req, mockParams as any); // Use 'as any' to satisfy Promise<params> type

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
        expect(prisma.project.findMany).not.toHaveBeenCalled();
    });

    it('should return 403 if the organization is not found', async () => {
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
        const req = createMockRequest(MOCK_USER_ID);

        const response = await GET(req, mockParams as any); 

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "Forbidden" });
        expect(prisma.project.findMany).not.toHaveBeenCalled();
    });

    it('should return 403 if the user is not the organization owner', async () => {
        const req = createMockRequest(MOCK_OTHER_USER_ID);
        // prisma mock is set to return MOCK_ORGANIZATION (owner: MOCK_USER_ID)

        const response = await GET(req, mockParams as any); 

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "Forbidden" });
        expect(prisma.project.findMany).not.toHaveBeenCalled();
    });

    // ======================================================================
    // SUCCESS SCENARIO
    // ======================================================================

    it('should return 200 and the list of projects if the user is the owner', async () => {
        const req = createMockRequest(MOCK_USER_ID);

        const response = await GET(req, mockParams as any); 

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(MOCK_PROJECTS_LIST);
        
        // Verify authorization check was performed
        expect(prisma.organization.findUnique).toHaveBeenCalledWith({
            where: { id: MOCK_ORG_ID }
        });

        // Verify project fetch was performed with correct filter
        expect(prisma.project.findMany).toHaveBeenCalledWith({
            where: { organizationId: MOCK_ORG_ID },
        });
    });

    // ======================================================================
    // ERROR HANDLING
    // ======================================================================

    it('should throw an unhandled exception if prisma.organization.findUnique throws', async () => {
        // Mock DB call to fail during the authorization step
        (prisma.organization.findUnique as jest.Mock).mockRejectedValue(new Error("Auth DB Failure"));
        const req = createMockRequest(MOCK_USER_ID);

        // Since the handler lacks a try/catch, we assert the promise rejection
        await expect(GET(req, mockParams as any)).rejects.toThrow("Auth DB Failure");
        
        expect(prisma.organization.findUnique).toHaveBeenCalled();
        expect(prisma.project.findMany).not.toHaveBeenCalled();
    });
    
    it('should throw an unhandled exception if prisma.project.findMany throws', async () => {
        // Mock DB call to fail during the data retrieval step
        (prisma.project.findMany as jest.Mock).mockRejectedValue(new Error("Project DB Failure"));
        const req = createMockRequest(MOCK_USER_ID);

        // Since the handler lacks a try/catch, we assert the promise rejection
        await expect(GET(req, mockParams as any)).rejects.toThrow("Project DB Failure");

        // Verify authorization succeeded but project fetch failed
        expect(prisma.organization.findUnique).toHaveBeenCalled();
        expect(prisma.project.findMany).toHaveBeenCalled();
    });
});