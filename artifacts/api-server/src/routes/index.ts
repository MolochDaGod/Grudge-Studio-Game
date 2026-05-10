import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gameRouter from "./game";
import modelsRouter from "./models";
import authRouter from "./auth";
import charactersRouter from "./characters";
import inventoryRouter from "./inventory";
import craftingRouter from "./crafting";
import economyRouter from "./economy";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/game", gameRouter);
router.use("/characters", charactersRouter);
router.use("/inventory", inventoryRouter);
router.use("/crafting", craftingRouter);
router.use("/economy", economyRouter);
router.use("/models", modelsRouter);

export default router;
