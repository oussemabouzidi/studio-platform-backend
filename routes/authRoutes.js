import express from "express";
import path from "path";
import multer from "multer";
import authController from "../controllers/authController.js";

const router = express.Router();
/*
// === Multer Storage configuration ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "avatarImage") {
      cb(null, "uploads/artists/avatars/");
    } else if (file.fieldname === "demos") {
      cb(null, "uploads/artists/demos/");
    } else {
      cb(null, "uploads/others/");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });
*/
// === ROUTES ===
router.post("/login", authController.login);
router.post("/register", authController.register);

// ✅ Upload middleware goes BEFORE controller
router.post(
  "/artist/create",
  authController.createAccount
);

router.post("/studio/create", authController.createStudio);

// Get studio by ID
router.get("/studio/:id", authController.getStudioById);

// Get artist by ID
router.get("/artist/:id", authController.getArtistById);

router.post("/oauth-login", authController.oauthLogin);

// POST connect
router.post("/connect", authController.oauthConnect);

export default router;
