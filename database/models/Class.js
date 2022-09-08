const Sequelize = require("sequelize");
const db = require("../config/database");

const Class = db.define("class", {
  grade: {
    type: Sequelize.INTEGER,
  },
  section: {
    type: Sequelize.STRING,
  },
  teacherId: {
    type: Sequelize.BIGINT,
  },
});

module["exports"] = Class;
