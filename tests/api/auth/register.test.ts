// tests/api/auth/register.test.ts

import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server'; // Needed for type hints

// --- Mock Data ---
const MOCK_EMAIL = 'newuser@example.com';
const MOCK_PASSWORD = 'strongpassword';
const MOCK_NAME = 'New User';
const MOCK_HASHED_PASSWORD = 'mock_hashed_password';
const MOCK_USER_ID = 'user_002';

const MOCK_USER_CREATED_RECORD = {
    id: MOCK_USER_ID,
    email: MOCK_EMAIL,
    name: MOCK_NAME,
    password: MOCK_HASHED_PASSWORD, 
};

const MOCK_VALIDATED_DATA = { 
    email: MOCK_EMAIL, 
    password: MOCK_PASSWORD, 
    name: MOCK_NAME 
};

// --- Global Module Mocks (Must be at the top level before dynamic imports) ---

// 1. Mock Prisma DB (User model only)
jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));

// 2. Mock external utility functions (@/lib/auth)
jest.mock('@/lib/auth', () => ({
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(), 
}));

// 3. Mock the validation wrapper (`withValidation`) - THE CRITICAL FIX
// We ensure the returned function correctly captures and passes 'ctx'.
jest.mock('@/lib/validateRequest', () => ({
    // withValidation returns a function that takes the handler
    withValidation: jest.fn(() => (handler: Function) => {
        // The function returned from the wrapper MUST match the Next.js handler signature: (req, ctx)
        return async (req: Request, ctx: any) => { 
            
            // Call the original handler logic, injecting the validated data.
            // Arguments passed: (req, ctx, data)
            return handler(req, ctx, MOCK_VALIDATED_DATA);
        };
    }),
}));

// Import the actual mocked function to control its behavior
import { hashPassword } from '@/lib/auth';

// --- Test Execution Setup ---
let POST_HANDLER: (req: Request, ctx: any) => Promise<NextResponse>;


describe('API: /api/auth/register (POST)', () => {
    
    // ⭐️ Use beforeAll to ensure the mocks are active before the route file is loaded
    beforeAll(async () => {
        // Dynamically load the POST handler AFTER all mocks are defined
        const module = await import('@/app/api/auth/register/route');
        // Cast to 'any' to avoid complex type issues with the dynamic import
        POST_HANDLER = module.POST as any; 
    });
    
    // We only need a placeholder Request object.
    const mockRequest = {} as unknown as Request;
    // We need a placeholder ctx object for the call signature.
    const mockContext = {};


    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default success mocks
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // User does NOT exist
        (hashPassword as jest.Mock).mockResolvedValue(MOCK_HASHED_PASSWORD);
        (prisma.user.create as jest.Mock).mockResolvedValue(MOCK_USER_CREATED_RECORD);
    });

    // ======================================================================
    // SUCCESS SCENARIO
    // ======================================================================

    it('should return 200 and create a new user with hashed password', async () => {
        // Execute the dynamically loaded handler, passing both req and ctx
        const response = await POST_HANDLER(mockRequest, mockContext); 

        // Assert HTTP Status
        expect(response.status).toBe(200);

        const responseBody = await response.json();
        
        // Assert response shape 
        expect(responseBody).toEqual({
            id: MOCK_USER_ID,
            email: MOCK_EMAIL,
            name: MOCK_NAME,
        });

        // Assert external functions were called correctly
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: MOCK_EMAIL } });
        expect(hashPassword).toHaveBeenCalledWith(MOCK_PASSWORD);
        expect(prisma.user.create).toHaveBeenCalledWith({
            data: {
                email: MOCK_EMAIL,
                name: MOCK_NAME,
                password: MOCK_HASHED_PASSWORD,
            }
        });
    });

    // ======================================================================
    // ERROR/VALIDATION SCENARIOS
    // ======================================================================

    it('should return 400 if a user with the email already exists', async () => {
        // Mock DB to return an existing user
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing_id', email: MOCK_EMAIL });
        
        const response = await POST_HANDLER(mockRequest, mockContext);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "User already exists" });
        
        // Ensure creation logic was NOT run
        expect(hashPassword).not.toHaveBeenCalled();
        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should return 500 if password hashing fails', async () => {
        // Mock hashing to throw an error
        (hashPassword as jest.Mock).mockRejectedValue(new Error("Bcrypt failure"));
        
        const response = await POST_HANDLER(mockRequest, mockContext);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Failed to register" });
        
        // Ensure DB creation was NOT run
        expect(prisma.user.create).not.toHaveBeenCalled();
    });
    
    it('should return 500 if prisma.user.create throws a generic error', async () => {
        // Mock DB creation to throw an error
        (prisma.user.create as jest.Mock).mockRejectedValue(new Error("DB Connection Error"));
        
        const response = await POST_HANDLER(mockRequest, mockContext);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Failed to register" });
    });
});