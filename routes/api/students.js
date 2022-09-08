const bcrypt = require("bcryptjs");
var tools = require("../tools/tools");
var Subject = require("../../database/models/Subject");
var Student = require("../../database/models/Student");
var Score = require("../../database/models/Score");
var ScoreItem = require("../../database/models/ScoreItem");
var Address = require("../../database/models/Address");
var Guardian = require("../../database/models/Guardian");
var StudentStatus = require("../../database/models/StudentStatus");

var EC = require("ec.js");

/* GET users listing. */

exports.getAll = async (req, res, next) => {
    Student.findAll({
        include: [{model: Address}, {model: Guardian}],
    })
        .then((data) => {
            res.send(data);
        })
        .catch((error) => console.log(error));
};

exports.getOne = async (req, res, next) => {
    try {
        var entries = ["student"];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.status(400).send(result["error"]);
        } else {
            var data = result["data"];
            const student = await Student.findByPk(data["student"], {
                include: [
                    {model: Address},
                    {model: Guardian},
                    {model: StudentStatus},
                ],
            });
            if (student !== null) {
                res.send(student.toJSON());
            } else {
                result["error"]["student"] = "Not found";
                res.send(result["error"]);
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500);
    }
};

exports.myInfo = async (req, res, next) => {
    try {
        const student = await Student.findByPk(req.user.id, {
            include: [
                {model: Address},
                {model: Guardian},
                {model: StudentStatus, include: {model: Score, include: {model: ScoreItem, include: {model: Subject}}}},
            ],
        });
        if (student !== null) {
            res.send(student.toJSON());
        } else {
            result["error"]["student"] = "Not found";
            res.send(result["error"]);
        }
    } catch (error) {
        console.log(error);
        res.status(500);
    }
};

exports.myScore = async (req, res, next) => {
    try {
        const student = await Score.findOne({
            include: [
                {
                    model: StudentStatus,
                    where: {studentId: req.user.id}
                },
                {model: ScoreItem, include :{model: Subject}},
            ],
        });
        if (student !== null) {
            res.send(student.toJSON());
        } else {
            result["error"]["student"] = "Not found";
            res.send(result["error"]);
        }
    } catch (error) {
        console.log(error);
        res.status(500);
    }
};

exports.create = async (req, res, next) => {
    try {
        var entries = [
            "email",
            "password",
            "first_name",
            "middle_name",
            "last_name",
            "sex",
            "phone_num",
            "country",
            "city",
            "kebele",
            "house_no",
            "g_name",
            "g_phone_num",
            "class",
        ];

        var result = tools.filter(Object.entries(req.body), entries);

        if (req.file !== undefined) {
            var path = req.file["path"];
            path = path.replace("public", "");
            path = path.replace(/\\/g, "/");
            result["data"]["profile"] = path;
        } else {
            result["data"]["profile"] = "/images/default/default.jpg";
        }

        if (result["errorCount"] > 0) {
            res.status(400).send(result["error"]);
        } else {
            var data = result["data"];
            var student_p_num = await Student.findOne({
                where: {phone_num: data["phone_num"]},
            });
            var student_email = await Student.findOne({
                where: {email: data["email"]},
            });

            if (student_email !== null || student_p_num !== null) {
                if (student_email !== null) {
                    result["error"]["email"] = "Already Registered";
                }
                if (student_p_num !== null) {
                    result["error"]["phone_num"] = "Already Registered";
                }
                res.status(400).send(result["error"]);
            } else {
                
                const [address, a_created] = await Address.findOrCreate({
                    where: {
                        country: data['country'],
                        city: data["city"],
                        kebele: data["kebele"],
                        house_no: data["house_no"],
                    }
                });

                const [guardian, g_created] = await Guardian.findOrCreate({
                    where: {
                        name: data["g_name"],
                        phone_num: data["g_phone_num"],
                        addressId: address.id,
                    },
                });

                console.log(address);
                
                console.log("=================================");
                
                console.log(guardian);

                if(address === null || guardian === null){
                    res.status(500).send({Error: "Internal DFSDFSDFSD error"});
                    return;
                }

                data["addressId"] = address.id;
                data["guardianId"] = guardian.id;

                delete data["country"];
                delete data["city"];
                delete data["kebele"];
                delete data["house_no"];
                delete data["g_name"];
                delete data["g_phone_num"];
                var _class = data["class"];
                delete data["class"];

                if (data["sex"] !== "Male" || data["sex"] !== "Female") {
                    data["sex"] = "Male";
                }

                data["student_id"] = data["first_name"] + new Date().getMilliseconds();

                let unhashedPass = data["password"];
                data["password"] = await bcrypt.hash(unhashedPass, 10);

                const student = await Student.create(data);
                var et = EC.instance("ethiopian");
                var year = et.today().toString().split("-")[0];

                await StudentStatus.create({
                    student: student.id,
                    grade: _class,
                    year: year,
                    status: 0,
                });
                res.send(student.toJSON());
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).send({Error: 'Internal Server Error'});
    }
};

exports.delete = async (req, res, next) => {
    try {
        var entries = ["student"];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.send(result["error"]);
        } else {
            var data = result["data"];
            const _class = await Student.findByPk(data["student"]);
            if (_class != null) {
                await _class.destroy();
                result["response"] = {student: "deleted successfully"};
                res.send(result["response"]);
            } else {
                result["error"]["student"] = "Not found";
                res.send(result["error"]);
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400);
    }
};
