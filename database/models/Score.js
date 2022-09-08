const Sequelize = require("sequelize");
const db = require("../config/database");

const Score = db.define("score", {
  stStatusId: {
    type: Sequelize.BIGINT,
  },
  semester: {
    type: Sequelize.INTEGER,
  },
  conduct: {
    type: Sequelize.STRING,
  },
  absence: {
    type: Sequelize.INTEGER,
  },
  comment: {
    type: Sequelize.STRING,
  },
  complete: {
    type: Sequelize.BOOLEAN,
  },
});

module["exports"] = Score;
