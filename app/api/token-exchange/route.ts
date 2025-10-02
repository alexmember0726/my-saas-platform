// api/token-exchange/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateShortLivedToken, verifySecretKey } from "@/lib/apiKey";

const AUTH_HEADER = 'authorization';

// the thirdparty server should send apikey and secret to get client token
// format: Authorization: Basic base64(API_KEY:SECRET_KEY)
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get(AUTH_HEADER);
    if (!authHeader || !authHeader.startsWith("Basic ")) return NextResponse.json({ error: "Authorization header required" }, { status: 400 });

    // Decode Base64 part
    const base64Credentials = authHeader.replace("Basic ", "");
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");

    const [apiKey, secret] = credentials.split(":");


    // Lookup the API key in DB by apiKeyId
    const dbKey = await prisma.apiKey.findFirst({
      where: { apiKey: apiKey },
      include: { project: true },
    });

    if (!dbKey) return NextResponse.json({ error: "API key not found" }, { status: 401 });

    // Verify the provided long-lived key against stored hash
    const valid = await verifySecretKey(secret, dbKey.keyHash);
    if (!valid) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    // Generate short-lived JWT (You can use STATIC key to generate token to speed up, but now let me use hash)
    const token = generateShortLivedToken(dbKey.projectId, dbKey.id, dbKey.keyHash);

    return NextResponse.json({ token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
  }
}
