// app/api/projects/[projectId]/events/route.ts
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * @swagger
 * /api/projects/{projectId}/events:
 *   get:
 *     summary: Get events of a project (paginated)
 *     description: Returns a list of events for a specific project, limited and paginated using cursor-based pagination.
 *     tags:
 *       - Events
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the project
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of events to fetch (max 100)
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema:
 *           type: string
 *         description: Event ID to paginate from
 *     responses:
 *       200:
 *         description: List of project events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *                   description: Cursor for fetching the next page
 *       401:
 *         description: Unauthorized (missing x-user-id)
 *       403:
 *         description: Forbidden (user does not own project)
 *
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         projectId:
 *           type: string
 *         name:
 *           type: string
 *         metadata:
 *           type: object
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const cursor = searchParams.get("cursor");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { organization: true },
    });

    if (!project || project.organization.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const events = await prisma.event.findMany({
      where: { projectId: projectId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    let nextCursor: string | null = null;
    if (events.length > limit) {
      const nextItem = events.pop();
      nextCursor = nextItem?.id || null;
    }

    return NextResponse.json({ events, nextCursor });
  } catch (err) {
    console.error("Failed to fetch events:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
