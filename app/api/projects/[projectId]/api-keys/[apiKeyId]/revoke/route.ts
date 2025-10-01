import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /projects/{projectId}/api-keys/{apiKeyId}/revoke:
 *   delete:
 *     summary: Revoke an API key
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
 *         description: API key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
export const DELETE = async (req: Request, { params }: { params: Promise<{ projectId: string; apiKeyId: string }> }) => {
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

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { revoked: true },
  });

  return NextResponse.json({ success: true });
};
