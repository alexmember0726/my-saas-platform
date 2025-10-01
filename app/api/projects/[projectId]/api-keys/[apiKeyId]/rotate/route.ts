import { prisma } from "@/lib/db";
import { generateApiKey, generateSecretKey, hashSecretKey } from "@/lib/apiKey";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /projects/{projectId}/api-keys/{apiKeyId}/rotate:
 *   put:
 *     summary: Rotate an existing API key
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
 *       - name: apiKeyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key rotated successfully, returns new secret once
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 secret:
 *                   type: string
 *                 masked:
 *                   type: string
 */
export const PUT = async (req: Request, { params }: { params: Promise<{ projectId: string; apiKeyId: string }> }) => {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, apiKeyId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: true },
  });

  if (!project || project.organization.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey || apiKey.revoked) {
    return NextResponse.json({ error: "API Key not found or revoked" }, { status: 404 });
  }

  const newKey = generateApiKey();
  const newSecret = generateSecretKey();
  const hashed = await hashSecretKey(newSecret);

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { 
        keyHash: hashed, 
        apiKey: newKey,
        last4: newSecret.slice(-4),
        rotatedAt: new Date(), 
    },
  });

  return NextResponse.json({
    id: apiKey.id,
    key: newKey,
    secret: newSecret
  });
};
