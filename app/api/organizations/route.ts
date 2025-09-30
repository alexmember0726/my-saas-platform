import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create a new organization
 *     tags:
 *       - Organizations
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
 *                 example: "My Organization"
 *               description:
 *                 type: string
 *                 example: "Description of organization"
 *     responses:
 *       200:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Unauthorized
 */
export async function POST(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();

  try {
    const organization = await prisma.organization.create({
      data: {
        name,
        description,
        ownerId: userId,
      },
    });

    return NextResponse.json(organization);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}

/**
 * @swagger
 * /organizations:
 *   get:
 *     summary: List organizations for the logged-in user
 *     tags:
 *       - Organizations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const organizations = await prisma.organization.findMany({
      where: { ownerId: userId },
      include: { projects: true },
    });

    return NextResponse.json(organizations);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}
