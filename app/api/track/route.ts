// api/track/route.ts

import { verifyShortLivedToken } from "@/lib/apiKey";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const ORIGIN_HEADER = 'Origin';
const REFERER_HEADER = 'Referer';
const RATE_LIMIT = 10; // per minute (may be set on project)
const requests: Record<string, { count: number; last: number }> = {};
const WINDOW = 60 * 1000;


// the client should short lived jwt token to track event
// format: Authorization: Bearer JWT_TOKEN
export const POST = async (request: Request) => {
    // 1. Key Extraction
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Determine the source domain for validation
    const origin = request.headers.get(ORIGIN_HEADER);
    const referer = request.headers.get(REFERER_HEADER);
    const domainToValidate = origin || referer || '';

    // 2. token verification using hmac/jwt
    try {
        const [payloadEncoded] = token.split('.');
        const payloadStr = Buffer.from(payloadEncoded, 'base64url').toString('utf8');
        const payload = JSON.parse(payloadStr);
        const apiId = payload.a;

        const keyRecord = await prisma.apiKey.findUnique({
            where: { id: apiId }, // Use the extracted ID for lookup
            include: { project: true }
        });

        if (!keyRecord) {
            return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
        }

        const valid = verifyShortLivedToken(token, keyRecord.keyHash);
        if (!valid) {
            return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
        }

        // 3. Domain Enforcement (Origin/Referer Validation)
        const { project } = keyRecord;
        const allowedDomains = project.allowedDomains.map(d => d.trim());
        const isAllowed = allowedDomains.includes('*') || allowedDomains.includes(domainToValidate);

        if (!isAllowed) {
            console.warn(`Forbidden access: Domain '${domainToValidate}' not allowed for project ${project.id}`);
            return NextResponse.json({ error: `Forbidden: Domain '${domainToValidate}' not authorized.` }, { status: 403 });
        }

        // 4. Rate Limiting Check (we can check this one using middleware + radis, but for the testing I will use in-memory rate limiting check)
        const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            request.headers.get("x-real-ip") ||
            "unknown";
        const now = Date.now();
        if (!requests[ip as string] || now - requests[ip as string].last > WINDOW) {
            requests[ip as string] = { count: 1, last: now };
        } else {
            requests[ip as string].count++;
        }
        if (requests[ip as string].count > RATE_LIMIT) {
            return NextResponse.json({ error: 'Too Many Requests: Rate limit exceeded.' }, { status: 429 });
        }

        // 5. Input Validation (Sanity Check for payload)
        const data = await request.json();
        if (!data.name || typeof data.metadata !== 'object') {
            return NextResponse.json({ error: 'Bad Request: Invalid event structure.' }, { status: 400 });
        }

        // 6. Save Event
        await prisma.event.create({
            data: {
                projectId: project.id,
                name: data.name,
                metadata: data.metadata
            }
        });

        return NextResponse.json({ message: 'Event accepted' }, { status: 202 });

    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}