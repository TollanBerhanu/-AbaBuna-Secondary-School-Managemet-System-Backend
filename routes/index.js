var express = require('express');
var Score = require('../database/models/Score');
var router = express.Router();
const tools = require("./tools/tools");

/* GET home page. */
router.get('/', async (req, res, next) =>{
    res.render('index');
    //res.send(tools.generateId("AB", 395423, 2014));
});

module["exports"] = router;
