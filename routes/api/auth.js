const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
var tools = require("../tools/tools");
var Student = require("../../database/models/Student");
var Employee = require("../../database/models/Employee");

exports.s_login = async (req, res) => {
  try {
    var entries = ["email", "password"];
    var result = tools.filter(Object.entries(req.body), entries);
    // console.log('Student Login: ' + req.body)

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      console.log(data);
      var student = await Student.findOne({
        where: { email: data["email"] },
      });
      if (student !== null) {
        if (await bcrypt.compare(data["password"], student.password)) {
          const id = student.id;
          const token = jwt.sign(
            { id: id, type: "student" },
            process.env.JWT_SECRET,
            {
              expiresIn: process.env.JWT_EXPIRES_IN,
            }
          );

          const cookieOptions = {
            expires: new Date(
              new Date() + process.env.JWT_COOCIE_EXPIRE * 60 * 60 * 1000
            ),
            httpOnly: true,
          };
          res.cookie("jwt", token, cookieOptions);
          res.status(200).send({ Token: token });
        } else {
          result["error"]["credentials"] = "Invalid Credentials!";
          res.status(401).send(result["error"]);
        }
      } else {
        result["error"]["credentials"] = "Invalid Credentials!";
        res.status(401).send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

exports.a_login = async (req, res) => {
  try {
    var entries = ["email", "password"];
    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      console.log(data);
      var admin = await Employee.findOne({
        where: { email: data["email"], isAdmin: true },
      });
      console.log(admin);
      if (admin !== null) {
        if (await bcrypt.compare(data["password"], admin.password)) {
          const id = admin.id;
          const token = jwt.sign(
            { id: id, type: "admin" },
            process.env.JWT_SECRET,
            {
              expiresIn: process.env.JWT_EXPIRES_IN,
            }
          );

          const cookieOptions = {
            expires: new Date(
              new Date() + process.env.JWT_COOCIE_EXPIRE * 60 * 60 * 1000
            ),
            httpOnly: true,
          };
          res.cookie("jwt", token, cookieOptions);
          res.status(200).send({ Token: token });
        } else {
          result["error"]["credentials"] = "Invalid Credentials!";
          res.status(401).send(result["error"]);
        }
      } else {
        result["error"]["credentials"] = "Invalid Credentials!";
        res.status(401).send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

exports.t_login = async (req, res) => {
  try {
    var entries = ["email", "password"];
    var result = tools.filter(Object.entries(req.body), entries);

    if (result["errorCount"] > 0) {
      res.send(result["error"]);
    } else {
      var data = result["data"];
      console.log(data);
      var teacher = await Employee.findOne({
        where: { email: data["email"], isAdmin: false },
      });
      if (teacher !== null) {
        if (await bcrypt.compare(data["password"], teacher.password)) {
          const id = teacher.id;
          const token = jwt.sign(
            { id: id, type: "teacher" },
            process.env.JWT_SECRET,
            {
              expiresIn: process.env.JWT_EXPIRES_IN,
            }
          );

          const cookieOptions = {
            expires: new Date(
              new Date() + process.env.JWT_COOCIE_EXPIRE * 60 * 60 * 1000
            ),
            httpOnly: true,
          };
          res.cookie("jwt", token, cookieOptions);
          res.status(200).send({ Token: token });
        } else {
          result["error"]["credentials"] = "Invalid Credentials!";
          res.status(401).send(result["error"]);
        }
      } else {
        result["error"]["credentials"] = "Invalid Credentials!";
        res.status(401).send(result["error"]);
      }
    }
  } catch (error) {
    console.log(error);
  }
};
