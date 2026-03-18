/**
 * @typedef {'local'|'s3'} StorageProvider
 *
 * @typedef {Object} UploadInput
 * @property {Buffer} buffer
 * @property {string} originalName
 * @property {string} mimeType
 * @property {number} size
 *
 * @typedef {Object} UploadResult
 * @property {string} key
 * @property {string} url
 * @property {StorageProvider} provider
 * @property {string} mimeType
 * @property {number} size
 */

export {};

