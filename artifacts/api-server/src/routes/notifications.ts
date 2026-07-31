import { Router } from "express";
import { and, eq, desc, gt } from "drizzle-orm";
import { db, notificationsTable, hospitalsTable } from "@workspace/db";
import {
  AdminListNotificationsQueryParams,
  AdminCreateNotificationBody,
  AdminUpdateNotificationBody,
  AdminUpdateNotificationParams,
  AdminDeleteNotificationParams,
  AdminPublishNotificationParams,
  GetPublicNotificationsQueryParams,
  HospitalCreateNotificationBody,
  HospitalDeleteNotificationParams,
} from "@workspace/api-zod";
import { requireAdmin, requireHospital } from "../middlewares/auth";

const router = Router();

function formatNotification(
  n: typeof notificationsTable.$inferSelect,
  hospitalName?: string | null
) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    status: n.status,
    hospitalId: n.hospitalId,
    hospitalName: hospitalName ?? null,
    campDate: n.campDate?.toISOString() ?? null,
    campLocation: n.campLocation,
    publishedAt: n.publishedAt?.toISOString() ?? null,
    expiresAt: n.expiresAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

// GET /notifications/public — no auth required
router.get("/notifications/public", async (req, res): Promise<void> => {
  const params = GetPublicNotificationsQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 20) : 20;

  const now = new Date();
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.status, "published"),
        // not expired or no expiry
        // We'll filter in JS for simplicity
      )
    )
    .orderBy(desc(notificationsTable.publishedAt))
    .limit(limit);

  // Filter expired ones
  const active = notifications.filter(
    (n) => !n.expiresAt || new Date(n.expiresAt) > now
  );

  res.json(active.map((n) => formatNotification(n)));
});

// GET /admin/notifications
router.get("/admin/notifications", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminListNotificationsQueryParams.safeParse(req.query);
  const conditions = [];

  if (params.success) {
    if (params.data.status) conditions.push(eq(notificationsTable.status, params.data.status));
    if (params.data.type) conditions.push(eq(notificationsTable.type, params.data.type));
  }

  const rows = await db
    .select({
      notification: notificationsTable,
      hospitalName: hospitalsTable.name,
    })
    .from(notificationsTable)
    .leftJoin(hospitalsTable, eq(notificationsTable.hospitalId, hospitalsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(notificationsTable.createdAt));

  res.json(rows.map((r) => formatNotification(r.notification, r.hospitalName)));
});

// POST /admin/notifications
router.post("/admin/notifications", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [notification] = await db
    .insert(notificationsTable)
    .values({
      title: data.title,
      message: data.message,
      type: data.type,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdBy: req.user!.email,
    })
    .returning();

  res.status(201).json(formatNotification(notification));
});

// PATCH /admin/notifications/:id
router.patch("/admin/notifications/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminUpdateNotificationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  const parsed = AdminUpdateNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const data = parsed.data;
  if (data.title !== undefined) updates.title = data.title;
  if (data.message !== undefined) updates.message = data.message;
  if (data.type !== undefined) updates.type = data.type;
  if (data.status !== undefined) updates.status = data.status;
  if (data.expiresAt !== undefined) updates.expiresAt = new Date(data.expiresAt);

  const [notification] = await db
    .update(notificationsTable)
    .set(updates)
    .where(eq(notificationsTable.id, params.data.id))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(formatNotification(notification));
});

// DELETE /admin/notifications/:id
router.delete("/admin/notifications/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminDeleteNotificationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  await db.delete(notificationsTable).where(eq(notificationsTable.id, params.data.id));
  res.status(204).end();
});

// PATCH /admin/notifications/:id/publish
router.patch("/admin/notifications/:id/publish", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminPublishNotificationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  const [notification] = await db
    .update(notificationsTable)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(notificationsTable.id, params.data.id))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(formatNotification(notification));
});

// --- HOSPITAL: blood donation camp notifications ---

// GET /hospital/notifications — a hospital's own submissions, any status
router.get("/hospital/notifications", requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.id;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.hospitalId, hospitalId))
    .orderBy(desc(notificationsTable.createdAt));

  res.json(notifications.map((n) => formatNotification(n)));
});

// POST /hospital/notifications — submit a camp notification
router.post("/hospital/notifications", requireHospital, async (req, res): Promise<void> => {
  const parsed = HospitalCreateNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const hospitalId = req.user!.id;

  const [hospital] = await db
    .select({ name: hospitalsTable.name })
    .from(hospitalsTable)
    .where(eq(hospitalsTable.id, hospitalId));

  const publishNow = data.publishNow === true;

  const [notification] = await db
    .insert(notificationsTable)
    .values({
      title: data.title,
      message: data.message,
      type: "camp",
      status: publishNow ? "published" : "pending_review",
      hospitalId,
      campDate: new Date(data.campDate),
      campLocation: data.campLocation,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      publishedAt: publishNow ? new Date() : null,
      createdBy: req.user!.email,
    })
    .returning();

  res.status(201).json(formatNotification(notification, hospital?.name));
});

// DELETE /hospital/notifications/:id — retract own submission
router.delete("/hospital/notifications/:id", requireHospital, async (req, res): Promise<void> => {
  const params = HospitalDeleteNotificationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  const hospitalId = req.user!.id;

  const [existing] = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.id, params.data.id));

  if (!existing || existing.hospitalId !== hospitalId) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  await db.delete(notificationsTable).where(eq(notificationsTable.id, params.data.id));
  res.status(204).end();
});

export default router;
