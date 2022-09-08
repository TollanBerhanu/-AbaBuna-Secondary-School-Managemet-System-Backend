var EC = require("ec.js");
var et = EC.instance("ethiopian");

module["exports"] = {
  filter: function (reqData, entries) {
    let errorCount = 0;
    let error = {};
    var obj = {};
    for (let [key, value] of reqData) {
      obj[key] = value;
    }
    var data = {};
    for (const x in entries) {
      if (!obj[entries[x]]) {
        error[entries[x]] = "Can not be empty";
        errorCount++;
      } else {
        data[entries[x]] = obj[entries[x]];
      }
    }

    return { errorCount: errorCount, error: error, data: data };
  },
  generateId: function (prefix, id, year) {
    let _id = id.toString().padStart(6, "0");

    console.log("String: " + _id);
    let _year = year.toString().substring(2);
    let st_id = "";
    for (const x of _id) {
      switch (parseInt(x)) {
        case 0: {
          st_id += "A";
          break;
        }
        case 1: {
          st_id += "1";
          break;
        }
        case 2: {
          st_id += "C";
          break;
        }
        case 3: {
          st_id += "3";
          break;
        }
        case 4: {
          st_id += "E";
          break;
        }
        case 5: {
          st_id += "5";
          break;
        }
        case 6: {
          st_id += "I";
          break;
        }
        case 7: {
          st_id += "U";
          break;
        }
        case 8: {
          st_id += "O";
          break;
        }
        case 9: {
          st_id += "9";
          break;
        }
        default: {
          st_id += "0";
          break;
        }
      }
    }
    st_id += _year;
    return prefix + st_id;
  },
  currentYear: function () {
    return et.today().toString().split("-")[0];
  },
};
