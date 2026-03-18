import express from "express";

import { confirm, presign } from "../controllers/uploadsController.js";

const router = express.Router();

router.post("/presign", presign);
router.post("/confirm", confirm);

export default router;

