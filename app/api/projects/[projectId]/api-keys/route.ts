import { prisma } from "@/lib/db";
import { generateApiKey, generateSecretKey, hashSecretKey, maskKey } from "@/lib/apiKey";
import { NextResponse } from "next/server";
import { withValidation } from "@/lib/validateRequest";
import { createApiKeySchema } from "@/lib/schemas";

/**
 * @swagger
 * /projects/{projectId}/api-keys:
 *   post:
 *     summary: Create a new API key for the project
 *     tags:
 *       - API Keys
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My Key"
 *     responses:
 *       200:
 *         description: API Key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 secret:
 *                   type: string
 *                 masked:
 *                   type: string
 *                 createdAt:
 *                   type: string
 */
export const POST = withValidation(createApiKeySchema)(async (req: Request, { params } : { params: Promise<{projectId: string}>}, data: any) => {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;

    const project = await prisma.project.findUnique({ where: { id: projectId }, include: { organization: true } });
    if (!project || project.organization.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = generateApiKey();
    const secretKey = generateSecretKey();
    const hashed = await hashSecretKey(secretKey);

    const newKey = await prisma.apiKey.create({
        data: {
            projectId,
            name: data.name,
            apiKey: apiKey,
            last4: secretKey.slice(-4),
            keyHash: hashed
        },
    });

    // Save full key once in memory for returning, afterwards only masked version is stored in DB
    return NextResponse.json({
        id: newKey.id,
        name: newKey.name,
        key: apiKey,
        secret: secretKey,
        createdAt: newKey.createdAt,
    });
});



/**
 * @swagger
 * /projects/{projectId}/api-keys:
 *   get:
 *     summary: List API keys for a project (masked)
 *     tags:
 *       - API Keys
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: List of API keys (masked)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   masked:
 *                     type: string
 *                   createdAt:
 *                     type: string
 */
export const GET = async (req: Request, { params }: { params: Promise<{ projectId: string }> }) => {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { apiKeys: true, organization: true } });
  if (!project || project.organization.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = project.apiKeys.map((k: any) => ({
    id: k.id,
    name: k.name,
    key: maskKey(k.apiKey), // show only last 4 chars (may be we can show fully)
    secret: "*".repeat(28) + k.last4, // show only last 4 chars
    createdAt: k.createdAt,
  }));

  return NextResponse.json(keys);
};