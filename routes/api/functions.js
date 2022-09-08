const sequelize = require("sequelize");
var tools = require("../tools/tools");
var Student = require("../../database/models/Student");
var Schedule = require("../../database/models/Schedule");
var Subject = require("../../database/models/Subject");
var SubjectTeacher = require("../../database/models/SubjectTeacher");
var Semester = require("../../database/models/Semester");
var Class = require("../../database/models/Class");
var Score = require("../../database/models/Score");
var ScoreItem = require("../../database/models/ScoreItem");
var DBStatus = require("../../database/models/DBStatus");
var StudentStatus = require("../../database/models/StudentStatus");
var EC = require("ec.js");
var et = EC.instance("ethiopian");

var fs = require("fs");
var util = require("util");
var log_file = fs.createWriteStream(__dirname + "/debug.log", {flags: "w"});
var log_stdout = process.stdout;

/** Assign students after registration */
exports.AssignStudents = async (req, res, next) => {
    try {
        var entries = ["min_p_c", "max_p_c"];
        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.send(result["error"]);
        } else {
            var year = et.today().toString().split("-")[0];

            const db_state = await DBStatus.findOne({where: {year: year}});

            if (
                db_state != null &&
                !db_state.year_complete &&
                !db_state.assign_complete &&
                db_state.reg_complete
            ) {
                const max = result["data"]["max_p_c"];
                const min = result["data"]["min_p_c"];
                const grades = [9, 10, 11, 12];
                //Categorize classes
                const classes = await Class.findAll();
                var class_list = {9: [], 10: [], 11: [], 12: []};
                for (const item of classes) {
                    var c_data = item.toJSON();
                    class_list[c_data["grade"]].push(c_data);
                }

                //Categorize current year Students
                const students = await Student.findAll({
                    include: [
                        {
                            model: StudentStatus,
                            where: {year: year},
                        },
                    ],
                    order: [["first_name"]],
                });
                var student_list = {9: [], 10: [], 11: [], 12: []};
                for (const item of students) {
                    var s_data = item.toJSON();
                    try {
                        student_list[s_data["st_statuses"][0]["grade"]].push(s_data);
                    } catch (error) {
                        console.log("Skip: " + s_data.id);
                    }
                }
                if (classes !== null) {
                    var response = {};
                    var error = {};
                    var errorCount = 0;

                    /** sai: Section Assignment info */
                    var sai = {};

                    /** Iterate through all grade levels and Initialize for assignation */
                    for (const item of grades) {
                        /** st(student): student count per grade(9,10,11,12) */
                        const st = student_list[item].length;
                        /** sec_d: section data (id, class, section, home room teacher)  eq: {id: 1, class: 9, section: A}*/
                        const sec_d = class_list[item];
                        /** sec(section): section count per grade(9,10,11,12)*/
                        const sec = class_list[item].length;
                        /** stpc(student per class):  number of students that can fit into current class sections(sec)*/
                        const stpc = Math.floor(st / sec);
                        /** remainder: remaining number of students after fitting them into current class sections(sec) */
                        const remainder = st % sec;
                        /** check if assign number of students per class doesn't exceed  the limit(max: maximum number of students allowed per class section)*/
                        if (max < stpc) {
                            /** Report error*/
                            error[item] =
                                "With the specified max number of students per class room: Additional " +
                                (requiredRoom - max) +
                                " rooms are required!";
                            error++;
                        } else {
                            /** std: list of students data(filtered and ordered by alphabet of their first_name)*/
                            var std = filterByAlphabet(student_list[item]);
                            /** Putting data required to assign students into Student Assignation Info array per grade(9,10,11,12)*/
                            sai[item] = {
                                std: std,
                                count: st,
                                sec: sec,
                                sec_d: sec_d,
                                stpc: stpc,
                                stpcr: remainder,
                            };
                        }
                    }

                    if (errorCount > 0) {
                        /** If any error: return report to requester and quit*/
                        response["error"] = error;
                        res.status(400).send(response);
                    } else {
                        /** db_assign(database assignations): filtered and finalized data to be sent to database*/
                        var db_assign = {};

                        /** Iterate through each alphabetically filtered student info and (randomly)assign section per grade(9,10,11,12)*/
                        for (const grade in sai) {
                            /** _sai(student assignation info): assignation info per grade(9,10,11,12)*/
                            const _sai = sai[grade];
                            /** create dictionary for each grade and initialize section data and lists(for student status id)*/
                            db_assign[grade] = {};
                            for (const section of _sai.sec_d) {
                                db_assign[grade][section.section] = {
                                    section: section,
                                    id: [],
                                };
                            }
                            /** r_std(remaining students): students remaining from equal(alphabetically) and random assignation per section*/
                            let r_std = new Set();

                            /**Block: Alphabetically assign equal number of student into each section*/
                            {
                                for (const alphabet in _sai.std) {
                                    /** _std(students): alphabetically ordered list of students*/
                                    var _std = _sai.std[alphabet];
                                    /** a_std(alphabeted student): number of alphabeted students per section*/
                                    var a_std = Math.floor(_std["count"] / _sai.sec);

                                    /** a_std_r(alphabeted student remainder): number of remaining alphabeted students out of equal distribution per section*/
                                    var a_std_r = _std["count"] % _sai.sec;

                                    /** Assign equal number of students into each section per alphabet*/
                                    for (const section of _sai.sec_d) {
                                        for (var s = 0; s < a_std; s++) {
                                            /** select random student from alphabetically filtered and ordered list of student*/
                                            const student = getRandomItem(_std["data"]);
                                            /** Put student status into db_assign(grade, section and section student id dictionary) list(only id, b/c it's to be sent to db) */
                                            db_assign[grade][section.section]["id"].push(
                                                student.st_statuses[0].id
                                            );
                                            /** remove student from list and decrement student count*/
                                            _std["data"].delete(student);
                                            _std["count"]--;
                                        }
                                    }
                                    /** Put remaining unassigned students to remaining students list for later random distribution */
                                    for (const student of _std["data"]) {
                                        r_std.add(student);
                                    }
                                }
                            }

                            /**Block: Assign remaining students equally among class sections*/
                            {
                                /** r_std_p_s(remaining students assignable per section)*/
                                let r_std_p_s = Math.floor(a_std_r_t / _sai.sec);

                                /** Assign equal number of students into each section from remaining students*/
                                for (const section of _sai.sec_d) {
                                    for (let i = 0; i < r_std_p_s; i++) {
                                        /** select random student from alphabetically filtered and ordered list of student*/
                                        const student = getRandomItem(r_std);
                                        /** Put student status into db_assign(grade, section and section student id dictionary) list(only id, b/c it's to be sent to db) */
                                        db_assign[grade][section.section]["id"].push(
                                            student.st_statuses[0].id
                                        );
                                        /** remove student from list*/
                                        r_std.delete(student);
                                    }
                                }
                            }

                            /** Randomly Assign any remaining students into sections */
                            {
                                for (const student of r_std) {
                                    /** Randomly select a section */
                                    let _sec = _sai.sec_d[Math.floor(Math.random() * _sai.sec)];
                                    /** Put student status into db_assign(grade, section and section student id dictionary) list(only id, b/c it's to be sent to db) */
                                    db_assign[grade][_sec.section]["id"].push(
                                        student.st_statuses[0].id
                                    );
                                }
                            }
                        }

                        /** Submit to database */
                        for (const grade_i in db_assign) {
                            /** grade_i: grade index */
                            const grade = db_assign[grade_i];
                            /** grade: contains list of class levels(9, 10, 11, 12) and their respective section data(for assignation)
                             */
                            for (const section_i in grade) {
                                /** section_i: section index */
                                const section = grade[section_i];
                                /** section:
                                 -section['section']: section information(id, class, section, home room teacher)
                                 -section['id']: list of student status ids to be assigned to the section
                                 */

                                /** Submit data to database to update student section assignation */
                                await StudentStatus.update(
                                    {
                                        classId: section["section"].id,
                                    },
                                    {
                                        where: {
                                            id: section["id"],
                                        },
                                    }
                                );
                            }
                        }
                        db_state.temp_assign_done = true;
                        await db_state.save();
                        res.send(db_assign);
                    }
                } else {
                    result["error"]["Class"] = "List empty";
                    res.status(400).send(result["error"]);
                }
            } else {
                if (db_state === null) {
                    result["error"]["Error"] = "Current school year not started yet!";
                    res.status(400).send(result["error"]);
                } else if (db_state.assign_complete) {
                    result["error"]["Error"] =
                        "Assignation already performed and committed!";
                    res.status(400).send(result["error"]);
                } else if (!db_state.reg_complete) {
                    result["error"]["Error"] = "Student registration not complete!";
                    res.status(400).send(result["error"]);
                }
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400);
    }
};
exports.ApproveAssignation = async (req, res, next) => {
    try {
        var year = et.today().toString().split("-")[0];
        const db_state = await DBStatus.findOne({where: {year: year}});

        if (db_state !== null) {
            if (!db_state.assign_complete) {
                if (db_state.temp_assign_done) {
                    db_state.assign_complete = true;
                    await db_state.save();
                } else {
                    let result = {error: {}};
                    result["error"]["Error"] = "No assignation done to approve!";
                    res.send(result['error'])
                }
            } else {
                res.send(db_state);
            }
        } else {
            let result = {error: []};
            result["error"]["Error"] = "Current school year not started yet!";
            res.status(400).send(result["error"]);
        }
    } catch (error) {
        console.log(error);
        res.status(500);
    }
};

exports.StartCurrentSchoolYear = async (req, res, next) => {
    try {
        const semesters = 2;
        var year = et.today().toString().split("-")[0];
        const [db_status, created] = await DBStatus.findOrCreate({
            where: {year: year},
            include: [{model: Semester}],
        });
        if (created) {
            for (let x = 1; x <= semesters; x++) {
                const [semester, created] = await Semester.findOrCreate({
                    where: {
                        dbStatusId: db_status.id,
                        semester: x,
                    },
                });
            }
        }
        res.status(200).send(db_status.toJSON());
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
};
exports.EndCurrentSchoolYear = async (req, res, next) => {
    try {
        var year = et.today().toString().split("-")[0];
        const db_status = await DBStatus.findOne({
            where: {year: year},
        });
        if (db_status !== null) {
            db_status.year_complete = true;
            await db_status.save();
            res.send(db_status.toJSON());
        } else {
            var result = {error: []};
            result["error"]["Class"] = "Current school year not started yet!";
            res.status(400).send(result["error"]);
        }
    } catch (error) {
        res.status(500);
    }
};
exports.RegistrationComplete = async (req, res, next) => {
    try {
        var year = et.today().toString().split("-")[0];
        const db_status = await DBStatus.findOne({
            where: {year: year},
        });
        if (db_status !== null) {
            if (!db_status.reg_complete) {
                db_status.reg_complete = true;
                await db_status.save();
            }
            res.send(db_status.toJSON());
        } else {
            var result = {error: []};
            result["error"]["Error"] = "Current school year not started yet!";
            res.status(400).send(result["error"]);
        }
    } catch (error) {
        res.status(500);
    }
};

exports.StartClass = async (req, res, next) => {
    try {
        var year = et.today().toString().split("-")[0];
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
            db_status.assign_complete &&
            db_status.reg_complete &&
            db_status.schedule_generated
        ) {
            let Semester = db_status.semesters[0];
            if (!db_status.class_started) {
                const students = await StudentStatus.findAll({
                    where: {year: year},
                    include: {model: Score},
                });
                const subjects = await Subject.findAll();
                const grades = [9,10,11,12];
                let student_list = {};
                let subject_list = {};
                let score_list = {};

                for (const grade of grades) {
                    console.log(grade);
                    student_list[grade] = [];
                    subject_list[grade] = [];
                    score_list[grade] = [];
                }
                let count = 0;
                for (let student of students) {
                    student = student.toJSON();
                    student_list[student.grade].push(student);
                }
                for (let subject of subjects) {
                    subject = subject.toJSON();
                    subject_list[subject.grade].push(subject);
                }

                for (const grade of grades) {
                    let score_data = [];
                    let status_list = [];
                    for (const studentSt of student_list[grade]) {
                        score_data.push({stStatusId: studentSt.id, semester: Semester.semester});
                        status_list.push(studentSt.id);
                    }
                    await Score.bulkCreate(score_data, {updateOnDuplicate: ["updatedAt"]});
                    score_list[grade] = await Score.findAll({where: {stStatusId: status_list}});
                    console.log(score_list[grade]);
                }
                for (const grade of grades) {
                    let score_item_data = {};
                    let counter = 0;
                    let index = 0;
                    score_item_data[index] = [];
                    for(const score of score_list[grade]){
                        for(const subject of subject_list[grade]){
                            score_item_data[index].push({scoreId: score.id, subjectId: subject.id});
                            counter++;
                            if(counter === 500){
                                index++;
                                score_item_data[index] = [];
                                counter = 0;
                            }
                        }
                    }
                    console.log("Grade: " + grade);
                    for(let x=0; x<=index; x++){
                        await ScoreItem.bulkCreate(score_item_data[x], {updateOnDuplicate: ["updatedAt"]} );
                    }
                }

                db_status.class_started = true;
                await db_status.save();
            }
            res.send(db_status.toJSON());
        } else {
            var result = {'error': {}};
            result["error"]["Error"] = "Current school year not started yet!";
            res.status(400).send(result['error']);
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};

/** Given a list of students, returns a list of alphabetically filtered items and their count
 @param list(set of students to alphabetically filter by their first_name)
 */
function filterByAlphabet(list) {
    const alphabet = [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
    ];
    var counter = 0;
    var NewList = {};
    for (const item of alphabet) {
        NewList[item] = {data: new Set(), count: 0};
    }
    var rounds = 0;
    for (const item of list) {
        rounds++;
        if (item.first_name.toLowerCase().startsWith(alphabet[counter])) {
            NewList[alphabet[counter]]["data"].add(item);
            NewList[alphabet[counter]]["count"]++;
            continue;
        }
        while (!item.first_name.toLowerCase().startsWith(alphabet[counter])) {
            counter++;
        }
        if (item.first_name.toLowerCase().startsWith(alphabet[counter])) {
            NewList[alphabet[counter]]["data"].add(item);
            NewList[alphabet[counter]]["count"]++;
        }
    }
    return NewList;
}

/** Given a set returns a random item from that set(if removal of the returned item is required)
 @param set(set of items to randomly select from)
 */
function getRandomItem(set) {
    let items = Array.from(set);
    return items[Math.floor(Math.random() * items.length)];
}

/** Given an array returns a random item from that array(if removal of the returned item is not required)
 @param dict(set of items to randomly select from)
 @param id(specific group selection)
 */
function getRandomSubject(dict, id) {
    let list = [];
    for (const key in dict) {
        for (const item of key.split(",")) {
            if (id === parseInt(item)) {
                if (dict[key].size > 0) {
                    list.push(key);
                }
            }
        }
    }
    let key = list[Math.floor(Math.random() * list.length)];
    let array = Array.from(dict[key]);
    let item = {
        key: key,
        value: array[Math.floor(Math.random() * array.length)],
    };
    return item;
}

logf = function (d) {
    //log_data += (util.format(d) + "\n");
    //log_file.write(util.format(d) + "\n");
    //log_stdout.write(util.format(d) + "\n");
};
logn = function (d) {
    //log_data += (util.format(d));
    //log_file.write(util.format(d));
    //log_stdout.write(util.format(d));
};
clogf = function (d) {
    //log_data += (util.format(d) + "\n");
    log_file.write(util.format(d) + "\n");
    //log_stdout.write(util.format(d) + "\n");
};
clogn = function (d) {
    //log_data += (util.format(d));
    //log_file.write(util.format(d));
    log_stdout.write(util.format(d));
};

exports.GenerateSchedule = async (req, res, next) => {
    try {
        var entries = ["override"];
        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.status(400).send(result["error"]);
        } else {
            let data = result["data"];
            data["override"] = data["override"].toLowerCase() === "true";

            var year = et.today().toString().split("-")[0];

            const db_state = await DBStatus.findOne({where: {year: year}});

            if (
                db_state != null &&
                !db_state.year_complete &&
                db_state.assign_complete &&
                db_state.reg_complete
            ) {
                let generate = false;
                const db_schedule = await Schedule.findOne({
                    where: {year: year},
                });
                if (db_schedule !== null) {
                    let sch_data = db_schedule.toJSON();
                    if (sch_data.accepted) {
                        if (!db_state.class_started) {
                            if (data["override"]) {
                                generate = true;
                            }
                        } else {
                            res
                                .status(400)
                                .send({
                                    Error: "Can not override a schedule after class started!",
                                });
                        }
                    } else {
                        generate = true;
                    }
                } else {
                    generate = true;
                }
                if (generate) {
                    let schedules = {};
                    const grades = [9, 10, 11, 12];
                    var class_section = {};
                    var id_section_map = {};
                    var grade_id_section_map = {};
                    let subjects = {};
                    let subjects_copy = {};
                    let _schedule = {};
                    grades.forEach((grade) => {
                        class_section[grade] = [];
                        schedules[grade] = {};
                        grade_id_section_map[grade] = {};
                        _schedule[grade] = {};
                        subjects[grade] = {};
                        subjects_copy[grade] = {};
                    });

                    const class_days = [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                    ];
                    const subjects_per_day = 6;

                    const classes = await Class.findAll();
                    if (classes !== null) {
                        for (let _class of classes) {
                            _class = _class.toJSON();
                            class_section[_class.grade].push({
                                id: _class.id,
                                section: _class.section,
                            });
                            id_section_map[_class.id] = _class.section;
                            grade_id_section_map[_class.grade][_class.id] = _class.section;
                        }
                    } else {
                        res.status(400).send({Error: "Class list empty!"});
                    }
                    const subject_list = await Subject.findAll({
                        include: [{model: SubjectTeacher}],
                    });
                    if (subject_list !== null) {
                        subject_list.forEach((subject) => {
                            subject = subject.toJSON();
                            let _mutual = {};
                            for (const sub_teacher of subject.subject_teachers) {
                                if (_mutual[sub_teacher.employeeId] === undefined) {
                                    _mutual[sub_teacher.employeeId] = [];
                                    _mutual[sub_teacher.employeeId].push(sub_teacher.classId);
                                } else {
                                    _mutual[sub_teacher.employeeId].push(sub_teacher.classId);
                                }
                            }
                            for (const sub_teacher of subject.subject_teachers) {
                                for (
                                    let counter = 0;
                                    counter < subject.class_per_week;
                                    counter++
                                ) {
                                    if (
                                        subjects[subject.grade][_mutual[sub_teacher.employeeId]] ===
                                        undefined
                                    ) {
                                        subjects[subject.grade][_mutual[sub_teacher.employeeId]] =
                                            new Set();
                                    }
                                    if (
                                        subjects_copy[subject.grade][
                                            _mutual[sub_teacher.employeeId]
                                            ] === undefined
                                    ) {
                                        subjects_copy[subject.grade][
                                            _mutual[sub_teacher.employeeId]
                                            ] = new Set();
                                    }
                                    let subject_data = {
                                        id: subject.id,
                                        code: subject.code,
                                        cpw: subject.class_per_week,
                                        teacher: sub_teacher.employeeId,
                                        class: sub_teacher.classId,
                                    };
                                    subjects[subject.grade][_mutual[sub_teacher.employeeId]].add(
                                        subject_data
                                    );
                                    subjects_copy[subject.grade][
                                        _mutual[sub_teacher.employeeId]
                                        ].add(subject_data);
                                }
                            }
                        });
                    } else {
                        res.status(400).send({Error: "Subject list empty!"});
                    }

                    for (const grade of grades) {
                        let grade_schedule = {};
                        let _subject_limit = {};
                        let grade_retries = 1;
                        let grade_max_retries = 10;
                        let grade_deadlock = false;
                        while (grade_retries < grade_max_retries) {
                            grade_deadlock = false;
                            for (const _class of class_section[grade]) {
                                let section = _class.section;
                                if (_subject_limit[section] === undefined) {
                                    _subject_limit[section] = {};
                                }
                                let section_schedule = {};
                                let t_section_schedule = {};
                                let section_retries = 1;
                                let section_max_retries = 25;
                                let section_deadlock = false;
                                while (section_retries < section_max_retries) {
                                    section_deadlock = false;
                                    for (const day of class_days) {
                                        t_section_schedule[day] = [];
                                        let day_schedule = {};
                                        let t_day_schedule = [];
                                        let day_retries = 1;
                                        let day_max_retries = 50;
                                        let day_deadlock = false;
                                        while (day_retries < day_max_retries) {
                                            day_deadlock = false;
                                            for (let x = 1; x <= subjects_per_day; x++) {
                                                let random_retries = 1;
                                                let random_max_retries = 50;
                                                while (random_retries < random_max_retries) {
                                                    let rSubject = getRandomSubject(
                                                        subjects[grade],
                                                        _class.id
                                                    );
                                                    let subject = rSubject.value;
                                                    if (
                                                        _subject_limit[section][subject.code] === undefined
                                                    ) {
                                                        _subject_limit[section][subject.code] = subject.cpw;
                                                    }
                                                    //logn("Checking: " + subject.code + " for Class " + grade + section + " " + day + " at " + x + " Re: " + subjects[grade][rSubject.key].size);
                                                    if (
                                                        one_per_day(day_schedule, x, subject) &&
                                                        is_in_per_week_limit(
                                                            _subject_limit[section][subject.code]
                                                        ) &&
                                                        unique_per_mutual(
                                                            rSubject.key,
                                                            _class.id,
                                                            day,
                                                            x,
                                                            subject,
                                                            grade_schedule,
                                                            id_section_map
                                                        )
                                                    ) {
                                                        //logf("\t\tAccepted!");
                                                        day_schedule[x] = rSubject;
                                                        t_day_schedule.push({
                                                            section: section,
                                                            subject: rSubject,
                                                        });
                                                        subjects[grade][rSubject.key].delete(subject);
                                                        _subject_limit[section][subject.code]--;
                                                        break;
                                                    } else {
                                                        //logf("\t\tFail!");
                                                    }
                                                    random_retries++;
                                                }
                                                if (random_retries === random_max_retries) {
                                                    day_deadlock = true;
                                                    break;
                                                }
                                            }
                                            if (day_deadlock) {
                                                t_day_schedule.forEach((item) => {
                                                    subjects[grade][item.subject.key].add(
                                                        item.subject.value
                                                    );
                                                    _subject_limit[item.section][
                                                        item.subject.value.code
                                                        ]++;
                                                });
                                                day_schedule = {};
                                                t_day_schedule = [];
                                                day_retries++;
                                            } else {
                                                t_section_schedule[day].push(...t_day_schedule);
                                                break;
                                            }
                                        }
                                        if (day_retries === day_max_retries) {
                                            section_deadlock = true;
                                            break;
                                        } else {
                                            section_schedule[day] = day_schedule;
                                        }
                                    }
                                    if (section_deadlock) {
                                        for (const day of class_days) {
                                            if (t_section_schedule[day] !== undefined) {
                                                t_section_schedule[day].forEach((item) => {
                                                    subjects[grade][item.subject.key].add(
                                                        item.subject.value
                                                    );
                                                    _subject_limit[item.section][
                                                        item.subject.value.code
                                                        ]++;
                                                });
                                            }
                                        }
                                        section_retries++;
                                    } else {
                                        break;
                                    }
                                }
                                if (section_retries === section_max_retries) {
                                    grade_deadlock = true;
                                    break;
                                } else {
                                    grade_schedule[section] = section_schedule;
                                }
                            }
                            if (grade_deadlock) {
                                subjects[grade] = copy_subjects(subjects_copy[grade]);
                                grade_schedule = {};
                                _subject_limit = {};
                                grade_retries++;
                            } else {
                                break;
                            }
                        }
                        if (grade_retries === grade_max_retries) {
                            res.send("Grade: " + grade + " Deadlock!");
                            return;
                        } else {
                            _schedule[grade] = grade_schedule;
                        }
                    }

                    let schedule_data = {};
                    for (const grade of grades) {
                        schedule_data[grade] = {};
                        for (const section of class_section[grade]) {
                            for (const id in grade_id_section_map[grade]) {
                                if (id_section_map[id] === section.section) {
                                    schedule_data[grade][id] = {};
                                    for (const day of class_days) {
                                        schedule_data[grade][id][day] = {};
                                        for (let x = 1; x <= subjects_per_day; x++) {
                                            schedule_data[grade][id][day][x] = {};
                                        }
                                    }
                                }
                            }
                        }
                        for (const day of class_days) {
                            for (let x = 1; x <= subjects_per_day; x++) {
                                for (const id in grade_id_section_map[grade]) {
                                    let subject =
                                        _schedule[grade][grade_id_section_map[grade][id]][day][x];
                                    schedule_data[grade][id][day][x] = subject["value"]["code"];
                                }
                            }
                        }
                    }

                    let formatted = {};
                    for (const grade of grades) {
                        formatted[grade] = {sections: [], data: {}};
                        for (const section of class_section[grade]) {
                            formatted[grade]["sections"].push(section.section);
                        }
                        for (const day of class_days) {
                            formatted[grade]["data"][day] = {};
                            for (let x = 1; x <= subjects_per_day; x++) {
                                formatted[grade]["data"][day][x] = {};
                            }
                        }
                        for (const day of class_days) {
                            for (let x = 1; x <= subjects_per_day; x++) {
                                for (const section of class_section[grade]) {
                                    let subject = _schedule[grade][section.section][day][x];
                                    formatted[grade]["data"][day][x][section.section] =
                                        subject["value"]["code"];
                                }
                            }
                        }
                    }
                    let _data = {year: year, data: schedule_data, formatted: formatted};
                    let schedule_db = await Schedule.findOne({where: {year: year}});
                    if (schedule_db !== null) {
                        schedule_db.data = _data["data"];
                        schedule_db.formatted = _data["formatted"];
                        if (data["override"]) {
                            db_state.schedule_generated = false;
                            schedule_db.accepted = false;
                            await db_state.save();
                        }
                        await schedule_db.save();
                    } else {
                        schedule_db = await Schedule.create(_data);
                    }
                    res.render("test", {data: schedule_db.toJSON()["formatted"]});
                }
            } else {
                res.send(db_state);
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400).send("Unable to generate schedule!");
    }
};
exports.GetCurrentYearSchedule = async (req, res, next) => {
    try {
        var year = et.today().toString().split("-")[0];
        const schedule_db = await Schedule.findOne({
            where: {year: year},
        });
        if (schedule_db !== null) {
            let data = schedule_db.toJSON();
            if (data.accepted) {
                res.render("test", {data: JSON.parse(data.formatted)});
            } else {
                res.render("test", {
                    data: JSON.parse(data.formatted),
                    msg: "Current schedule have not been approved yet!",
                });
            }
        } else {
            res.send({Error: "No schedule data create for current year"});
        }
    } catch (error) {
        console.log(error);
        res.status(500);
    }
};
exports.ApproveSchedule = async (req, res, next) => {
    try {
        var year = et.today().toString().split("-")[0];
        const db_state = await DBStatus.findOne({where: {year: year}});

        if (db_state !== null) {
            const schedule_db = await Schedule.findOne({
                where: {year: year},
            });
            if (schedule_db !== null) {
                let data = schedule_db.toJSON();
                if (!data.accepted) {
                    schedule_db.accepted = true;
                    db_state.schedule_generated = true;
                    await db_state.save();
                    await schedule_db.save();
                } else {
                    if (!db_state.schedule_generated) {
                        db_state.schedule_generated = true;
                        await db_state.save();
                    }
                }
                res.send(schedule_db.toJSON());
            } else {
                res.send({Error: "No schedule data created for current year"});
            }
        } else {
            var result = {error: []};
            result["error"]["Error"] = "Current school year not started yet!";
            res.status(400).send(result["error"]);
        }
    } catch (error) {
        console.log(error);
        res.status(500);
    }
};

function copy_subjects(subjects_copy) {
    let data = {};
    for (const key in subjects_copy) {
        data[key] = new Set();
        subjects_copy[key].forEach((subject) => data[key].add(subject));
    }
    return data;
}

function one_per_day(dict, current_period, subject) {
    for (let x = 1; x < current_period; x++) {
        if (dict[x].value.code === subject.code) {
            //logn("\tOne per day");
            return false;
        }
    }
    return true;
}

function is_in_per_week_limit(item) {
    if (item > 0) {
        return true;
    }
    //logn("\tPer week limit! -> " + item);
    return false;
}

function unique_per_mutual(
    subject_key,
    class_id,
    current_day,
    current_period,
    subject,
    grade_schedule,
    id_section_map
) {
    for (const id of subject_key.split(",")) {
        const _id = parseInt(id);
        if (class_id !== _id) {
            if (grade_schedule[id_section_map[id]] !== undefined) {
                if (
                    grade_schedule[id_section_map[id]][current_day][current_period][
                        "value"
                        ]["code"] === subject["code"]
                ) {
                    //logf("\tUnique per mutual");
                    return false;
                }
            }
        }
    }
    return true;
}

/**    Add random students

 const fs = require("fs");
 var ph_num = 930531000;
 fs.readFile('tests/test.txt', 'utf-8', async (err, file) => {
        const lines = file.split('\n');

        for (let line of lines){
          var item = line.trim();
          try {
            var n_data = {
              "email": (item + "xyz@gmail.com"),
              "password": "1234567890",
              "first_name": item,
              "middle_name": "MD",
              "last_name": "AD",
              "sex": item.length > 5 ? "Male" : "Female",
              "phone_num": '0' + (ph_num++),
              'addressId': 1,
              'guardianId': 1,
              "student_id": item + (new Date()).getMilliseconds(),
            };
            const student = await Student.create(n_data);
            const _class = Math.floor(Math.random() * 4) + 9;
            await StudentStatus.create({
              studentId: student.id,
              class: _class,
              year: year,
              status: 0,
            });
          }
          catch (error){
            console.log(error)
          }
        }

      });
 res.send("Done");

 */

/**
 * Can only generate for upto 5 sections and sometimes 6
 * only for one subject : one teacher proportionality
 try {
        var entries = [];
        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.send(result["error"]);
        } else {
            var year = et.today().toString().split("-")[0];

            const db_state = await DBStatus.findOne({where: {year: year}});

            if (
                db_state != null &&
                !db_state.year_complete &&
                !db_state.assign_complete &&
                db_state.class_started &&
                db_state.reg_complete
            ) {
                const grades = [9, 10, 11, 12];
                const class_days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
                const subjects_per_day = 6;

                var subject_grade = {
                    9: new Set(),
                    10: new Set(),
                    11: new Set(),
                    12: new Set(),
                };
                const subjects = await Subject.findAll();
                if (subjects !== null) {
                    for (let subject of subjects) {
                        subject = subject.toJSON();
                        subject_grade[subject.grade].add({
                            subject: subject.name,
                            code: subject.code,
                            cpw: subject.class_per_week,
                            counter: subject.class_per_week,
                        });
                    }
                } else {
                    res.status(400).send({Error: "Subject list empty!"});
                }

                var class_section = {9: [], 10: [], 11: [], 12: []};
                const classes = await Class.findAll();
                if (classes !== null) {
                    for (let _class of classes) {
                        _class = _class.toJSON();
                        class_section[_class.grade].push({
                            section: _class.section,
                            data: null,
                        });
                    }
                } else {
                    res.status(400).send({Error: "Class list empty!"});
                }

                for (var grade of grades) {
                    let _subjects = subject_grade[grade];
                    let _class = class_section[grade];
                    let jj = 0;
                    for (var schedule of _class) {
                        jj++;
                        let section = schedule.section;
                        let data = {};
                        let attempts_for_week = 1;
                        let sw_deadlock = false;
                        while (attempts_for_week < 100) {
                            let subjects = new Set(JSON.parse(JSON.stringify([..._subjects])));
                            sw_deadlock = false;
                            logf("Section: " + section + " Whole Week attempt " + attempts_for_week);
                            logf("************************************************************************");
                            data = {};
                            for (const day of class_days) {
                                let attempts = 0;
                                let daily_schedule = {};
                                while (attempts < 10) {
                                    let deadlock = false;
                                    for (let x = 1; x <= subjects_per_day; x++) {
                                        if (daily_schedule[x] === undefined) {
                                            break;
                                        }
                                        for (let subject of subjects) {
                                            if (daily_schedule[x] === subject.code) {
                                                subject.counter++;
                                            }
                                        }
                                    }
                                    daily_schedule = {};
                                    attempts++;
                                    logf("Date: " + day + " Attempt: " + attempts + " Section: " + section);
                                    for (let x = 1; x <= subjects_per_day; x++) {
                                        let fill = false;
                                        let failed_subs = [];
                                        let last_failed_subject = null;
                                        while (!fill) {
                                            let remaining_count = 0;
                                            subjects.forEach(item => {
                                                if (item.counter > 0) {
                                                    remaining_count++;
                                                }
                                            });
                                            if (failed_subs.length === remaining_count) {
                                                deadlock = true;
                                            }
                                            if (deadlock) {
                                                break;
                                            }
                                            let tempSet = new Set();
                                            subjects.forEach(item => {
                                                if (item.counter > 0) {
                                                    tempSet.add(item)
                                                }
                                            });
                                            let randomItem = getRandomItem(tempSet);
                                            let subject = null;
                                            let exists = false;
                                            subjects.forEach(item => {
                                                if (randomItem.code === item.code) {
                                                    subject = item;
                                                }
                                            });
                                            if(subject.code === last_failed_subject){
                                                logf("Failed item reselected!");
                                                logf("Declined!");
                                                exists = true;
                                            }
                                            if (subject["counter"] > 0) {
                                                let _class = class_section[grade];
                                                for (const _schedule of _class) {
                                                    exists = false;
                                                    let _section = _schedule.section;
                                                    let data = _schedule.data;
                                                    logf("checking: " + subject.code + "  For: " + section + "   :   " + day + "    :   " + x);
                                                    if (section === _section) {
                                                        let z = x;
                                                        while (z >= 1) {
                                                            if (daily_schedule[z] === undefined) {
                                                                z--;
                                                                continue;
                                                            }
                                                            if (daily_schedule[z] === subject.code) {
                                                                exists = true;
                                                                let in_failed = false;
                                                                failed_subs.forEach((item) => {
                                                                    if (subject.code === item) {
                                                                        in_failed = true;
                                                                    }
                                                                });
                                                                if (!in_failed) {
                                                                    failed_subs.push(subject.code);
                                                                }
                                                                break;
                                                            }
                                                            z--;
                                                        }
                                                        break;
                                                    }
                                                    if (data !== null && data[day][x] === subject.code) {
                                                        exists = true;
                                                        let in_failed = false;
                                                        failed_subs.forEach((item) => {
                                                            if (subject.code === item) {
                                                                in_failed = true;
                                                            }
                                                        });
                                                        if (!in_failed) {
                                                            last_failed_subject = subject.code;
                                                            failed_subs.push(subject.code);
                                                        }
                                                        logf("Declined!");
                                                        break;
                                                    } else {
                                                        logf("Pass!")
                                                    }
                                                }

                                                if (!exists) {
                                                    logf("Accepted!");
                                                    daily_schedule[x] = subject.code;
                                                    subject.counter--;
                                                    logf("-----------------------------------------------------------");
                                                    logf(section + "   :   " + day + "    :   " + x);
                                                    logf(subject.code + " : " + subject.counter);
                                                    logf("-----------------------------------------------------------");
                                                    fill = true;
                                                }

                                            }
                                        }
                                        if (deadlock) {
                                            break;
                                        }
                                    }
                                    if (!deadlock) {
                                        break;
                                    }
                                }
                                if (attempts === 10) {
                                    sw_deadlock = true;
                                    attempts_for_week++;
                                    break;
                                }
                                logf("===========================================================");
                                logf(section + "   :   " + day);
                                logf(daily_schedule);
                                logf("===========================================================");
                                data[day] = daily_schedule;
                            }
                            if (!sw_deadlock) {
                                break;
                            }
                        }
                        if (attempts_for_week === 100) {
                            res.send("Generating Schedule Failed!");
                            return;
                        }
                        schedule.data = data;
                        if(jj === 5){
                            //res.send(_class);
                            res.render('test', {data: _class, days: class_days});
                            return;
                        }
                    }
                    console.log(_class);
                }

                res.send(class_section);
            } else {
                res.send(db_state);
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400);
    }
 */

/**

 let write_to_log = true;
 if (write_to_log) {
                    for (const grade of grades) {
                        formatted[grade] = {sections: [], data: {}};
                        for (const section of class_section[grade]) {
                            formatted[grade]['sections'].push(section.section);
                        }
                        for (const day of class_days) {
                            formatted[grade]['data'][day] = {};
                            for (let x = 1; x <= subjects_per_day; x++) {
                                formatted[grade]['data'][day][x] = {}
                            }
                        }
                        logf("Grade: " + grade);
                        logf(
                            "========================================================================================\n\n"
                        );
                        for (const day of class_days) {
                            logf("Day: " + day);
                            logf("----------------------------------------");
                            logn("\t");
                            for (const section of class_section[grade]) {
                                logn("  " + section.section + "\t\t");
                            }
                            logf(
                                "\n------------------------------------------------------------------------------------------------------"
                            );
                            for (let x = 1; x <= subjects_per_day; x++) {
                                logn(x + "\t");
                                for (const section of class_section[grade]) {
                                    let subject = _schedule[grade][section.section][day][x];
                                    formatted[grade]['data'][day][x][section.section] = subject['value']["code"];
                                    logn(_schedule[grade][section.section][day][x]['value']["code"] + "\t");
                                }
                                logn("\n");
                            }
                            logf("----------------------------------------\n");
                        }
                        logf(
                            "========================================================================================\n\n"
                        );
                    }
                }



 */
