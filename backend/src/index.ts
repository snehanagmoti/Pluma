import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import Routes (We will convert these to TS in the next steps)
import authRoute from "./routes/auth";
import userRoute from "./routes/users";
import bookRoute from "./routes/books";

// Initialize environment variables
dotenv.config();

// Initialize Express Application
const app: Application = express();
const serverPort: number = parseInt(process.env.PORT as string, 10) || 5000;

// Middleware Setup
app.use(cors());
app.use(express.json());

// API Route Mounting
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/books", bookRoute);

// Base Health Check Route
app.get("/", (req: Request, res: Response) => {
  res.send("Pluma API is running natively on PostgreSQL & Prisma!");
});

// Server Initialization
app.listen(serverPort, () => {
  console.log(`Server successfully started on http://localhost:${serverPort}`);
});