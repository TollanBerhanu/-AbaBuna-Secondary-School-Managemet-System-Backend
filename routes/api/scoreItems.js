var tools = require("../tools/tools");
var ScoreItem = require("../../database/models/ScoreItem");

/* GET users listing. */
exports.getAll = async (req, res, next) => {
    ScoreItem.findAll()
    .then(data => {
        res.send(data);
    })
    .catch((error) => console.log(error));
};

exports.getOne = async (req, res, next) => {
    try{
        var entries = ["scoreitem"];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.status(400).send(result["error"]);
        } else {
            var data = result["data"];
            const scoreitem = await ScoreItem.findByPk(data['scoreitem']);
            if(scoreitem !== null){
                res.send(scoreitem.toJSON());
            }
            else{
                result["error"]["Score item"] = "Not found";
                res.send(result["error"]);
            }
        }
    }
    catch(error){
        console.log(error);
        res.status(500);
    }

};