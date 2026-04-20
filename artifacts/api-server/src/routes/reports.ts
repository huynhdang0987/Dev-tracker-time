import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reportsTable, developersTable } from "@workspace/db";
import {
  CreateReportBody,
  ListReportsQueryParams,
  ListReportsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports", async (req, res): Promise<void> => {
  const params = ListReportsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: reportsTable.id,
      developerId: reportsTable.developerId,
      developerName: developersTable.name,
      date: reportsTable.date,
      content: reportsTable.content,
      submittedAt: reportsTable.submittedAt,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .innerJoin(developersTable, eq(reportsTable.developerId, developersTable.id))
    .where(
      params.data.developerId != null
        ? eq(reportsTable.developerId, params.data.developerId)
        : undefined
    )
    .orderBy(reportsTable.date);

  let filtered = rows;
  if (params.data.date) {
    filtered = rows.filter((r) => r.date === params.data.date);
  }

  res.json(ListReportsResponse.parse(filtered));
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dev] = await db.select().from(developersTable).where(eq(developersTable.id, parsed.data.developerId));
  if (!dev) {
    res.status(404).json({ error: "Developer not found" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const date: string = parsed.data.date != null ? String(parsed.data.date) : today;

  const [report] = await db
    .insert(reportsTable)
    .values({
      developerId: parsed.data.developerId,
      date,
      content: parsed.data.content,
      status: "submitted",
    })
    .returning();

  const result = { ...report, developerName: dev.name };
  res.status(201).json(result);
});

export default router;
