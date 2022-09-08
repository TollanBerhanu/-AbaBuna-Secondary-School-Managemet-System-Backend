var tools = require("../tools/tools");
var Class = require("../../database/models/Class");
var Teacher = require("../../database/models/Employee");
var Student = require("../../database/models/Student");
var StudentStatus = require("../../database/models/StudentStatus");

exports.getAll = async (req, res, next) => {
  Class.findAll()
    .then((data) => {
      res.send(data);
    })
    .catch((error) => console.log(error));
};

exports.getOne = async (req, res, next) => {
  try {
    var entries = ["class"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.status(400).send(result["error"]);
    } else {
      var data = result["data"];
      const _class = await Class.findByPk(data["class"]);
      if (address !== null) {
        res.send(_class.toJSON());
      } else {
        result["error"]["class"] = "Not found";
        res.send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

exports.getStudents = async (req, res, next) => {
  try {
    var entries = ["class"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      const _class = await Class.findOne({
        where: {
          id: data["class"],
        },
      });
      if (_class !== null) {
        let students = await Student.findAll({
          include: [
            {
              model: StudentStatus,
              where: { classId: _class.id },
            },
          ],
        });
        let st_list = [];
        for (const student of students) {
          st_list.push(student.toJSON());
        }

        res.send(st_list);
      } else {
        result["error"]["Class"] = "Not Found";
        res.status(404).send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};

exports.create = async (req, res, next) => {
  try {
    var entries = ["grade", "section"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      const [_class, created] = await Class.findOrCreate({
        where: {
          grade: data["grade"],
          section: data["section"],
        },
      });

      res.send(_class.toJSON());
    }
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};

exports.delete = async (req, res, next) => {
  try {
    var entries = ["class"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      const _class = await Class.findByPk(data["class"]);
      if (_class != null) {
        await _class.destroy();
        result["response"] = { class: "deleted successfully" };
        res.send(result["response"]);
      } else {
        result["error"]["class"] = "Not found";
        res.send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};

exports.setHRTeacher = async (req, res, next) => {
  try {
    var entries = ["id", "teacher"];

    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      const _class = await Class.findOne({
        where: {
          id: data["id"],
        },
      });
      if (_class === null) {
        result["error"]["class"] = "Not found";
        res.send(result["error"]);
        return;
      }
      const teacher = await Teacher.findOne({
        where: {
          id: data["teacher"],
        },
      });
      if (teacher !== null && teacher.id !== 1) {
        _class.hr_teacher = teacher.id;
        await _class.save();
        res.send(_class.toJSON());
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
