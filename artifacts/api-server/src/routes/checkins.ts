import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, checkinsTable, developersTable } from "@workspace/db";
import {
  CreateCheckinBody,
  CheckoutParams,
  CheckoutBody,
  ListCheckinsQueryParams,
  ListCheckinsResponse,
  CheckoutResponse,
} from "@workspace/api-zod";
import { getDateStringVN, parseExpectedTimeAsUTC } from "../lib/tz";

const router: IRouter = Router();

function getCheckinStatus(checkinAt: Date, expectedTime: string): string {
  const expected = parseExpectedTimeAsUTC(checkinAt, expectedTime);
  const diffMin = (checkinAt.getTime() - expected.getTime()) / 60000;
  if (diffMin <= 5) return "on_time";
  return "late";
}

function getCheckoutStatus(checkoutAt: Date, expectedTime: string): string {
  const expected = parseExpectedTimeAsUTC(checkoutAt, expectedTime);
  const diffMin = (checkoutAt.getTime() - expected.getTime()) / 60000;
  if (diffMin >= -5) return "on_time";
  return "early";
}

router.get("/checkins", async (req, res): Promise<void> => {
  const params = ListCheckinsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: checkinsTable.id,
      developerId: checkinsTable.developerId,
      developerName: developersTable.name,
      date: checkinsTable.date,
      checkinAt: checkinsTable.checkinAt,
      checkoutAt: checkinsTable.checkoutAt,
      checkinStatus: checkinsTable.checkinStatus,
      checkoutStatus: checkinsTable.checkoutStatus,
      notes: checkinsTable.notes,
      createdAt: checkinsTable.createdAt,
    })
    .from(checkinsTable)
    .innerJoin(developersTable, eq(checkinsTable.developerId, developersTable.id))
    .where(
      params.data.developerId != null
        ? eq(checkinsTable.developerId, params.data.developerId)
        : undefined
    )
    .orderBy(checkinsTable.date);

  let filtered = rows;
  if (params.data.date) {
    filtered = rows.filter((r) => r.date === params.data.date);
  }

  res.json(ListCheckinsResponse.parse(filtered));
});

router.post("/checkins", async (req, res): Promise<void> => {
  const parsed = CreateCheckinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dev] = await db.select().from(developersTable).where(eq(developersTable.id, parsed.data.developerId));
  if (!dev) {
    res.status(404).json({ error: "Developer not found" });
    return;
  }

  const checkinAt = new Date(parsed.data.checkinAt);
  const date = getDateStringVN(checkinAt);
  const checkinStatus = getCheckinStatus(checkinAt, dev.checkinTime);

  const [checkin] = await db
    .insert(checkinsTable)
    .values({
      developerId: parsed.data.developerId,
      date,
      checkinAt,
      checkinStatus,
      checkoutStatus: "missing",
      notes: parsed.data.notes ?? null,
    })
    .returning();

  const result = { ...checkin, developerName: dev.name };
  res.status(201).json(result);
});

router.patch("/checkins/:id/checkout", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CheckoutParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(checkinsTable).where(eq(checkinsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Check-in not found" });
    return;
  }

  const [dev] = await db.select().from(developersTable).where(eq(developersTable.id, existing.developerId));
  if (!dev) {
    res.status(404).json({ error: "Developer not found" });
    return;
  }

  const checkoutAt = new Date(parsed.data.checkoutAt);
  const checkoutStatus = getCheckoutStatus(checkoutAt, dev.checkoutTime);

  const [updated] = await db
    .update(checkinsTable)
    .set({ checkoutAt, checkoutStatus })
    .where(eq(checkinsTable.id, params.data.id))
    .returning();

  const result = { ...updated, developerName: dev.name };
  res.json(CheckoutResponse.parse(result));
});

export default router;
