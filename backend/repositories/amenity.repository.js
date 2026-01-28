const Repository = require("../core/repository");
const { Amenity } = require("../models");

module.exports = class AmenityRepository extends Repository {
  getModel() {
    return Amenity;
  }
};
