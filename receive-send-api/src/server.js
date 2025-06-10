const express = require('express');
const { connectRabbitMQ } = require('./utils/rabbitmq');

const app = express();

const messageController = require('./controller/messageController');

app.use(express.json());
connectRabbitMQ();

app.use('/message', messageController);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Receive-Send-API rodando na porta ${PORT}`);
});