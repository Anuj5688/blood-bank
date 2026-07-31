import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, eq, desc } from "drizzle-orm";
import {
  db,
  hospitalsTable,
  bloodInventoryTable,
  bloodStockHistoryTable,
  auditLogsTable,
} from "@workspace/db";
import {
  UpdateHospitalProfileBody,
  UpdateBloodStockBody,
  UpdateBloodStockParams,
  ChangeHospitalPasswordBody,
} from "@workspace/api-zod";
import { requireHospital } from "../middlewares/auth";

const router = Router();

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function bloodStatus(units: number): string {
  if (units === 0) return "Out of Stock";
  if (units <= 5) return "Low Stock";
  return "Available";
}

async function ensureInventoryExists(hospitalId: number): Promise<void> {
  const existing = await db
    .select({ bloodGroup: bloodInventoryTable.bloodGroup })
    .from(bloodInventoryTable)
    .where(eq(bloodInventoryTable.hospitalId, hospitalId));

  const existingGroups = new Set(existing.map((r) => r.bloodGroup));
  const missing = BLOOD_GROUPS.filter((bg) => !existingGroups.has(bg));

  if (missing.length > 0) {
    await db.insert(bloodInventoryTable).values(
      missing.map((bg) => ({
        hospitalId,
        bloodGroup: bg,
        units: 0,
        status: "Out of Stock",
      }))
    );
  }
}

router.get("/hospital/profile", requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.id;

  const [hospital] = await db
    .select()
    .from(hospitalsTable)
    .where(eq(hospitalsTable.id, hospitalId));

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  res.json({
    id: hospital.id,
    name: hospital.name,
    registrationNumber: hospital.registrationNumber,
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
    status: hospital.isActive ? "Active" : "Inactive",
    approvalStatus: hospital.approvalStatus,
    createdAt: hospital.createdAt.toISOString(),
  });
});

router.patch("/hospital/profile", requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.id;
  const parsed = UpdateHospitalProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
  if (data.contactNumber !== undefined) updateData.contactNumber = data.contactNumber;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.pinCode !== undefined) updateData.pinCode = data.pinCode;
  if (data.googleMapsLat !== undefined) updateData.googleMapsLat = data.googleMapsLat?.toString();
  if (data.googleMapsLng !== undefined) updateData.googleMapsLng = data.googleMapsLng?.toString();
  if (data.workingHours !== undefined) updateData.workingHours = data.workingHours;

  const [hospital] = await db
    .update(hospitalsTable)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(hospitalsTable.id, hospitalId))
    .returning();

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "profile_update",
    entityType: "hospital",
    entityId: hospitalId,
    performedBy: hospital.email,
    details: "Hospital updated their profile",
  });

  res.json({
    id: hospital.id,
    name: hospital.name,
    registrationNumber: hospital.registrationNumber,
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
    status: hospital.isActive ? "Active" : "Inactive",
    approvalStatus: hospital.approvalStatus,
    createdAt: hospital.createdAt.toISOString(),
  });
});

router.get("/hospital/inventory", requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.id;
  await ensureInventoryExists(hospitalId);

  const inventory = await db
    .select()
    .from(bloodInventoryTable)
    .where(eq(bloodInventoryTable.hospitalId, hospitalId))
    .orderBy(bloodInventoryTable.bloodGroup);

  res.json(
    inventory.map((inv) => ({
      id: inv.id,
      hospitalId: inv.hospitalId,
      bloodGroup: inv.bloodGroup,
      units: inv.units,
      status: bloodStatus(inv.units),
      lastUpdated: inv.lastUpdated.toISOString(),
    }))
  );
});

router.patch("/hospital/inventory/:bloodGroup", requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.id;

  const params = UpdateBloodStockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const bodyParsed = UpdateBloodStockBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const { bloodGroup } = params.data;
  const { units, notes } = bodyParsed.data;

  // Get current inventory
  const [existing] = await db
    .select()
    .from(bloodInventoryTable)
    .where(
      and(
        eq(bloodInventoryTable.hospitalId, hospitalId),
        eq(bloodInventoryTable.bloodGroup, bloodGroup)
      )
    );

  const unitsBefore = existing?.units ?? 0;
  const newStatus = bloodStatus(units);

  let inv;
  if (existing) {
    const [updated] = await db
      .update(bloodInventoryTable)
      .set({ units, status: newStatus, lastUpdated: new Date() })
      .where(eq(bloodInventoryTable.id, existing.id))
      .returning();
    inv = updated;
  } else {
    const [created] = await db
      .insert(bloodInventoryTable)
      .values({ hospitalId, bloodGroup, units, status: newStatus })
      .returning();
    inv = created;
  }

  // Log history
  await db.insert(bloodStockHistoryTable).values({
    hospitalId,
    bloodGroup,
    unitsBefore,
    unitsAfter: units,
    action: units > unitsBefore ? "add" : units < unitsBefore ? "remove" : "update",
    notes: notes ?? null,
    performedBy: req.user!.email,
  });

  await db.insert(auditLogsTable).values({
    action: "inventory_update",
    entityType: "blood_inventory",
    entityId: hospitalId,
    performedBy: req.user!.email,
    details: `${bloodGroup}: ${unitsBefore} → ${units} units`,
  });

  res.json({
    id: inv.id,
    hospitalId: inv.hospitalId,
    bloodGroup: inv.bloodGroup,
    units: inv.units,
    status: bloodStatus(inv.units),
    lastUpdated: inv.lastUpdated.toISOString(),
  });
});

router.get("/hospital/inventory/history", requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.id;

  const history = await db
    .select()
    .from(bloodStockHistoryTable)
    .where(eq(bloodStockHistoryTable.hospitalId, hospitalId))
    .orderBy(desc(bloodStockHistoryTable.createdAt))
    .limit(100);

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

router.post("/hospital/change-password", requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.id;
  const parsed = ChangeHospitalPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  const [hospital] = await db
    .select()
    .from(hospitalsTable)
    .where(eq(hospitalsTable.id, hospitalId));

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, hospital.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(hospitalsTable)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(hospitalsTable.id, hospitalId));

  await db.insert(auditLogsTable).values({
    action: "password_change",
    entityType: "hospital",
    entityId: hospitalId,
    performedBy: hospital.email,
    details: "Hospital changed their password",
  });

  res.json({ message: "Password changed successfully" });
});

export default router;
