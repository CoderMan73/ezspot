// server/server.ts
import express, { Request, Response } from 'express';
import { pool, waitForDatabase } from "./db/connection";
import uploadRoutes from "./routes/uploadRoutes"
import healthRoutes from "./routes/healthRoutes"
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000', // Docker / nginx
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Example API routes
app.use('/api', uploadRoutes)
app.use('/api', healthRoutes)


// function to handle server startup
async function startServer() {
  try {
    // wait for the database before the server is ran
    await waitForDatabase();

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    // handle shutdown
    const shutdown = () => {
      console.log("Received shutdown signal, closing server...");
      server.close(() => {
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

startServer();