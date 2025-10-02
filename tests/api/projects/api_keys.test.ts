// tests/api/projects/[projectId]/api-keys.test.ts

import { prisma } from '@/lib/db';
import { withValidation } from '@/lib/validateRequest';
import { NextResponse } from 'next/server';


// Mock API Key utility functions
jest.mock('@/lib/apiKey', () => ({
    generateApiKey: jest.fn(),
    generateSecretKey: jest.fn(),
    hashSecretKey: jest.fn(),
    maskKey: jest.fn(),
}));

import { 
    generateApiKey, 
    generateSecretKey, 
    hashSecretKey,
    maskKey
} from '@/lib/apiKey'; 


jest.mock('@/lib/db', () => ({
    prisma: {
        // DEFINE all required functions as mock functions here
        project: {
            findUnique: jest.fn(), // <--- Ensure this line exists
        },
        apiKey: {
            create: jest.fn(),
        },
    },
}));


// --- Mock Data ---
const MOCK_USER_ID = 'user_owner_123';
const MOCK_OTHER_USER_ID = 'user_stranger_456';
const MOCK_ORG_ID = 'org_abc_789';
const MOCK_PROJECT_ID = 'proj_xyz_111';

// Key Constants
const MOCK_API_KEY = 'pk_test_1234567890abcdef';
const MOCK_SECRET_KEY = 'sk_test_fedcba0987654321';
const MOCK_KEY_HASH = 'hashed_secret_12345';
const MOCK_LAST_4 = '4321';
const MOCK_MASKED_KEY = 'pk_test_****************f'; // Mocked by maskKey utility
const MOCK_DATE = new Date().toISOString();


const MOCK_ORGANIZATION = {
    id: MOCK_ORG_ID,
    ownerId: MOCK_USER_ID,
};

// Project data returned by findUnique for authorization
const MOCK_PROJECT_AUTH = {
    id: MOCK_PROJECT_ID,
    organizationId: MOCK_ORG_ID,
    organization: MOCK_ORGANIZATION, 
    apiKeys: [], // For GET, this will be mocked with keys
};

const MOCK_API_KEY_DATA = { name: 'Dashboard Key' };
const MOCK_CREATED_KEY_ID = 'key_111';

// Data saved to the database during POST
const MOCK_DB_CREATED_KEY = {
    id: MOCK_CREATED_KEY_ID,
    name: MOCK_API_KEY_DATA.name,
    projectId: MOCK_PROJECT_ID,
    apiKey: MOCK_API_KEY,
    last4: MOCK_LAST_4,
    keyHash: MOCK_KEY_HASH,
    revoked: false,
    createdAt: MOCK_DATE,
};

// Data returned to the client on successful POST
const MOCK_POST_RESPONSE = {
    id: MOCK_CREATED_KEY_ID,
    name: MOCK_API_KEY_DATA.name,
    key: MOCK_API_KEY,
    secret: MOCK_SECRET_KEY, // The raw secret key
    createdAt: MOCK_DATE,
};

// Data for GET handler (stored in DB)
const MOCK_API_KEYS_DB = [
    { id: 'key_a', name: 'Web Key', apiKey: 'pk_web_abc', last4: '0001', revoked: false, createdAt: MOCK_DATE },
    { id: 'key_b', name: 'App Key', apiKey: 'pk_app_def', last4: '0002', revoked: true, createdAt: MOCK_DATE },
];

// Data for GET handler (returned to client after masking/obfuscation)
const MOCK_API_KEYS_CLIENT = [
    { id: 'key_a', name: 'Web Key', revoked: false, key: 'pk_web_a***1', secret: '****************************0001', createdAt: MOCK_DATE },
    { id: 'key_b', name: 'App Key', revoked: true, key: 'pk_app_d***2', secret: '****************************0002', createdAt: MOCK_DATE },
];

// --- Global Module Mocks (continued) ---

// 2. Mock the validation wrapper (`withValidation`) for POST
jest.mock('@/lib/validateRequest', () => ({
    withValidation: jest.fn(() => (handler: Function) => {
        return async (req: Request, ctx: any) => { 
            // Inject the validated data for POST
            return handler(req, ctx, MOCK_API_KEY_DATA);
        };
    }),
}));

// Mock prisma DB calls
(prisma.project.findUnique as jest.Mock).mockImplementation(({ include }) => {
    // If we're including apiKeys (for GET), return the project with keys
    if (include && include.apiKeys) {
        return Promise.resolve({ ...MOCK_PROJECT_AUTH, apiKeys: MOCK_API_KEYS_DB });
    }
    // Otherwise, return the project without keys (for POST auth)
    return Promise.resolve(MOCK_PROJECT_AUTH);
});


// Import the actual mocked functions
import { GET, POST } from '@/app/api/projects/[projectId]/api-keys/route';

// --- Test Helper Functions ---

// Helper to create the required route parameters object structure
const createMockParams = (projectId: string) => ({
    params: Promise.resolve({ projectId }),
});

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

describe('API: /projects/[projectId]/api-keys', () => {
    
    const mockParams = createMockParams(MOCK_PROJECT_ID);

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup utility function mocks
        (generateApiKey as jest.Mock).mockReturnValue(MOCK_API_KEY);
        (generateSecretKey as jest.Mock).mockReturnValue(MOCK_SECRET_KEY);
        (hashSecretKey as jest.Mock).mockResolvedValue(MOCK_KEY_HASH);

        // Reset prisma mock for authorization
        (prisma.project.findUnique as jest.Mock).mockImplementation((options) => {
            // Default success for authorization check
            return Promise.resolve({ 
                ...MOCK_PROJECT_AUTH,
                apiKeys: options?.include?.apiKeys ? MOCK_API_KEYS_DB : [],
            });
        });
    });

    // ======================================================================
    // POST /projects/{projectId}/api-keys (Create)
    // ======================================================================

    describe('POST handler (Create API Key)', () => {

        beforeEach(() => {
            (prisma.apiKey.create as jest.Mock).mockResolvedValue(MOCK_DB_CREATED_KEY);
        });

        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'POST');
            const response = await POST(req, mockParams as any); 

            expect(response.status).toBe(401);
            expect(prisma.apiKey.create).not.toHaveBeenCalled();
        });

        it('should return 403 if the user is not the organization owner', async () => {
            const req = createMockRequest(MOCK_OTHER_USER_ID, 'POST');

            const response = await POST(req, mockParams as any); 

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
            expect(prisma.apiKey.create).not.toHaveBeenCalled();
        });

        it('should return 200 and the full API key/secret upon successful creation', async () => {
            const req = createMockRequest(MOCK_USER_ID, 'POST');

            const response = await POST(req, mockParams as any);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(MOCK_POST_RESPONSE);

            // Verify project authorization check
            expect(prisma.project.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: MOCK_PROJECT_ID }, include: { organization: true } })
            );

            // Verify API Key creation in DB
            expect(prisma.apiKey.create).toHaveBeenCalledWith({
                data: {
                    projectId: MOCK_PROJECT_ID,
                    name: MOCK_API_KEY_DATA.name,
                    apiKey: MOCK_API_KEY,
                    last4: MOCK_LAST_4,
                    keyHash: MOCK_KEY_HASH
                },
            });
        });
        
        it('should throw an unhandled exception if prisma.apiKey.create fails', async () => {
            (prisma.apiKey.create as jest.Mock).mockRejectedValue(new Error("DB Create Error"));
            const req = createMockRequest(MOCK_USER_ID, 'POST');
            
            // Should pass auth check, but fail on creation
            await expect(POST(req, mockParams as any)).rejects.toThrow("DB Create Error");
        });
    });

    // ======================================================================
    // GET /projects/{projectId}/api-keys (List)
    // ======================================================================
    
    describe('GET handler (List API Keys)', () => {

        beforeEach(() => {
            // Setup maskKey mock to return specific values for verification
            (maskKey as jest.Mock)
                .mockImplementationOnce(() => MOCK_API_KEYS_CLIENT[0].key) // For key_a
                .mockImplementationOnce(() => MOCK_API_KEYS_CLIENT[1].key); // For key_b
        });
        
        it('should return 401 if x-user-id header is missing', async () => {
            const req = createMockRequest(null, 'GET');
            const response = await GET(req, mockParams as any); 

            expect(response.status).toBe(401);
            expect(prisma.project.findUnique).not.toHaveBeenCalled();
        });

        it('should return 403 if the user is not the organization owner', async () => {
            const req = createMockRequest(MOCK_OTHER_USER_ID, 'GET');

            const response = await GET(req, mockParams as any); 

            expect(response.status).toBe(403);
            expect(await response.json()).toEqual({ error: "Forbidden" });
        });
        
        it('should return 200 and a list of masked API keys', async () => {
            const req = createMockRequest(MOCK_USER_ID, 'GET');
            
            const response = await GET(req, mockParams as any);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(MOCK_API_KEYS_CLIENT);

            // Verify project was fetched with includes for keys and organization
            expect(prisma.project.findUnique).toHaveBeenCalledWith({
                where: { id: MOCK_PROJECT_ID },
                include: { apiKeys: true, organization: true },
            });
            
            // Verify masking function was called for each key's apiKey
            expect(maskKey).toHaveBeenCalledTimes(2);
            expect(maskKey).toHaveBeenCalledWith(MOCK_API_KEYS_DB[0].apiKey);
            expect(maskKey).toHaveBeenCalledWith(MOCK_API_KEYS_DB[1].apiKey);
        });

        it('should throw an unhandled exception if prisma.project.findUnique throws an error', async () => {
            (prisma.project.findUnique as jest.Mock).mockRejectedValue(new Error("DB Fetch Error"));
            const req = createMockRequest(MOCK_USER_ID, 'GET');

            // Assert that the promise rejects, as the handler lacks a try/catch around the DB call
            await expect(GET(req, mockParams as any)).rejects.toThrow("DB Fetch Error");
        });
    });
});