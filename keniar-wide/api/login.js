const { createToken, setSessionCookie } = require("./_auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      body = {};
    }
  }

  const { username, password } = body || {};
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    res.status(500).json({ ok: false, error: "Admin credentials are not configured on the server." });
    return;
  }

  if (username === expectedUsername && password === expectedPassword) {
    setSessionCookie(res, createToken());
    res.status(200).json({ ok: true });
    return;
  }

  res.status(401).json({ ok: false, error: "Identifiant ou mot de passe incorrect." });
};
