import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const postgresPool = new Pool({ connectionString: process.env.DATABASE_URL });
const prismaAdapter = new PrismaPg(postgresPool);

export const prismaClient = new PrismaClient({ adapter: prismaAdapter });