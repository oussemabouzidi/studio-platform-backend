import express from "express";
import artistRoutes from './routes/artistRoutes.js';
import studioRoutes from './routes/studioRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import cors from 'cors';
import dotenv from "dotenv";
import path from "path";
import { pathToFileURL } from "url";

dotenv.config({ quiet: true });

const server = express();
server.use(express.json({ limit: "10mb" }));
server.use(express.urlencoded({ limit: "10mb", extended: true }));



server.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Logging middleware
server.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
server.use('/api/artist', artistRoutes);
server.use('/api/admin', adminRoutes);
server.use('/api/studio', studioRoutes);
server.use('/api/auth', authRoutes);
server.use('/api/stats', statsRoutes);

// Test route
server.get('/', (req, res) => {
    res.send('<h1>the server is working</h1>');
});

// Error handling
server.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

export function startServer(port = process.env.PORT || 8800) {
  const httpServer = server.listen(port, () => {
    const actualPort = httpServer.address()?.port ?? port;
    console.log(`Server is listening on port ${actualPort}`);
  });

  httpServer.on("error", (err) => {
    if (err?.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Stop the other process or set PORT in .env.`
      );
      process.exit(1);
    }

    console.error(err);
    process.exit(1);
  });

  return httpServer;
}

export default server;

const isMain =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  startServer();
}
