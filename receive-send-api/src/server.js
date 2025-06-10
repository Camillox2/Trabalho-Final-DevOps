const express = require('express');

const app = express();
app.use(express.json());

const messageController = require('./controllers/messageController');
const authController = require('./controllers/authController');
const healthController = require('./controllers/healthController');

app.use('/messages', messageController);
app.use('/', authController);
app.use('/', healthController);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Receive-Send-API rodando na porta ${PORT}`);
});