const express = require("express");
const axios = require("axios");
const redis = require("redis");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const AUTH_API_URL = process.env.AUTH_API_URL || "http://auth-api";
const RECORD_API_URL = process.env.RECORD_API_URL || "http://record-api:5001";
const REDIS_HOST = process.env.REDIS_HOST || "redis_cache";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");

const redisClient = redis.createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

redisClient.on("error", (err) => console.error("Erro no Cliente Redis:", err));
redisClient.on("connect", () => console.log("Conectado ao Redis com sucesso!"));
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("Falha inicial ao conectar ao Redis:", err);
  }
})();

async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null)
    return res.status(401).json({ error: "Token não fornecido." });

  try {
    const response = await axios.get(`${AUTH_API_URL}/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 200 && response.data.user) {
      req.user = response.data.user;
      next();
    } else {
      res
        .status(403)
        .json({ error: "Token inválido ou expirado via Auth-API." });
    }
  } catch (error) {
    console.error(
      "Erro ao validar token com Auth-API:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      return res.status(error.response.status).json({
        error: "Falha na autenticação.",
        details: error.response.data,
      });
    }
    return res.status(500).json({ error: "Erro interno ao validar token." });
  }
}

app.post("/message", authenticateToken, async (req, res) => {
  const { receiver_id, content } = req.body;
  const sender_id = req.user.user_id;

  if (!sender_id || !content) {
    return res
      .status(400)
      .json({ error: "sender_id (do token) e content são obrigatórios." });
  }

  try {
    const recordResponse = await axios.post(`${RECORD_API_URL}/message`, {
      sender_id,
      receiver_id,
      content,
    });

    if (recordResponse.status === 201) {
      if (redisClient.isOpen) {
        try {
          await redisClient.set(
            `last_message_user:${sender_id}`,
            JSON.stringify({
              message_id: recordResponse.data.message_id,
              content,
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
});

app.get("/message", authenticateToken, async (req, res) => {
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
});

app.post("/register", async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_API_URL}/register`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "Erro no proxy para /register na Auth-API:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      return res
        .status(error.response.status)
        .json({ error: "Falha no registro.", details: error.response.data });
    }
    return res
      .status(500)
      .json({ error: "Erro interno no proxy de registro." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_API_URL}/login`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "Erro no proxy para /login na Auth-API:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      return res
        .status(error.response.status)
        .json({ error: "Falha no login.", details: error.response.data });
    }
    return res.status(500).json({ error: "Erro interno no proxy de login." });
  }
});

app.get("/health", async (req, res) => {
  let authApiHealthy = false;
  let recordApiHealthy = false;
  let redisHealthy = false;

  try {
    const authRes = await axios.get(`${AUTH_API_URL}/health`, {
      timeout: 2000,
    });
    if (authRes.status === 200) authApiHealthy = true;
  } catch (e) {
    console.log("Auth-API health check failed");
  }

  try {
    const recordRes = await axios.get(`${RECORD_API_URL}/health`, {
      timeout: 2000,
    });
    if (recordRes.status === 200) recordApiHealthy = true;
  } catch (e) {
    console.log("Record-API health check failed");
  }

  if (redisClient.isOpen) {
    try {
      const pong = await redisClient.ping();
      if (pong === "PONG") redisHealthy = true;
    } catch (e) {
      console.log("Redis PING failed");
    }
  } else {
    console.log("Redis client is not open for health check.");
  }

  res.status(200).json({
    status: "Receive-Send-API UP",
    dependencies: {
      auth_api: authApiHealthy ? "UP" : "DOWN",
      record_api: recordApiHealthy ? "UP" : "DOWN",
      redis: redisHealthy ? "CONNECTED" : "DISCONNECTED_OR_UNHEALTHY",
    },
  });
});

app.listen(PORT, () => {
  console.log(`Receive-Send API rodando na porta ${PORT}`);
  console.log(`Auth API URL: ${AUTH_API_URL}`);
  console.log(`Record API URL: ${RECORD_API_URL}`);
  console.log(`Redis: ${REDIS_HOST}:${REDIS_PORT}`);
});
