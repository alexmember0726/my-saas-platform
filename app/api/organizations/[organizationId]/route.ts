import { prisma } from "@/lib/db";
import { createOrganizationSchema } from "@/lib/schemas";
import { withValidation } from "@/lib/validateRequest";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /organizations/{organizationId}:
 *   get:
 *     summary: Get organization by ID
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
 *         description: Organization details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(req: Request, { params }: { params: Promise<{ organizationId: string }> }) {
    const userId = req.headers.get("x-user-id");
    if(!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { organizationId } = await params;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization || organization.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(organization);
}

/**
 * @swagger
 * /organizations/{organizationId}:
 *   put:
 *     summary: Update organzation by ID
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
 *     responses:
 *       200:
 *         description: Updated organization
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export const PUT = withValidation(createOrganizationSchema)(async (req: Request, { params }: {params: Promise<{organizationId: string}>}, data) => {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { organizationId } = await params;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization || organization.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.organization.update({
        where: { id: organizationId },
        data
    });

    return NextResponse.json(updated);
});

/**
 * @swagger
 * /organizations/{organizationId}:
 *   delete:
 *     summary: Delete organization by ID
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
 *         description: Organization deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export const DELETE = async (req: Request, { params }: { params: Promise<{ organizationId: string }> }) => {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { organizationId } = await params;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
    });

    if (!organization || organization.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.organization.delete({ where: { id: organizationId } });

    return NextResponse.json({ success: true });
}
