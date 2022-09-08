var tools = require("../tools/tools");
var Score = require("../../database/models/Score");

exports.getAll = async (req, res, next) => {
  Score.findAll()
    .then((data) => {
      res.send(data);
    })
    .catch((error) => console.log(error));
};
exports.getOne = async (req, res, next) => {
    try{
        var entries = ["score"];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.status(400).send(result["error"]);
        } else {
            var data = result["data"];
            const score = await Score.findByPk(data['score']);
            if(score !== null){
                res.send(score.toJSON());
            }
            else{
                result["error"]["score"] = "Not found";
                res.send(result["error"]);
            }
        }
    }
    catch(error){
        console.log(error);
        res.status(500).send("Internal Server Error");
    }

};