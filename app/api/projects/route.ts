import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createProjectSchema } from "@/lib/schemas";
import { validateRequest, withValidation } from "@/lib/validateRequest";

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
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
 *               organizationId:
 *                 type: string
 *               allowedDomains:
 *                 type: array
 *                 items:
 *                   type: string
 *               featureToggles:
 *                 type: object
 *     responses:
 *       200:
 *         description: Project created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export const POST = withValidation(createProjectSchema)(async (req: Request, data: any) => {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { id: data.organizationId } });
    if (!org || org.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const project = await prisma.project.create({
        data
    });

    return NextResponse.json(project);
});

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: List all projects for user's organizations
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 */
export const GET = async (req: Request) => {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projects = await prisma.project.findMany({
        where: { organization: { ownerId: userId } },
        include: { apiKeys: false },
    });

    return NextResponse.json(projects);
}
