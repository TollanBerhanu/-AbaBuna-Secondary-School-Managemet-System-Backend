var tools = require("../tools/tools");
var Guardian = require("../../database/models/Guardian");
var Address = require("../../database/models/Address");

/* GET users listing. */
exports.getAll = async (req, res, next) => {
    Guardian.findAll()
    .then(data => {
        res.send(data);
    })
    .catch((error) => console.log(error));
};
exports.getOne = async (req, res, next) => {
    try{
        var entries = ["guardian"];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.status(400).send(result["error"]);
        } else {
            var data = result["data"];
            const guardian = await Guardian.findByPk(data['guardian'], {include: Address});
            if(guardian !== null){
                res.send(guardian.toJSON());
            }
            else{
                result["error"]["guardian"] = "Not found";
                res.send(result["error"]);
            }
        }
    }
    catch(error){
        console.log(error);
        res.status(500);
    }

};