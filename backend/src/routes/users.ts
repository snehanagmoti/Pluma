import { Router } from "express";
import { verifyToken } from "../middleware/auth";
import {
    toggleLibrary,
    getLibrary,
    updateUser,
    getRecommendations
} from "../controllers/userController";

const router = Router();

console.log("✅ User Routes File is Loading...");

// 1. Get Recommendations - Protected
router.get("/:id/recommendations", verifyToken, getRecommendations);

// 2. Update User Profile - Protected
router.put("/:id", verifyToken, updateUser);

// 3. Update Library (Add/Remove) - Protected
router.put("/:id/library", verifyToken, toggleLibrary);

// 4. Get Library Content - Protected
router.get("/:id/library", verifyToken, getLibrary);

export default router;