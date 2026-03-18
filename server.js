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
import fs from "fs";
import uploadRoutes from "./routes/uploadRoutes.js";
import uploadsRoutes from "./routes/uploadsRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import { storageDriver } from "./services/storage/index.js";

dotenv.config({ quiet: true });

const server = express();
server.use(express.json({ limit: "10mb" }));
server.use(express.urlencoded({ limit: "10mb", extended: true }));

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

server.use(cors({
  origin: corsOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Serve local uploads (STORAGE_DRIVER=local)
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), "uploads");
if (storageDriver() === "local") {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch {
    // ignore (adapter will error on write if it cannot create the directory)
  }
}
server.use(
  "/uploads",
  express.static(uploadsDir, {
    fallthrough: true,
    index: false,
    redirect: false,
    dotfiles: "deny",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  }),
);

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
server.use("/api", uploadRoutes); // POST /api/upload
server.use("/api/uploads", uploadsRoutes); // POST /api/uploads/presign|confirm
server.use("/api/media", mediaRoutes); // GET /api/media

// Test route
server.get('/', (req, res) => {
    res.send('<h1>the server is working</h1>');
});

// Error handling
server.use((err, req, res, next) => {
  console.error(err.stack);
  const isApi = req.originalUrl?.startsWith("/api/");

  if (err?.code === "LIMIT_FILE_SIZE") {
    const payload = { error: "File too large (max 50MB)" };
    return isApi ? res.status(413).json(payload) : res.status(413).send(payload.error);
  }

  if (isApi && typeof err?.message === "string") {
    if (err.message.includes("Only image/audio/video")) {
      return res.status(400).json({ error: err.message });
    }
  }

  const message = err?.message || "Something broke!";
  if (isApi) return res.status(500).json({ error: message });
  return res.status(500).send(message);
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
