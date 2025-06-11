require('dotenv').config();
const axios = require("axios");
const redisClient = require('../utils/redisClient');

const RECORD_API_URL = process.env.RECORD_API_URL || "http://record-api:5001";

async function createMessage(req, res) {
  const { userIdReceive, userIdSend, message } = req.body;

  if (!userIdSend || !message) {
    return res
      .status(400)
      .json({ error: "userIdSend (do token) e message são obrigatórios." });
  }

  try {
    const recordResponse = await axios.post(`${RECORD_API_URL}/message`, {
      sender_id: userIdSend,
      receiver_id: userIdReceive,
      message: message,
    });

    if (recordResponse.status === 201) {
      if (redisClient.isOpen) {
        try {
          await redisClient.set(
            `last_message_user:${userIdSend}`,
            JSON.stringify({
              message_id: recordResponse.data.message_id,
              message,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (redisErr) {
          console.error("Erro ao salvar no Redis:", redisErr);
        }
      }
      res.status(201).json({
        message: "Mensagem enviada e gravada com sucesso!",
        details: recordResponse.data,
      });
    } else {
      res.status(recordResponse.status).json({
        error: "Falha ao gravar mensagem na Record-API.",
        details: recordResponse.data,
      });
    }
  } catch (error) {
    console.error(
      "Erro ao enviar mensagem para Record-API:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      return res.status(error.response.status).json({
        error: "Erro ao processar mensagem.",
        details: error.response.data,
      });
    }
    return res
      .status(500)
      .json({ error: "Erro interno no servidor ao enviar mensagem." });
  }
}

async function getMessages(req, res) {
    const userId = req.user.user_id;
  if (!userId) {
    return res.status(400).json({
      error: "Não foi possível identificar o usuário para buscar mensagens.",
    });
  }

  try {
    const response = await axios.get(`${RECORD_API_URL}/message`, {
      params: { userId },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "Erro ao consultar mensagens na Record-API:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      return res.status(error.response.status).json({
        error: "Erro ao buscar mensagens.",
        details: error.response.data,
      });
    }
    return res
      .status(500)
      .json({ error: "Erro interno no servidor ao buscar mensagens." });
  }
}

module.exports = { createMessage, getMessages } 