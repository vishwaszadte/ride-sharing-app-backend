const jwt = require("jsonwebtoken");

const generateToken = (payload) => {
  // Generate a new JWT token with the payload
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

  return token;
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the JWT token and extract the payload
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the token is about to expire (e.g., within the next 10 minutes)
    const now = Date.now().valueOf() / 1000;
    const exp = payload.exp;
    const timeUntilExpiration = exp - now;

    if (timeUntilExpiration < 600) {
      // If token is about to expire (within 10 minutes)
      // Generate a new token with the payload and send it back to the client
      const newToken = generateToken(payload);
      res.set("Authorization", `Bearer ${newToken}`);
    }

    req.user = payload; // Attach the payload to the request object
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = authMiddleware;
