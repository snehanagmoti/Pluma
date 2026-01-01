const jwt = require("jsonwebtoken");

const verifyToken = async (req, res, next) => {
  try {
    // 1. Get the token from the header
    let token = req.header("Authorization");

    if (!token) {
      return res.status(403).send("Access Denied: No Token Provided");
    }

    // Remove "Bearer " prefix if it exists
    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length).trimLeft();
    }

    // 2. Verify the token
    const verified = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    
    // 3. Attach user info to the request object
    req.user = verified;
    
    // 4. Move to the next function
    next();
    
  } catch (err) {
    res.status(401).json({ error: "Invalid Token" });
  }
};

module.exports = { verifyToken };