import fs from "fs/promises";
import path from "path";

import { fileTypeFromBuffer } from "file-type";

import {
  MAX_UPLOAD_BYTES,
  assertSafeObjectKey,
  generateObjectKey,
  isAllowedTopLevelMime,
  safeExtFromOriginalName,
  trimTrailingSlashes,
} from "./storageUtils.js";

function resolveUploadsDir() {
  const fromEnv = process.env.UPLOADS_DIR;
  const uploadsDir = fromEnv
    ? path.resolve(fromEnv)
    : path.resolve(process.cwd(), "uploads");
  return uploadsDir;
}

function computePublicBaseUrl() {
  const fromEnv =
    process.env.PUBLIC_BASE_URL ||
    process.env.BACKEND_PUBLIC_BASE_URL ||
    process.env.BACKEND_URL;
  if (fromEnv) return trimTrailingSlashes(fromEnv);
  const port = process.env.PORT || 8800;
  return `http://localhost:${port}`;
}

export default class LocalStorageAdapter {
  /** @type {import('./storageTypes.js').StorageProvider} */
  provider = "local";

  constructor() {
    this.uploadsDir = resolveUploadsDir();
    this.publicBaseUrl = computePublicBaseUrl();
  }

  async ensureUploadsDir() {
    await fs.mkdir(this.uploadsDir, { recursive: true });
  }

  /**
   * @param {import('./storageTypes.js').UploadInput} input
   * @returns {Promise<import('./storageTypes.js').UploadResult>}
   */
  async upload(input) {
    const { buffer, originalName, mimeType, size } = input;

    if (!Buffer.isBuffer(buffer)) throw new Error("Invalid file buffer");
    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
      throw new Error("Invalid file size");
    }
    if (size > MAX_UPLOAD_BYTES) throw new Error("File too large (max 50MB)");

    const detected = await fileTypeFromBuffer(buffer).catch(() => null);
    const effectiveMime = detected?.mime ?? mimeType;
    if (!isAllowedTopLevelMime(effectiveMime)) {
      throw new Error("Only image/audio/video uploads are allowed");
    }

    const ext = safeExtFromOriginalName(originalName) || (detected ? `.${detected.ext}` : "");
    const key = generateObjectKey(ext);
    assertSafeObjectKey(key);

    await this.ensureUploadsDir();
    const filePath = path.join(this.uploadsDir, key);
    const resolvedUploads = path.resolve(this.uploadsDir) + path.sep;
    const resolvedFile = path.resolve(filePath);
    if (!resolvedFile.startsWith(resolvedUploads)) throw new Error("Invalid path");

    await fs.writeFile(resolvedFile, buffer, { flag: "wx" });

    const url = `${this.publicBaseUrl}/uploads/${encodeURIComponent(key)}`;
    return {
      key,
      url,
      provider: this.provider,
      mimeType: effectiveMime,
      size,
    };
  }
}

