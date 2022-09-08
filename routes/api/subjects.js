var Sequelize = require("sequelize");
const Op = Sequelize.Op;
var tools = require("../tools/tools");
var Subject = require("../../database/models/Subject");
var Class = require("../../database/models/Class");
var Teacher = require("../../database/models/Employee");
var SubjectTeacher = require("../../database/models/SubjectTeacher");

/* GET users listing. */
exports.getAll = async (req, res, next) => {
  Subject.findAll()
    .then((data) => {
      res.send(data);
    })
    .catch((error) => console.log(error));
};

exports.getOne = async (req, res, next) => {
  try {
    var entries = ["subject"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.status(400).send(result["error"]);
    } else {
      var data = result["data"];
      const subject = await Subject.findByPk(data["subject"]);
      if (subject !== null) {
        res.send(subject.toJSON());
      } else {
        result["error"]["subject"] = "Not found";
        res.send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

exports.create = async (req, res, next) => {
  try {
    var entries = ["name", "code", "grade", "class_per_week", "common"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.status(400).send(result["error"]);
    } else {
      var data = result["data"];
      console.log(data);
      console.log("====> " + typeof(data['common']));
      try {
        if (data["common"] === 'true') {
          const grades = [9, 10, 11, 12];
          let subj_data = [];
          for (const grade of grades) {
            subj_data.push({
              name: data["name"],
              code:
                data["code"].toUpperCase() + grade.toString().padStart(2, "0"),
              grade: grade,
            });
          }
          const subjects = await Subject.bulkCreate(subj_data);
          console.log('Selected Grade: ' + data['grade'])
          res.send(subjects);
        } else {
          const [subject, created] = await Subject.findOrCreate({
            where: {
              name: data["name"],
              code: data["code"].toUpperCase() + data["grade"].toString().padStart(2, "0"),
              grade: data["grade"],
            },
          });
          res.send(subject.toJSON());
        }
      } catch (error) {
        res.status(400).send({ Error: "Subject Code Already Exists" });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};

exports.delete = async (req, res, next) => {
  try {
    var entries = ["subject"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      const _class = await Subject.findByPk(data["subject"]);
      if (_class != null) {
        await _class.destroy();
        result["response"] = { subject: "deleted successfully" };
        res.send(result["response"]);
      } else {
        result["error"]["subject"] = "Not found";
        res.send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};

exports.setTeacher = async (req, res, next) => {
  try {
    var entries = ["subject", "teacher", "all", "section"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      data["all"] = data["all"].toLowerCase() === "true";
      const subject = await Subject.findOne({
        where: {
          id: data["subject"],
        },
      });
      if (subject === null) {
        result["error"]["subject"] = "Not found";
        res.send(result["error"]);
        return;
      }
      const teacher = await Teacher.findOne({
        where: {
          id: data["teacher"],
        },
      });
      if (teacher !== null && teacher.id !== 1) {
        let section_list = [];
        console.log(data["all"] === false);
        if (data["all"]) {
          const sections = await Class.findAll({
            where: { grade: subject.grade },
          });
          sections.forEach((section) =>
            section_list.push({
              subjectId: subject.id,
              employeeId: teacher.id,
              classId: section.toJSON().id,
            })
          );
        } else {
          const sections = await Class.findAll({
            where: {
              grade: subject.grade,
              section: { [Op.in]: data["section"] },
            },
          });
          sections.forEach((section) => section_list.push({
              subjectId: subject.id,
              employeeId: teacher.id,
              classId: section.toJSON().id,
          }));
        }
        const result = await SubjectTeacher.bulkCreate(section_list, {ignoreDuplicates: true});
        res.send(JSON.stringify(result));
      } else {
        result["error"]["teacher"] = "Not found";
        res.send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};

exports.UnsetTeacherSubject = async (req, res, next) => {
  try {
    var entries = ["subject", "teacher"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      const subject = await Subject.findOne({
        where: {
          id: data["id"],
        },
      });
      if (subject === null) {
        result["error"]["subject"] = "Not found";
        res.send(result["error"]);
        return;
      }
      const teacher = await Teacher.findOne({
        where: {
          id: data["teacher"],
        },
      });
      if (teacher !== null && teacher.id !== 1) {
        const subject_teacher = await SubjectTeacher.findOne({
          where: {
            subjectId: subject.id,
            employeeId: teacher.id,
          },
        });
        if (subject_teacher !== null) {
          await subject_teacher.delete;
          res.status(200).send("Teacher dismissed from subject successfully!");
        } else {
          res.status(400).send({ Error: "Teacher not assigned to subject!" });
        }
      } else {
        result["error"]["teacher"] = "Not found";
        res.send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};
exports.UnsetTeacherSection = async (req, res, next) => {
  try {
    var entries = ["subject", "teacher", "class"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      const subject = await Subject.findOne({
        where: {
          id: data["subject"],
        },
      });
      if (subject === null) {
        result["error"]["subject"] = "Not found";
        res.send(result["error"]);
        return;
      }
      const _class = await Subject.findOne({
        where: {
          id: data["class"],
        },
      });
      if (_class === null) {
        result["error"]["Class"] = "Not found";
        res.send(result["error"]);
        return;
      }
      const teacher = await Teacher.findOne({
        where: {
          id: data["teacher"],
        },
      });
      if (teacher !== null && teacher.id !== 1) {
        const subject_teacher = await SubjectTeacher.findOne({
          where: {
            subjectId: subject.id,
            employeeId: teacher.id,
            classId: _class.id,
          },
        });
        if (subject_teacher !== null) {
          await subject_teacher.delete;
          res
            .status(200)
            .send("Teacher dismissed from subject of class successfully!");
        } else {
          res
            .status(400)
            .send({ Error: "Teacher not assigned to subject of class!" });
        }
      } else {
        result["error"]["teacher"] = "Not found";
        res.send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};
