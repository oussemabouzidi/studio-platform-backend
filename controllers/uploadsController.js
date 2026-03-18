import multer from "multer";

import { createMedia, listMedia } from "../models/media.js";
import { getStorageAdapter, storageDriver, usePresignedUploads } from "../services/storage/index.js";
import { MAX_UPLOAD_BYTES, isAllowedTopLevelMime, assertSafeObjectKey } from "../services/storage/storageUtils.js";

export const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedTopLevelMime(file.mimetype)) {
      cb(new Error("Only image/audio/video uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

function jsonError(res, status, message, extra = {}) {
  return res.status(status).json({ error: message, ...extra });
}

export async function uploadSingle(req, res) {
  const file = req.file;
  if (!file) return jsonError(res, 400, "Missing file (field name: file)");

  try {
    const adapter = getStorageAdapter();
    const result = await adapter.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });

    await createMedia({
      key: result.key,
      url: result.url,
      provider: result.provider,
      mimeType: result.mimeType,
      size: result.size,
    });

    return res.json({
      url: result.url,
      key: result.key,
      provider: result.provider,
      mimeType: result.mimeType,
      size: result.size,
    });
  } catch (err) {
    return jsonError(res, 400, err?.message || "Upload failed");
  }
}

export async function presign(req, res) {
  if (storageDriver() !== "s3") {
    return jsonError(res, 400, "Presigned uploads require STORAGE_DRIVER=s3");
  }
  if (!usePresignedUploads()) {
    return jsonError(
      res,
      400,
      "Presigned uploads are disabled. Set USE_PRESIGNED_UPLOADS=true on the backend.",
    );
  }

  const { fileName, mimeType, size } = req.body ?? {};
  if (!fileName || !mimeType || typeof size !== "number") {
    return jsonError(res, 400, "Expected body: { fileName, mimeType, size }");
  }
  if (!isAllowedTopLevelMime(mimeType)) {
    return jsonError(res, 400, "Only image/audio/video uploads are allowed");
  }

  try {
    const adapter = getStorageAdapter();
    if (typeof adapter.presignPut !== "function") {
      return jsonError(res, 500, "Storage adapter does not support presign");
    }

    const { uploadUrl, key, publicUrl } = await adapter.presignPut({
      originalName: fileName,
      mimeType,
      size,
    });

    return res.json({ uploadUrl, key, publicUrl });
  } catch (err) {
    return jsonError(res, 400, err?.message || "Failed to create presigned URL");
  }
}

export async function confirm(req, res) {
  if (storageDriver() !== "s3") {
    return jsonError(res, 400, "Confirm is only required for S3 presigned flow");
  }

  const { key, url, mimeType, size } = req.body ?? {};
  if (!key || !url || !mimeType || typeof size !== "number") {
    return jsonError(res, 400, "Expected body: { key, url, mimeType, size }");
  }
  if (size > MAX_UPLOAD_BYTES) {
    return jsonError(res, 413, "File too large (max 50MB)");
  }
  if (!isAllowedTopLevelMime(mimeType)) {
    return jsonError(res, 400, "Only image/audio/video uploads are allowed");
  }
  try {
    assertSafeObjectKey(key);
  } catch {
    return jsonError(res, 400, "Invalid key");
  }

  try {
    await createMedia({
      key,
      url,
      provider: "s3",
      mimeType,
      size,
    });
    return res.json({ ok: true });
  } catch (err) {
    return jsonError(res, 400, err?.message || "Failed to confirm upload");
  }
}

export async function list(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const data = await listMedia({ page, pageSize });
    return res.json(data);
  } catch (err) {
    return jsonError(res, 500, err?.message || "Failed to list media");
  }
}
