// tests/api/projects/[projectId]/api-keys/[apiKeyId]/revoke.test.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { DELETE } from '@/app/api/projects/[projectId]/api-keys/[apiKeyId]/revoke/route';

// --- Mock Data ---
const MOCK_USER_ID = 'user_owner_123';
const MOCK_OTHER_USER_ID = 'user_stranger_456';
const MOCK_ORG_ID = 'org_abc_789';
const MOCK_PROJECT_ID = 'proj_xyz_111';
const MOCK_API_KEY_ID = 'key_to_revoke_001';

const MOCK_ORGANIZATION = {
    id: MOCK_ORG_ID,
    ownerId: MOCK_USER_ID,
};

// Data returned by project.findUnique for authorization
const MOCK_PROJECT_AUTH = {
    id: MOCK_PROJECT_ID,
    organizationId: MOCK_ORG_ID,
    organization: MOCK_ORGANIZATION, 
};


// --- Global Module Mocks ---

// Mock Prisma DB
jest.mock('@/lib/db', () => ({
    prisma: {
        project: {
            findUnique: jest.fn(),
        },
        apiKey: {
            update: jest.fn(),
        },
    },
}));


// --- Test Helper Functions ---

// Helper to create the required route parameters object structure
const createMockParams = (projectId: string, apiKeyId: string) => ({
    params: Promise.resolve({ projectId, apiKeyId }),
});

// Helper to create a Request object with the required 'x-user-id' header
const createMockRequest = (userId: string | null = MOCK_USER_ID) => {
    const headers = new Headers();
    if (userId) {
        headers.set("x-user-id", userId);
    }
    return {
        headers,
        method: 'DELETE',
    } as unknown as Request;
};

describe('API: /projects/[projectId]/api-keys/[apiKeyId]/revoke (DELETE)', () => {
    
    const mockParams = createMockParams(MOCK_PROJECT_ID, MOCK_API_KEY_ID);

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default Prisma mocks for success case
        (prisma.project.findUnique as jest.Mock).mockResolvedValue(MOCK_PROJECT_AUTH);
        (prisma.apiKey.update as jest.Mock).mockResolvedValue({}); // Simple resolve for the update call
    });

    // ======================================================================
    // AUTHORIZATION / VALIDATION
    // ======================================================================

    it('should return 401 if x-user-id header is missing', async () => {
        const req = createMockRequest(null);
        const response = await DELETE(req, mockParams as any); 

        expect(response.status).toBe(401);
        expect(prisma.project.findUnique).not.toHaveBeenCalled();
        expect(prisma.apiKey.update).not.toHaveBeenCalled();
    });

    it('should return 403 if the project is not found', async () => {
        (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
        const req = createMockRequest(MOCK_USER_ID);

        const response = await DELETE(req, mockParams as any); 

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "Forbidden" });
        expect(prisma.apiKey.update).not.toHaveBeenCalled();
    });

    it('should return 403 if the user is not the organization owner', async () => {
        const req = createMockRequest(MOCK_OTHER_USER_ID);

        const response = await DELETE(req, mockParams as any); 

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "Forbidden" });
        expect(prisma.apiKey.update).not.toHaveBeenCalled();
    });


    // ======================================================================
    // SUCCESS SCENARIO
    // ======================================================================

    it('should return 200 and call update to set the revoked flag to true', async () => {
        const req = createMockRequest(MOCK_USER_ID);

        const response = await DELETE(req, mockParams as any);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true });
        
        // Verify project authorization check
        expect(prisma.project.findUnique).toHaveBeenCalledWith({
            where: { id: MOCK_PROJECT_ID },
            include: { organization: true },
        });

        // Verify database update to revoke the key
        expect(prisma.apiKey.update).toHaveBeenCalledWith({
            where: { id: MOCK_API_KEY_ID },
            data: { revoked: true },
        });
    });

    // ======================================================================
    // ERROR HANDLING (Unhandled Exception)
    // ======================================================================
    
    // Note: Since this handler is simple and lacks a try/catch, 
    // any DB error will bubble up and cause the test to assert rejection.

    it('should throw an unhandled exception if prisma.project.findUnique throws', async () => {
        (prisma.project.findUnique as jest.Mock).mockRejectedValue(new Error("Auth DB Error"));
        const req = createMockRequest(MOCK_USER_ID);

        await expect(DELETE(req, mockParams as any)).rejects.toThrow("Auth DB Error");
    });
    
    it('should throw an unhandled exception if prisma.apiKey.update throws', async () => {
        (prisma.apiKey.update as jest.Mock).mockRejectedValue(new Error("Update DB Error"));
        const req = createMockRequest(MOCK_USER_ID);

        await expect(DELETE(req, mockParams as any)).rejects.toThrow("Update DB Error");
        
        // Ensure auth check passed and update was attempted
        expect(prisma.project.findUnique).toHaveBeenCalledTimes(1);
        expect(prisma.apiKey.update).toHaveBeenCalledTimes(1);
    });
});