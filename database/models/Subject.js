const Sequelize = require("sequelize");
const db = require("../config/database");

const Subject = db.define("subject", {
  name: {
    type: Sequelize.STRING,
  },
  code: {
    type: Sequelize.STRING,
  },
  grade: {
    type: Sequelize.INTEGER,
  },
  class_per_week: {
    type: Sequelize.INTEGER,
  }
});

module.exports = Subject;
