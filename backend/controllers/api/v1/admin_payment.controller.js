const asyncHandler = require("../../../utils/asyncHandler");
const { successResponse } = require("../../../utils/response");
const adminPaymentService = require("../../../services/admin_payment.service");
module.exports = {
  list: asyncHandler(async (req, res) => {
    const {
      status = null,
      provider = null,
      q = null,
      limit = 200,
      page = 1
    } = req.query || {};
    const data = await adminPaymentService.list({
      status,
      provider,
      q,
      limit,
      page
    });
    return successResponse(res, data, "Payments fetched", 200);
  }),
  detail: asyncHandler(async (req, res) => {
    const data = await adminPaymentService.detail(req.params.id);
    return successResponse(res, data, "OK", 200);
  })
};
