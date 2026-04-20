import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, developersTable, checkinsTable, reportsTable, alertsTable, responsesTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetTodayStatusResponse,
  GetResponseStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [devsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(developersTable)
    .where(eq(developersTable.active, true));

  const [checkedInResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(checkinsTable)
    .where(and(eq(checkinsTable.date, today), eq(checkinsTable.checkinStatus, "on_time")));

  const lateCheckin = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(checkinsTable)
    .where(and(eq(checkinsTable.date, today), eq(checkinsTable.checkinStatus, "late")));

  const [reportsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportsTable)
    .where(eq(reportsTable.date, today));

  const [alertsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alertsTable)
    .where(eq(alertsTable.resolved, false));

  const [avgResponseResult] = await db
    .select({ avg: sql<number | null>`avg(response_time_minutes)` })
    .from(responsesTable)
    .where(sql`response_time_minutes is not null`);

  const checkedInCount = (checkedInResult?.count ?? 0) + (lateCheckin[0]?.count ?? 0);
  const totalDevs = devsResult?.count ?? 0;
  const missingCheckin = totalDevs - checkedInCount;

  const summary = {
    totalDevelopers: totalDevs,
    checkedInToday: checkedInCount,
    missingCheckinToday: Math.max(0, missingCheckin),
    reportsSubmittedToday: reportsResult?.count ?? 0,
    unresolvedAlerts: alertsResult?.count ?? 0,
    avgResponseTimeMinutes: avgResponseResult?.avg != null ? Math.round(Number(avgResponseResult.avg)) : null,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/today", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const devs = await db.select().from(developersTable).where(eq(developersTable.active, true));
  const checkins = await db.select().from(checkinsTable).where(eq(checkinsTable.date, today));
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.date, today));
  const alerts = await db
    .select()
    .from(alertsTable)
    .where(and(eq(alertsTable.resolved, false)));

  const statusList = devs.map((dev) => {
    const checkin = checkins.find((c) => c.developerId === dev.id);
    const hasReport = reports.some((r) => r.developerId === dev.id);
    const alertCount = alerts.filter((a) => a.developerId === dev.id).length;

    return {
      developerId: dev.id,
      developerName: dev.name,
      email: dev.email,
      expectedCheckin: dev.checkinTime,
      expectedCheckout: dev.checkoutTime,
      checkinAt: checkin?.checkinAt?.toISOString() ?? null,
      checkoutAt: checkin?.checkoutAt?.toISOString() ?? null,
      checkinStatus: checkin?.checkinStatus ?? "missing",
      checkoutStatus: checkin?.checkoutStatus ?? "missing",
      reportSubmitted: hasReport,
      alertCount,
    };
  });

  res.json(GetTodayStatusResponse.parse(statusList));
});

router.get("/dashboard/response-stats", async (_req, res): Promise<void> => {
  const devs = await db.select().from(developersTable).where(eq(developersTable.active, true));
  const responses = await db.select().from(responsesTable);

  const stats = devs.map((dev) => {
    const devResponses = responses.filter((r) => r.developerId === dev.id);
    const responded = devResponses.filter((r) => r.responseTimeMinutes != null);
    const avgMinutes =
      responded.length > 0
        ? Math.round(responded.reduce((sum, r) => sum + (r.responseTimeMinutes ?? 0), 0) / responded.length)
        : null;

    return {
      developerId: dev.id,
      developerName: dev.name,
      avgResponseMinutes: avgMinutes,
      totalMessages: devResponses.length,
      respondedMessages: responded.length,
    };
  });

  res.json(GetResponseStatsResponse.parse(stats));
});

export default router;
