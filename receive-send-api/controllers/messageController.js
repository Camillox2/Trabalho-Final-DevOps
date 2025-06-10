const express = require("express");
const messageRouter = express.Router();
const { createMessage, getMessages } = require("../services/messageService");
const { authenticateToken } = require("../middlewares/authMiddleware");

messageRouter.post("/", createMessage);
messageRouter.get("/", getMessages);

module.exports = messageRouter;