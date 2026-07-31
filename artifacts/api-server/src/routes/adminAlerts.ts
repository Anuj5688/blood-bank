import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, adminAlertsTable } from "@workspace/db";
import { ListAdminAlertsQueryParams } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

function formatAlert(a: typeof adminAlertsTable.$inferSelect) {
  return {
    id: a.id,
    type: a.type,
    title: a.title,
    message: a.message,
    entityType: a.entityType,
    entityId: a.entityId,
    isRead: a.isRead,
    createdAt: a.createdAt.toISOString(),
  };
}

// GET /admin/alerts
router.get("/admin/alerts", requireAdmin, async (req, res): Promise<void> => {
  const params = ListAdminAlertsQueryParams.safeParse(req.query);
  const unreadOnly = params.success && params.data.unreadOnly === true;

  const alerts = await db
    .select()
    .from(adminAlertsTable)
    .where(unreadOnly ? eq(adminAlertsTable.isRead, false) : undefined)
    .orderBy(desc(adminAlertsTable.createdAt))
    .limit(100);

  res.json(alerts.map(formatAlert));
});

// GET /admin/alerts/unread-count
router.get("/admin/alerts/unread-count", requireAdmin, async (_req, res): Promise<void> => {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminAlertsTable)
    .where(eq(adminAlertsTable.isRead, false));

  res.json({ count: row?.count ?? 0 });
});

// PATCH /admin/alerts/:id/read
router.patch("/admin/alerts/:id/read", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid alert id" });
    return;
  }

  const [alert] = await db
    .update(adminAlertsTable)
    .set({ isRead: true })
    .where(eq(adminAlertsTable.id, id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(formatAlert(alert));
});

// PATCH /admin/alerts/read-all
router.patch("/admin/alerts/read-all", requireAdmin, async (_req, res): Promise<void> => {
  await db
    .update(adminAlertsTable)
    .set({ isRead: true })
    .where(eq(adminAlertsTable.isRead, false));

  res.json({ message: "All alerts marked as read" });
});

export default router;
