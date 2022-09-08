const Sequelize = require("sequelize");
const db = require("../config/database");

const Student = db.define("student", {
  email: {
    type: Sequelize.STRING,
  },
  password: {
    type: Sequelize.TEXT,
  },
  student_id: {
    type: Sequelize.STRING,
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
  guardianId: {
    type: Sequelize.BIGINT,
  },
  status: {
    type: Sequelize.INTEGER,
  },
  archived: {
    type: Sequelize.BOOLEAN,
  },
});

module.exports = Student;
