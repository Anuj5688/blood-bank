import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, eq, ilike, or, sql, desc } from "drizzle-orm";
import {
  db,
  hospitalsTable,
  bloodInventoryTable,
  bloodStockHistoryTable,
  auditLogsTable,
  usersTable,
  notificationsTable,
  adminAlertsTable,
} from "@workspace/db";
import {
  AdminListHospitalsQueryParams,
  AdminCreateHospitalBody,
  AdminUpdateHospitalParams,
  AdminUpdateHospitalBody,
  AdminGetHospitalParams,
  AdminDeleteHospitalParams,
  ApproveHospitalParams,
  RejectHospitalParams,
  RejectHospitalBody,
  SuspendHospitalParams,
  ActivateHospitalParams,
  AdminResetPasswordParams,
  AdminResetPasswordBody,
  GetAuditLogsQueryParams,
  AdminListUsersQueryParams,
  AdminGetUserParams,
  AdminDeleteUserParams,
  AdminBlockUserParams,
  AdminBlockUserBody,
  AdminResetUserPasswordParams,
  AdminResetUserPasswordBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function bloodStatus(units: number): string {
  if (units === 0) return "Out of Stock";
  if (units <= 5) return "Low Stock";
  return "Available";
}

function formatHospital(hospital: typeof hospitalsTable.$inferSelect, inventory: typeof bloodInventoryTable.$inferSelect[]) {
  return {
    id: hospital.id,
    name: hospital.name,
    registrationNumber: hospital.registrationNumber,
    licenseNumber: hospital.licenseNumber,
    type: hospital.type,
    ownership: hospital.ownership,
    city: hospital.city,
    district: hospital.district,
    state: hospital.state,
    address: hospital.address,
    pinCode: hospital.pinCode,
    contactPerson: hospital.contactPerson,
    contactNumber: hospital.contactNumber,
    email: hospital.email,
    website: hospital.website,
    googleMapsLat: hospital.googleMapsLat ? parseFloat(hospital.googleMapsLat) : null,
    googleMapsLng: hospital.googleMapsLng ? parseFloat(hospital.googleMapsLng) : null,
    workingHours: hospital.workingHours,
    logoUrl: hospital.logoUrl,
    licenseDocumentUrl: hospital.licenseDocumentUrl,
    licenseDocumentFileName: hospital.licenseDocumentFileName,
    status: hospital.isActive ? "Active" : "Inactive",
    approvalStatus: hospital.approvalStatus,
    rejectionReason: hospital.rejectionReason,
    lastLogin: hospital.lastLogin?.toISOString() ?? null,
    createdAt: hospital.createdAt.toISOString(),
    bloodInventory: inventory.map((inv) => ({
      id: inv.id,
      hospitalId: inv.hospitalId,
      bloodGroup: inv.bloodGroup,
      units: inv.units,
      status: bloodStatus(inv.units),
      lastUpdated: inv.lastUpdated.toISOString(),
    })),
  };
}

// GET /admin/hospitals
router.get("/admin/hospitals", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminListHospitalsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { status, city, district, search, type } = params.data;
  const conditions = [];

  if (status) conditions.push(eq(hospitalsTable.approvalStatus, status));
  if (city) conditions.push(ilike(hospitalsTable.city, `%${city}%`));
  if (district) conditions.push(ilike(hospitalsTable.district, `%${district}%`));
  if (type) conditions.push(ilike(hospitalsTable.type, `%${type}%`));
  if (search) {
    conditions.push(
      or(
        ilike(hospitalsTable.name, `%${search}%`),
        ilike(hospitalsTable.email, `%${search}%`),
        ilike(hospitalsTable.city, `%${search}%`)
      )!
    );
  }

  const hospitals = await db
    .select()
    .from(hospitalsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(hospitalsTable.createdAt));

  const ids = hospitals.map((h) => h.id);
  let inventoryByHospital: Record<number, typeof bloodInventoryTable.$inferSelect[]> = {};

  if (ids.length > 0) {
    const inv = await db
      .select()
      .from(bloodInventoryTable)
      .where(sql`${bloodInventoryTable.hospitalId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
    for (const row of inv) {
      if (!inventoryByHospital[row.hospitalId]) inventoryByHospital[row.hospitalId] = [];
      inventoryByHospital[row.hospitalId].push(row);
    }
  }

  res.json(hospitals.map((h) => formatHospital(h, inventoryByHospital[h.id] ?? [])));
});

// POST /admin/hospitals
router.post("/admin/hospitals", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateHospitalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const passwordHash = await bcrypt.hash(data.password, 12);

  const [hospital] = await db
    .insert(hospitalsTable)
    .values({
      name: data.name,
      registrationNumber: data.registrationNumber ?? null,
      licenseNumber: data.licenseNumber ?? null,
      type: data.type ?? "Hospital",
      ownership: data.ownership ?? "Private",
      city: data.city,
      district: data.district,
      state: data.state ?? "Punjab",
      address: data.address,
      pinCode: data.pinCode ?? null,
      contactPerson: data.contactPerson ?? null,
      contactNumber: data.contactNumber,
      email: data.email,
      passwordHash,
      website: data.website ?? null,
      googleMapsLat: data.googleMapsLat?.toString() ?? null,
      googleMapsLng: data.googleMapsLng?.toString() ?? null,
      workingHours: data.workingHours ?? null,
      approvalStatus: "approved",
      isActive: data.status !== "inactive",
    })
    .returning();

  // Seed initial inventory
  const inventoryValues = BLOOD_GROUPS.map((bg) => {
    const init = (data.initialInventory ?? []).find((i) => i.bloodGroup === bg);
    const units = init?.units ?? 0;
    return {
      hospitalId: hospital.id,
      bloodGroup: bg,
      units,
      status: bloodStatus(units),
    };
  });
  await db.insert(bloodInventoryTable).values(inventoryValues);

  await db.insert(auditLogsTable).values({
    action: "hospital_created",
    entityType: "hospital",
    entityId: hospital.id,
    performedBy: req.user!.email,
    details: `Admin manually added hospital: ${hospital.name}`,
  });

  const inventory = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.hospitalId, hospital.id));
  res.status(201).json(formatHospital(hospital, inventory));
});

// GET /admin/hospitals/:id
router.get("/admin/hospitals/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminGetHospitalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [hospital] = await db
    .select()
    .from(hospitalsTable)
    .where(eq(hospitalsTable.id, params.data.id));

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  const inventory = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.hospitalId, hospital.id));
  res.json(formatHospital(hospital, inventory));
});

// PATCH /admin/hospitals/:id
router.patch("/admin/hospitals/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminUpdateHospitalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminUpdateHospitalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.registrationNumber !== undefined) updateData.registrationNumber = data.registrationNumber;
  if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.ownership !== undefined) updateData.ownership = data.ownership;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.district !== undefined) updateData.district = data.district;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.pinCode !== undefined) updateData.pinCode = data.pinCode;
  if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
  if (data.contactNumber !== undefined) updateData.contactNumber = data.contactNumber;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.googleMapsLat !== undefined) updateData.googleMapsLat = data.googleMapsLat?.toString();
  if (data.googleMapsLng !== undefined) updateData.googleMapsLng = data.googleMapsLng?.toString();
  if (data.workingHours !== undefined) updateData.workingHours = data.workingHours;
  if (data.status !== undefined) updateData.isActive = data.status !== "inactive";

  const [hospital] = await db
    .update(hospitalsTable)
    .set(updateData)
    .where(eq(hospitalsTable.id, params.data.id))
    .returning();

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "hospital_updated",
    entityType: "hospital",
    entityId: hospital.id,
    performedBy: req.user!.email,
    details: `Admin updated hospital: ${hospital.name}`,
  });

  const inventory = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.hospitalId, hospital.id));
  res.json(formatHospital(hospital, inventory));
});

// DELETE /admin/hospitals/:id
router.delete("/admin/hospitals/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminDeleteHospitalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [hospital] = await db
    .delete(hospitalsTable)
    .where(eq(hospitalsTable.id, params.data.id))
    .returning({ id: hospitalsTable.id, name: hospitalsTable.name });

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "hospital_deleted",
    entityType: "hospital",
    entityId: hospital.id,
    performedBy: req.user!.email,
    details: `Admin deleted hospital: ${hospital.name}`,
  });

  res.sendStatus(204);
});

// PATCH /admin/hospitals/:id/approve
router.patch("/admin/hospitals/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const params = ApproveHospitalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Ensure all blood groups exist for the hospital
  const existing = await db.select({ bloodGroup: bloodInventoryTable.bloodGroup })
    .from(bloodInventoryTable)
    .where(eq(bloodInventoryTable.hospitalId, params.data.id));

  const existingGroups = new Set(existing.map((r) => r.bloodGroup));
  const missing = BLOOD_GROUPS.filter((bg) => !existingGroups.has(bg));
  if (missing.length > 0) {
    await db.insert(bloodInventoryTable).values(
      missing.map((bg) => ({ hospitalId: params.data.id, bloodGroup: bg, units: 0, status: "Out of Stock" }))
    );
  }

  const [hospital] = await db
    .update(hospitalsTable)
    .set({ approvalStatus: "approved", isActive: true, updatedAt: new Date() })
    .where(eq(hospitalsTable.id, params.data.id))
    .returning();

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "hospital_approved",
    entityType: "hospital",
    entityId: hospital.id,
    performedBy: req.user!.email,
    details: `Admin approved hospital: ${hospital.name}`,
  });

  await db
    .update(adminAlertsTable)
    .set({ isRead: true })
    .where(and(eq(adminAlertsTable.entityType, "hospital"), eq(adminAlertsTable.entityId, hospital.id)));

  const inventory = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.hospitalId, hospital.id));
  res.json(formatHospital(hospital, inventory));
});

// PATCH /admin/hospitals/:id/reject
router.patch("/admin/hospitals/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const params = RejectHospitalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const bodyParsed = RejectHospitalBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [hospital] = await db
    .update(hospitalsTable)
    .set({ approvalStatus: "rejected", rejectionReason: bodyParsed.data.reason, updatedAt: new Date() })
    .where(eq(hospitalsTable.id, params.data.id))
    .returning();

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "hospital_rejected",
    entityType: "hospital",
    entityId: hospital.id,
    performedBy: req.user!.email,
    details: `Admin rejected hospital: ${hospital.name}. Reason: ${bodyParsed.data.reason}`,
  });

  await db
    .update(adminAlertsTable)
    .set({ isRead: true })
    .where(and(eq(adminAlertsTable.entityType, "hospital"), eq(adminAlertsTable.entityId, hospital.id)));

  const inventory = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.hospitalId, hospital.id));
  res.json(formatHospital(hospital, inventory));
});

// PATCH /admin/hospitals/:id/suspend
router.patch("/admin/hospitals/:id/suspend", requireAdmin, async (req, res): Promise<void> => {
  const params = SuspendHospitalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [hospital] = await db
    .update(hospitalsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(hospitalsTable.id, params.data.id))
    .returning();

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "hospital_suspended",
    entityType: "hospital",
    entityId: hospital.id,
    performedBy: req.user!.email,
    details: `Admin suspended hospital: ${hospital.name}`,
  });

  const inventory = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.hospitalId, hospital.id));
  res.json(formatHospital(hospital, inventory));
});

// PATCH /admin/hospitals/:id/activate
router.patch("/admin/hospitals/:id/activate", requireAdmin, async (req, res): Promise<void> => {
  const params = ActivateHospitalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [hospital] = await db
    .update(hospitalsTable)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(hospitalsTable.id, params.data.id))
    .returning();

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "hospital_activated",
    entityType: "hospital",
    entityId: hospital.id,
    performedBy: req.user!.email,
    details: `Admin activated hospital: ${hospital.name}`,
  });

  const inventory = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.hospitalId, hospital.id));
  res.json(formatHospital(hospital, inventory));
});

// POST /admin/hospitals/:id/reset-password
router.post("/admin/hospitals/:id/reset-password", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminResetPasswordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const bodyParsed = AdminResetPasswordBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const newHash = await bcrypt.hash(bodyParsed.data.newPassword, 12);
  const [hospital] = await db
    .update(hospitalsTable)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(hospitalsTable.id, params.data.id))
    .returning({ id: hospitalsTable.id, name: hospitalsTable.name, email: hospitalsTable.email });

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "password_reset",
    entityType: "hospital",
    entityId: hospital.id,
    performedBy: req.user!.email,
    details: `Admin reset password for hospital: ${hospital.name}`,
  });

  res.json({ message: "Password reset successfully" });
});

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [totalHospitals] = await db.select({ count: sql<number>`count(*)::int` }).from(hospitalsTable);
  const [pending] = await db.select({ count: sql<number>`count(*)::int` }).from(hospitalsTable).where(eq(hospitalsTable.approvalStatus, "pending"));
  const [approved] = await db.select({ count: sql<number>`count(*)::int` }).from(hospitalsTable).where(eq(hospitalsTable.approvalStatus, "approved"));
  const [rejected] = await db.select({ count: sql<number>`count(*)::int` }).from(hospitalsTable).where(eq(hospitalsTable.approvalStatus, "rejected"));
  const [suspended] = await db.select({ count: sql<number>`count(*)::int` }).from(hospitalsTable).where(and(eq(hospitalsTable.approvalStatus, "approved"), eq(hospitalsTable.isActive, false)));
  const [bloodBanks] = await db.select({ count: sql<number>`count(*)::int` }).from(hospitalsTable).where(and(eq(hospitalsTable.approvalStatus, "approved"), eq(hospitalsTable.type, "Blood Bank")));
  const [bloodUnits] = await db.select({ total: sql<number>`coalesce(sum(units), 0)::int` }).from(bloodInventoryTable);

  const cityWiseCounts = await db
    .select({ city: hospitalsTable.city, count: sql<number>`count(*)::int` })
    .from(hospitalsTable)
    .where(eq(hospitalsTable.approvalStatus, "approved"))
    .groupBy(hospitalsTable.city)
    .orderBy(desc(sql`count(*)`));

  const districtWiseCounts = await db
    .select({ district: hospitalsTable.district, count: sql<number>`count(*)::int` })
    .from(hospitalsTable)
    .where(eq(hospitalsTable.approvalStatus, "approved"))
    .groupBy(hospitalsTable.district)
    .orderBy(desc(sql`count(*)`));

  const bloodGroupStats = await db
    .select({
      bloodGroup: bloodInventoryTable.bloodGroup,
      totalUnits: sql<number>`sum(${bloodInventoryTable.units})::int`,
      hospitalsAvailable: sql<number>`count(distinct ${bloodInventoryTable.hospitalId})::int`,
    })
    .from(bloodInventoryTable)
    .groupBy(bloodInventoryTable.bloodGroup)
    .orderBy(bloodInventoryTable.bloodGroup);

  const [totalUsers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);

  const [blockedUsers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(eq(usersTable.isBlocked, true));

  const [activeNotifications] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(eq(notificationsTable.status, "published"));

  const recentLogs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(10);

  res.json({
    totalHospitals: totalHospitals?.count ?? 0,
    pendingApprovals: pending?.count ?? 0,
    approvedHospitals: approved?.count ?? 0,
    rejectedHospitals: rejected?.count ?? 0,
    suspendedHospitals: suspended?.count ?? 0,
    totalBloodBanks: bloodBanks?.count ?? 0,
    totalBloodUnits: bloodUnits?.total ?? 0,
    totalUsers: totalUsers?.count ?? 0,
    blockedUsers: blockedUsers?.count ?? 0,
    activeNotifications: activeNotifications?.count ?? 0,
    cityStats: cityWiseCounts.map((c) => ({ city: c.city, hospitalCount: c.count, totalUnits: 0 })),
    bloodGroupStats: bloodGroupStats.map((bg) => ({
      bloodGroup: bg.bloodGroup,
      totalUnits: bg.totalUnits ?? 0,
      hospitalsAvailable: bg.hospitalsAvailable ?? 0,
    })),
    recentActivity: recentLogs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      performedBy: l.performedBy,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

// ==================== USER MANAGEMENT ====================

function formatAdminUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    bloodGroup: user.bloodGroup,
    city: user.city,
    district: user.district,
    isBlocked: user.isBlocked,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

// GET /admin/users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminListUsersQueryParams.safeParse(req.query);
  const page = (params.success && params.data.page) ? params.data.page : 1;
  const limit = (params.success && params.data.limit) ? params.data.limit : 20;
  const offset = (page - 1) * limit;
  const conditions = [];

  if (params.success) {
    if (params.data.search) {
      conditions.push(
        or(
          ilike(usersTable.name, `%${params.data.search}%`),
          ilike(usersTable.email, `%${params.data.search}%`)
        )!
      );
    }
    if (params.data.status === "blocked") conditions.push(eq(usersTable.isBlocked, true));
    if (params.data.status === "active") conditions.push(eq(usersTable.isBlocked, false));
  }

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const users = await db
    .select()
    .from(usersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    users: users.map(formatAdminUser),
    total: totalRow?.count ?? 0,
    page,
    limit,
  });
});

// GET /admin/users/:id
router.get("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminGetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatAdminUser(user));
});

// DELETE /admin/users/:id
router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminDeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.status(204).end();
});

// PATCH /admin/users/:id/block
router.patch("/admin/users/:id/block", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminBlockUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const parsed = AdminBlockUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({
      isBlocked: parsed.data.blocked,
      blockReason: parsed.data.reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatAdminUser(user));
});

// POST /admin/users/:id/reset-password
router.post("/admin/users/:id/reset-password", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminResetUserPasswordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const parsed = AdminResetUserPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const [user] = await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, params.data.id))
    .returning({ id: usersTable.id });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ message: "User password reset successfully" });
});

// GET /admin/audit-logs
router.get("/admin/audit-logs", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAuditLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { hospitalId, action, limit } = params.data;
  const conditions = [];

  if (hospitalId) conditions.push(eq(auditLogsTable.entityId, hospitalId));
  if (action) conditions.push(ilike(auditLogsTable.action, `%${action}%`));

  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit ?? 100);

  res.json(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      performedBy: l.performedBy,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    }))
  );
});

// DELETE handler for blood stock history (for admin cleanup)
router.get("/admin/blood-stock-history/:hospitalId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.hospitalId) ? req.params.hospitalId[0] : req.params.hospitalId;
  const hospitalId = parseInt(raw, 10);

  const history = await db
    .select()
    .from(bloodStockHistoryTable)
    .where(eq(bloodStockHistoryTable.hospitalId, hospitalId))
    .orderBy(desc(bloodStockHistoryTable.createdAt))
    .limit(50);

  res.json(
    history.map((h) => ({
      id: h.id,
      hospitalId: h.hospitalId,
      bloodGroup: h.bloodGroup,
      unitsBefore: h.unitsBefore,
      unitsAfter: h.unitsAfter,
      action: h.action,
      notes: h.notes,
      createdAt: h.createdAt.toISOString(),
    }))
  );
});

export default router;
