const express = require('express');

const app = express();
app.use(express.json());

const messageController = require('./controllers/messageController');
const authController = require('./controllers/authController');
const healthController = require('./controllers/healthController');

app.use('/message', messageController);
app.use(authController);
app.use('/health', healthController);

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Receive-Send-API rodando na porta ${PORT}`);
});