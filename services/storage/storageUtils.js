import crypto from "crypto";
import path from "path";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

export function isAllowedTopLevelMime(mimeType) {
  if (!mimeType || typeof mimeType !== "string") return false;
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("video/")
  );
}

export function safeExtFromOriginalName(originalName) {
  const ext = path.extname(originalName ?? "").toLowerCase();
  if (!ext) return "";
  if (!/^\.[a-z0-9]{1,10}$/.test(ext)) return "";
  return ext;
}

export function generateObjectKey(ext) {
  const safeExt = typeof ext === "string" ? ext : "";
  return `${crypto.randomUUID()}${safeExt}`;
}

export function assertSafeObjectKey(key) {
  if (typeof key !== "string" || !key) throw new Error("Invalid key");
  if (key.includes("/") || key.includes("\\") || key.includes(".."))
    throw new Error("Invalid key");
  if (!/^[a-zA-Z0-9._-]{1,200}$/.test(key)) throw new Error("Invalid key");
}

export function trimTrailingSlashes(url) {
  return String(url ?? "").replace(/\/+$/, "");
}

