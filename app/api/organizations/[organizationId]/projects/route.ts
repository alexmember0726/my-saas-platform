import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /organizations/{organizationId}/projects:
 *   get:
 *     summary: List all projects for organization
 *     tags:
 *       - Organizations
 *     security:
 *       - bearerAuth: []
*     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of projects
 */
export const GET = async (req: Request, { params }: { params: Promise<{ organizationId: string }> }) => {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    
    const { organizationId } = await params;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization || organization.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const projects = await prisma.project.findMany({
        where: { organizationId: organizationId },
    });

    return NextResponse.json(projects);
}
