const express = require("express");
const authRouter = express.Router();

const { login, register } = require("../services/authService");

authRouter.post("/login", login);
authRouter.post("/register", register);

module.exports = authRouter;