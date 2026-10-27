const { initCloudinary } = require("../config/cloudinary");
const fs = require("node:fs");
const httpError = require("../utils/httpError");

let _client = null;
function getClient() {
  if (_client) return _client;
  _client = initCloudinary();
  return _client;
}

/** Kiểm tra chữ ký tệp trên đĩa trước khi gửi sang Cloudinary; MIME từ client không đủ tin cậy. */
async function validateImageFile(file) {
  const handle = await fs.promises.open(file.path, "r");
  const signature = Buffer.alloc(12);
  try {
    await handle.read(signature, 0, signature.length, 0);
  } finally {
    await handle.close();
  }
  const jpeg = signature.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const png = signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = signature.toString("ascii", 0, 4) === "RIFF" && signature.toString("ascii", 8, 12) === "WEBP";
  if (!({ "image/jpeg": jpeg, "image/png": png, "image/webp": webp })[file.mimetype]) {
    throw httpError(400, "Invalid image content");
  }
}

/** Dùng cùng luồng tải cho ảnh phòng công khai và media chat có kiểm quyền. */
function uploadStream(file, options) {
  const cloudinary = getClient();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    const source = fs.createReadStream(file.path);
    source.on("error", (error) => { stream.destroy(); reject(error); });
    stream.on("error", reject);
    source.pipe(stream);
  });
}

/** Kiểm chữ ký container của bản ghi âm; MIME do browser gửi không đủ để xác thực. */
async function validateAudioFile(file) {
  const handle = await fs.promises.open(file.path, "r");
  const signature = Buffer.alloc(12);
  try { await handle.read(signature, 0, signature.length, 0); }
  finally { await handle.close(); }
  const valid = {
    "audio/webm": signature.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
    "audio/ogg": signature.toString("ascii", 0, 4) === "OggS",
    "audio/mp4": signature.toString("ascii", 4, 8) === "ftyp",
  }[file.mimetype];
  if (!valid) throw httpError(400, "Invalid audio content");
}

/** Tải ảnh phòng theo hợp đồng cũ. */
async function uploadFile(file, publicId) {
  await validateImageFile(file);
  return uploadStream(file, { public_id: publicId, overwrite: false, resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"], use_filename: false, unique_filename: false });
}

/** Media chat luôn ở chế độ authenticated; không phát URL công khai trong message. */
async function uploadChatFile(file, publicId) {
  const resourceType = file.mimetype.startsWith("image/") ? "image" : "video";
  if (resourceType === "image") await validateImageFile(file);
  else await validateAudioFile(file);
  return uploadStream(file, { public_id: publicId, overwrite: false, resource_type: resourceType,
    type: "authenticated", use_filename: false, unique_filename: false });
}

/** URL có chữ ký chỉ được dùng trong proxy chat sau khi kiểm tra quyền; không phụ thuộc đồng hồ của backend. */
function chatDownloadUrl(publicId, format, resourceType) {
  return getClient().url(publicId, {
    resource_type: resourceType, type: "authenticated", sign_url: true, secure: true,
    ...(resourceType === "raw" ? {} : { format }),
  });
}

async function destroy(publicId, resourceType = "image", deliveryType = "upload") {
  const cloudinary = getClient();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: deliveryType });
}

module.exports = { uploadFile, uploadChatFile, chatDownloadUrl, destroy };
