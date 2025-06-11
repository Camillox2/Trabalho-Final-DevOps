require('dotenv').config();
const amqp = require('amqplib');

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'amqp://rabbitmq:5672';
const MESSAGE_QUEUE = 'chat_messages_queue';

let connection = null;
let channel = null;

async function connectRabbitMQ() {
    try {
        if (connection && channel) {
            console.log('RabbitMQ: Já conectado e canal existente.');
            return;
        }

        console.log(`RabbitMQ: Conectando a ${RABBITMQ_HOST}...`);
        connection = await amqp.connect(RABBITMQ_HOST);

        connection.on('error', (err) => {
            console.error('RabbitMQ Connection Error:', err.message);
            if (connection && connection.isOpen) {
                setTimeout(connectRabbitMQ, 5000);
            } else {
                console.error('RabbitMQ: Conexão fechada. Tentando reconectar...');
                setTimeout(connectRabbitMQ, 5000);
            }
        });

        connection.on('close', () => {
            console.warn('RabbitMQ: Conexão fechada. Tentando reconectar...');
            connection = null;
            channel = null;
            setTimeout(connectRabbitMQ, 5000);
        });

        channel = await connection.createChannel();
        await channel.assertQueue(MESSAGE_QUEUE, {
            durable: true
        });

        console.log(`RabbitMQ: Conectado e fila '${MESSAGE_QUEUE}' assertada.`);
    } catch (err) {
        console.error('RabbitMQ: Falha ao conectar ou assertar fila:', err.message);
        setTimeout(connectRabbitMQ, 5000);
    }
}

async function publishMessage(messageData) {
    if (!channel) {
        console.error('RabbitMQ: Canal não está disponível. Tentando reconectar...');
        await connectRabbitMQ();
        if (!channel) {
            throw new Error('RabbitMQ: Falha ao conectar ao canal para publicar mensagem.');
        }
    }
    
    try {
        const messageBuffer = Buffer.from(JSON.stringify(messageData));
        channel.sendToQueue(MESSAGE_QUEUE, messageBuffer, {
            persistent: true
        });
        console.log('RabbitMQ: Mensagem publicada na fila:', messageData);
    } catch (err) {
        console.error('RabbitMQ: Erro ao publicar mensagem:', err.message);
        
        channel = null;
        connection = null;
        throw err;
    }
}

module.exports = {
    connectRabbitMQ,
    publishMessage
};
