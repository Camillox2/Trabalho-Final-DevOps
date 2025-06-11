require('dotenv').config();
const axios = require("axios");
const redisClient = require('../utils/redisClient');
const rabbitMQClient = require('../utils/rabbitmqClient');

const RECORD_API_URL = process.env.RECORD_API_URL || "http://record-api:5001"; // Ainda usado por getMessages

async function createMessage(req, res) {
    const { userIdSend, userIdReceive, message } = req.body;

    if (!userIdSend || !message) {
        console.error("Validation failed: userIdSend missing or message is not a string.");
        return res
            .status(400)
            .json({ error: "userIdSend (do token) e message (string) são obrigatórios." });
    }

    try {
        const messageData = {
            sender_id: userIdSend,
            receiver_id: userIdReceive,
            message: message,
            timestamp: new Date().toISOString()
        };

        await rabbitMQClient.publishMessage(messageData);

        if (redisClient.isOpen) {
            try {
                const channelKey = `channel:${userIdSend}:${userIdReceive || 'general'}`;
                await redisClient.rPush(channelKey, JSON.stringify(messageData));
                
                await redisClient.set(
                    `last_message_user:${userIdSend}`,
                    JSON.stringify({
                        message_id: 'pending_via_queue',
                        message: messageData.message,
                        timestamp: messageData.timestamp,
                    })
                );
            } catch (redisErr) {
                console.error("Erro ao salvar no Redis após publicar no RabbitMQ:", redisErr);
            }
        }

        res.status(202).json({
            message: "Mensagem enviada para a fila",
            details: {
                status: "queued",
                timestamp: messageData.timestamp,
            },
        });

    } catch (caughtError) {
        console.error("Erro capturado em createMessage. Detalhes completos do erro:", caughtError);
        
        let errorMessage = "Erro interno ao processar mensagem.";
        if (caughtError && typeof caughtError === 'object' && caughtError.message) {
            errorMessage = caughtError.message;
        } else if (typeof caughtError === 'string') {
            errorMessage = caughtError;
        }
        
        return res
            .status(500)
            .json({ error: errorMessage + ". Tente novamente mais tarde." });
    }
}

async function getMessages(req, res) {
    const userId = req.user ? req.user.user_id : null;
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

async function messagesWorker(req, res) {
    if (!redisClient.isOpen) {
        return { success: false, error: "Redis não está conectado." };
    }

    const { userIdSend, userIdReceive } = req.body;

    const channelKey = `channel:${userIdSend}:${userIdReceive || 'general'}`; 
    
    try {
        const messagesRaw = await redisClient.lRange(channelKey, 0, -1);
        
        if (messagesRaw.length === 0) {
            console.log(`Nenhuma mensagem encontrada no canal ${channelKey} para transferência.`);
            return { success: true, message: "Nenhuma mensagem para transferir." };
        }

        for (const msgRaw of messagesRaw) {
            try {
                const messageData = JSON.parse(msgRaw);
                await rabbitMQClient.publishMessage(messageData);
            } catch (parseError) {
                return res.status(400).json({ message: `Erro ao parsear mensagem do Redis para o canal: ${error.message}` });
            }
        }

        await redisClient.del(channelKey);
        return res.status(200).json({ message: 'Mensagens transferidas com sucesso e canal limpo.' });

    } catch (error) {
        console.error("Erro ao transferir mensagens do canal via Redis/RabbitMQ:", error.message);
        return res.status(400).json({ message: `Erro ao transferir mensagens do canal: ${error.message}` });
    }
}

module.exports = { createMessage, getMessages, messagesWorker };
