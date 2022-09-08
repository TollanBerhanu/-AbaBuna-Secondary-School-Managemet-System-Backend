const Sequelize = require("sequelize");
const db = require("../config/database");

const Address = db.define("address", {
  country: {
    type: Sequelize.STRING,
  },
  city: {
    type: Sequelize.STRING,
  },
  kebele: {
    type: Sequelize.STRING,
  },
  house_no: {
    type: Sequelize.STRING,
  },
});
module.exports = Address;
