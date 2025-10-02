// tests/api/projects/[projectId]/events.test.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { GET } from '@/app/api/projects/[projectId]/events/route';
import { NextRequest } from 'next/server'; // Needed for type casting

// --- Mock Data ---
const MOCK_USER_ID = 'user_owner_123';
const MOCK_OTHER_USER_ID = 'user_stranger_456';
const MOCK_ORG_ID = 'org_abc_789';
const MOCK_PROJECT_ID = 'proj_xyz_111';

const MOCK_PROJECT_WITH_ORG = {
    id: MOCK_PROJECT_ID,
    organizationId: MOCK_ORG_ID,
    name: 'Test Project',
    organization: {
        id: MOCK_ORG_ID,
        ownerId: MOCK_USER_ID,
    },
};

const MOCK_EVENTS = [
    { id: 'event_10', projectId: MOCK_PROJECT_ID, name: 'Login Success', createdAt: new Date(Date.now() - 1000) },
    { id: 'event_09', projectId: MOCK_PROJECT_ID, name: 'Page View', createdAt: new Date(Date.now() - 2000) },
    { id: 'event_08', projectId: MOCK_PROJECT_ID, name: 'API Call', createdAt: new Date(Date.now() - 3000) },
    { id: 'event_07', projectId: MOCK_PROJECT_ID, name: 'Logout', createdAt: new Date(Date.now() - 4000) },
    // event_06 is the one that would be used for nextCursor
    { id: 'event_06', projectId: MOCK_PROJECT_ID, name: 'Heartbeat', createdAt: new Date(Date.now() - 5000) }, 
];


// --- Global Module Mocks ---

// Mock Prisma DB
jest.mock('@/lib/db', () => ({
    prisma: {
        project: {
            findUnique: jest.fn(),
        },
        event: {
            findMany: jest.fn(),
        },
    },
}));


// --- Test Helper Functions ---

// Helper to create the required route parameters object structure
const createMockParams = (projectId: string) => ({
    params: Promise.resolve({ projectId }),
});

// Helper to create a NextRequest object with correct headers and URL
const createMockRequest = (
    userId: string | null = MOCK_USER_ID, 
    urlPath: string = `/api/projects/${MOCK_PROJECT_ID}/events?limit=4` // Default for pagination test
) => {
    const headers = new Headers();
    if (userId) {
        headers.set("x-user-id", userId);
    }
    
    // We mock the Request by extending a base URL, ensuring req.url is correctly structured
    const url = new URL(urlPath, 'http://localhost:3000');
    const req = {
        headers,
        // Mock get property of NextRequest for searchParams logic
        get url() { return url.toString(); }
    } as unknown as NextRequest;

    return req;
};

describe('API: /projects/[projectId]/events (GET)', () => {
    
    const mockParams = createMockParams(MOCK_PROJECT_ID);

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default prisma mock for authorization: success finding the project and owner match
        (prisma.project.findUnique as jest.Mock).mockResolvedValue(MOCK_PROJECT_WITH_ORG);
        
        // Default prisma mock for data retrieval
        // Use events list but only take up to limit+1 for pagination logic
        (prisma.event.findMany as jest.Mock).mockResolvedValue(MOCK_EVENTS);
    });

    // ======================================================================
    // AUTHORIZATION / VALIDATION
    // ======================================================================

    it('should return 401 if x-user-id header is missing', async () => {
        const req = createMockRequest(null);
        const response = await GET(req, mockParams as any);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
        expect(prisma.project.findUnique).not.toHaveBeenCalled();
    });

    it('should return 403 if the project is not found', async () => {
        (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
        const req = createMockRequest();

        const response = await GET(req, mockParams as any); 

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "Forbidden" });
        expect(prisma.event.findMany).not.toHaveBeenCalled();
    });

    it('should return 403 if the user is not the organization owner', async () => {
        const req = createMockRequest(MOCK_OTHER_USER_ID);

        const response = await GET(req, mockParams as any); 

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "Forbidden" });
        expect(prisma.event.findMany).not.toHaveBeenCalled();
    });

    // ======================================================================
    // SUCCESS & PAGINATION SCENARIOS
    // ======================================================================

    it('should return 200 with the correct events and a nextCursor', async () => {
        // limit=4 is the default in helper, mock has 5 items (4 + 1)
        const req = createMockRequest(MOCK_USER_ID);
        const limit = 4;

        const response = await GET(req, mockParams as any); 

        const body = await response.json();
        
        expect(response.status).toBe(200);
        
        // Assert the events array is the size of the limit (4)
        expect(body.events.length).toBe(limit);
        
        // Assert the nextCursor is the ID of the 5th item (event_06)
        expect(body.nextCursor).toBe('event_06');
        
        // Assert prisma.event.findMany was called correctly
        expect(prisma.event.findMany).toHaveBeenCalledWith({
            where: { projectId: MOCK_PROJECT_ID },
            orderBy: { createdAt: "desc" },
            take: limit + 1, // Expect take to be 5
        });
    });
    
    it('should handle pagination using the cursor query parameter', async () => {
        const cursorId = 'event_15';
        const req = createMockRequest(MOCK_USER_ID, `/api/projects/${MOCK_PROJECT_ID}/events?limit=10&cursor=${cursorId}`);
        const limit = 10;

        await GET(req, mockParams as any); 

        // Assert prisma.event.findMany was called with cursor logic
        expect(prisma.event.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                take: limit + 1, // Expect take to be 11
                skip: 1,
                cursor: { id: cursorId },
            })
        );
    });
    
    it('should use the default limit (50) and return a null cursor if fewer than 50 events', async () => {
        // Mock a result with only 5 events
        const fiveEvents = [
            { id: 'e1', projectId: MOCK_PROJECT_ID },
            { id: 'e2', projectId: MOCK_PROJECT_ID },
            { id: 'e3', projectId: MOCK_PROJECT_ID },
            { id: 'e4', projectId: MOCK_PROJECT_ID },
            { id: 'e5', projectId: MOCK_PROJECT_ID },
        ];
        (prisma.event.findMany as jest.Mock).mockResolvedValue(fiveEvents); 
        const req = createMockRequest(MOCK_USER_ID, `/api/projects/${MOCK_PROJECT_ID}/events`); // No limit query param

        const response = await GET(req, mockParams as any); 

        const body = await response.json();
        
        // Assert take was 51 (default 50 + 1)
        expect(prisma.event.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                take: 51, 
            })
        );
        
        // Assert nextCursor is null
        expect(body.events.length).toBe(5);
        expect(body.nextCursor).toBeNull();
    });
    
    it('should respect the max limit of 100 if a higher limit is requested', async () => {
        const req = createMockRequest(MOCK_USER_ID, `/api/projects/${MOCK_PROJECT_ID}/events?limit=200`);

        await GET(req, mockParams as any); 

        // Assert take was 101 (max 100 + 1)
        expect(prisma.event.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                take: 101, 
            })
        );
    });

    // ======================================================================
    // ERROR HANDLING (Protected by try/catch)
    // ======================================================================

    it('should return 500 if prisma throws an error during authorization', async () => {
        (prisma.project.findUnique as jest.Mock).mockRejectedValue(new Error("Auth DB Failure"));
        const req = createMockRequest(MOCK_USER_ID);

        const response = await GET(req, mockParams as any);
        
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal Server Error' });
        expect(prisma.event.findMany).not.toHaveBeenCalled();
    });
    
    it('should return 500 if prisma.event.findMany throws an error', async () => {
        // Ensure auth check passes first
        (prisma.project.findUnique as jest.Mock).mockResolvedValue(MOCK_PROJECT_WITH_ORG);
        (prisma.event.findMany as jest.Mock).mockRejectedValue(new Error("Event DB Failure"));
        const req = createMockRequest(MOCK_USER_ID);

        const response = await GET(req, mockParams as any);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal Server Error' });

        expect(prisma.project.findUnique).toHaveBeenCalled();
        expect(prisma.event.findMany).toHaveBeenCalled();
    });
});