import { Router } from "express";
import { verifyToken } from "../middleware/auth";
import {
  createBook,
  updateBook,
  getBook,
  getAllBooks,
  getUserBooks,
  searchBooks
} from "../controllers/bookController";

const router = Router();

router.post("/", verifyToken, createBook);
router.put("/:id", verifyToken, updateBook);
router.get("/public", verifyToken, getAllBooks);
router.get("/search", verifyToken, searchBooks);
router.get("/profile/:username", verifyToken, getUserBooks);
router.get("/find/:id", verifyToken, getBook);

export default router;