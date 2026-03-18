import express from "express";

import { uploadMulter, uploadSingle } from "../controllers/uploadsController.js";

const router = express.Router();

router.post("/upload", uploadMulter.single("file"), uploadSingle);

export default router;

