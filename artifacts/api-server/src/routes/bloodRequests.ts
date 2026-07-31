import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, bloodRequestsTable, hospitalsTable } from "@workspace/db";
import {
  CreateBloodRequestBody,
  CancelBloodRequestParams,
  ListHospitalBloodRequestsQueryParams,
  RespondToBloodRequestParams,
  RespondToBloodRequestBody,
} from "@workspace/api-zod";
import { requireUser, requireHospital } from "../middlewares/auth";

const router = Router();

const VALID_URGENCY = ["normal", "urgent", "critical"];
const VALID_RESPONSE_STATUS = ["accepted", "fulfilled", "declined"];

function formatRequest(
  r: typeof bloodRequestsTable.$inferSelect,
  hospitalName?: string | null
) {
  return {
    id: r.id,
    userId: r.userId,
    hospitalId: r.hospitalId,
    hospitalName: hospitalName ?? null,
    bloodGroup: r.bloodGroup,
    units: r.units,
    urgency: r.urgency,
    patientName: r.patientName,
    contactNumber: r.contactNumber,
    notes: r.notes,
    status: r.status,
    hospitalResponse: r.hospitalResponse,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// --- USER: submit and manage own blood requests ---

// GET /user/blood-requests — donor's own requests, any status
router.get("/user/blood-requests", requireUser, async (req, res): Promise<void> => {
  const userId = req.user!.id;

  const rows = await db
    .select({ request: bloodRequestsTable, hospitalName: hospitalsTable.name })
    .from(bloodRequestsTable)
    .leftJoin(hospitalsTable, eq(bloodRequestsTable.hospitalId, hospitalsTable.id))
    .where(eq(bloodRequestsTable.userId, userId))
    .orderBy(desc(bloodRequestsTable.createdAt));

  res.json(rows.map((r) => formatRequest(r.request, r.hospitalName)));
});

// POST /user/blood-requests — submit a targeted request to a specific hospital
router.post("/user/blood-requests", requireUser, async (req, res): Promise<void> => {
  const parsed = CreateBloodRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  if (!VALID_URGENCY.includes(data.urgency)) {
    res.status(400).json({ error: "Invalid urgency value" });
    return;
  }

  const [hospital] = await db
    .select({ id: hospitalsTable.id, name: hospitalsTable.name, approvalStatus: hospitalsTable.approvalStatus })
    .from(hospitalsTable)
    .where(eq(hospitalsTable.id, data.hospitalId));

  if (!hospital || hospital.approvalStatus !== "approved") {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  const [request] = await db
    .insert(bloodRequestsTable)
    .values({
      userId: req.user!.id,
      hospitalId: data.hospitalId,
      bloodGroup: data.bloodGroup,
      units: data.units,
      urgency: data.urgency,
      patientName: data.patientName,
      contactNumber: data.contactNumber,
      notes: data.notes,
    })
    .returning();

  res.status(201).json(formatRequest(request, hospital.name));
});

// PATCH /user/blood-requests/:id/cancel — donor cancels their own pending request
router.patch("/user/blood-requests/:id/cancel", requireUser, async (req, res): Promise<void> => {
  const params = CancelBloodRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(bloodRequestsTable)
    .where(eq(bloodRequestsTable.id, params.data.id));

  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (existing.status !== "pending") {
    res.status(409).json({ error: "Only pending requests can be cancelled" });
    return;
  }

  const [updated] = await db
    .update(bloodRequestsTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(bloodRequestsTable.id, params.data.id))
    .returning();

  res.json(formatRequest(updated));
});

// --- HOSPITAL: view and respond to incoming requests ---

// GET /hospital/blood-requests — requests targeted at the logged-in hospital
router.get("/hospital/blood-requests", requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.id;
  const params = ListHospitalBloodRequestsQueryParams.safeParse(req.query);

  const conditions = [eq(bloodRequestsTable.hospitalId, hospitalId)];
  if (params.success && params.data.status) {
    conditions.push(eq(bloodRequestsTable.status, params.data.status));
  }

  const requests = await db
    .select()
    .from(bloodRequestsTable)
    .where(and(...conditions))
    .orderBy(desc(bloodRequestsTable.createdAt));

  res.json(requests.map((r) => formatRequest(r)));
});

// PATCH /hospital/blood-requests/:id — accept, fulfill, or decline
router.patch("/hospital/blood-requests/:id", requireHospital, async (req, res): Promise<void> => {
  const params = RespondToBloodRequestParams.safeParse(req.params);
  const body = RespondToBloodRequestBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  if (!VALID_RESPONSE_STATUS.includes(body.data.status)) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  const hospitalId = req.user!.id;

  const [existing] = await db
    .select()
    .from(bloodRequestsTable)
    .where(eq(bloodRequestsTable.id, params.data.id));

  if (!existing || existing.hospitalId !== hospitalId) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  const [updated] = await db
    .update(bloodRequestsTable)
    .set({
      status: body.data.status,
      hospitalResponse: body.data.hospitalResponse ?? existing.hospitalResponse,
      updatedAt: new Date(),
    })
    .where(eq(bloodRequestsTable.id, params.data.id))
    .returning();

  res.json(formatRequest(updated));
});

export default router;
