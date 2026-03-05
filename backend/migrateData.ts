import mongoose from "mongoose";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const postgresPool = new Pool({ connectionString: process.env.DATABASE_URL });
const prismaAdapter = new PrismaPg(postgresPool);

const prismaClient = new PrismaClient({ adapter: prismaAdapter });
const mongoUri = process.env.MONGO_URI as string;

const fallbackUserSchema = new mongoose.Schema({}, { strict: false });
const fallbackBookSchema = new mongoose.Schema({}, { strict: false });

const MongoUserModel = mongoose.model("User", fallbackUserSchema, "users");
const MongoBookModel = mongoose.model("Book", fallbackBookSchema, "books");

async function executeDataMigration() {
    console.log("Connecting to databases...");
    await mongoose.connect(mongoUri);

    console.log("Fetching and migrating Users...");
    const mongoUsers = await MongoUserModel.find().lean();
    const userPayloads = (mongoUsers as any[]).map((mongoUser: any) => ({
        id: mongoUser._id.toString(),
        username: mongoUser.username,
        email: mongoUser.email,
        password: mongoUser.password,
        profilePicture: mongoUser.profilePicture || "",
        coverPicture: mongoUser.coverPicture || "",
        isPrivate: mongoUser.isPrivate || false,
        isAdmin: mongoUser.isAdmin || false,
        desc: mongoUser.desc || "",
        city: mongoUser.city || "",
        from: mongoUser.from || "",
    }));

    await prismaClient.user.createMany({
        data: userPayloads,
        skipDuplicates: true,
    });

    const migratedUsers = await prismaClient.user.findMany({ select: { id: true } });
    const validUserIds = new Set(migratedUsers.map((user: any) => user.id));

    console.log("Fetching and migrating Books...");
    const mongoBooks = await MongoBookModel.find().lean();
    const bookPayloads = [];

    for (const mongoBook of mongoBooks as any[]) {
        if (mongoBook.userId && validUserIds.has(mongoBook.userId.toString())) {
            bookPayloads.push({
                id: mongoBook._id.toString(),
                userId: mongoBook.userId.toString(),
                authorName: mongoBook.authorName,
                title: mongoBook.title,
                desc: mongoBook.desc || "",
                genres: mongoBook.genres || [],
                cover: mongoBook.cover || "https://via.placeholder.com/150",
                privacy: mongoBook.privacy || "private",
                rating: mongoBook.rating || 0,
                year: mongoBook.year || null,
                isbn: mongoBook.isbn || null,
                pages: mongoBook.pages || null,
            });
        }
    }

    await prismaClient.book.createMany({
        data: bookPayloads,
        skipDuplicates: true,
    });

    console.log("Migration Complete! Check Prisma Studio.");

    await mongoose.disconnect();
    await prismaClient.$disconnect();
}

executeDataMigration();