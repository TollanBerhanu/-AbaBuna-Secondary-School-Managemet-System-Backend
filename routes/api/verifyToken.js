const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const config = process.env;

exports.VT_Admin = async (req, res, next) => {
    const token =
        req.body.token || req.query.token || req.headers["x-access-token"];


    if (!token) {
        return res.status(403).send("A token is required for authentication");
    }
    try {
        req.user = await promisify(jwt.verify)(token, config.JWT_SECRET);
        if(req.user.type !== 'admin'){
            throw jwt.JsonWebTokenError;
        }
    } catch (err) {
        console.log(err);
        return res.status(401).send("Invalid Token");
    }
    return next();
};
exports.VT_Student = async (req, res, next) => {
    const token =
        req.body.token || req.query.token || req.headers["x-access-token"];


    if (!token) {
        return res.status(403).send("A token is required for authentication");
    }
    try {
        req.user = await promisify(jwt.verify)(token, config.JWT_SECRET);
        if(req.user.type !== 'student'){
            throw jwt.JsonWebTokenError;
        }
    } catch (err) {
        console.log(err);
        return res.status(401).send("Invalid Token");
    }
    return next();
};
exports.VT_Teacher = async (req, res, next) => {
    const token =
        req.body.token || req.query.token || req.headers["x-access-token"];


    if (!token) {
        return res.status(403).send("A token is required for authentication");
    }
    try {
        req.user = await promisify(jwt.verify)(token, config.JWT_SECRET);
        console.log(req.user);
        if(req.user.type !== 'teacher'){
            throw jwt.JsonWebTokenError;
        }
    } catch (err) {
        console.log(err);
        return res.status(401).send("Invalid Token");
    }
    return next();
};
