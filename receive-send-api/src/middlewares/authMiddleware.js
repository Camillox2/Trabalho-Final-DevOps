const AUTH_API_URL = process.env.AUTH_API_URL || "http://auth-api";

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

exports.module = { authenticateToken };