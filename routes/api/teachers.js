var Employee = require("../../database/models/Employee");
var Address = require("../../database/models/Address");
var DBStatus = require("../../database/models/DBStatus");
var Class = require("../../database/models/Class");
var Semester = require("../../database/models/Semester");
var Score = require("../../database/models/Score");
var ScoreItem = require("../../database/models/ScoreItem");
var Student = require("../../database/models/Student");
var SubjectTeacher = require("../../database/models/SubjectTeacher");
var StudentStatus = require("../../database/models/StudentStatus");
var tools = require("../tools/tools");
const bcrypt = require("bcryptjs");

/* GET users listing. */
exports.getAll = async (req, res, next) => {
    Employee.findAll({include: Address})
        .then((data) => {
            res.send(data);
        })
        .catch((error) => console.log(error));
};

exports.getOne = async (req, res, next) => {
    try {
        var entries = ["teacher"];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.status(400).send(result["error"]);
        } else {
            var data = result["data"];
            const teacher = await Employee.findByPk(data["teacher"], {
                include: Address,
            });
            if (teacher !== null) {
                res.send(teacher.toJSON());
            } else {
                result["error"]["teacher"] = "Not found";
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
            var teacher_email = await Employee.findOne({
                where: {email: data["email"]},
            });
            var teacher_p_num = await Employee.findOne({
                where: {phone_num: data["phone_num"]},
            });
            if (teacher_email !== null || teacher_p_num !== null) {
                if (teacher_email !== null) {
                    result["error"]["email"] = "Already Registered";
                }
                if (teacher_p_num !== null) {
                    result["error"]["phone_num"] = "Already Registered";
                }
                res.status(400).send(result["error"]);
            } else {
                const [address, created] = await Address.findOrCreate({
                    where: {
                        city: data["city"],
                        kebele: data["kebele"],
                        house_no: data["house_no"],
                    },
                    defaults: {
                        country: "Ethiopia",
                    },
                });
                data["addressId"] = address.id;
                delete data["country"];
                delete data["city"];
                delete data["kebele"];
                delete data["house_no"];

                if (data["sex"] !== "Male" || data["sex"] !== "Female") {
                    data["sex"] = "Male";
                }

                let unhashedPass = data["password"];
                data["password"] = await bcrypt.hash(unhashedPass, 10);

                const employee = await Employee.create(data);
                res.send(employee.toJSON());
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var entries = ["teacher"];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.send(result["error"]);
        } else {
            var data = result["data"];
            const _class = await Employee.findByPk(data["student"]);
            if (_class != null) {
                await _class.destroy();
                result["response"] = {teacher: "deleted successfully"};
                res.send(result["response"]);
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

exports.getClassInfo = async (req, res, next) => {
    try {
        const year = tools.currentYear();
        const db_status = await DBStatus.findOne({
            where: {year: year},
            include: [
                {
                    model: Semester,
                    where: {complete: false},
                    order: [["semester"]],
                    limit: 1,
                },
            ],
        });
        if (
            db_status !== null &&
            !db_status.year_complete &&
            db_status.class_started
        ) {
            let semester = db_status.toJSON().semesters[0].semester;
            const sub_teachers = await SubjectTeacher.findAll({
                where: {employeeId: req.user.id},
            });
            if (sub_teachers !== null) {
                let subject_ids = new Set();
                let class_ids = new Set();
                for (let sub_teacher of sub_teachers) {
                    sub_teacher = sub_teacher.toJSON();
                    subject_ids.add(sub_teacher.subjectId);
                    class_ids.add(sub_teacher.classId);
                }
                subject_ids = Array.from(subject_ids);
                let subjectId = subject_ids[0];
                class_ids = Array.from(class_ids);

                let students = await Class.findAll({
                    where: {id: class_ids},
                    attributes: ["id", "grade", "section", "teacherId"],
                    include: {
                        model: StudentStatus,
                        attributes: ["id", "studentId", "year", "grade", "classId"],
                        include: [
                            {
                                model: Student,
                                attributes: [
                                    "id",
                                    "email",
                                    "student_id",
                                    "first_name",
                                    "middle_name",
                                    "last_name",
                                    "sex",
                                    "profile",
                                    "status",
                                ],
                            },
                            {
                                model: Score,
                                where: {semester: semester},
                                attributes: ["id"],
                                include: [
                                    {
                                        model: ScoreItem,
                                        where: {subjectId: subjectId},
                                        attributes: ["id", "subjectId", "data"],
                                    },
                                ],
                            },
                        ],
                    },
                });
                res.send(students);
            } else {
                let result = {Message: "You haven't been assigned any subject yet!"};
                res.send(result);
            }
        } else {
            let result = {error: {}};
            result["error"]["Error"] = "Current school year not started yet!";
            res.status(400).send(result["error"]);
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error!");
    }
};

exports.submitScore = async (req, res, next) => {
    try {
        var entries = ["studentST_Id", "subjectId", "scoreItemId", "name", 'a_value', "s_value", 'bonus'];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.send(result["error"]);
        } else {
            var data = result["data"];
            const max_a_value = 100;
            if (parseInt(data['s_value']) > parseInt(data['a_value'])) {
                let result = {"Value Error": "Student's score exceeds the Assigned Score Value!"};
                res.status(400).send(result);
                return;
            }
            const year = tools.currentYear();
            const db_status = await DBStatus.findOne({
                where: {year: year},
                include: [
                    {
                        model: Semester,
                        where: {complete: false},
                        order: [["semester"]],
                        limit: 1,
                    },
                ],
            });
            if (
                db_status !== null &&
                !db_status.year_complete &&
                db_status.class_started
            ) {
                let semester = db_status.toJSON().semesters[0].semester;
                const sub_teachers = await SubjectTeacher.findAll({
                    where: {
                        employeeId: req.user.id,
                        subjectId: data["subjectId"],
                    },
                });
                if (sub_teachers !== null) {
                    let class_list = [];
                    for (const sub_teacher of sub_teachers) {
                        class_list.push(sub_teacher.toJSON().classId);
                    }
                    let student = await StudentStatus.findOne({
                        where: {id: data["studentST_Id"]},
                        include: [
                            {
                                model: Class,
                                where: {id: class_list},
                                attributes: []
                            },
                            {
                                model: Score,
                                where: {semester: semester},
                                attributes: ['id']
                            },
                        ],
                    });
                    let found = false;
                    if (student !== null) {
                        student = student.toJSON();
                        const scoreItem = await ScoreItem.findOne({
                            where: {
                                id: data['scoreItemId'],
                                scoreId: student.scores[0].id,
                                subjectId: data["subjectId"]
                            }
                        });
                        if (scoreItem !== null) {
                            let update = false;
                            let score_data = JSON.parse(scoreItem.toJSON().data);
                            let a_value = parseInt(data['a_value']);
                            for (let item of score_data) {
                                if (item['name'] === data['name']) {
                                    item['a_value'] = data['a_value'];
                                    item['s_value'] = data['s_value'];
                                    item['bonus'] = data['bonus'];
                                    update = true;
                                    a_value -= parseInt(data['a_value']);
                                }
                                a_value += parseInt(item['a_value']);
                                if (a_value > max_a_value) {
                                    let result = {'Value Error': "Total assigned score value(" + a_value + ") exceeds max allowed value(" + max_a_value + ")"};
                                    res.status(400).send(result);
                                    return;
                                }
                            }
                            if(!update){
                                score_data.push({
                                    'name': data['name'],
                                    'a_value': data['a_value'],
                                    's_value': data['s_value'],
                                    'bonus': data['bonus']
                                });
                            }
                            scoreItem.data = score_data;
                            await scoreItem.save();
                            res.send(score_data);
                            found = true;
                        }
                    }
                    if (!found) {
                        let result = {Error: "Student not found!"};
                        res.status(400).send(result);
                    }
                } else {
                    let result = {Message: "You haven't been assigned this subject!"};
                    res.status(400).send(result);
                }
            } else {
                let result = {error: {}};
                result["error"]["Error"] = "Current school year not started yet!";
                res.status(400).send(result["error"]);
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error!");
    }
};

exports.submitScore_ll = async (req, res, next) => {
    try {
        var entries = ["studentST_Id", "subjectId", "scoreItemId", "data"];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.send(result["error"]);
        } else {
            var data = result["data"];
            const year = tools.currentYear();
            const db_status = await DBStatus.findOne({
                where: {year: year},
                include: [
                    {
                        model: Semester,
                        where: {complete: false},
                        order: [["semester"]],
                        limit: 1,
                    },
                ],
            });
            if (
                db_status !== null &&
                !db_status.year_complete &&
                db_status.class_started
            ) {
                let semester = db_status.toJSON().semesters[0].semester;
                const sub_teachers = await SubjectTeacher.findAll({
                    where: {
                        employeeId: req.user.id,
                        subjectId: data["subjectId"],
                    },
                });
                if (sub_teachers !== null) {
                    let class_list = [];
                    for (const sub_teacher of sub_teachers) {
                        class_list.push(sub_teacher.toJSON().classId);
                    }
                    let student = await StudentStatus.findOne({
                        where: {id: data["studentST_Id"]},
                        include: [
                            {
                                model: Class,
                                where: {id: class_list},
                                attributes: []
                            },
                            {
                                model: Score,
                                where: {semester: semester},
                                attributes: ['id']
                            },
                        ],
                    });
                    if (student !== null) {
                        student = student.toJSON();
                        const scoreItem = await ScoreItem.findOne({
                            where: {
                                id: data['scoreItemId'],
                                scoreId: student.scores[0].id,
                                subjectId: data["subjectId"]
                            }
                        });
                        if (scoreItem !== null) {
                            scoreItem.data = data['data'];
                            await scoreItem.save();
                            res.send(scoreItem);
                        }
                    }
                    else {
                        let result = {Error: "Student not found!"};
                        res.status(400).send(result);
                    }
                } else {
                    let result = {Message: "You haven't been assigned this subject!"};
                    res.status(400).send(result);
                }
            } else {
                let result = {error: {}};
                result["error"]["Error"] = "Current school year not started yet!";
                res.status(400).send(result["error"]);
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error!");
    }
};

exports.getHRClassInfo = async (req, res, next) => {
    try {
        const year = tools.currentYear();
        const db_status = await DBStatus.findOne({
            where: {year: year},
            include: [
                {
                    model: Semester,
                    where: {complete: false},
                    order: [["semester"]],
                    limit: 1,
                },
            ],
        });
        if (
            db_status !== null &&
            !db_status.year_complete &&
            db_status.class_started
        ) {
            let semester = db_status.toJSON().semesters[0].semester;

            let _class = await Class.findOne({
                where: {teacherId: req.user.id},
                attributes: ["id", "grade", "section"],
                include: {
                    model: StudentStatus,
                    attributes: ["id", "studentId", "year", "grade", "classId"],
                    include: [
                        {
                            model: Student,
                            attributes: [
                                "id",
                                "email",
                                "student_id",
                                "first_name",
                                "middle_name",
                                "last_name",
                                "sex",
                                "profile",
                                "status",
                            ],
                        },
                    ],
                },
            });
            if (_class !== null) {
                res.send(_class);
            } else {
                let result = {Message: "You haven't been assigned any class yet!"};
                res.send(result);
            }
        } else {
            let result = {error: {}};
            result["error"]["Error"] = "Current school year not started yet!";
            res.status(400).send(result["error"]);
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error!");
    }
};

/**
 * Multiple Teachers at once
 *
 * else {
            var data_ = result["data"];
            for(var x=10; x<=65; x++){
                var data = {};
                for(const key in data_){
                    data[key] = data_[key];
                }
                let temp = Math.round(new Date().getTime()/1000);
                data['email'] = (x.toString()) + temp.toString() + data['email'];
                data['phone_num'] = data['phone_num'] + (x * 150).toString();
                data['middle_name'] = (x * 150).toString();
                data['sex'] = x%2 === 0 ? "Male" : "Female";
                var teacher_email = await Employee.findOne({where: {email: data['email']}});
                var teacher_p_num = await Employee.findOne({where: {phone_num: data['phone_num']}});
                if (teacher_email !== null || teacher_p_num !== null) {
                    if (teacher_email !== null) {
                        result["error"]["email"] = "Already Registered";
                    }
                    if (teacher_p_num !== null) {
                        result["error"]["phone_num"] = "Already Registered";
                    }
                    res.status(400).send(result["error"]);
                } else {
                    const [address, created] = await Address.findOrCreate({
                        where: {
                            city: data["city"],
                            kebele: data["kebele"],
                            house_no: data["house_no"],
                        },
                        defaults: {
                            country: "Ethiopia",
                        },
                    });
                    data["addressId"] = address.id;
                    // delete data["country"];
                    // delete data["city"];
                    // delete data["kebele"];
                    // delete data["house_no"];

                    if (data['sex'] !== "Male" || data['sex'] !== "Female") {
                        data['sex'] = "Male";
                    }

                    let unhashedPass = data["password"];
                    data["password"] = await bcrypt.hash(unhashedPass, 10);


                    const employee = await Employee.create(data);

                }
            }
        }
 */
