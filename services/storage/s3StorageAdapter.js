import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fileTypeFromBuffer } from "file-type";

import {
  MAX_UPLOAD_BYTES,
  assertSafeObjectKey,
  generateObjectKey,
  isAllowedTopLevelMime,
  safeExtFromOriginalName,
  trimTrailingSlashes,
} from "./storageUtils.js";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function boolEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  return raw === "true" || raw === "1" || raw === "yes";
}

function buildPublicUrl({ key, endpoint, bucket, cdnBaseUrl }) {
  if (cdnBaseUrl) return `${trimTrailingSlashes(cdnBaseUrl)}/${key}`;
  const base = trimTrailingSlashes(endpoint);
  return `${base}/${bucket}/${key}`;
}

export default class S3StorageAdapter {
  /** @type {import('./storageTypes.js').StorageProvider} */
  provider = "s3";

  constructor() {
    this.endpoint = requireEnv("S3_ENDPOINT");
    this.bucket = requireEnv("S3_BUCKET");
    this.region = process.env.S3_REGION || "us-east-1";
    this.accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
    this.secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
    this.forcePathStyle = boolEnv("S3_FORCE_PATH_STYLE", true);
    this.cdnBaseUrl = process.env.PUBLIC_CDN_BASE_URL || null;
    this.keyPrefix = process.env.S3_KEY_PREFIX || "";
    this.acl = process.env.S3_ACL || null;

    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: this.forcePathStyle,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  /**
   * @param {string} key
   */
  publicUrlForKey(key) {
    return buildPublicUrl({
      key,
      endpoint: this.endpoint,
      bucket: this.bucket,
      cdnBaseUrl: this.cdnBaseUrl,
    });
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
    const rawKey = `${this.keyPrefix}${generateObjectKey(ext)}`;
    const key = rawKey.replace(/^\/+/, "");
    assertSafeObjectKey(key);

    const put = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: effectiveMime,
      ...(this.acl ? { ACL: this.acl } : {}),
    });

    await this.client.send(put);

    const url = this.publicUrlForKey(key);
    return {
      key,
      url,
      provider: this.provider,
      mimeType: effectiveMime,
      size,
    };
  }

  /**
   * @param {{ originalName: string; mimeType: string; size: number }}
   * @returns {Promise<{ uploadUrl: string; key: string; publicUrl: string }>}
   */
  async presignPut({ originalName, mimeType, size }) {
    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
      throw new Error("Invalid file size");
    }
    if (size > MAX_UPLOAD_BYTES) throw new Error("File too large (max 50MB)");
    if (!isAllowedTopLevelMime(mimeType)) {
      throw new Error("Only image/audio/video uploads are allowed");
    }

    const ext = safeExtFromOriginalName(originalName);
    const rawKey = `${this.keyPrefix}${generateObjectKey(ext)}`;
    const key = rawKey.replace(/^\/+/, "");
    assertSafeObjectKey(key);

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      ...(this.acl ? { ACL: this.acl } : {}),
    });

    const uploadUrl = await getSignedUrl(this.client, cmd, {
      expiresIn: Number(process.env.S3_PRESIGN_EXPIRES_SECONDS || 60 * 10),
    });

    const publicUrl = this.publicUrlForKey(key);
    return { uploadUrl, key, publicUrl };
  }
}

