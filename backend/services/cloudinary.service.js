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

/** Tải ảnh từ tệp tạm lên Cloudinary theo luồng để không giữ toàn bộ ảnh trong RAM. */
async function uploadFile(file, publicId) {
  await validateImageFile(file);
  const cloudinary = getClient();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: false,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const source = fs.createReadStream(file.path);
    source.on("error", (error) => { stream.destroy(); reject(error); });
    stream.on("error", reject);
    source.pipe(stream);
  });
}

async function destroy(publicId, resourceType = "image") {
  const cloudinary = getClient();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { uploadFile, destroy };
