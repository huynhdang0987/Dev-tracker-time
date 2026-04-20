import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, responsesTable, developersTable } from "@workspace/db";
import {
  CreateResponseBody,
  ListResponsesQueryParams,
  ListResponsesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/responses", async (req, res): Promise<void> => {
  const params = ListResponsesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: responsesTable.id,
      developerId: responsesTable.developerId,
      developerName: developersTable.name,
      messageAt: responsesTable.messageAt,
      respondedAt: responsesTable.respondedAt,
      responseTimeMinutes: responsesTable.responseTimeMinutes,
      topic: responsesTable.topic,
      createdAt: responsesTable.createdAt,
    })
    .from(responsesTable)
    .innerJoin(developersTable, eq(responsesTable.developerId, developersTable.id))
    .where(
      params.data.developerId != null
        ? eq(responsesTable.developerId, params.data.developerId)
        : undefined
    )
    .orderBy(responsesTable.messageAt);

  let filtered = rows;
  if (params.data.date) {
    filtered = rows.filter((r) => r.messageAt.toISOString().startsWith(params.data.date!));
  }

  res.json(ListResponsesResponse.parse(filtered));
});

router.post("/responses", async (req, res): Promise<void> => {
  const parsed = CreateResponseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dev] = await db.select().from(developersTable).where(eq(developersTable.id, parsed.data.developerId));
  if (!dev) {
    res.status(404).json({ error: "Developer not found" });
    return;
  }

  let responseTimeMinutes: number | null = null;
  const messageAt = new Date(parsed.data.messageAt);
  let respondedAt: Date | null = null;

  if (parsed.data.respondedAt) {
    respondedAt = new Date(parsed.data.respondedAt);
    responseTimeMinutes = Math.round((respondedAt.getTime() - messageAt.getTime()) / 60000);
  }

  const [response] = await db
    .insert(responsesTable)
    .values({
      developerId: parsed.data.developerId,
      messageAt,
      respondedAt,
      responseTimeMinutes,
      topic: parsed.data.topic ?? null,
    })
    .returning();

  const result = { ...response, developerName: dev.name };
  res.status(201).json(result);
});

export default router;
