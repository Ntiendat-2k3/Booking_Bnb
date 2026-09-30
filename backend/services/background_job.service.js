// Lưu tác vụ ngoài DB cùng transaction nghiệp vụ để worker có thể tiếp tục sau khi tiến trình khởi động lại.
const { BackgroundJob } = require("../models");

function enqueue(type, payload, transaction) {
  return BackgroundJob.create({ type, payload }, { transaction });
}

module.exports = { enqueue };
