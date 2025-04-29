import jwt from "jsonwebtoken";

export const authenticate = async (req, res, next) => {
  const authToken = req.headers.authorization;
  if (!authToken || !authToken.startsWith("Bearer")) {
    return res.status(401).json({ status: "fail", message: "authorization Bearer Token is not valid" });
  }
  try {
    const token = authToken.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded._id;
    req.role = decoded.role;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, message: "Token is Expired" });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const userType = async (req, res, next) => {
  const user = req.headers["user-type"];
  try {
    if(user !== "customer" && user !== "supplier" && user !== "deliveryBoy" && user !== "admin"){
      return res.status(400).json({ success: false, message: "user-type must be customer, supplier, deliveryBoy or admin" });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "user-type must be customer, supplier, deliveryBoy or admin" });
  }
};
