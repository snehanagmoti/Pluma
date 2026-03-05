import { Router } from "express";
import { verifyToken } from "../middleware/auth";
import { getUsers } from "../controllers/userController";

const router = Router();

// Definition: When a GET request comes to '/', check token first, then run getUsers
router.get("/", verifyToken, getUsers);

export default router;