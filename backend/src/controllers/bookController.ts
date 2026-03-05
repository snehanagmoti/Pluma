import { Request, Response } from "express";
import axios from "axios";
import { prismaClient } from "../config/db";

export const createBook = async (req: Request, res: Response): Promise<any> => {
  const { genres, ...otherBookData } = req.body;

  if (!genres || genres.length === 0) {
    return res.status(400).json("At least one genre is required.");
  }

  try {
    const createdBookRecord = await prismaClient.book.create({
      data: {
        ...otherBookData,
        genres: genres,
      },
    });

    try {
      await axios.post("http://localhost:8000/refresh");
      console.log("✅ AI Service notified: Data refreshed.");
    } catch (aiRefreshError: any) {
      console.error("⚠️ AI Refresh Warning:", aiRefreshError.message);
    }

    return res.status(200).json(createdBookRecord);
  } catch (databaseError) {
    return res.status(500).json(databaseError);
  }
};

export const updateBook = async (req: Request, res: Response): Promise<any> => {
  try {
    const targetBookId = req.params.id as string;
    const requestingUserId = req.body.userId;

    const existingBookRecord = await prismaClient.book.findUnique({
      where: { id: targetBookId },
    });

    if (!existingBookRecord) {
      return res.status(404).json("Book not found");
    }

    if (existingBookRecord.userId === requestingUserId) {
      await prismaClient.book.update({
        where: { id: targetBookId },
        data: req.body,
      });
      return res.status(200).json("The book has been updated");
    } else {
      return res.status(403).json("You can only update your own book!");
    }
  } catch (databaseError) {
    return res.status(500).json(databaseError);
  }
};

export const getBook = async (req: Request, res: Response): Promise<any> => {
  try {
    const targetBookId = req.params.id as string;
    const retrievedBookRecord = await prismaClient.book.findUnique({
      where: { id: targetBookId },
    });

    if (!retrievedBookRecord) {
      return res.status(404).json("Book not found");
    }

    return res.status(200).json(retrievedBookRecord);
  } catch (databaseError) {
    return res.status(500).json(databaseError);
  }
};

export const getAllBooks = async (req: Request, res: Response): Promise<any> => {
  try {
    const publicBookCollection = await prismaClient.book.findMany({
      where: { privacy: "public" },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(publicBookCollection);
  } catch (databaseError) {
    return res.status(500).json(databaseError);
  }
};

export const getUserBooks = async (req: Request, res: Response): Promise<any> => {
  try {
    const targetAuthorName = req.params.username as string;

    const authorBookCollection = await prismaClient.book.findMany({
      where: {
        authorName: targetAuthorName,
        privacy: "public"
      },
    });

    return res.status(200).json(authorBookCollection);
  } catch (databaseError) {
    return res.status(500).json(databaseError);
  }
};

export const searchBooks = async (req: Request, res: Response): Promise<any> => {
  const searchQuery = req.query.q as string;
  const searchType = req.query.type as string;

  if (!searchQuery) {
    return res.status(400).json("Search query is required.");
  }

  try {
    let matchingBookCollection;

    if (searchType === "author") {
      matchingBookCollection = await prismaClient.book.findMany({
        where: {
          authorName: { contains: searchQuery, mode: "insensitive" },
          privacy: "public",
        },
      });
    } else if (searchType === "genre") {
      matchingBookCollection = await prismaClient.book.findMany({
        where: {
          genres: { has: searchQuery.toLowerCase() },
          privacy: "public",
        },
      });
    } else {
      matchingBookCollection = await prismaClient.book.findMany({
        where: {
          title: { contains: searchQuery, mode: "insensitive" },
          privacy: "public",
        },
      });
    }

    return res.status(200).json(matchingBookCollection);
  } catch (databaseError) {
    return res.status(500).json(databaseError);
  }
};