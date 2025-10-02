// tests/unit/apiKey.test.ts

import {
    generateApiKey,
    generateSecretKey,
    hashSecretKey,
    verifySecretKey,
    generateShortLivedToken,
    verifyShortLivedToken,
    verifyWebhookHmac,
    maskKey
} from '@/lib/apiKey'; // Adjust path as necessary
import crypto from 'crypto';

// Mock Date.now for predictable token expiration tests
const MOCK_CURRENT_TIME = 1678886400000; // Example: Mar 15, 2023 12:00:00 AM UTC
const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour (Matching the lib, though comment said 15 mins)

describe('API Key Security Utilities', () => {
    
    // --- Key Generation Tests ---
    describe('Key Generation', () => {
        it('should generate a 16-character (8-byte hex) API key', () => {
            const apiKey = generateApiKey();
            expect(apiKey).toHaveLength(16);
            expect(apiKey).toMatch(/^[0-9a-f]+$/);
        });

        it('should generate a 64-character (32-byte hex) secret key', () => {
            const secretKey = generateSecretKey();
            expect(secretKey).toHaveLength(64);
            expect(secretKey).toMatch(/^[0-9a-f]+$/);
        });

        it('should generate different keys on subsequent calls', () => {
            expect(generateSecretKey()).not.toBe(generateSecretKey());
            expect(generateApiKey()).not.toBe(generateApiKey());
        });
    });

    // --- Hashing and Verification Tests (Long-lived keys) ---
    describe('Bcrypt Hashing and Verification', () => {
        const testKey = 'super_secret_long_lived_key';
        let hashedKey: string;

        it('should successfully hash the secret key', async () => {
            hashedKey = await hashSecretKey(testKey);
            expect(hashedKey).not.toBe(testKey);
            // Bcrypt hashes usually start with $2a$ or $2b$ and are around 60 chars
            expect(hashedKey).toMatch(/^\$2[ayb]\$.{56}/); 
        });

        it('should verify the correct key against the hash', async () => {
            const isValid = await verifySecretKey(testKey, hashedKey);
            expect(isValid).toBe(true);
        });

        it('should fail verification for an incorrect key', async () => {
            const isInvalid = await verifySecretKey('wrong_key', hashedKey);
            expect(isInvalid).toBe(false);
        });
    });

    // --- Short-lived Token Tests (HMAC) ---
    describe('Short-lived Token (HMAC) Generation and Verification', () => {
        const projectId = 'proj_abc123';
        const apiKeyId = 'key_xyz789';
        const signingSecret = 'secret-for-hmac-signing';

        beforeAll(() => {
            jest.useFakeTimers();
            jest.setSystemTime(MOCK_CURRENT_TIME);
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        it('should generate a valid HMAC token', () => {
            const token = generateShortLivedToken(projectId, apiKeyId, signingSecret);
            const parts = token.split('.');

            expect(parts).toHaveLength(2);
            expect(parts[0]).not.toBeFalsy(); // Payload exists
            expect(parts[1]).not.toBeFalsy(); // Signature exists
        });

        it('should correctly verify a valid token', () => {
            const token = generateShortLivedToken(projectId, apiKeyId, signingSecret);
            const payload = verifyShortLivedToken(token, signingSecret);

            expect(payload).not.toBeNull();
            expect(payload).toEqual({ p: projectId, a: apiKeyId });
        });

        it('should reject a token with an incorrect signing secret', () => {
            const token = generateShortLivedToken(projectId, apiKeyId, signingSecret);
            const payload = verifyShortLivedToken(token, 'wrong-secret');

            expect(payload).toBeNull();
        });

        it('should reject a token with a tampered payload', () => {
            const originalToken = generateShortLivedToken(projectId, apiKeyId, signingSecret);
            const [payloadEncoded, signature] = originalToken.split('.');
            
            // Tamper the payload: change projectId
            const originalPayloadStr = Buffer.from(payloadEncoded, 'base64url').toString('utf8');
            const tamperedPayload = JSON.parse(originalPayloadStr);
            tamperedPayload.p = 'hacker_proj';
            
            const tamperedPayloadEncoded = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
            const tamperedToken = `${tamperedPayloadEncoded}.${signature}`; // Signature is now incorrect for payload

            const payload = verifyShortLivedToken(tamperedToken, signingSecret);

            expect(payload).toBeNull(); // Should fail signature check
        });

        it('should reject an expired token', () => {
            const token = generateShortLivedToken(projectId, apiKeyId, signingSecret);
            
            // Fast-forward past the expiration time (plus a small buffer)
            jest.advanceTimersByTime(TOKEN_LIFETIME_MS + 1000); 

            const payload = verifyShortLivedToken(token, signingSecret);
            
            expect(payload).toBeNull();
        });
        
        it('should return null for malformed tokens', () => {
            expect(verifyShortLivedToken('payload_only', signingSecret)).toBeNull();
            expect(verifyShortLivedToken('.signature_only', signingSecret)).toBeNull();
            expect(verifyShortLivedToken('..', signingSecret)).toBeNull();
        });
    });
    
    // --- Webhook HMAC Verification Tests ---
    describe('Webhook HMAC Verification', () => {
        const secret = 'webhook_secret_123';
        const rawBody = '{"event": "user.created", "data": {"id": 1}}';
        const rawBodyBuffer = Buffer.from(rawBody, 'utf8');

        // Helper to generate the expected signature for testing
        const generateHmacSignature = (body: Buffer | string, sec: string) => {
            const hmac = crypto.createHmac('sha256', sec);
            hmac.update(body);
            return hmac.digest('hex');
        };

        it('should successfully verify a valid HMAC signature (string body)', () => {
            const signature = generateHmacSignature(rawBody, secret);
            const isValid = verifyWebhookHmac(rawBody, signature, secret);
            expect(isValid).toBe(true);
        });
        
        it('should successfully verify a valid HMAC signature (buffer body)', () => {
            const signature = generateHmacSignature(rawBodyBuffer, secret);
            const isValid = verifyWebhookHmac(rawBodyBuffer, signature, secret);
            expect(isValid).toBe(true);
        });

        it('should reject an invalid signature', () => {
            const signature = generateHmacSignature(rawBody, secret);
            const isInvalid = verifyWebhookHmac(rawBody, signature.slice(0, -1) + 'X', secret);
            expect(isInvalid).toBe(false);
        });
        
        it('should reject a request with a tampered body', () => {
            const signature = generateHmacSignature(rawBody, secret);
            const tamperedBody = rawBody + 'tamper';
            const isInvalid = verifyWebhookHmac(tamperedBody, signature, secret);
            expect(isInvalid).toBe(false);
        });
        
        it('should return false if secret is missing', () => {
            const signature = generateHmacSignature(rawBody, secret);
            const isValid = verifyWebhookHmac(rawBody, signature, '');
            expect(isValid).toBe(false);
        });
        
        it('should return false if signature header is missing', () => {
            const isValid = verifyWebhookHmac(rawBody, '', secret);
            expect(isValid).toBe(false);
        });
        
        it('should handle invalid hex in received signature gracefully', () => {
             const isValid = verifyWebhookHmac(rawBody, 'invalid-hex-string', secret);
             expect(isValid).toBe(false);
        });
    });
    
    // --- Key Masking Tests ---
    describe('Key Masking', () => {
        it('should mask a long key, showing only the last 4 characters', () => {
            const key = 'abcdef1234567890'; // Length 16
            const masked = maskKey(key);
            expect(masked).toHaveLength(16);
            expect(masked).toBe('************7890'); // 12 stars + last 4
        });
        
        it('should return the key if length is exactly 4', () => {
            const key = 'ABCD';
            expect(maskKey(key)).toBe('ABCD');
        });

        it('should return the key if length is less than 4', () => {
            const key = 'ABC';
            expect(maskKey(key)).toBe('ABC');
        });

        it('should handle an empty string', () => {
            expect(maskKey('')).toBe('');
        });
    });
});