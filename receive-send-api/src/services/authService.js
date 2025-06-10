async function login(req, res) {
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
}

async function register(req, res) {
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
}

module.exports = { login, register };