import express from "express";
import artistRoutes from './routes/artistRoutes.js';
import studioRoutes from './routes/studioRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import cors from 'cors';

const server = express();
server.use(express.json({ limit: "10mb" }));
server.use(express.urlencoded({ limit: "10mb", extended: true }));



server.use(cors({
  origin: "http://localhost:3000",
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

const port = process.env.PORT || 8800;
server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
