import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import userAuthRouter from "./userAuth";
import publicRouter from "./public";
import hospitalRouter from "./hospital";
import adminRouter from "./admin";
import adminAlertsRouter from "./adminAlerts";
import notificationsRouter from "./notifications";
import categoriesRouter from "./categories";
import bloodRequestsRouter from "./bloodRequests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userAuthRouter);
router.use(publicRouter);
router.use(hospitalRouter);
router.use(adminRouter);
router.use(adminAlertsRouter);
router.use(notificationsRouter);
router.use(categoriesRouter);
router.use(bloodRequestsRouter);

export default router;
