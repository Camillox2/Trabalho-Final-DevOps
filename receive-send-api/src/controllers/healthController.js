const express = require("express");
const healthRouter = express.Router();

const { health } = require("../services/healthService");

healthRouter.get("/", health);

module.exports = healthRouter;