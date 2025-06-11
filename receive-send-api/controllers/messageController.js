const express = require("express");
const messageRouter = express.Router();
const { createMessage, messagesWorker, getMessages } = require("../services/messageService");
const { authenticateToken } = require("../middlewares/authMiddleware");

messageRouter.post("/", authenticateToken, createMessage);
messageRouter.get("/", authenticateToken, getMessages);
messageRouter.post('/worker', authenticateToken, messagesWorker);

module.exports = messageRouter;