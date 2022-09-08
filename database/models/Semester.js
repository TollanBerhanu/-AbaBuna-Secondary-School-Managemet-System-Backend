const Sequelize = require("sequelize");
const db = require("../config/database");

const Semester = db.define("semester", {
  dbStatusId: {
    type: Sequelize.BIGINT,
  },
  semester: {
    type: Sequelize.INTEGER,
  },
  complete: {
    type: Sequelize.BOOLEAN,
  },
});

module["exports"] = Semester;
