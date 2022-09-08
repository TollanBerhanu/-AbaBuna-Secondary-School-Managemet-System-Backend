const Sequelize = require("sequelize");
const db = require("../config/database");

const Employee = db.define("employee", {
  email: {
    type: Sequelize.STRING,
  },
  password: {
    type: Sequelize.TEXT,
  },
  profile: {
    type: Sequelize.STRING,
  },
  first_name: {
    type: Sequelize.STRING,
  },
  middle_name: {
    type: Sequelize.STRING,
  },
  last_name: {
    type: Sequelize.STRING,
  },
  sex: {
    type: Sequelize.STRING,
  },
  phone_num: {
    type: Sequelize.STRING,
  },
  addressId: {
    type: Sequelize.BIGINT,
  },
  status: {
    type: Sequelize.INTEGER,
  },
  isAdmin: {
    type: Sequelize.BOOLEAN,
  },
  archived: {
    type: Sequelize.BOOLEAN,
  },
});

module.exports = Employee;
