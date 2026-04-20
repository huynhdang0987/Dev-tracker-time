import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, developersTable, checkinsTable, reportsTable, alertsTable } from "@workspace/db";
import {
  N8nWebhookBody,
  N8nWebhookResponse,
  TriggerDailyCheckResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/n8n/webhook", async (req, res): Promise<void> => {
  const parsed = N8nWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { event, developerId, data } = parsed.data;
  req.log.info({ event, developerId }, "Received n8n webhook");

  let message = `Processed event: ${event}`;

  if (event === "alert_email_sent" && developerId != null) {
    await db
      .update(alertsTable)
      .set({ emailSent: true })
      .where(eq(alertsTable.developerId, developerId));
    message = `Email alert marked as sent for developer ${developerId}`;
  }

  res.json(N8nWebhookResponse.parse({ success: true, message }));
});

router.post("/n8n/trigger-check", async (req, res): Promise<void> => {
  req.log.info("Triggering daily compliance check");

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const devs = await db.select().from(developersTable).where(eq(developersTable.active, true));
  const checkins = await db.select().from(checkinsTable).where(eq(checkinsTable.date, today));
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.date, today));

  const alertsCreated: number[] = [];

  for (const dev of devs) {
    const checkin = checkins.find((c) => c.developerId === dev.id);
    const hasReport = reports.some((r) => r.developerId === dev.id);

    const [checkinH, checkinM] = dev.checkinTime.split(":").map(Number);
    const [checkoutH, checkoutM] = dev.checkoutTime.split(":").map(Number);

    const totalCurrentMin = currentHour * 60 + currentMinute;
    const expectedCheckinMin = checkinH * 60 + checkinM;
    const expectedCheckoutMin = checkoutH * 60 + checkoutM;

    const existingAlerts = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.developerId, dev.id));

    const todayAlerts = existingAlerts.filter(
      (a) => a.createdAt.toISOString().startsWith(today)
    );

    if (!checkin && totalCurrentMin > expectedCheckinMin + 30) {
      const alreadyExists = todayAlerts.some((a) => a.type === "missing_checkin");
      if (!alreadyExists) {
        const [alert] = await db
          .insert(alertsTable)
          .values({
            developerId: dev.id,
            type: "missing_checkin",
            message: `${dev.name} has not checked in today (expected by ${dev.checkinTime})`,
            resolved: false,
            emailSent: false,
          })
          .returning();
        alertsCreated.push(alert.id);
        req.log.info({ devId: dev.id, devName: dev.name }, "Created missing_checkin alert");
      }
    }

    if (checkin && checkin.checkinStatus === "late") {
      const alreadyExists = todayAlerts.some((a) => a.type === "late_checkin");
      if (!alreadyExists) {
        const [alert] = await db
          .insert(alertsTable)
          .values({
            developerId: dev.id,
            type: "late_checkin",
            message: `${dev.name} checked in late today`,
            resolved: false,
            emailSent: false,
          })
          .returning();
        alertsCreated.push(alert.id);
      }
    }

    if (!hasReport && totalCurrentMin > expectedCheckoutMin) {
      const alreadyExists = todayAlerts.some((a) => a.type === "missing_report");
      if (!alreadyExists) {
        const [alert] = await db
          .insert(alertsTable)
          .values({
            developerId: dev.id,
            type: "missing_report",
            message: `${dev.name} has not submitted a daily report for ${today}`,
            resolved: false,
            emailSent: false,
          })
          .returning();
        alertsCreated.push(alert.id);
        req.log.info({ devId: dev.id, devName: dev.name }, "Created missing_report alert");
      }
    }

    if (checkin && !checkin.checkoutAt && totalCurrentMin > expectedCheckoutMin + 60) {
      const alreadyExists = todayAlerts.some((a) => a.type === "missing_checkout");
      if (!alreadyExists) {
        const [alert] = await db
          .insert(alertsTable)
          .values({
            developerId: dev.id,
            type: "missing_checkout",
            message: `${dev.name} has not checked out (expected by ${dev.checkoutTime})`,
            resolved: false,
            emailSent: false,
          })
          .returning();
        alertsCreated.push(alert.id);
      }
    }
  }

  res.json(
    TriggerDailyCheckResponse.parse({
      success: true,
      alertsCreated: alertsCreated.length,
      message: `Daily check complete. ${alertsCreated.length} new alerts created.`,
    })
  );
});

export default router;
