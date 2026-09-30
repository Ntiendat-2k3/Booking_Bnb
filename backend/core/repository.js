const { Op, where, cast, col } = require("sequelize");

module.exports = class Repository {
  static searchWhere(query, columns) {
    const term = String(query || "").trim();
    if (!term) return {};
    const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
    return { [Op.or]: columns.map((column) => where(cast(col(column), "text"), { [Op.iLike]: pattern })) };
  }
  constructor() {
    this.model = this.getModel();
  }

  // repo con phải override
  getModel() {
    throw new Error("getModel() must be implemented");
  }

  create(data, options = {}) {
    return this.model.create(data, options);
  }
  update(data, condition) {
    return this.model.update(data, { where: condition });
  }
  updateByPk(data, id) {
    return this.model.update(data, { where: { id: id } });
  }
  delete(condition = {}) {
    return this.model.destroy({ where: condition });
  }
  deleteByPk(id) {
    return this.model.destroy({ where: { id: id } });
  }
  findOne(options = {}) {
    return this.model.findOne(options);
  }
  findAll(options = {}) {
    return this.model.findAll(options);
  }
  findByPk(id, options = {}) {
    return this.model.findByPk(id, options);
  }
};
