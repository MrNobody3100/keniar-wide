const { verifyToken, parseCookies, COOKIE_NAME } = require("./_auth");

module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  const authenticated = verifyToken(cookies[COOKIE_NAME]);
  res.status(200).json({ authenticated });
};
