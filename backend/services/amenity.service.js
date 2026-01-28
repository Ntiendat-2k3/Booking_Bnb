const AmenityRepository = require("../repositories/amenity.repository");

const amenityRepo = new AmenityRepository();

module.exports = {
  async list() {
    const items = await amenityRepo.findAll({
      where: { is_active: true },
      order: [["group", "ASC"], ["name", "ASC"]],
    });
    return items;
  },
};
