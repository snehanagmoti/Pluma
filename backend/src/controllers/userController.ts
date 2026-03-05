import { Request, Response } from "express";
import bcrypt from "bcrypt";
import axios from "axios";
import { prismaClient } from "../config/db";

const executeAIRecommendationUpdate = async (targetUserId: string, activeLibraryIds: string[]): Promise<void> => {
  try {
    const aiPredictionResponse = await axios.post("http://localhost:8000/recommend", {
      book_ids: activeLibraryIds,
    });

    if (aiPredictionResponse.data.recommendations) {
      const formattedRecommendationRelations = aiPredictionResponse.data.recommendations.map((bookId: string) => ({
        id: bookId,
      }));

      await prismaClient.user.update({
        where: { id: targetUserId },
        data: {
          recommendedBooks: {
            set: formattedRecommendationRelations,
          },
        },
      });
    }
  } catch (aiExecutionError: any) {
    console.error(aiExecutionError.message);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<any> => {
  const targetUserId = req.params.id as string;
  const requestingUserId = req.body.userId as string;
  const isRequestingUserAdmin = (req as any).user?.isAdmin;

  if (requestingUserId === targetUserId || isRequestingUserAdmin) {
    if (req.body.password) {
      try {
        const encryptionSalt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, encryptionSalt);
      } catch (encryptionError) {
        return res.status(500).json(encryptionError);
      }
    }

    try {
      const updatedUserRecord = await prismaClient.user.update({
        where: { id: targetUserId },
        data: req.body,
      });

      return res.status(200).json(updatedUserRecord);
    } catch (databaseError) {
      return res.status(500).json(databaseError);
    }
  } else {
    return res.status(403).json("You can only update your own account!");
  }
};

export const toggleLibrary = async (req: Request, res: Response): Promise<any> => {
  const targetUserId = req.params.id as string;
  const requestingUserId = req.body.userId as string;
  const targetBookId = req.body.bookId as string;

  if (requestingUserId !== targetUserId) {
    return res.status(403).json("You can only update your own library!");
  }

  try {
    const targetUserRecord = await prismaClient.user.findUnique({
      where: { id: targetUserId },
      include: {
        library: {
          select: { id: true },
        },
      },
    });

    if (!targetUserRecord) {
      return res.status(404).json("User not found");
    }

    const isBookCurrentlyInLibrary = targetUserRecord.library.some(
      (bookRecord) => bookRecord.id === targetBookId
    );

    let activeLibraryIds = targetUserRecord.library.map((bookRecord) => bookRecord.id);

    if (!isBookCurrentlyInLibrary) {
      await prismaClient.user.update({
        where: { id: targetUserId },
        data: {
          library: {
            connect: { id: targetBookId },
          },
        },
      });

      activeLibraryIds.push(targetBookId);

      res.status(200).json("Book has been added to your library");

      executeAIRecommendationUpdate(targetUserId, activeLibraryIds);
    } else {
      await prismaClient.user.update({
        where: { id: targetUserId },
        data: {
          library: {
            disconnect: { id: targetBookId },
          },
        },
      });

      activeLibraryIds = activeLibraryIds.filter((id) => id !== targetBookId);

      res.status(200).json("Book has been removed from your library");

      executeAIRecommendationUpdate(targetUserId, activeLibraryIds);
    }
  } catch (databaseError) {
    return res.status(500).json(databaseError);
  }
};

export const getLibrary = async (req: Request, res: Response): Promise<any> => {
  const targetUserId = req.params.id as string;

  try {
    const targetUserRecord = await prismaClient.user.findUnique({
      where: { id: targetUserId },
      include: { library: true },
    });

    if (!targetUserRecord) {
      return res.status(404).json("User not found");
    }

    return res.status(200).json(targetUserRecord.library);
  } catch (databaseError) {
    return res.status(500).json(databaseError);
  }
};

export const getRecommendations = async (req: Request, res: Response): Promise<any> => {
  const targetUserId = req.params.id as string;

  try {
    const targetUserRecord = await prismaClient.user.findUnique({
      where: { id: targetUserId },
      include: { recommendedBooks: true },
    });

    if (!targetUserRecord) {
      return res.status(404).json("User not found");
    }

    return res.status(200).json(targetUserRecord.recommendedBooks);
  } catch (databaseError) {
    return res.status(500).json(databaseError);
  }
};