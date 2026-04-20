import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_SETTINGS: Record<string, string> = {
  leader_email: "",
  leader_name: "",
  checkin_time: "08:00",
  checkout_time: "17:00",
};

async function getSettingValue(key: string): Promise<string> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? DEFAULT_SETTINGS[key] ?? "";
}

async function upsertSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
}

router.get("/settings", async (_req, res): Promise<void> => {
  const [leaderEmail, leaderName, checkinTime, checkoutTime] = await Promise.all([
    getSettingValue("leader_email"),
    getSettingValue("leader_name"),
    getSettingValue("checkin_time"),
    getSettingValue("checkout_time"),
  ]);

  res.json(
    GetSettingsResponse.parse({
      leaderEmail: leaderEmail || null,
      leaderName: leaderName || null,
      checkinTime: checkinTime || "08:00",
      checkoutTime: checkoutTime || "17:00",
    })
  );
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Promise<void>[] = [];
  if (parsed.data.leaderEmail !== undefined) {
    updates.push(upsertSetting("leader_email", parsed.data.leaderEmail ?? ""));
  }
  if (parsed.data.leaderName !== undefined) {
    updates.push(upsertSetting("leader_name", parsed.data.leaderName ?? ""));
  }
  if (parsed.data.checkinTime != null) {
    updates.push(upsertSetting("checkin_time", parsed.data.checkinTime));
  }
  if (parsed.data.checkoutTime != null) {
    updates.push(upsertSetting("checkout_time", parsed.data.checkoutTime));
  }

  await Promise.all(updates);

  const [leaderEmail, leaderName, checkinTime, checkoutTime] = await Promise.all([
    getSettingValue("leader_email"),
    getSettingValue("leader_name"),
    getSettingValue("checkin_time"),
    getSettingValue("checkout_time"),
  ]);

  res.json(
    UpdateSettingsResponse.parse({
      leaderEmail: leaderEmail || null,
      leaderName: leaderName || null,
      checkinTime: checkinTime || "08:00",
      checkoutTime: checkoutTime || "17:00",
    })
  );
});

export default router;
