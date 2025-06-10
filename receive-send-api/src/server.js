const express = require('express');

const app = express();
app.use(express.json());

const messageController = require('./controller/messageController');
const authController = require('./controller/authController');
const healthController = require('./controller/healthController');

app.use('/message', messageController);
app.use('/', authController);
app.use('/', healthController);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Receive-Send-API rodando na porta ${PORT}`);
});