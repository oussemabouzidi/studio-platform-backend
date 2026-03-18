import LocalStorageAdapter from "./localStorageAdapter.js";
import S3StorageAdapter from "./s3StorageAdapter.js";

export function storageDriver() {
  return (process.env.STORAGE_DRIVER || "local").toLowerCase();
}

let cachedAdapter = null;
export function getStorageAdapter() {
  if (cachedAdapter) return cachedAdapter;
  const driver = storageDriver();
  cachedAdapter = driver === "s3" ? new S3StorageAdapter() : new LocalStorageAdapter();
  return cachedAdapter;
}

export function usePresignedUploads() {
  const raw = process.env.USE_PRESIGNED_UPLOADS;
  if (!raw) return false;
  return raw === "true" || raw === "1" || raw === "yes";
}
