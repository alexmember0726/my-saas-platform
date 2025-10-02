import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /organizations/{organizationId}/events:
 *   get:
 *     summary: Get last 7 days of event counts
 *     tags:
 *       - Dashboard
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
 *         description: List of event counts by day
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     example: 2025-09-30
 *                   events:
 *                     type: number
 *                     example: 15
 *       500:
 *         description: Server error
 */
export const GET = async (req: Request, { params }: { params: Promise<{ organizationId: string }> }) => {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


    const { organizationId } = await params;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization || organization.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch events for the current user's projects
    const events = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT 
        DATE(e."createdAt") AS date,
        COUNT(*) AS count
      FROM "Event" e
      INNER JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = ${organizationId}
        AND e."createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(e."createdAt")
      ORDER BY DATE(e."createdAt") ASC
    `;

    const formatted = events.map(e => ({
      date: e.date,
      events: Number(e.count),
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error('Failed to fetch event counts:', err);
    return NextResponse.json({ error: 'Failed to fetch event counts' }, { status: 500 });
  }
};