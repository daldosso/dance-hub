import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/users.routes";
import eventRoutes from "./routes/events.routes";
import venueRoutes from "./routes/venues.routes";
import courseRoutes from "./routes/courses.routes";
import paymentRoutes from "./routes/payments.routes";

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/payments", paymentRoutes);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "Dance-Hub API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`🚀 Dance-Hub API avviata su http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("Prisma disconnected. Server stopped.");
  process.exit(0);
});
