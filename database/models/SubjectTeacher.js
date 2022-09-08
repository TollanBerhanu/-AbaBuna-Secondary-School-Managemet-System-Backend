const Sequelize = require("sequelize");
const db = require("../config/database");

const SubjectTeacher = db.define("subject_teacher", {
  subjectId: {
    type: Sequelize.BIGINT,
  },
  classId: {
    type: Sequelize.BIGINT,
  },
  employeeId: {
    type: Sequelize.BIGINT,
  },
});

module["exports"] = SubjectTeacher;
