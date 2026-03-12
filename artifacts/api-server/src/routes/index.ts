import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gameRouter from "./game";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/game", gameRouter);

export default router;
