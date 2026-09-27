import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, hospitalsTable, adminsTable, adminAlertsTable } from "@workspace/db";
import { LoginBody, RegisterHospitalBody } from "@workspace/api-zod";
import { signToken } from "../middlewares/auth";

const router = Router();

const MAX_LICENSE_DOCUMENT_BYTES = 300 * 1024; // 300KB

/**
 * Validates a base64 data-URL PDF upload: must be a PDF, and the decoded
 * (actual file) size must not exceed MAX_LICENSE_DOCUMENT_BYTES. Client-side
 * checks exist too, but this is the enforcement that actually matters.
 */
function validateLicenseDocument(dataUrl: string): { ok: true } | { ok: false; error: string } {
  const match = /^data:application\/pdf;base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { ok: false, error: "License document must be a PDF file" };
  }

  const base64Payload = match[1];
  // Decoded byte length from base64 length, without allocating a Buffer
  // for a value we haven't size-checked yet.
  const padding = base64Payload.endsWith("==") ? 2 : base64Payload.endsWith("=") ? 1 : 0;
  const decodedBytes = (base64Payload.length * 3) / 4 - padding;

  if (decodedBytes > MAX_LICENSE_DOCUMENT_BYTES) {
    return { ok: false, error: "License document must be 300KB or smaller" };
  }

  return { ok: true };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  // Check admin first
     // Check admin first
     let admin;
     try {
       [admin] = await db
         .select()
         .from(adminsTable)
         .where(eq(adminsTable.email, email));
     } catch (err: any) {
       console.error("LOGIN DB ERROR:", err.message);
       console.error("CAUSE:", err.cause);
       throw err;
     }

     if (admin) {
       const valid = await bcrypt.compare(password, admin.passwordHash);
       if (!valid) {
         res.status(401).json({ error: "Invalid credentials" });
         return;
       }
       const token = signToken({ id: admin.id, email: admin.email, role: "admin" });
       res.json({ token, role: "admin", hospitalId: null, name: admin.name });
       return;
     }
  if (admin) {
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: admin.id, email: admin.email, role: "admin" });
    res.json({ token, role: "admin", hospitalId: null, name: admin.name });
    return;
  }

  // Check hospital
  const [hospital] = await db
    .select()
    .from(hospitalsTable)
    .where(eq(hospitalsTable.email, email));

  if (!hospital) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, hospital.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (hospital.approvalStatus !== "approved") {
    res.status(403).json({ error: `Account ${hospital.approvalStatus}. Only approved hospitals can log in.` });
    return;
  }

  if (!hospital.isActive) {
    res.status(403).json({ error: "Account suspended. Please contact admin." });
    return;
  }

  // Update last login
  await db
    .update(hospitalsTable)
    .set({ lastLogin: new Date() })
    .where(eq(hospitalsTable.id, hospital.id));

  const token = signToken({ id: hospital.id, email: hospital.email, role: "hospital" });
  res.json({ token, role: "hospital", hospitalId: hospital.id, name: hospital.name });
});

// POST /auth/hospital/register — self-service registration, pending admin approval
router.post("/auth/hospital/register", async (req, res): Promise<void> => {
  const parsed = RegisterHospitalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  if (data.licenseDocument) {
    const validation = validateLicenseDocument(data.licenseDocument);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }
  }

  const [existingHospital] = await db
    .select({ id: hospitalsTable.id })
    .from(hospitalsTable)
    .where(eq(hospitalsTable.email, data.email));

  if (existingHospital) {
    res.status(409).json({ error: "A hospital is already registered with this email" });
    return;
  }

  const [existingAdmin] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.email, data.email));

  if (existingAdmin) {
    res.status(409).json({ error: "This email is already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const [hospital] = await db
    .insert(hospitalsTable)
    .values({
      name: data.name,
      registrationNumber: data.registrationNumber,
      licenseNumber: data.licenseNumber ?? null,
      type: data.type,
      ownership: data.ownership,
      city: data.city,
      district: data.district,
      state: data.state ?? "Punjab",
      address: data.address,
      pinCode: data.pinCode ?? null,
      contactPerson: data.contactPerson,
      contactNumber: data.contactNumber,
      email: data.email,
      passwordHash,
      website: data.website ?? null,
      workingHours: data.workingHours ?? null,
      licenseDocumentUrl: data.licenseDocument ?? null,
      licenseDocumentFileName: data.licenseDocumentFileName ?? null,
      approvalStatus: "pending",
      isActive: true,
    })
    .returning();

  // Notify super admins so they can review and approve/reject the application
  await db.insert(adminAlertsTable).values({
    type: "hospital_registration",
    title: "New hospital registration",
    message: `${hospital.name} (${hospital.city}) submitted a registration request and is awaiting approval.`,
    entityType: "hospital",
    entityId: hospital.id,
  });

  res.status(201).json({
    message: "Registration submitted successfully. Your account will be reviewed by an administrator before you can log in.",
    hospitalId: hospital.id,
    approvalStatus: hospital.approvalStatus,
  });
});

export default router;
