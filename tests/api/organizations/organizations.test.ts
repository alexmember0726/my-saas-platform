// tests/api/organizations.test.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// --- Mock Data ---
const MOCK_USER_ID = 'user_abc_123';
const MOCK_ORG_ID = 'org_xyz_456';
const MOCK_ORG_NAME = 'Test Org Name';
const MOCK_ORG_DESCRIPTION = 'Test Org Description';

const MOCK_VALIDATED_DATA = { 
    name: MOCK_ORG_NAME, 
    description: MOCK_ORG_DESCRIPTION,
};

const MOCK_CREATED_ORGANIZATION = {
    id: MOCK_ORG_ID,
    name: MOCK_ORG_NAME,
    description: MOCK_ORG_DESCRIPTION,
    ownerId: MOCK_USER_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const MOCK_ORGANIZATION_LIST = [
    { ...MOCK_CREATED_ORGANIZATION, projects: [] },
    { 
        id: 'org_789', 
        name: 'Second Org', 
        ownerId: MOCK_USER_ID, 
        projects: [{ id: 'proj_1', name: 'P1' }] 
    },
];

// --- Global Module Mocks (Must be at the top level before dynamic imports) ---

// 1. Mock Prisma DB (Organization model only)
jest.mock('@/lib/db', () => ({
    prisma: {
        organization: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));

// 2. Mock the validation wrapper (`withValidation`)
jest.mock('@/lib/validateRequest', () => ({
    withValidation: jest.fn(() => (handler: Function) => {
        // The function returned must match the Next.js handler signature: (req, ctx)
        return async (req: Request, ctx: any) => { 
            // Call the original handler logic, injecting the validated data.
            return handler(req, ctx, MOCK_VALIDATED_DATA);
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
    
    // We only need a placeholder Request object with correct headers/method
    return {
        headers,
        method,
        json: async () => MOCK_VALIDATED_DATA, // Placeholder json for POST handler logic
    } as unknown as Request;
};

describe('API: /api/organizations', () => {
    
    // ⭐️ Dynamically load handlers AFTER all mocks are defined ⭐️
    beforeAll(async () => {
        const module = await import('@/app/api/organizations/route');
        POST_HANDLER = module.POST as any;
        GET_HANDLER = module.GET as any;
    });
    
    // Placeholder context object for the handler signature
    const mockContext = {};

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ======================================================================
    // POST /organizations (Create)
    // ======================================================================

    describe('POST /organizations (Create Organization)', () => {

        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'POST');
            
            // Note: Since POST_HANDLER is the wrapped function, we call it with req and ctx
            const response = await POST_HANDLER(req, mockContext); 

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
            expect(prisma.organization.create).not.toHaveBeenCalled();
        });

        it('should return 200 and create the organization with the correct ownerId', async () => {
            (prisma.organization.create as jest.Mock).mockResolvedValue(MOCK_CREATED_ORGANIZATION);
            const req = createMockRequest(MOCK_USER_ID, 'POST');

            const response = await POST_HANDLER(req, mockContext);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(MOCK_CREATED_ORGANIZATION);

            // Verify that the data passed to prisma includes the injected ownerId
            expect(prisma.organization.create).toHaveBeenCalledWith({
                data: {
                    ...MOCK_VALIDATED_DATA, // name, description from mock
                    ownerId: MOCK_USER_ID,  // injected by the route logic
                }
            });
        });

        it('should return 500 if prisma.organization.create throws an error', async () => {
            (prisma.organization.create as jest.Mock).mockRejectedValue(new Error("DB Error"));
            const req = createMockRequest(MOCK_USER_ID, 'POST');

            const response = await POST_HANDLER(req, mockContext);

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: "Failed to create organization" });
        });
    });

    // ======================================================================
    // GET /organizations (List)
    // ======================================================================
    
    describe('GET /organizations (List Organizations)', () => {
        
        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'GET');
            const response = await GET_HANDLER(req); 

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
            expect(prisma.organization.findMany).not.toHaveBeenCalled();
        });
        
        it('should return 200 and a list of organizations owned by the user', async () => {
            (prisma.organization.findMany as jest.Mock).mockResolvedValue(MOCK_ORGANIZATION_LIST);
            const req = createMockRequest(MOCK_USER_ID, 'GET');
            
            const response = await GET_HANDLER(req);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(MOCK_ORGANIZATION_LIST);

            // Verify that the query filtered by the correct ownerId and included projects
            expect(prisma.organization.findMany).toHaveBeenCalledWith({
                where: { ownerId: MOCK_USER_ID },
                include: { projects: true },
            });
        });

        it('should return 500 if prisma.organization.findMany throws an error', async () => {
            (prisma.organization.findMany as jest.Mock).mockRejectedValue(new Error("DB Fetch Error"));
            const req = createMockRequest(MOCK_USER_ID, 'GET');

            const response = await GET_HANDLER(req);

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: "Failed to fetch organizations" });
        });
    });
});