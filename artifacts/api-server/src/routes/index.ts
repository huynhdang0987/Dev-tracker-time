import { Router, type IRouter } from "express";
import healthRouter from "./health";
import developersRouter from "./developers";
import checkinsRouter from "./checkins";
import responsesRouter from "./responses";
import reportsRouter from "./reports";
import alertsRouter from "./alerts";
import dashboardRouter from "./dashboard";
import n8nRouter from "./n8n";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(developersRouter);
router.use(checkinsRouter);
router.use(responsesRouter);
router.use(reportsRouter);
router.use(alertsRouter);
router.use(dashboardRouter);
router.use(n8nRouter);
router.use(settingsRouter);

export default router;
