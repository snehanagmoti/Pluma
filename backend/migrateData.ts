import mongoose from "mongoose";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
const pgAdapter = new PrismaPg(pgPool);
const prismaClientInstance = new PrismaClient({ adapter: pgAdapter });
const mongoDatabaseUri = process.env.MONGO_URI as string;

const fallbackSchema = new mongoose.Schema({}, { strict: false });
const MongoBookModel = mongoose.model("Book", fallbackSchema, "books");

async function executeDataMigration() {
    console.log("Connecting to databases...");
    await mongoose.connect(mongoDatabaseUri);

    const archiveUser = await prismaClientInstance.user.upsert({
        where: { username: "system_archive" },
        update: {},
        create: {
            username: "system_archive",
            email: "archive@system.local",
            password: "secure_placeholder",
            isPrivate: false,
            isAdmin: true,
        }
    });

    const activeUsers = await prismaClientInstance.user.findMany();
    const validUserIds = new Set(activeUsers.map(user => user.id));
    const usernameToIdMap = new Map(activeUsers.map(user => [user.username, user.id]));

    const mongoBooksData = await MongoBookModel.find().lean();
    console.log(`Found ${mongoBooksData.length} books in MongoDB.`);

    let successfullyMigratedCount = 0;
    let skippedDuplicateCount = 0;

    for (const mongoBookRecord of mongoBooksData as any[]) {
        const rawUserIdString = mongoBookRecord.userId?.toString();
        let targetPostgresUserId = archiveUser.id;

        if (validUserIds.has(rawUserIdString)) {
            targetPostgresUserId = rawUserIdString;
        } else if (usernameToIdMap.has(rawUserIdString)) {
            targetPostgresUserId = usernameToIdMap.get(rawUserIdString)!;
        }

        const formattedChaptersData = mongoBookRecord.chapters && Array.isArray(mongoBookRecord.chapters)
            ? mongoBookRecord.chapters.map((chapterRecord: any) => ({
                title: chapterRecord.title || "Untitled",
                content: chapterRecord.content || ""
              }))
            : [];

        try {
            await prismaClientInstance.book.create({
                data: {
                    id: mongoBookRecord._id.toString(),
                    userId: targetPostgresUserId,
                    authorName: mongoBookRecord.authorName || "Unknown Author",
                    title: mongoBookRecord.title || "Untitled Book",
                    desc: mongoBookRecord.desc || "",
                    genres: mongoBookRecord.genres || [],
                    cover: mongoBookRecord.cover || "https://via.placeholder.com/150",
                    privacy: mongoBookRecord.privacy || "public",
                    rating: mongoBookRecord.rating ? Number(mongoBookRecord.rating) : 0,
                    year: mongoBookRecord.year ? Number(mongoBookRecord.year) : null,
                    isbn: mongoBookRecord.isbn ? mongoBookRecord.isbn.toString() : null,
                    pages: mongoBookRecord.pages ? Number(mongoBookRecord.pages) : null,
                    chapters: {
                        create: formattedChaptersData
                    }
                }
            });
            successfullyMigratedCount++;
        } catch (databaseError: any) {
            if (databaseError.code === 'P2002') {
                skippedDuplicateCount++;
                continue; 
            } else {
                console.error(`\n❌ STOPPING MIGRATION: Failed on book ID ${mongoBookRecord._id}`);
                console.error(`Database Error Reason:\n`, databaseError.message);
                break; 
            }
        }
    }

    console.log(`\n⏩ Skipped ${skippedDuplicateCount} books that were already in PostgreSQL.`);
    console.log(`✅ Successfully migrated ${successfullyMigratedCount} new books this run.`);
    
    await mongoose.disconnect();
    await prismaClientInstance.$disconnect();
}

executeDataMigration();