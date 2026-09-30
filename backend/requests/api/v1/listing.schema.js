const Joi = require("joi");
const { uuid } = require("./common.schema");

const fields = {
  title: Joi.string().trim().min(1).max(255), description: Joi.string().max(10000).allow(null, ""),
  address: Joi.string().trim().max(255).allow(null, ""), city: Joi.string().trim().min(1).max(120), country: Joi.string().trim().min(1).max(120),
  lat: Joi.number().min(-90).max(90).allow(null, ""), lng: Joi.number().min(-180).max(180).allow(null, ""),
  property_type: Joi.string().max(80).allow(null, ""), room_type: Joi.string().max(80).allow(null, ""),
  price_per_night: Joi.number().integer().min(1).max(Number.MAX_SAFE_INTEGER), max_guests: Joi.number().integer().min(1).max(100),
  bedrooms: Joi.number().integer().min(0).max(100), beds: Joi.number().integer().min(0).max(100), bathrooms: Joi.number().min(0).max(99.9).precision(1),
};
const createListingSchema = Joi.object({ ...fields, title: fields.title.required(), city: fields.city.required(), country: fields.country.required(), price_per_night: fields.price_per_night.required(), max_guests: fields.max_guests.required() });
const updateListingSchema = Joi.object(fields).min(1);
const amenitiesSchema = Joi.object({ amenity_ids: Joi.array().items(uuid).unique().max(100).required() });
const imageSchema = Joi.object({
  public_id: Joi.string().max(500).required(), is_cover: Joi.boolean(), sort_order: Joi.number().integer().min(0).max(10000),
});
const listingQuerySchema = Joi.object({
  city: Joi.string().max(120), country: Joi.string().max(120),
  min_price: Joi.number().integer().min(0), max_price: Joi.number().integer().min(0),
  guests: Joi.number().integer().min(1).max(100), bedrooms: Joi.number().integer().min(0).max(100),
  room_type: Joi.string().max(80), property_type: Joi.string().max(80),
  lat: Joi.number().min(-90).max(90), lng: Joi.number().min(-180).max(180), radius_km: Joi.number().positive().max(20000),
  sort: Joi.string().valid("distance_asc", "price_asc", "price_desc", "newest", "rating_desc"),
  page: Joi.number().integer().min(1).max(100000).default(1), limit: Joi.number().integer().min(1).max(50).default(20),
}).and("lat", "lng");

module.exports = { createListingSchema, updateListingSchema, amenitiesSchema, imageSchema, listingQuerySchema };
