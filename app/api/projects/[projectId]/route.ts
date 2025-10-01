import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateProjectSchema } from "@/lib/schemas";
import { withValidation } from "@/lib/validateRequest";

/**
 * @swagger
 * /projects/{projectId}:
 *   get:
 *     summary: Get project by ID
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
    const userId = req.headers.get("x-user-id");
    if(!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { organization: true },
    });

    if (!project || project.organization.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(project);
}

/**
 * @swagger
 * /projects/{projectId}:
 *   put:
 *     summary: Update project by ID
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               allowedDomains:
 *                 type: array
 *                 items:
 *                   type: string
 *               featureToggles:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated project
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export const PUT = withValidation(updateProjectSchema)(async (req: Request, { params }: {params: Promise<{projectId: string}>}, data) => {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { organization: true },
    });

    if (!project || project.organization.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.project.update({
        where: { id: projectId },
        data
    });

    return NextResponse.json(updated);
});

/**
 * @swagger
 * /projects/{projectId}:
 *   delete:
 *     summary: Delete project by ID
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export const DELETE = async (req: Request, { params }: { params: Promise<{ projectId: string }> }) => {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { organization: true },
    });

    if (!project || project.organization.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.project.delete({ where: { id: projectId } });

    return NextResponse.json({ success: true });
}
