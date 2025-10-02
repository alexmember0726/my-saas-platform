// tests/api/projects/[projectId]/api-keys/[apiKeyId]/rotate.test.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { PUT } from '@/app/api/projects/[projectId]/api-keys/[apiKeyId]/rotate/route';

// Mock API Key utility functions
jest.mock('@/lib/apiKey', () => ({
    generateApiKey: jest.fn(),
    generateSecretKey: jest.fn(),
    hashSecretKey: jest.fn(),
}));

import { 
    generateApiKey, 
    generateSecretKey, 
    hashSecretKey
} from '@/lib/apiKey'; 
// --- Mock Data ---
const MOCK_USER_ID = 'user_owner_123';
const MOCK_OTHER_USER_ID = 'user_stranger_456';
const MOCK_ORG_ID = 'org_abc_789';
const MOCK_PROJECT_ID = 'proj_xyz_111';
const MOCK_API_KEY_ID = 'key_to_rotate_001';

// New Key Constants
const NEW_API_KEY = 'pk_new_1234567890abcdef';
const NEW_SECRET_KEY = 'sk_new_fedcba0987654321';
const NEW_KEY_HASH = 'hashed_new_secret_7890';
const NEW_LAST_4 = '4321';

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

// Data returned by apiKey.findUnique
const MOCK_EXISTING_API_KEY = {
    id: MOCK_API_KEY_ID,
    projectId: MOCK_PROJECT_ID,
    name: 'Old Key',
    revoked: false,
    keyHash: 'old_hash',
};

// Data returned to the client on successful PUT
const MOCK_PUT_RESPONSE = {
    id: MOCK_API_KEY_ID,
    key: NEW_API_KEY,
    secret: NEW_SECRET_KEY,
};


// --- Global Module Mocks ---

// Mock Prisma DB
jest.mock('@/lib/db', () => ({
    prisma: {
        project: {
            findUnique: jest.fn(),
        },
        apiKey: {
            findUnique: jest.fn(),
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
        method: 'PUT',
    } as unknown as Request;
};

describe('API: /projects/[projectId]/api-keys/[apiKeyId]/rotate (PUT)', () => {
    
    const mockParams = createMockParams(MOCK_PROJECT_ID, MOCK_API_KEY_ID);

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup utility function mocks
        (generateApiKey as jest.Mock).mockReturnValue(NEW_API_KEY);
        (generateSecretKey as jest.Mock).mockReturnValue(NEW_SECRET_KEY);
        (hashSecretKey as jest.Mock).mockResolvedValue(NEW_KEY_HASH);

        // Default Prisma mocks for success case
        (prisma.project.findUnique as jest.Mock).mockResolvedValue(MOCK_PROJECT_AUTH);
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(MOCK_EXISTING_API_KEY);
        (prisma.apiKey.update as jest.Mock).mockResolvedValue({ id: MOCK_API_KEY_ID });
    });

    // ======================================================================
    // AUTHORIZATION / VALIDATION
    // ======================================================================

    it('should return 401 if x-user-id header is missing', async () => {
        const req = createMockRequest(null);
        const response = await PUT(req, mockParams as any); 

        expect(response.status).toBe(401);
        expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('should return 403 if the user is not the organization owner', async () => {
        const req = createMockRequest(MOCK_OTHER_USER_ID);

        const response = await PUT(req, mockParams as any); 

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "Forbidden" });
        expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    });
    
    it('should return 404 if the API Key is not found', async () => {
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);
        const req = createMockRequest(MOCK_USER_ID);

        const response = await PUT(req, mockParams as any); 

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "API Key not found or revoked" });
        expect(prisma.apiKey.update).not.toHaveBeenCalled();
    });

    it('should return 404 if the API Key is revoked', async () => {
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({ ...MOCK_EXISTING_API_KEY, revoked: true });
        const req = createMockRequest(MOCK_USER_ID);

        const response = await PUT(req, mockParams as any); 

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "API Key not found or revoked" });
        expect(prisma.apiKey.update).not.toHaveBeenCalled();
    });


    // ======================================================================
    // SUCCESS SCENARIO
    // ======================================================================

    it('should return 200 and the new key/secret upon successful rotation', async () => {
        const req = createMockRequest(MOCK_USER_ID);

        const response = await PUT(req, mockParams as any);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(MOCK_PUT_RESPONSE);
        
        // Verify utility functions were called
        expect(generateApiKey as jest.Mock).toHaveBeenCalledTimes(1);
        expect(generateSecretKey).toHaveBeenCalledTimes(1);
        expect(hashSecretKey).toHaveBeenCalledWith(NEW_SECRET_KEY);

        // Verify database update
        expect(prisma.apiKey.update).toHaveBeenCalledWith({
            where: { id: MOCK_API_KEY_ID },
            data: { 
                keyHash: NEW_KEY_HASH, 
                apiKey: NEW_API_KEY,
                last4: NEW_LAST_4,
                rotatedAt: expect.any(Date), // Check that a new Date object was used
            },
        });
    });

    // ======================================================================
    // ERROR HANDLING (Unhandled Exception)
    // ======================================================================

    it('should throw an unhandled exception if prisma.project.findUnique throws', async () => {
        (prisma.project.findUnique as jest.Mock).mockRejectedValue(new Error("Auth DB Error"));
        const req = createMockRequest(MOCK_USER_ID);

        // Since the handler lacks a try/catch, we assert the promise rejection
        await expect(PUT(req, mockParams as any)).rejects.toThrow("Auth DB Error");
    });
    
    it('should throw an unhandled exception if prisma.apiKey.update throws', async () => {
        (prisma.apiKey.update as jest.Mock).mockRejectedValue(new Error("Update DB Error"));
        const req = createMockRequest(MOCK_USER_ID);

        // Since the handler lacks a try/catch, we assert the promise rejection
        await expect(PUT(req, mockParams as any)).rejects.toThrow("Update DB Error");
        
        expect(prisma.apiKey.update).toHaveBeenCalledTimes(1);
    });
});