const Sequelize = require("sequelize");
const db = require("../config/database");

const DBStatus = db.define("db_status", {
  year: {
    type: Sequelize.INTEGER,
  },
  reg_complete: {
    type: Sequelize.BOOLEAN,
  },
  assign_complete: {
    type: Sequelize.BOOLEAN,
  },
  temp_assign_done: {
    type: Sequelize.BOOLEAN,
  },
  schedule_generated: {
    type: Sequelize.BOOLEAN,
  },
  class_started: {
    type: Sequelize.BOOLEAN,
  },
  year_complete: {
    type: Sequelize.BOOLEAN,
  },
});

module.exports = DBStatus;
