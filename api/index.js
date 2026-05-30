const adminHandler = require("./admin");
const webhookHandler = require("./webhook");

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  // Route to handlers
  if (path === "/webhook" || path.startsWith("/api/webhook")) {
    return webhookHandler(req, res);
  }
  if (path.startsWith("/api/admin")) {
    return adminHandler(req, res);
  }
  if (path === "/api/ping" || path === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, status: "running", version: "1.0.0" }));
  }

  // Default: 404
  res.writeHead(404, { "Content-Type": "application/json" });
  return res.end(JSON.stringify({ error: "Not found" }));
};
