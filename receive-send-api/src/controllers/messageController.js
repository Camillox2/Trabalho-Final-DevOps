const express = require("express");
const messageRouter = express.Router();
const { createMessage, getMessages } = require("../services/messageService");
const { authenticateToken } = require("../middlewares/authMiddleware");

messageRouter.post("/", authenticateToken, createMessage);
messageRouter.get("/messages", authenticateToken, getMessages);

module.exports = messageRouter;