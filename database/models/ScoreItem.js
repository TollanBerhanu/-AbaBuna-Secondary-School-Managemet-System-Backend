const Sequelize = require("sequelize");
const db = require("../config/database");

const ScoreItem = db.define("score_item", {
  scoreId: {
    type: Sequelize.BIGINT,
  },
  subjectId: {
    type: Sequelize.BIGINT,
  },
  data: {
    type: Sequelize.JSON,
  },
  complete: {
    type: Sequelize.BOOLEAN,
  },
  incomplete: {
    type: Sequelize.BOOLEAN,
  },
});

module["exports"] = ScoreItem;
