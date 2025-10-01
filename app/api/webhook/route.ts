import { verifyWebhookHmac } from "@/lib/apiKey";
import { NextRequest, NextResponse } from "next/server";

async function getRawBodyBuffer(request: NextRequest): Promise<Buffer> {
    // Clone the request to read the body stream once.
    const rawText = await request.clone().text(); 
    return Buffer.from(rawText, 'utf8');
}


export async function POST(request: NextRequest) {
    const WEBHOOK_SECRET_KEY = process.env.WEBHOOK_SECRET_KEY as string; // shared webhook secret key
    const SIGNATURE_HEADER = 'X-Hub-Signature';

    // 1. Get RAW Body (CRITICAL STEP)
    const rawBodyBuffer = await getRawBodyBuffer(request);

    // 2. Get Signature from Header
    const signatureHeader = request.headers.get(SIGNATURE_HEADER);

    if (!WEBHOOK_SECRET_KEY || !signatureHeader) {
        return NextResponse.json({ error: 'Missing security configuration or header.' }, { status: 400 });
    }

    // 3. Verification
    if (verifyWebhookHmac(rawBodyBuffer, signatureHeader, WEBHOOK_SECRET_KEY)) {
        // SUCCESS: Signature is valid. Process the payload.
        
        // Convert the raw body to JSON now that it's verified
        const eventPayload = JSON.parse(rawBodyBuffer.toString('utf8'));
        
        // --- Process the Webhook Event Here ---
        console.log(`Verified Webhook Received: ${eventPayload.type}`);
        // e.g., Update user subscription in DB

        // Important: Respond quickly (200 OK or 202 Accepted) to prevent the sender from retrying
        return NextResponse.json({ message: 'Webhook accepted' }, { status: 202 }); 
    } else {
        // FAILURE: Signature mismatch. Reject immediately.
        console.error(`HMAC signature verification failed for incoming request.`);
        return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 403 });
    }
}