import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import paymentsRouter from "./payments";
import webhookRouter from "./webhook";
import userRouter from "./user";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use("/payments", paymentsRouter);
router.use(webhookRouter);   // POST /api/webhook
router.use(userRouter);      // GET  /api/user-status

export default router;
