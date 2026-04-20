import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, developersTable } from "@workspace/db";
import {
  CreateDeveloperBody,
  GetDeveloperParams,
  UpdateDeveloperParams,
  UpdateDeveloperBody,
  DeleteDeveloperParams,
  ListDevelopersResponse,
  GetDeveloperResponse,
  UpdateDeveloperResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/developers", async (req, res): Promise<void> => {
  const devs = await db.select().from(developersTable).orderBy(developersTable.name);
  res.json(ListDevelopersResponse.parse(devs));
});

router.post("/developers", async (req, res): Promise<void> => {
  const parsed = CreateDeveloperBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dev] = await db
    .insert(developersTable)
    .values({
      ...parsed.data,
      checkinTime: parsed.data.checkinTime ?? "08:00",
      checkoutTime: parsed.data.checkoutTime ?? "17:00",
    })
    .returning();

  res.status(201).json(GetDeveloperResponse.parse(dev));
});

router.get("/developers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDeveloperParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dev] = await db.select().from(developersTable).where(eq(developersTable.id, params.data.id));
  if (!dev) {
    res.status(404).json({ error: "Developer not found" });
    return;
  }

  res.json(GetDeveloperResponse.parse(dev));
});

router.patch("/developers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateDeveloperParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDeveloperBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.email != null) updateData.email = parsed.data.email;
  if (parsed.data.slackId !== undefined) updateData.slackId = parsed.data.slackId;
  if (parsed.data.checkinTime != null) updateData.checkinTime = parsed.data.checkinTime;
  if (parsed.data.checkoutTime != null) updateData.checkoutTime = parsed.data.checkoutTime;
  if (parsed.data.active != null) updateData.active = parsed.data.active;

  const [dev] = await db
    .update(developersTable)
    .set(updateData)
    .where(eq(developersTable.id, params.data.id))
    .returning();

  if (!dev) {
    res.status(404).json({ error: "Developer not found" });
    return;
  }

  res.json(UpdateDeveloperResponse.parse(dev));
});

router.delete("/developers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteDeveloperParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dev] = await db.delete(developersTable).where(eq(developersTable.id, params.data.id)).returning();
  if (!dev) {
    res.status(404).json({ error: "Developer not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
