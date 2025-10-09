import express from "express";
import { getStats } from "../controllers/statsController.js";

const router = express.Router();

router.get("/show", getStats);

export default router;
