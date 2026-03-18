import express from "express";

import { list } from "../controllers/uploadsController.js";

const router = express.Router();

router.get("/", list);

export default router;

