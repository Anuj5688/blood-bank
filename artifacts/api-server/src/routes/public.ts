import { Router } from "express";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  hospitalsTable,
  bloodInventoryTable,
  citiesTable,
  districtsTable,
} from "@workspace/db";
import {
  SearchHospitalsQueryParams,
  GetHospitalParams,
} from "@workspace/api-zod";

const router = Router();

function bloodStatus(units: number): string {
  if (units === 0) return "Out of Stock";
  if (units <= 5) return "Low Stock";
  return "Available";
}

router.get("/hospitals", async (req, res): Promise<void> => {
  const params = SearchHospitalsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { city, district, bloodGroup, type, search } = params.data;

  const conditions = [
    eq(hospitalsTable.approvalStatus, "approved"),
    eq(hospitalsTable.isActive, true),
  ];

  if (city) conditions.push(ilike(hospitalsTable.city, `%${city}%`));
  if (district) conditions.push(ilike(hospitalsTable.district, `%${district}%`));
  if (type) conditions.push(ilike(hospitalsTable.type, `%${type}%`));
  if (search) {
    conditions.push(
      or(
        ilike(hospitalsTable.name, `%${search}%`),
        ilike(hospitalsTable.city, `%${search}%`),
        ilike(hospitalsTable.district, `%${search}%`),
        ilike(hospitalsTable.address, `%${search}%`)
      )!
    );
  }

  let hospitals = await db
    .select()
    .from(hospitalsTable)
    .where(and(...conditions));

  // If filtering by blood group, only show hospitals that have available stock
  if (bloodGroup) {
    const inventoryRows = await db
      .select()
      .from(bloodInventoryTable)
      .where(
        and(
          eq(bloodInventoryTable.bloodGroup, bloodGroup),
          sql`${bloodInventoryTable.units} > 0`
        )
      );
    const hospitalIdsWithBlood = new Set(inventoryRows.map((r) => r.hospitalId));
    hospitals = hospitals.filter((h) => hospitalIdsWithBlood.has(h.id));
  }

  const hospitalIds = hospitals.map((h) => h.id);
  let inventoryMap: Record<number, typeof bloodInventoryTable.$inferSelect[]> = {};

  if (hospitalIds.length > 0) {
    const inventoryRows = await db
      .select()
      .from(bloodInventoryTable)
      .where(sql`${bloodInventoryTable.hospitalId} = ANY(${sql.raw(`ARRAY[${hospitalIds.join(",")}]::int[]`)})`)

    for (const row of inventoryRows) {
      if (!inventoryMap[row.hospitalId]) inventoryMap[row.hospitalId] = [];
      inventoryMap[row.hospitalId].push(row);
    }
  }

  const result = hospitals.map((h) => ({
    id: h.id,
    name: h.name,
    type: h.type,
    ownership: h.ownership,
    city: h.city,
    district: h.district,
    address: h.address,
    pinCode: h.pinCode,
    contactNumber: h.contactNumber,
    email: h.email,
    website: h.website,
    googleMapsLat: h.googleMapsLat ? parseFloat(h.googleMapsLat) : null,
    googleMapsLng: h.googleMapsLng ? parseFloat(h.googleMapsLng) : null,
    workingHours: h.workingHours,
    logoUrl: h.logoUrl,
    status: h.isActive ? "Active" : "Inactive",
    bloodInventory: (inventoryMap[h.id] ?? []).map((inv) => ({
      id: inv.id,
      hospitalId: inv.hospitalId,
      bloodGroup: inv.bloodGroup,
      units: inv.units,
      status: bloodStatus(inv.units),
      lastUpdated: inv.lastUpdated.toISOString(),
    })),
  }));

  res.json(result);
});

router.get("/hospitals/:id", async (req, res): Promise<void> => {
  const params = GetHospitalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [hospital] = await db
    .select()
    .from(hospitalsTable)
    .where(
      and(
        eq(hospitalsTable.id, params.data.id),
        eq(hospitalsTable.approvalStatus, "approved"),
        eq(hospitalsTable.isActive, true)
      )
    );

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  const inventory = await db
    .select()
    .from(bloodInventoryTable)
    .where(eq(bloodInventoryTable.hospitalId, hospital.id));

  res.json({
    id: hospital.id,
    name: hospital.name,
    type: hospital.type,
    ownership: hospital.ownership,
    city: hospital.city,
    district: hospital.district,
    address: hospital.address,
    pinCode: hospital.pinCode,
    contactNumber: hospital.contactNumber,
    email: hospital.email,
    website: hospital.website,
    googleMapsLat: hospital.googleMapsLat ? parseFloat(hospital.googleMapsLat) : null,
    googleMapsLng: hospital.googleMapsLng ? parseFloat(hospital.googleMapsLng) : null,
    workingHours: hospital.workingHours,
    logoUrl: hospital.logoUrl,
    status: hospital.isActive ? "Active" : "Inactive",
    bloodInventory: inventory.map((inv) => ({
      id: inv.id,
      hospitalId: inv.hospitalId,
      bloodGroup: inv.bloodGroup,
      units: inv.units,
      status: bloodStatus(inv.units),
      lastUpdated: inv.lastUpdated.toISOString(),
    })),
  });
});

router.get("/cities", async (_req, res): Promise<void> => {
  const cities = await db
    .select()
    .from(citiesTable)
    .orderBy(citiesTable.name);
  res.json(cities);
});

router.get("/districts", async (_req, res): Promise<void> => {
  const districts = await db
    .select()
    .from(districtsTable)
    .orderBy(districtsTable.name);
  res.json(districts);
});

router.get("/public-stats", async (_req, res): Promise<void> => {
  const [totalHospitals] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hospitalsTable)
    .where(and(eq(hospitalsTable.approvalStatus, "approved"), eq(hospitalsTable.type, "Hospital")));

  const [totalBloodBanks] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hospitalsTable)
    .where(and(eq(hospitalsTable.approvalStatus, "approved"), eq(hospitalsTable.type, "Blood Bank")));

  const [availableBloodUnits] = await db
    .select({ total: sql<number>`coalesce(sum(units), 0)::int` })
    .from(bloodInventoryTable)
    .leftJoin(hospitalsTable, eq(bloodInventoryTable.hospitalId, hospitalsTable.id))
    .where(and(eq(hospitalsTable.approvalStatus, "approved"), eq(hospitalsTable.isActive, true)));

  const [citiesServed] = await db
    .select({ count: sql<number>`count(distinct city)::int` })
    .from(hospitalsTable)
    .where(and(eq(hospitalsTable.approvalStatus, "approved"), eq(hospitalsTable.isActive, true)));

  const [districtsServed] = await db
    .select({ count: sql<number>`count(distinct district)::int` })
    .from(hospitalsTable)
    .where(and(eq(hospitalsTable.approvalStatus, "approved"), eq(hospitalsTable.isActive, true)));

  const bloodGroupCounts = await db
    .select({
      bloodGroup: bloodInventoryTable.bloodGroup,
      totalUnits: sql<number>`sum(${bloodInventoryTable.units})::int`,
      hospitalsAvailable: sql<number>`count(distinct ${bloodInventoryTable.hospitalId})::int`,
    })
    .from(bloodInventoryTable)
    .leftJoin(hospitalsTable, eq(bloodInventoryTable.hospitalId, hospitalsTable.id))
    .where(and(eq(hospitalsTable.approvalStatus, "approved"), eq(hospitalsTable.isActive, true)))
    .groupBy(bloodInventoryTable.bloodGroup)
    .orderBy(bloodInventoryTable.bloodGroup);

  res.json({
    totalHospitals: totalHospitals?.count ?? 0,
    totalBloodBanks: totalBloodBanks?.count ?? 0,
    availableBloodUnits: availableBloodUnits?.total ?? 0,
    citiesServed: citiesServed?.count ?? 0,
    districtsServed: districtsServed?.count ?? 0,
    bloodGroupCounts: bloodGroupCounts.map((bg) => ({
      bloodGroup: bg.bloodGroup,
      totalUnits: bg.totalUnits ?? 0,
      hospitalsAvailable: bg.hospitalsAvailable ?? 0,
    })),
  });
});

export default router;
