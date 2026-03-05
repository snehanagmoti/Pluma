import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prismaClient } from "../config/db";

export const registerUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { username, email, password } = req.body;

    const existingUserRecord = await prismaClient.user.findUnique({
      where: { email }
    });

    if (existingUserRecord) {
      return res.status(400).json({ message: "User already exists" });
    }

    const encryptionSalt = await bcrypt.genSalt(10);
    const securedPassword = await bcrypt.hash(password, encryptionSalt);

    const newlyCreatedUser = await prismaClient.user.create({
      data: {
        username,
        email,
        password: securedPassword,
      },
    });

    return res.status(200).json({
      id: newlyCreatedUser.id,
      username: newlyCreatedUser.username,
      email: newlyCreatedUser.email,
      message: "User registered successfully!",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error);
  }
};

export const loginUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    const targetUserRecord = await prismaClient.user.findUnique({
      where: { email },
    });

    if (!targetUserRecord) {
      return res.status(404).json("User not found");
    }

    const isPasswordValidated = await bcrypt.compare(password, targetUserRecord.password);

    if (!isPasswordValidated) {
      return res.status(400).json("Wrong password");
    }

    const jwtSecretKey = process.env.JWT_SECRET as string;
    const accessJSONWebToken = jwt.sign(
      { id: targetUserRecord.id, isAdmin: targetUserRecord.isAdmin },
      jwtSecretKey,
      { expiresIn: "5d" }
    );

    const { password: userPasswordHash, ...publicUserAttributes } = targetUserRecord;

    return res.status(200).json({ ...publicUserAttributes, token: accessJSONWebToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error);
  }
};