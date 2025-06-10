async function health(req, res) {
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
}

module.exports = { health };