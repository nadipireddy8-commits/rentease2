const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    // 1️⃣ Get Authorization header
    const authHeader = req.headers.authorization;
    console.log("AUTH HEADER:",authHeader);

    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. No token provided."
      });
    }

    // 2️⃣ Check format: Bearer <token>
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Invalid token format."
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        message: "Token missing."
      });
    }

    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Attach user to request
    req.user = decoded;

    next();

  } catch (error) {
    console.log("Auth error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
};