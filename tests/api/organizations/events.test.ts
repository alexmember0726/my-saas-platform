// tests/api/organizations/[organizationId]/events.test.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
// Note: We import NextRequest type, but mock the Request object for simplicity
import { GET } from '@/app/api/organizations/[organizationId]/events/route';

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

// Mock data structure returned by the raw query (with BigInt for count)
const MOCK_RAW_QUERY_RESULT = [
    { date: '2025-09-28', count: BigInt(5) },
    { date: '2025-09-29', count: BigInt(12) },
    { date: '2025-09-30', count: BigInt(8) },
];

// Expected final JSON output (with count converted to Number)
const MOCK_EXPECTED_RESULT = [
    { date: '2025-09-28', events: 5 },
    { date: '2025-09-29', events: 12 },
    { date: '2025-09-30', events: 8 },
];

// --- Global Module Mocks ---

// Mock Prisma DB
jest.mock('@/lib/db', () => ({
    prisma: {
        organization: {
            findUnique: jest.fn(),
        },
        // Mock the raw query function at the top level
        $queryRaw: jest.fn(),
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
    // Cast to NextRequest as required by the handler signature
    return {
        headers,
        method: 'GET',
    } as unknown as Request; 
};


describe('API: /organizations/[organizationId]/events (GET Dashboard)', () => {
    
    // Create the parameters object once
    const mockParams = createMockParams(MOCK_ORG_ID);

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default prisma mock for authorization: success finding the organization and owner match
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue(MOCK_ORGANIZATION);
        // Default prisma mock for data retrieval
        (prisma.$queryRaw as jest.Mock).mockResolvedValue(MOCK_RAW_QUERY_RESULT);
    });

    // ======================================================================
    // AUTHORIZATION / VALIDATION
    // ======================================================================

    it('should return 401 if x-user-id header is missing', async () => {
        const req = createMockRequest(null);
        const response = await GET(req, mockParams as any);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should return 403 if the organization is not found', async () => {
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
        const req = createMockRequest(MOCK_USER_ID);

        const response = await GET(req, mockParams as any); 

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "Forbidden" });
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should return 403 if the user is not the organization owner', async () => {
        const req = createMockRequest(MOCK_OTHER_USER_ID);

        const response = await GET(req, mockParams as any); 

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "Forbidden" });
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    // ======================================================================
    // SUCCESS SCENARIO
    // ======================================================================

    it('should return 200 and the formatted list of event counts', async () => {
        const req = createMockRequest(MOCK_USER_ID);

        const response = await GET(req, mockParams as any); 

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(MOCK_EXPECTED_RESULT);
        
        // Verify authorization check was performed
        expect(prisma.organization.findUnique).toHaveBeenCalledWith({
            where: { id: MOCK_ORG_ID }
        });

        // Verify raw query was called (arguments are hard to match perfectly, so checking call is sufficient)
        expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    // ======================================================================
    // ERROR HANDLING (Protected by try/catch)
    // ======================================================================

    it('should return 500 if prisma throws an error during authorization', async () => {
        // Mock DB call to fail during the authorization step
        (prisma.organization.findUnique as jest.Mock).mockRejectedValue(new Error("Auth DB Failure"));
        const req = createMockRequest(MOCK_USER_ID);

        const response = await GET(req, mockParams as any);
        
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Failed to fetch event counts' });
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
    
    it('should return 500 if prisma.$queryRaw throws an error', async () => {
        // Mock DB call to fail during the data retrieval step
        (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error("Query Failure"));
        const req = createMockRequest(MOCK_USER_ID);

        const response = await GET(req, mockParams as any);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Failed to fetch event counts' });

        // Verify authorization succeeded but query failed
        expect(prisma.organization.findUnique).toHaveBeenCalled();
        expect(prisma.$queryRaw).toHaveBeenCalled();
    });
});