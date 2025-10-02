import crypto from "crypto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const HMAC_ALGORITHM = "sha256";
const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 15 minutes for short-lived token

// Generate api key
export function generateApiKey() {
    return crypto.randomBytes(8).toString("hex");
}

// Generate secret key
export function generateSecretKey() {
    return crypto.randomBytes(32).toString("hex");
}


// Hash key for storage
export async function hashSecretKey(key: string) {
    return await bcrypt.hash(key, SALT_ROUNDS);
}

// Verify long-lived key
export async function verifySecretKey(key: string, hash: string) {
    return await bcrypt.compare(key, hash);
}

// Generate short-lived token from long-lived key
export function generateShortLivedToken(projectId: string, apiKeyId: string, signingSecret: string) {
    const payload = {
        p: projectId,
        a: apiKeyId,
        exp: Date.now() + TOKEN_LIFETIME_MS, // Expiration timestamp
        iat: Date.now(), // Issued at
    };

    // 1. Serialize and Base64 encode the payload
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // 2. Calculate the HMAC signature using the project's unique secret
    const hmac = crypto.createHmac(HMAC_ALGORITHM, signingSecret);
    hmac.update(payloadEncoded);
    const signature = hmac.digest('base64url');

    // 3. Combine to form the token
    return `${payloadEncoded}.${signature}`;
}

// Verify short-lived token
export function verifyShortLivedToken(token: string, signingSecret: string) {
    try {
        const [payloadEncoded, signatureReceived] = token.split('.');
        if (!payloadEncoded || !signatureReceived) {
            return null; // Malformed token
        }

        // 1. Recalculate the expected signature
        const hmac = crypto.createHmac(HMAC_ALGORITHM, signingSecret);
        hmac.update(payloadEncoded);
        const signatureExpected = hmac.digest('base64url');

        // 2. Compare signatures securely
        if (signatureExpected !== signatureReceived) {
            return null; // Invalid signature (tampered or wrong secret)
        }

        // 3.  Decode payload and check expiration
        const payloadStr = Buffer.from(payloadEncoded, 'base64url').toString('utf8');
        const payload = JSON.parse(payloadStr);
        if (payload.exp && payload.exp < Date.now()) {
            return null; // Token expired
        }

        const { p, a } = payload;

        return { p, a };
    } catch {
        return null;
    }
}

// verify webhook hmac
export function verifyWebhookHmac(rawBody: Buffer | string, signatureHeader: string, secret: string): boolean {
    if (!secret || !signatureHeader) {
        console.error("Verification failed: Missing secret or signature header.");
        return false;
    }

    // --- STEP 1: Extract the payload used for the hash calculation ---
    // Note: Many services prepend a timestamp (e.g., Stripe: t=timestamp,v1=signature)
    // For this generic example, we'll assume the entire signature header is the signature,
    // or you can simplify the payload as needed by the external service's format.
    
    // Simplification: Assume the whole raw body is signed directly (like GitHub's basic mode)
    const signedPayload = rawBody; 

    // --- STEP 2: Calculate the expected signature ---
    // The raw body is hashed using the secret key.
    const hmac = crypto.createHmac(HMAC_ALGORITHM, secret);
    hmac.update(signedPayload);
    const expectedSignature = hmac.digest('hex');

    // --- STEP 3: Get the received signature (adjust based on header format) ---
    // Assuming the header contains the hex signature directly:
    const receivedSignature = signatureHeader; 
    
    // If the service prefixes it (e.g., "sha256="), you'd need to extract just the hex part.

    // --- STEP 4: Secure Comparison (Constant-Time) ---
    // Critical: Use a constant-time comparison to prevent timing attacks.
    try {
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');
        const receivedBuffer = Buffer.from(receivedSignature, 'hex');

        // Check length first to avoid error in timingSafeEqual if buffers are different length
        if (expectedBuffer.length !== receivedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch {
        // Handle potential errors if buffers cannot be created (e.g., invalid hex strings)
        return false;
    }
}

// Mask a secret key: show only last 4 characters
export function maskKey(key: string): string {
    if(key.length <= 4) return key;
    return "*".repeat(key.length - 4) + key.slice(-4);
}