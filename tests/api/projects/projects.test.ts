// tests/api/projects.test.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withValidation } from '@/lib/validateRequest';
// We will dynamically import the actual GET/POST handlers later

// --- Mock Data ---
const MOCK_USER_ID = 'user_owner_123';
const MOCK_OTHER_USER_ID = 'user_stranger_456';
const MOCK_ORG_ID = 'org_abc_789';

const MOCK_ORGANIZATION = {
    id: MOCK_ORG_ID,
    ownerId: MOCK_USER_ID,
    name: 'Org Name',
    // Minimal fields for auth check
};

const MOCK_PROJECT_ID = 'proj_xyz_111';
const MOCK_PROJECT_NAME = 'My New Project';

const MOCK_PROJECT_DATA = {
    name: MOCK_PROJECT_NAME,
    description: 'A test project.',
    organizationId: MOCK_ORG_ID,
    allowedDomains: ['localhost:3000'],
    featureToggles: { dark_mode: true },
};

const MOCK_CREATED_PROJECT = {
    id: MOCK_PROJECT_ID,
    ...MOCK_PROJECT_DATA,
    createdAt: new Date().toISOString(),
};

const MOCK_PROJECTS_LIST = [
    MOCK_CREATED_PROJECT,
    { id: 'proj_222', name: 'Another Project', organizationId: MOCK_ORG_ID },
];

// --- Global Module Mocks (Must be at the top level) ---

// 1. Mock Prisma DB
jest.mock('@/lib/db', () => ({
    prisma: {
        organization: {
            findUnique: jest.fn(),
        },
        project: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));

// 2. Mock the validation wrapper (`withValidation`) for POST
jest.mock('@/lib/validateRequest', () => ({
    withValidation: jest.fn(() => (handler: Function) => {
        return async (req: Request, ctx: any) => { 
            // Inject the validated data
            return handler(req, ctx, MOCK_PROJECT_DATA);
        };
    }),
}));

// --- Test Execution Setup ---
let POST_HANDLER: (req: Request, ctx: any) => Promise<NextResponse>;
let GET_HANDLER: (req: Request) => Promise<NextResponse>;

// Helper to create a Request object with the required 'x-user-id' header
const createMockRequest = (userId: string | null = MOCK_USER_ID, method: 'GET' | 'POST' = 'GET') => {
    const headers = new Headers();
    if (userId) {
        headers.set("x-user-id", userId);
    }
    
    return {
        headers,
        method,
    } as unknown as Request;
};


describe('API: /api/projects', () => {
    
    // ⭐️ Dynamically load handlers AFTER all mocks are defined ⭐️
    beforeAll(async () => {
        const module = await import('@/app/api/projects/route');
        POST_HANDLER = module.POST as any;
        GET_HANDLER = module.GET as any;
    });
    
    const mockContext = {}; // Placeholder context object

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default mocks for POST authorization check
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue(MOCK_ORGANIZATION);
    });

    // ======================================================================
    // POST /projects (Create)
    // ======================================================================

    describe('POST /projects (Create Project)', () => {

        beforeEach(() => {
            // Default mock for successful creation
            (prisma.project.create as jest.Mock).mockResolvedValue(MOCK_CREATED_PROJECT);
        });

        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'POST');
            
            const response = await POST_HANDLER(req, mockContext); 

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
            expect(prisma.organization.findUnique).not.toHaveBeenCalled();
            expect(prisma.project.create).not.toHaveBeenCalled();
        });

        it('should return 403 if the organization is not found', async () => {
            (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
            const req = createMockRequest(MOCK_USER_ID, 'POST');

            const response = await POST_HANDLER(req, mockContext); 

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
            expect(prisma.project.create).not.toHaveBeenCalled();
        });

        it('should return 403 if the user is not the organization owner', async () => {
            const req = createMockRequest(MOCK_OTHER_USER_ID, 'POST');
            // MOCK_ORGANIZATION owner is MOCK_USER_ID

            const response = await POST_HANDLER(req, mockContext); 

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
            expect(prisma.project.create).not.toHaveBeenCalled();
        });

        it('should return 200 and create the project if authorized', async () => {
            const req = createMockRequest(MOCK_USER_ID, 'POST');

            const response = await POST_HANDLER(req, mockContext);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(MOCK_CREATED_PROJECT);

            // Verify organization check
            expect(prisma.organization.findUnique).toHaveBeenCalledWith({
                where: { id: MOCK_ORG_ID }
            });

            // Verify creation call used the injected data
            expect(prisma.project.create).toHaveBeenCalledWith({
                data: MOCK_PROJECT_DATA
            });
        });

        it('should throw an unhandled exception if prisma.project.create fails', async () => {
            (prisma.project.create as jest.Mock).mockRejectedValue(new Error("DB Create Error"));
            const req = createMockRequest(MOCK_USER_ID, 'POST');
            
            // Should pass the authorization check, but fail on creation
            await expect(POST_HANDLER(req, mockContext)).rejects.toThrow("DB Create Error");

            expect(prisma.project.create).toHaveBeenCalled();
        });
    });

    // ======================================================================
    // GET /projects (List)
    // ======================================================================
    
    describe('GET /projects (List Projects)', () => {

        beforeEach(() => {
            (prisma.project.findMany as jest.Mock).mockResolvedValue(MOCK_PROJECTS_LIST);
        });
        
        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'GET');
            const response = await GET_HANDLER(req); 

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
            expect(prisma.project.findMany).not.toHaveBeenCalled();
        });
        
        it('should return 200 and a list of all projects owned by the user\'s organizations', async () => {
            const req = createMockRequest(MOCK_USER_ID, 'GET');
            
            const response = await GET_HANDLER(req);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(MOCK_PROJECTS_LIST);

            // Verify that the query filtered by the correct nested ownerId
            expect(prisma.project.findMany).toHaveBeenCalledWith({
                where: { organization: { ownerId: MOCK_USER_ID } },
                include: { apiKeys: false },
            });
        });

        it('should throw an unhandled exception if prisma.project.findMany throws an error', async () => {
            (prisma.project.findMany as jest.Mock).mockRejectedValue(new Error("DB Fetch Error"));
            const req = createMockRequest(MOCK_USER_ID, 'GET');

            // Assert that the promise rejects, as the handler lacks a try/catch
            await expect(GET_HANDLER(req)).rejects.toThrow("DB Fetch Error");
        });
    });
});