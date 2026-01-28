const multer = require("multer");
const { errorResponse } = require("../utils/response");

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = Number(process.env.UPLOAD_MAX_SIZE || 5 * 1024 * 1024); // 5MB

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only jpg/png/webp allowed"));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 1 },
});

function uploadErrorHandler(err, req, res, next) {
  if (!err) return next();
  // Multer error
  const msg = err.message || "Upload failed";
  return errorResponse(res, msg, 400);
}

module.exports = { upload, uploadErrorHandler, ALLOWED_MIMES, MAX_SIZE };
