const jwt = require("jsonwebtoken");

// Middleware function for verifying JWT token for rider
const verifyRiderToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.riderID = decoded.rider_id;
    next();
  });
};

// Middleware function for verifying JWT token for driver
const verifyDriverToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.driverID = decoded.driver_id;
    next();
  });
};

module.exports = { verifyRiderToken, verifyDriverToken };
