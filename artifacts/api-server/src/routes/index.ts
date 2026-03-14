import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gameRouter from "./game";
import modelsRouter from "./models";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/game", gameRouter);
router.use("/models", modelsRouter);

export default router;
