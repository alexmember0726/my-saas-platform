// tests/api/auth/login.test.ts

import { POST } from '@/app/api/auth/login/route';
import { NextResponse } from 'next/server'; // Needed for type hints, though not for mock logic

// --- Mock Data ---
const MOCK_EMAIL = 'test@example.com';
const MOCK_PASSWORD = 'correctpassword';
const MOCK_USER_ID = 'user_001';
const MOCK_USER_NAME = 'Test User';
const MOCK_USER_HASH = 'hashed_password_value';
const MOCK_JWT_TOKEN = 'mock.jwt.token';

const MOCK_USER_RECORD = {
    id: MOCK_USER_ID,
    email: MOCK_EMAIL,
    name: MOCK_USER_NAME,
    password: MOCK_USER_HASH, // password hash is stored here
    // ... any other user fields
};

// --- Global Module Mocks ---

// 1. Mock Prisma DB
// Assuming prisma is mocked globally or we define it here if needed
jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));
import { prisma } from '@/lib/db';

// 2. Mock external utility functions
// Use jest.mock for external utilities to avoid 'Cannot redefine property'
jest.mock('@/lib/auth', () => ({
    verifyPassword: jest.fn(),
}));
import { verifyPassword } from '@/lib/auth';

// 3. Mock jsonwebtoken library
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
}));
import jwt from 'jsonwebtoken';

// --- Helper Functions ---

// Helper to simulate a Next.js Request object with a JSON body
const createMockLoginRequest = async (email: string, password: string): Promise<Request> => {
    // Note: The POST handler uses req.json(), so we need to mock the Request structure correctly.
    // We will use a regular object for the test and cast it.
    const mockRequest = {
        json: async () => ({ email, password }),
        headers: new Headers(),
    } as unknown as Request; 
    return mockRequest;
};


describe('API: /api/auth/login (POST)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default success mocks
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(MOCK_USER_RECORD);
        (verifyPassword as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue(MOCK_JWT_TOKEN);
    });

    // ======================================================================
    // SUCCESS SCENARIO
    // ======================================================================

    it('should return 200 and a JWT token for valid credentials', async () => {
        const req = await createMockLoginRequest(MOCK_EMAIL, MOCK_PASSWORD);
        const response = await POST(req);

        // Assert HTTP Status
        expect(response.status).toBe(200);

        const responseBody = await response.json();
        
        // Assert response shape and data
        expect(responseBody).toEqual({
            token: MOCK_JWT_TOKEN,
            user: {
                id: MOCK_USER_ID,
                email: MOCK_EMAIL,
                name: MOCK_USER_NAME,
            },
        });

        // Assert external functions were called correctly
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: MOCK_EMAIL } });
        expect(verifyPassword).toHaveBeenCalledWith(MOCK_PASSWORD, MOCK_USER_HASH);
        expect(jwt.sign).toHaveBeenCalledWith(
            { userId: MOCK_USER_ID }, 
            expect.any(String), // We can't know the exact process.env secret
            { expiresIn: "24h" }
        );
    });

    // ======================================================================
    // ERROR/VALIDATION SCENARIOS
    // ======================================================================

    it('should return 401 if user email is not found in the database', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        
        const req = await createMockLoginRequest('nonexistent@example.com', MOCK_PASSWORD);
        const response = await POST(req);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Invalid credentials" });
        
        // Ensure password verification was NOT called (short-circuited)
        expect(verifyPassword).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should return 401 if the provided password is incorrect', async () => {
        (verifyPassword as jest.Mock).mockResolvedValue(false);
        
        const req = await createMockLoginRequest(MOCK_EMAIL, 'wrongpassword');
        const response = await POST(req);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Invalid credentials" });
        
        // Ensure password verification WAS called
        expect(verifyPassword).toHaveBeenCalledWith('wrongpassword', MOCK_USER_HASH);
        expect(jwt.sign).not.toHaveBeenCalled();
    });
    
    // ======================================================================
    // EDGE CASES / ERROR HANDLING
    // ======================================================================

    it('should return 500 if req.json() fails (malformed body)', async () => {
        const mockRequest = {
            // Force req.json() to throw an error
            json: async () => { throw new Error("Bad JSON"); },
            headers: new Headers(),
        } as unknown as Request;
        
        const response = await POST(mockRequest);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Failed to login" });
    });

    it('should return 500 if prisma throws a generic error', async () => {
        (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("DB Connection Failed"));
        
        const req = await createMockLoginRequest(MOCK_EMAIL, MOCK_PASSWORD);
        const response = await POST(req);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Failed to login" });
        expect(verifyPassword).not.toHaveBeenCalled();
    });
});