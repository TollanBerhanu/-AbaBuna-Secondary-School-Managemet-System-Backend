const Sequelize = require("sequelize");
const db = require("../config/database");

const Schedule = db.define("schedule", {
  year: {
    type: Sequelize.INTEGER,
  },
  data: {
    type: Sequelize.JSON,
  },
  formatted: {
    type: Sequelize.JSON,
  },
  accepted: {
    type: Sequelize.BOOLEAN,
  },
});

module["exports"] = Schedule;
