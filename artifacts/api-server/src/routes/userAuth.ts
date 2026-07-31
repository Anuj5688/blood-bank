import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody, UpdateUserProfileBody, ChangeUserPasswordBody } from "@workspace/api-zod";
import { signToken, requireUser } from "../middlewares/auth";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    bloodGroup: user.bloodGroup,
    city: user.city,
    district: user.district,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt.toISOString(),
  };
}

// POST /auth/user/register
router.post("/auth/user/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, data.email));

  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({
      name: data.name,
      email: data.email,
      passwordHash,
      phone: data.phone ?? null,
      bloodGroup: data.bloodGroup ?? null,
      city: data.city ?? null,
      district: data.district ?? null,
    })
    .returning();

  const token = signToken({ id: user.id, email: user.email, role: "user" });
  res.status(201).json({ token, role: "user", user: formatUser(user) });
});

// POST /auth/user/login
router.post("/auth/user/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.isBlocked) {
    res.status(403).json({ error: "Account blocked. Please contact admin." });
    return;
  }

  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

  const token = signToken({ id: user.id, email: user.email, role: "user" });
  res.json({ token, role: "user", user: formatUser(user) });
});

// GET /user/profile
router.get("/user/profile", requireUser, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// PATCH /user/profile
router.patch("/user/profile", requireUser, async (req, res): Promise<void> => {
  const parsed = UpdateUserProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, phone, bloodGroup, city, district } = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
  if (city !== undefined) updates.city = city;
  if (district !== undefined) updates.district = district;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user!.id))
    .returning();

  res.json(formatUser(user));
});

// POST /user/change-password
router.post("/user/change-password", requireUser, async (req, res): Promise<void> => {
  const parsed = ChangeUserPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

  res.json({ message: "Password changed successfully" });
});

export default router;
