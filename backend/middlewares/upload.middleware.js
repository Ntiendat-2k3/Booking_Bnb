const multer = require("multer");
const os = require("node:os");
const { errorResponse } = require("../utils/response");

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = Number(process.env.UPLOAD_MAX_SIZE || 5 * 1024 * 1024); // 5MB

const storage = multer.diskStorage({ destination: os.tmpdir() });

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only jpg/png/webp allowed"));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 1, fields: 0 },
});

const CHAT_MIMES = new Set([...ALLOWED_MIMES, "audio/webm", "audio/ogg", "audio/mp4"]);
const chatUpload = multer({
  storage,
  fileFilter(_req, file, cb) {
    if (!CHAT_MIMES.has(file.mimetype)) return cb(new Error("Invalid chat media type"));
    return cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2 },
});

function uploadErrorHandler(err, req, res, next) {
  if (!err) return next();
  const msg = err.message || "Upload failed";
  return errorResponse(res, msg, 400);
}

module.exports = { upload, chatUpload, uploadErrorHandler, ALLOWED_MIMES, MAX_SIZE };
