// : "định nghĩa" phương thức chung cho các repository của Sequelize
//: Tác dụng: giả sử sau này chuyển sang Mongoose hoặc ORM khác thì chỉ cần sửa ở file này k phải vào từng file service sửa nữa
module.exports = class Repository {
  constructor() {
    this.model = this.getModel();
  }

  // repo con phải override
  getModel() {
    throw new Error("getModel() must be implemented");
  }

  create(data) {
    return this.model.create(data);
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
