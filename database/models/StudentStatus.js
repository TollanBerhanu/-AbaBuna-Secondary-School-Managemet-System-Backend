const Sequelize = require("sequelize");
const db = require("../config/database");

const StudentStatus = db.define("st_status", {
  studentId: {
    type: Sequelize.BIGINT,
  },
  year: {
    type: Sequelize.INTEGER,
  },
  grade: {
    type: Sequelize.INTEGER,
  },
  classId: {
    type: Sequelize.BIGINT,
  },
  status: {
    type: Sequelize.INTEGER,
  },
});

module.exports = StudentStatus;
