var VT = require("./api/verifyToken");

var express = require("express");
var router = express.Router();

var Teacher = require("./api/teachers");
var Student = require("./api/students");
var Address = require("./api/address");
var Score = require("./api/scores");
var ScoreItem = require("./api/scoreItems");
var Class = require("./api/classes");
var Guardian = require("./api/guardian");
var Subject = require("./api/subjects");
var Auth = require("./api/auth");
var Functions = require("./api/functions");

var path = require("path");
var multer = require("multer");

var e_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/employee");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
var s_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/student");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

var d_upload = multer();
var t_upload = multer({ storage: e_storage });
var s_upload = multer({ storage: s_storage });

/* Auth */
router.post("/admin/login", d_upload.none(), Auth.a_login);
router.post("/teacher/login", d_upload.none(), Auth.t_login);
router.post("/student/login", d_upload.none(), Auth.s_login);

/* Teacher */
router.get("/teacher/", VT.VT_Admin, Teacher.getAll);
router.post("/teacher/", VT.VT_Admin, d_upload.none(), Teacher.getOne);
router.post("/teacher/create", VT.VT_Admin, t_upload.single("profile"), Teacher.create);
/* For Teacher */
router.get("/teacher/myclasses", VT.VT_Teacher, Teacher.getClassInfo);
router.get("/teacher/myclass", VT.VT_Teacher, Teacher.getHRClassInfo);
router.post("/teacher/submit/score/2", VT.VT_Teacher, d_upload.none(),Teacher.submitScore);
router.post("/teacher/submit/score", VT.VT_Teacher, d_upload.none(),Teacher.submitScore_ll);

/* Students */
router.get("/student/", VT.VT_Admin , Student.getAll);
router.post("/student/", VT.VT_Admin, d_upload.none(), Student.getOne);
router.post("/student/create", VT.VT_Admin,s_upload.single("profile"), Student.create);

/* For Students */
router.get("/student/me/info", VT.VT_Student , Student.myInfo);
router.get("/student/me/score", VT.VT_Student, Student.myScore);


/* Addresses */
router.get("/address/", VT.VT_Admin,Address.getAll);
router.post("/address/", VT.VT_Admin, d_upload.none(), Address.getOne);

/* Class */
router.post("/class/assign", VT.VT_Admin, d_upload.none(), Functions.AssignStudents);
router.get("/class/assign/approve", VT.VT_Admin, Functions.ApproveAssignation);

router.get("/school/start", VT.VT_Admin, Functions.StartCurrentSchoolYear);
router.get("/school/registration/complete", VT.VT_Admin, Functions.RegistrationComplete);
router.post("/school/schedule/generate", VT.VT_Admin, d_upload.none(), Functions.GenerateSchedule);
router.get("/school/schedule/approve", VT.VT_Admin, Functions.ApproveSchedule);
router.get("/school/class/start", VT.VT_Admin, Functions.StartClass);
router.get("/school/schedule", Functions.GetCurrentYearSchedule);
router.get("/school/end", VT.VT_Admin, Functions.EndCurrentSchoolYear);

router.get("/class/", VT.VT_Admin, Class.getAll);
router.post("/class/", VT.VT_Admin, d_upload.none(), Class.getOne);
router.post("/class/students", VT.VT_Admin, d_upload.none(), Class.getStudents);
router.post("/class/create", VT.VT_Admin,d_upload.none(), Class.create);
router.delete("/class/delete", VT.VT_Admin,d_upload.none(), Class.delete);
router.post("/class/update/hrteacher", VT.VT_Admin, d_upload.none(), Class.setHRTeacher);

/* Guardians */
router.get("/guardian/", VT.VT_Admin, Guardian.getAll);
router.post("/guardian/", VT.VT_Admin, d_upload.none(), Guardian.getOne);

/* Subjects */
router.get("/subject/", VT.VT_Admin, Subject.getAll);
router.post("/subject/", VT.VT_Admin, d_upload.none(), Subject.getOne);
router.post("/subject/create", VT.VT_Admin, d_upload.none(), Subject.create);
router.post("/subject/teacher/set", d_upload.none(), Subject.setTeacher);
router.post("/subject/teacher/unset/subject", VT.VT_Admin, d_upload.none(), Subject.UnsetTeacherSubject);
router.post("/subject/teacher/unset/section", VT.VT_Admin, d_upload.none(), Subject.UnsetTeacherSection);

/* Scores */
router.get("/score/", VT.VT_Admin, Score.getAll);
router.post("/score/", VT.VT_Admin, d_upload.none(), Score.getOne);

/* ScoreItems */
router.get("/scoreitem/", VT.VT_Admin, ScoreItem.getAll);
router.post("/scoreitem/", VT.VT_Admin, d_upload.none(), ScoreItem.getOne);

module["exports"] = router;
