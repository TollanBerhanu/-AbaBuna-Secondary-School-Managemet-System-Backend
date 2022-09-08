var Address = require("../../database/models/Address");
var tools = require("../tools/tools");

exports.getAll = async (req, res, next) => {
  Address.findAll()
    .then((data) => {
      res.send(data);
    })
    .catch((error) => console.log(error));
};

exports.getOne = async (req, res, next) => {
    try{
        var entries = ["address"];

        var result = tools.filter(Object.entries(req.body), entries);

        if (result["errorCount"] > 0) {
            res.status(400).send(result["error"]);
        } else {
            var data = result["data"];
            const address = await Address.findByPk(data['address']);
            if(address !== null){
                res.send(address.toJSON());
            }
            else{
                result["error"]["address"] = "Not found";
                res.send(result["error"]);
            }
        }
    }
    catch(error){
        console.log(error);
        res.status(500);
    }

};
