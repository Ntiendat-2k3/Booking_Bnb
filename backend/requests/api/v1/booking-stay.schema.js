const Joi = require("joi");
const { uuid } = require("./common.schema");

const purpose = Joi.string().valid("check_in", "check_out").required();
const token = Joi.string().pattern(/^[A-Za-z0-9_-]{43}$/).required();
const listingId = uuid.required();

module.exports = {
  issueQrSchema: Joi.object({ purpose }),
  scanQrSchema: Joi.object({ token }),
  manualStaySchema: Joi.object({ listing_id: listingId, purpose,
    reason: Joi.string().trim().min(3).max(500).required() }),
  hostStayQuery: Joi.object({ listing_id: uuid,
    code: Joi.string().trim().pattern(/^BNB-[0-9A-Z]{8}$/i),
    page: Joi.number().integer().min(1).max(100000).default(1) }),
  stayEventsQuery: Joi.object({ listing_id: listingId }),
};
