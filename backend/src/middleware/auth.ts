import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    let authorizationHeaderToken = req.header("Authorization");

    if (!authorizationHeaderToken) {
      return res.status(403).send("Access Denied: No Token Provided");
    }

    if (authorizationHeaderToken.startsWith("Bearer ")) {
      authorizationHeaderToken = authorizationHeaderToken.slice(7, authorizationHeaderToken.length).trimLeft();
    }

    const jwtSecretKey = process.env.JWT_SECRET as string;
    const decodedTokenPayload = jwt.verify(authorizationHeaderToken, jwtSecretKey);

    (req as any).user = decodedTokenPayload;

    next();
  } catch (authenticationError) {
    return res.status(401).json({ error: "Invalid Token" });
  }
};