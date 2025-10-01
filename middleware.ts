import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Skip auth for public endpoints
    if (
        pathname.startsWith("/api/auth")
        || pathname.startsWith("/api/docs")
        || pathname.startsWith("/api/token-exchange") 
        || pathname.startsWith("/api/track")
    ) {
        return NextResponse.next();
    }

    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string };

        // Pass userId to downstream routes
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("x-user-id", payload.userId);

        return NextResponse.next({
            request: { headers: requestHeaders },
        });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
}

export const config = {
    matcher: ["/api/:path*"], // apply middleware to all API routes
    runtime: "nodejs"
};
