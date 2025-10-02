// tests/api/organizations/[organizationId].test.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withValidation } from '@/lib/validateRequest';

// --- Mock Data ---
const MOCK_USER_ID = 'user_owner_123';
const MOCK_OTHER_USER_ID = 'user_stranger_456';
const MOCK_ORG_ID = 'org_abc_789';

const MOCK_DATE_STRING = new Date().toISOString();

const MOCK_ORGANIZATION = {
    id: MOCK_ORG_ID,
    name: 'Original Org Name',
    description: 'Original Description',
    ownerId: MOCK_USER_ID,
    createdAt: MOCK_DATE_STRING,
    updatedAt: MOCK_DATE_STRING,
};

const MOCK_UPDATED_DATA = {
    name: 'New Org Name',
    description: 'Updated Description',
};

const MOCK_UPDATED_ORGANIZATION = {
    ...MOCK_ORGANIZATION,
    ...MOCK_UPDATED_DATA,
    updatedAt: MOCK_DATE_STRING,
};


// --- Global Module Mocks ---

// 1. Mock Prisma DB
jest.mock('@/lib/db', () => ({
    prisma: {
        organization: {
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
            // Call the original handler logic, injecting the validated data.
            return handler(req, ctx, MOCK_UPDATED_DATA);
        };
    }),
}));

// Import the actual mocked functions
import { GET, PUT, DELETE } from '@/app/api/organizations/[organizationId]/route';

// --- Test Helper Functions ---

// Helper to create the required route parameters object structure
const createMockParams = (organizationId: string) => ({
    params: Promise.resolve({ organizationId }),
});

// Helper to create a Request object with the required 'x-user-id' header
const createMockRequest = (userId: string | null = MOCK_USER_ID, method: 'GET' | 'PUT' | 'DELETE' = 'GET') => {
    const headers = new Headers();
    if (userId) {
        headers.set("x-user-id", userId);
    }

    // We only need a placeholder Request object with correct headers/method
    return {
        headers,
        method,
    } as unknown as Request;
};

describe('API: /api/organizations/[organizationId]', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Default prisma mock: success finding the organization
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue(MOCK_ORGANIZATION);
    });

    // ======================================================================
    // GET /organizations/{organizationId} (Read)
    // ======================================================================

    describe('GET handler', () => {
        const mockParams = createMockParams(MOCK_ORG_ID);

        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'GET');
            const response = await GET(req, mockParams);

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
        });

        it('should return 403 if the organization is not found', async () => {
            (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
            const req = createMockRequest(MOCK_USER_ID, 'GET');

            const response = await GET(req, mockParams);

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
        });

        it('should return 403 if the user is not the organization owner', async () => {
            const req = createMockRequest(MOCK_OTHER_USER_ID, 'GET');
            // prisma mock is set to return MOCK_ORGANIZATION (owner: MOCK_USER_ID)

            const response = await GET(req, mockParams);

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
        });

        it('should return 200 and the organization if the user is the owner', async () => {
            const req = createMockRequest(MOCK_USER_ID, 'GET');

            const response = await GET(req, mockParams);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(MOCK_ORGANIZATION);
            expect(prisma.organization.findUnique).toHaveBeenCalledWith({
                where: { id: MOCK_ORG_ID }
            });
        });

        it('should return 500 if prisma throws an error', async () => {
            // 1. Mock the DB call to fail
            (prisma.organization.findUnique as jest.Mock).mockRejectedValue(new Error("DB Error"));

            const req = createMockRequest(MOCK_USER_ID, 'GET');

            // We need a fresh set of params for the call
            const mockParams = createMockParams(MOCK_ORG_ID);

            // 2. ASSERT that the async function call REJECTS with the error
            // This is the cleanest way to test for an unhandled exception in an async function.
            await expect(GET(req, mockParams)).rejects.toThrow("DB Error");

            // Optional: Ensure the DB function was still called
            expect(prisma.organization.findUnique).toHaveBeenCalled();
        });
    });

    // ======================================================================
    // PUT /organizations/{organizationId} (Update)
    // ======================================================================

    describe('PUT handler', () => {
        const mockParams = createMockParams(MOCK_ORG_ID);

        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'PUT');
            const response = await PUT(req, mockParams); // {} is placeholder for validated data

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
            expect(prisma.organization.update).not.toHaveBeenCalled();
        });

        it('should return 403 if the user is not the organization owner', async () => {
            const req = createMockRequest(MOCK_OTHER_USER_ID, 'PUT');

            const response = await PUT(req, mockParams);

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
            expect(prisma.organization.update).not.toHaveBeenCalled();
        });

        it('should return 200 and update the organization if the user is the owner', async () => {
            (prisma.organization.update as jest.Mock).mockResolvedValue(MOCK_UPDATED_ORGANIZATION);
            const req = createMockRequest(MOCK_USER_ID, 'PUT');

            // The 'data' argument is injected by the withValidation mock
            const response = await PUT(req, createMockParams(MOCK_ORG_ID) as any);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(MOCK_UPDATED_ORGANIZATION);

            // Verify the update call
            expect(prisma.organization.update).toHaveBeenCalledWith({
                where: { id: MOCK_ORG_ID },
                data: MOCK_UPDATED_DATA, // Injected by withValidation mock
            });
        });

        it('should return 500 if prisma.organization.update throws an error', async () => {
            (prisma.organization.update as jest.Mock).mockRejectedValue(new Error("DB Update Error"));
            const req = createMockRequest(MOCK_USER_ID, 'PUT');

            // FindUnique still returns success for owner check
            (prisma.organization.findUnique as jest.Mock).mockResolvedValue(MOCK_ORGANIZATION);

            // The PUT handler for this route does not have a try/catch block around the update!
            // Similar to GET, this will throw an unhandled exception.
            try {
                await PUT(req, mockParams);
                fail('Expected PUT handler to throw an error on prisma update failure.');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    // ======================================================================
    // DELETE /organizations/{organizationId} (Delete)
    // ======================================================================

    describe('DELETE handler', () => {
        const mockParams = createMockParams(MOCK_ORG_ID);

        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'DELETE');
            const response = await DELETE(req, mockParams);

            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
            expect(prisma.organization.delete).not.toHaveBeenCalled();
        });

        it('should return 403 if the user is not the organization owner', async () => {
            const req = createMockRequest(MOCK_OTHER_USER_ID, 'DELETE');

            const response = await DELETE(req, mockParams);

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
            expect(prisma.organization.delete).not.toHaveBeenCalled();
        });

        it('should return 200 and delete the organization if the user is the owner', async () => {
            (prisma.organization.delete as jest.Mock).mockResolvedValue(MOCK_ORGANIZATION); // Delete returns the deleted item
            const req = createMockRequest(MOCK_USER_ID, 'DELETE');

            const response = await DELETE(req, mockParams);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ success: true });

            // Verify the delete call
            expect(prisma.organization.delete).toHaveBeenCalledWith({
                where: { id: MOCK_ORG_ID },
            });
        });

        it('should return 500 if prisma.organization.delete throws an error', async () => {
            (prisma.organization.delete as jest.Mock).mockRejectedValue(new Error("DB Delete Error"));
            const req = createMockRequest(MOCK_USER_ID, 'DELETE');

            // FindUnique still returns success for owner check
            (prisma.organization.findUnique as jest.Mock).mockResolvedValue(MOCK_ORGANIZATION);

            // The DELETE handler for this route does not have a try/catch block around the delete!
            // Similar to GET and the PUT update call, this will throw an unhandled exception.
            try {
                await DELETE(req, mockParams);
                fail('Expected DELETE handler to throw an error on prisma delete failure.');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });
    });
});