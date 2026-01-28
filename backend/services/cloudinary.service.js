const { initCloudinary } = require("../config/cloudinary");

let _client = null;
function getClient() {
  if (_client) return _client;
  _client = initCloudinary();
  return _client;
}

/**
 * Upload a file buffer to Cloudinary using upload_stream.
 * @param {Buffer} buffer
 * @param {object} opts { folder, public_id, overwrite, resource_type }
 * @returns {Promise<object>} Cloudinary upload result
 */
function uploadBuffer(buffer, opts = {}) {
  const cloudinary = getClient();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder || "booking_bnb",
        public_id: opts.public_id,
        overwrite: opts.overwrite ?? false,
        resource_type: opts.resource_type || "image",
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function destroy(publicId, resourceType = "image") {
  const cloudinary = getClient();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { uploadBuffer, destroy };
