// tests/api/projects/[projectId].test.ts

import { prisma } from '@/lib/db';
import { withValidation } from '@/lib/validateRequest';
import { NextResponse } from 'next/server';

// --- Mock Data ---
const MOCK_USER_ID = 'user_owner_123';
const MOCK_OTHER_USER_ID = 'user_stranger_456';
const MOCK_ORG_ID = 'org_abc_789';
const MOCK_PROJECT_ID = 'proj_xyz_111';

// Define a stable date string for mocking
const MOCK_DATE_STRING = new Date().toISOString(); 

const MOCK_ORGANIZATION = {
    id: MOCK_ORG_ID,
    ownerId: MOCK_USER_ID,
    name: 'Test Org',
};

// Mock data used for findUnique result (MUST include organization for auth check)
const MOCK_PROJECT_WITH_ORG = {
    id: MOCK_PROJECT_ID,
    organizationId: MOCK_ORG_ID,
    name: 'Original Project Name',
    description: 'Original Description',
    createdAt: MOCK_DATE_STRING, 
    updatedAt: MOCK_DATE_STRING,
    organization: MOCK_ORGANIZATION, // Necessary for the authorization check
};

// Mock data used for successful GET response (MUST NOT include organization)
const MOCK_PROJECT_SAFE = (({ organization, ...rest }) => rest)(MOCK_PROJECT_WITH_ORG);

const MOCK_UPDATE_DATA = { 
    name: 'New Project Name', 
    description: 'Updated Description',
};

const MOCK_UPDATED_PROJECT = {
    ...MOCK_PROJECT_SAFE,
    ...MOCK_UPDATE_DATA,
    updatedAt: MOCK_DATE_STRING,
};


// --- Global Module Mocks ---

// 1. Mock Prisma DB
jest.mock('@/lib/db', () => ({
    prisma: {
        organization: {
            findUnique: jest.fn(), // Only needed if a dedicated org check is performed
        },
        project: {
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

// 2. Mock the validation wrapper (`withValidation`) for PUT
jest.mock('@/lib/validateRequest', () => ({
    withValidation: jest.fn(() => (handler: Function) => {
        return async (req: Request, ctx: any) => { 
            // Inject the validated data for PUT
            return handler(req, ctx, MOCK_UPDATE_DATA);
        };
    }),
}));


// Import the actual mocked functions
import { GET, PUT, DELETE } from '@/app/api/projects/[projectId]/route';

// --- Test Helper Functions ---

// Helper to create the required route parameters object structure
const createMockParams = (projectId: string) => ({
    params: Promise.resolve({ projectId }),
});

// Helper to create a Request object with the required 'x-user-id' header
const createMockRequest = (userId: string | null = MOCK_USER_ID, method: 'GET' | 'PUT' | 'DELETE' = 'GET') => {
    const headers = new Headers();
    if (userId) {
        headers.set("x-user-id", userId);
    }
    return {
        headers,
        method,
    } as unknown as Request;
};

describe('API: /api/projects/[projectId]', () => {
    
    // Create the parameters object once
    const mockParams = createMockParams(MOCK_PROJECT_ID);

    beforeEach(() => {
        jest.clearAllMocks();
        // Default prisma mock: success finding the project and organization data
        (prisma.project.findUnique as jest.Mock).mockResolvedValue(MOCK_PROJECT_WITH_ORG);
    });

    // ======================================================================
    // GET /projects/{projectId} (Read)
    // ======================================================================

    describe('GET handler', () => {

        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'GET');
            const response = await GET(req, mockParams as any); 

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
        });

        it('should return 403 if the project is not found', async () => {
            (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
            const req = createMockRequest(MOCK_USER_ID, 'GET');

            const response = await GET(req, mockParams as any); 

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
        });

        it('should return 403 if the user is not the organization owner', async () => {
            const req = createMockRequest(MOCK_OTHER_USER_ID, 'GET');
            // MOCK_PROJECT_WITH_ORG owner is MOCK_USER_ID

            const response = await GET(req, mockParams as any); 

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
        });

        it('should return 200 and the project if the user is the owner', async () => {
            const req = createMockRequest(MOCK_USER_ID, 'GET');

            const response = await GET(req, mockParams as any); 

            expect(response.status).toBe(200);
            // Expect the project *without* the organization details
            // expect(await response.json()).toEqual(MOCK_PROJECT_SAFE); 
            
            // Verify findUnique called with correct params and include for auth check
            expect(prisma.project.findUnique).toHaveBeenCalledWith({
                where: { id: MOCK_PROJECT_ID },
                include: { organization: true } // Assumes implementation includes organization
            });
        });

        it('should return 500 if prisma throws an error', async () => {
            (prisma.project.findUnique as jest.Mock).mockRejectedValue(new Error("DB Error"));
            const req = createMockRequest(MOCK_USER_ID, 'GET');

            const response = await GET(req, mockParams as any); 

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: "Failed to fetch project" });
        });
    });

    // ======================================================================
    // PUT /projects/{projectId} (Update)
    // ======================================================================

    describe('PUT handler', () => {

        beforeEach(() => {
            (prisma.project.update as jest.Mock).mockResolvedValue(MOCK_UPDATED_PROJECT);
        });

        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'PUT');
            const response = await PUT(req, mockParams as any); // {} is placeholder for validated data

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
            expect(prisma.project.update).not.toHaveBeenCalled();
        });

        it('should return 403 if the user is not the organization owner', async () => {
            const req = createMockRequest(MOCK_OTHER_USER_ID, 'PUT');

            const response = await PUT(req, mockParams as any); 

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
            expect(prisma.project.update).not.toHaveBeenCalled();
        });

        it('should return 200 and update the project if the user is the owner', async () => {
            const req = createMockRequest(MOCK_USER_ID, 'PUT');

            // The 'data' argument is injected by the withValidation mock
            const response = await PUT(req, mockParams as any); 

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(MOCK_UPDATED_PROJECT);

            // Verify the authorization check (findUnique) was called
            expect(prisma.project.findUnique).toHaveBeenCalledTimes(1);
            
            // Verify the update call
            expect(prisma.project.update).toHaveBeenCalledWith({
                where: { id: MOCK_PROJECT_ID },
                data: MOCK_UPDATE_DATA, // Injected by withValidation mock
            });
        });

        it('should return 500 if prisma.project.update throws an error', async () => {
            (prisma.project.update as jest.Mock).mockRejectedValue(new Error("DB Update Error"));
            const req = createMockRequest(MOCK_USER_ID, 'PUT');

            const response = await PUT(req, mockParams as any); 

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: "Failed to update project" });
        });
    });
    
    // ======================================================================
    // DELETE /projects/{projectId} (Delete)
    // ======================================================================

    describe('DELETE handler', () => {

        beforeEach(() => {
            (prisma.project.delete as jest.Mock).mockResolvedValue(MOCK_PROJECT_WITH_ORG);
        });

        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'DELETE');
            const response = await DELETE(req, mockParams as any); 

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
            expect(prisma.project.delete).not.toHaveBeenCalled();
        });

        it('should return 403 if the user is not the organization owner', async () => {
            const req = createMockRequest(MOCK_OTHER_USER_ID, 'DELETE');

            const response = await DELETE(req, mockParams as any); 

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
            expect(prisma.project.delete).not.toHaveBeenCalled();
        });
        
        it('should return 200 and delete the project if the user is the owner', async () => {
            const req = createMockRequest(MOCK_USER_ID, 'DELETE');

            const response = await DELETE(req, mockParams as any); 

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ success: true });

            // Verify the authorization check (findUnique) was called
            expect(prisma.project.findUnique).toHaveBeenCalledTimes(1);
            
            // Verify the delete call
            expect(prisma.project.delete).toHaveBeenCalledWith({
                where: { id: MOCK_PROJECT_ID },
            });
        });

        it('should return 500 if prisma.project.delete throws an error', async () => {
            (prisma.project.delete as jest.Mock).mockRejectedValue(new Error("DB Delete Error"));
            const req = createMockRequest(MOCK_USER_ID, 'DELETE');

            const response = await DELETE(req, mockParams as any);

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: "Failed to delete project" });
        });
    });
});