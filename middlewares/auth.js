const jwt = require("jsonwebtoken");

// Middleware function for verifying JWT token for rider
const verifyRiderToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  console.log(token);

  try {
    // Verify and decode the token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.riderID = decoded.rider_id;
    next();
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

// Middleware function for verifying JWT token for driver
const verifyDriverToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  console.log(token);

  try {
    // Verify and decode the token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.driverID = decoded.driver_id;
    next();
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

module.exports = { verifyRiderToken, verifyDriverToken };
