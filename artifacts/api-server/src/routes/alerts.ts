import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, alertsTable, developersTable } from "@workspace/db";
import {
  CreateAlertBody,
  ResolveAlertParams,
  ListAlertsQueryParams,
  ListAlertsResponse,
  ResolveAlertResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  const params = ListAlertsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.developerId != null) {
    conditions.push(eq(alertsTable.developerId, params.data.developerId));
  }
  if (params.data.resolved != null) {
    conditions.push(eq(alertsTable.resolved, params.data.resolved === "true"));
  }

  const rows = await db
    .select({
      id: alertsTable.id,
      developerId: alertsTable.developerId,
      developerName: developersTable.name,
      type: alertsTable.type,
      message: alertsTable.message,
      resolved: alertsTable.resolved,
      emailSent: alertsTable.emailSent,
      resolvedAt: alertsTable.resolvedAt,
      createdAt: alertsTable.createdAt,
    })
    .from(alertsTable)
    .innerJoin(developersTable, eq(alertsTable.developerId, developersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(alertsTable.createdAt);

  res.json(ListAlertsResponse.parse(rows));
});

router.post("/alerts", async (req, res): Promise<void> => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dev] = await db.select().from(developersTable).where(eq(developersTable.id, parsed.data.developerId));
  if (!dev) {
    res.status(404).json({ error: "Developer not found" });
    return;
  }

  const [alert] = await db
    .insert(alertsTable)
    .values({
      developerId: parsed.data.developerId,
      type: parsed.data.type,
      message: parsed.data.message,
      emailSent: parsed.data.emailSent ?? false,
      resolved: false,
    })
    .returning();

  const result = { ...alert, developerName: dev.name };
  res.status(201).json(result);
});

router.patch("/alerts/:id/resolve", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ResolveAlertParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(alertsTable).where(eq(alertsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  const [updated] = await db
    .update(alertsTable)
    .set({ resolved: true, resolvedAt: new Date() })
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  const [dev] = await db.select().from(developersTable).where(eq(developersTable.id, updated.developerId));

  const result = { ...updated, developerName: dev?.name ?? "Unknown" };
  res.json(ResolveAlertResponse.parse(result));
});

export default router;
