const Address = require("./Address");
const Class = require("./Class");
const Employee = require("./Employee");
const Guardian = require("./Guardian");
const Score = require("./Score");
const ScoreItem = require("./ScoreItem");
const Student = require("./Student");
const StudentStatus = require("./StudentStatus");
const Subject = require("./Subject");
const SubjectTeacher = require("./SubjectTeacher");
const DBStatus = require("./DBStatus");
const Semester = require("./Semester");

//
// const Address = db.define("address", {
//   country: {
//     type: Sequelize.STRING,
//   },
//   city: {
//     type: Sequelize.STRING,
//   },
//   kebele: {
//     type: Sequelize.STRING,
//   },
//   house_no: {
//     type: Sequelize.STRING,
//   },
// });
//
// const Class = db.define("class", {
//     grade: {
//         type: Sequelize.INTEGER,
//     },
//     section: {
//         type: Sequelize.STRING,
//     },
//     hr_teacher: {
//         type: Sequelize.BIGINT,
//     },
// });
//
// const Employee = db.define("employee", {
//     email: {
//         type: Sequelize.STRING,
//     },
//     password: {
//         type: Sequelize.TEXT,
//     },
//     profile: {
//         type: Sequelize.STRING,
//     },
//     first_name: {
//         type: Sequelize.STRING,
//     },
//     middle_name: {
//         type: Sequelize.STRING,
//     },
//     last_name: {
//         type: Sequelize.STRING,
//     },
//     sex: {
//         type: Sequelize.STRING,
//     },
//     phone_num: {
//         type: Sequelize.STRING,
//     },
//     address: {
//         type: Sequelize.BIGINT,
//     },
//     status: {
//         type: Sequelize.INTEGER,
//     },
//     isAdmin: {
//         type: Sequelize.BOOLEAN,
//     },
// });
//
// const Guardian = db.define("guardian", {
//     name: {
//         type: Sequelize.STRING,
//     },
//     address: {
//         type: Sequelize.BIGINT,
//     },
//     phone_num: {
//         type: Sequelize.STRING,
//     },
// });
//
// const Score = db.define("score", {
//   student: {
//     type: Sequelize.BIGINT,
//   },
//   year: {
//     type: Sequelize.DATEONLY,
//   },
//   semester: {
//     type: Sequelize.INTEGER,
//   },
// });
//
// const ScoreItem = db.define("score_item", {
//     score: {
//         type: Sequelize.BIGINT,
//     },
//     subject: {
//         type: Sequelize.BIGINT,
//     },
//     data: {
//         type: Sequelize.JSON,
//     },
// });
//
// const Student = db.define("student", {
//     email: {
//         type: Sequelize.STRING,
//     },
//     password: {
//         type: Sequelize.TEXT,
//     },
//     student_id: {
//         type: Sequelize.STRING,
//     },
//     profile: {
//         type: Sequelize.STRING,
//     },
//     first_name: {
//         type: Sequelize.STRING,
//     },
//     middle_name: {
//         type: Sequelize.STRING,
//     },
//     last_name: {
//         type: Sequelize.STRING,
//     },
//     sex: {
//         type: Sequelize.STRING,
//     },
//     phone_num: {
//         type: Sequelize.STRING,
//     },
//     address: {
//         type: Sequelize.BIGINT,
//     },
//     guardian: {
//         type: Sequelize.BIGINT,
//     },
//     status: {
//         type: Sequelize.INTEGER,
//     },
// });
//
// const StudentStatus = db.define("st_status", {
//   student: {
//     type: Sequelize.BIGINT,
//   },
//   year: {
//     type: Sequelize.INTEGER,
//   },
//   class: {
//     type: Sequelize.BIGINT,
//   },
//   status: {
//     type: Sequelize.INTEGER,
//   },
// });
//
// const Subject = db.define("subject", {
//     name: {
//         type: Sequelize.STRING,
//     },
//     code: {
//         type: Sequelize.STRING,
//     },
//     grade: {
//         type: Sequelize.INTEGER,
//     },
//     teacher: {
//         type: Sequelize.BIGINT,
//     },
// });
//
// const SubjectTeacher = db.define("score", {
//     subject: {
//         type: Sequelize.BIGINT,
//     },
//     teacher: {
//         type: Sequelize.BIGINT,
//     },
// });

Address.hasOne(Employee, { foreignKey: "addressId" });
Employee.belongsTo(Address);

Address.hasOne(Student, { foreignKey: "addressId" });
Student.belongsTo(Address);

Address.hasOne(Guardian, { foreignKey: "addressId" });
Guardian.belongsTo(Address);

Guardian.hasOne(Student, { foreignKey: "guardianId" });
Student.belongsTo(Guardian);

Score.hasMany(ScoreItem, { foreignKey: "scoreId" });
ScoreItem.belongsTo(Score);

Subject.hasMany(ScoreItem, { foreignKey: "subjectId" });
ScoreItem.belongsTo(Subject);

StudentStatus.hasMany(Score, { foreignKey: "stStatusId" });
Score.belongsTo(StudentStatus);

Student.hasMany(StudentStatus, { foreignKey: "studentId" });
StudentStatus.belongsTo(Student);

Subject.hasMany(SubjectTeacher, { foreignKey: "subjectId" });
SubjectTeacher.belongsTo(Subject);

Class.hasMany(StudentStatus, { foreignKey: "classId" });
StudentStatus.belongsTo(Class);

Class.hasMany(SubjectTeacher, { foreignKey: "classId" });
SubjectTeacher.belongsTo(Class);

Employee.hasMany(SubjectTeacher, { foreignKey: "employeeId" });
SubjectTeacher.belongsTo(Employee);

DBStatus.hasMany(Semester, { foreignKey: "dbStatusId" });
Semester.belongsTo(DBStatus);
