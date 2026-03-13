import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { upload } from "../services/upload.service";
import { listUsers, uploadProfilePhoto } from "../controllers/user.controller";

const router = Router();

router.get("/", listUsers);

router.post(
  "/profile-photo",
  authenticateToken,
  upload.single("profilePhoto"), // nome del campo nel form-data
  uploadProfilePhoto,
);

export default router;
