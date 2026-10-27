const refunds = require("../../../services/refund.service");
const disputes = require("../../../services/payment_dispute.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");

module.exports = {
  list: asyncHandler(async (req, res) => successResponse(res,
    await refunds.listForAdmin(req.query))),
  detail: asyncHandler(async (req, res) => successResponse(res, {
    refund: await refunds.detailForAdmin(req.params.id),
  })),
  action: asyncHandler(async (req, res) => successResponse(res,
    await refunds.adminAction({ refundId: req.params.id, actorId: req.user.user.id,
      action: req.body.action, note: req.body.note }))),
  listDisputes: asyncHandler(async (req, res) => successResponse(res,
    await disputes.listForAdmin(req.query))),
  disputeDetail: asyncHandler(async (req, res) => successResponse(res, {
    dispute: await disputes.detailForAdmin(req.params.id),
  })),
  noteDispute: asyncHandler(async (req, res) => successResponse(res,
    await disputes.addAdminNote({ id: req.params.id, actorId: req.user.user.id,
      note: req.body.note }))),
};
