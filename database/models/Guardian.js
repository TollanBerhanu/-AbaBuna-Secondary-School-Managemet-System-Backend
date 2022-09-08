const Sequelize = require("sequelize");
const db = require("../config/database");

const Guardian = db.define("guardian", {
  name: {
    type: Sequelize.STRING,
  },
  addressId: {
    type: Sequelize.BIGINT,
  },
  phone_num: {
    type: Sequelize.STRING,
  },
});

module.exports = Guardian;
