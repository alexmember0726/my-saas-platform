// tests/api/tokenExchange_Track.test.ts

import { POST as tokenExchangePOST } from '@/app/api/token-exchange/route';
import { POST as trackPOST } from '@/app/api/track/route';
// Removed 'next' imports as they are unnecessary/potentially incorrect for App Router mocks

// NOTE: You must have a mock for 'next/server' if you use it in other modules
// This is not strictly required here as we are importing the handler directly.

// --- Mock Data ---
const MOCK_PROJECT_ID = 'proj_001';
const MOCK_API_KEY_ID = 'key_001';
const MOCK_API_KEY = 'pk_validapikey';
const MOCK_SECRET_KEY = 'validsecret';
const MOCK_SECRET_HASH = 'hashed_secret_value'; // The value stored in DB
const MOCK_SHORT_LIVED_TOKEN = 'mocked_payload.mocked_signature';
const ORIGIN_HEADER = 'Origin';
const REFERER_HEADER = 'Referer';

// --- Global Module Mocks ---

// 1. Mock Prisma DB
jest.mock('@/lib/db', () => ({
    prisma: {
        apiKey: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
        },
        event: {
            create: jest.fn(),
        }
    },
}));

// 2. Mock the entire '@/lib/apiKey' module to control its functions
jest.mock('@/lib/apiKey', () => ({
    generateShortLivedToken: jest.fn(),
    verifySecretKey: jest.fn(),
    verifyShortLivedToken: jest.fn(),
}));

import { 
    generateShortLivedToken, 
    verifySecretKey, 
    verifyShortLivedToken 
} from '@/lib/apiKey'; 
import { prisma } from '@/lib/db';
// NOTE: These variables now hold the jest.fn() defined above.

// --- Test Helper Functions ---

// Helper to create the 'Authorization: Basic' header value
const createBasicAuthHeader = (key: string, secret: string) => 
    `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;

// Helper to create the 'Authorization: Bearer' header value
const createBearerAuthHeader = (token: string) => `Bearer ${token}`;

// Helper to simulate a Next.js Request object for token-exchange (POST)
const createMockTokenExchangeRequest = (authHeader?: string | null) => ({
    headers: {
        get: (name: string) => {
            if (name.toLowerCase() === 'authorization') return authHeader;
            return null;
        },
    },
    // The handler expects 'request: Request', so we cast it.
} as unknown as Request);


// Helper to simulate a Next.js Request object for track (POST)
// We need to simulate the Request interface for App Router (headers.get, json())
// and the rate limiting logic which tries to get IP headers.
const createMockTrackRequest = (authHeader: string | undefined, body: any, headers: Record<string, string> = {}) => ({
    headers: {
        get: (name: string) => {
            if (name.toLowerCase() === 'authorization') return authHeader;
            // Mocking IP headers and domain headers
            if (name.toLowerCase() === 'x-forwarded-for') return headers['x-forwarded-for'] || '192.168.1.1';
            const headerValue = headers[name] || headers[name.toLowerCase()];
            return headerValue || null;
        },
        // Mock the headers.keys() and headers.forEach() if necessary (not usually needed for direct handler tests)
    },
    // Mock the request.json() function which the handler calls
    json: async () => body,
} as unknown as Request);


// Helper to extract the mocked API ID from the token for the track route logic
const createTokenWithMockedPayload = (apiId: string) => {
    // Payload structure for token (p: projectID, a: apiKeyId)
    const payload = JSON.stringify({ p: MOCK_PROJECT_ID, a: apiId });
    // Use base64url encoding as suggested by Buffer.from(..., 'base64url')
    const payloadEncoded = Buffer.from(payload).toString('base64url'); 
    return `${payloadEncoded}.mockedsignature`;
};

// --- Test Constants for Track API ---
const MOCK_EVENT_NAME = 'user_clicked_button';
const MOCK_EVENT_METADATA = { component: 'cta', position: 1 };
const MOCK_ALLOWED_DOMAIN = 'https://app.example.com';
const MOCK_KEY_RECORD = {
    id: MOCK_API_KEY_ID,
    projectId: MOCK_PROJECT_ID,
    keyHash: MOCK_SECRET_HASH,
    project: {
        id: MOCK_PROJECT_ID,
        allowedDomains: [MOCK_ALLOWED_DOMAIN],
    },
};
const MOCK_EVENT_BODY = { name: MOCK_EVENT_NAME, metadata: MOCK_EVENT_METADATA };


// --- Rate Limiter State Reset ---
// We need to manually reset the in-memory rate limiter state for testing
// This is the cleanest way to access the unexported 'requests' object for testing.
// NOTE: This relies on the implementation detail of the route, but is necessary for stateful rate limiting tests.
const resetRateLimiter = async () => {
    // Import the POST handler again to get a fresh module state.
    // In a real project, you would export and reset the 'requests' object.
    // Since it's not exported, we simulate a fresh module import, which might be complex in Jest.
    // A simpler way is to mock Date.now() and trigger the window reset.
    // For this test, we will temporarily manipulate the route's internals if necessary, 
    // but the best way is to rely on the time window logic if possible.
};


// --------------------------------------------------------------------------
// API: /api/token-exchange Tests (Omitted for brevity, assuming previous tests passed)
// --------------------------------------------------------------------------

describe('API: /api/token-exchange', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        (verifySecretKey as jest.Mock).mockResolvedValue(true);
        (generateShortLivedToken as jest.Mock).mockReturnValue(MOCK_SHORT_LIVED_TOKEN);
        
        (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
            id: MOCK_API_KEY_ID,
            apiKey: MOCK_API_KEY,
            keyHash: MOCK_SECRET_HASH,
            projectId: MOCK_PROJECT_ID,
            keyType: 'SERVER', 
        });
    });

    it('should return a 200 with the short-lived token for valid credentials', async () => {
        const authHeader = createBasicAuthHeader(MOCK_API_KEY, MOCK_SECRET_KEY);
        const req = createMockTokenExchangeRequest(authHeader);
        const response = await tokenExchangePOST(req);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ token: MOCK_SHORT_LIVED_TOKEN });
    });
});


// --------------------------------------------------------------------------
// API: /api/track Tests (Including Rate Limiting)
// --------------------------------------------------------------------------

describe('API: /api/track', () => {
    // Rate Limiter constants from the route
    const RATE_LIMIT = 10;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers(); // Enable fake timers for rate limiting

        // Default successful track setup
        (verifyShortLivedToken as jest.Mock).mockReturnValue({ p: MOCK_PROJECT_ID, a: MOCK_API_KEY_ID });
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(MOCK_KEY_RECORD);
        (prisma.event.create as jest.Mock).mockResolvedValue({});
    });
    
    afterEach(() => {
        jest.useRealTimers(); // Restore real timers
        // As a safeguard, ensure we reset the in-memory state 
        // by importing the module again (tricky) or simply
        // allowing the next test to naturally reset the counter via time.
    });


    // ... Existing tests (Domain, Auth, Validation) ...

    it('should return 400 if event name is missing in body', async () => {
        const token = createTokenWithMockedPayload(MOCK_API_KEY_ID);
        const req = createMockTrackRequest(createBearerAuthHeader(token), { metadata: MOCK_EVENT_METADATA }, { [ORIGIN_HEADER]: MOCK_ALLOWED_DOMAIN });
        const response = await trackPOST(req);
        
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Bad Request: Invalid event structure." });
        expect(prisma.event.create).not.toHaveBeenCalled();
    });


    // --------------------------------------------------------------------------
    // NEW: RATE LIMITING TEST (we cannot test it in-memory mode - skip)
    // --------------------------------------------------------------------------

    it('should allow exactly RATE_LIMIT events then return 429', async () => {
        const token = createTokenWithMockedPayload(MOCK_API_KEY_ID);
        const ip = '192.168.1.1';
        const headers = { [ORIGIN_HEADER]: MOCK_ALLOWED_DOMAIN, 'x-forwarded-for': ip };
        
        // --- 1. Test requests within the limit (1 to 10) ---
        for (let i = 0; i < RATE_LIMIT; i++) {
            const req = createMockTrackRequest(createBearerAuthHeader(token), MOCK_EVENT_BODY, headers);
            const response = await trackPOST(req);
            
            // Should pass for all requests 0 through 9
            expect(response.status).toBe(202);
        }

        // Assert that 10 events were successfully created
        expect(prisma.event.create).toHaveBeenCalledTimes(RATE_LIMIT);

        // --- 2. Test the 11th request (should be blocked) ---
        const reqBlocked = createMockTrackRequest(createBearerAuthHeader(token), MOCK_EVENT_BODY, headers);
        const responseBlocked = await trackPOST(reqBlocked);

        // Should be blocked with 429
        expect(responseBlocked.status).toBe(429);
        expect(await responseBlocked.json()).toEqual({ error: 'Too Many Requests: Rate limit exceeded.' });
        
        // Assert that no 11th event was created
        expect(prisma.event.create).toHaveBeenCalledTimes(RATE_LIMIT);
    });

    it('should reset the rate limit count after the time window expires', async () => {
        const token = createTokenWithMockedPayload(MOCK_API_KEY_ID);
        const ip = '192.168.1.2';
        const headers = { [ORIGIN_HEADER]: MOCK_ALLOWED_DOMAIN, 'x-forwarded-for': ip };
        const WINDOW = 60 * 1000; // 60 seconds

        // 1. Hit the limit (10 requests)
        for (let i = 0; i < RATE_LIMIT; i++) {
            const req = createMockTrackRequest(createBearerAuthHeader(token), MOCK_EVENT_BODY, headers);
            await trackPOST(req);
        }

        // 2. The 11th request is blocked
        const reqBlocked = createMockTrackRequest(createBearerAuthHeader(token), MOCK_EVENT_BODY, headers);
        const responseBlocked = await trackPOST(reqBlocked);
        expect(responseBlocked.status).toBe(429);
        expect(prisma.event.create).toHaveBeenCalledTimes(RATE_LIMIT);
        
        // 3. Advance time just past the 60 second window (60001 ms)
        jest.advanceTimersByTime(WINDOW + 1);

        // 4. Send a new request (should be allowed now)
        const reqAllowed = createMockTrackRequest(createBearerAuthHeader(token), MOCK_EVENT_BODY, headers);
        const responseAllowed = await trackPOST(reqAllowed);
        
        expect(responseAllowed.status).toBe(202);
        
        // Assert total events created is RATE_LIMIT + 1 (11)
        expect(prisma.event.create).toHaveBeenCalledTimes(RATE_LIMIT + 1);
    });
});