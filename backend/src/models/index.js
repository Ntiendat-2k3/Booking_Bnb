const { sequelize } = require("../config/database");

const User = require("./User")(sequelize);
const RefreshToken = require("./RefreshToken")(sequelize);
const UserSetting = require("./UserSetting")(sequelize);
const PaymentMethod = require("./PaymentMethod")(sequelize);

const Listing = require("./Listing")(sequelize);
const ListingImage = require("./ListingImage")(sequelize);
const Amenity = require("./Amenity")(sequelize);
const ListingAmenity = require("./ListingAmenity")(sequelize);

const Booking = require("./Booking")(sequelize);
const Payment = require("./Payment")(sequelize);
const Review = require("./Review")(sequelize);
const Favorite = require("./Favorite")(sequelize);

const db = {
  sequelize,
  User,
  RefreshToken,
  UserSetting,
  PaymentMethod,
  Listing,
  ListingImage,
  Amenity,
  ListingAmenity,
  Booking,
  Payment,
  Review,
  Favorite,
};

Object.values(db).forEach((model) => {
  if (model?.associate) model.associate(db);
});

module.exports = db;
