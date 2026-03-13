import { Router } from "express";
import { listCourses } from "../controllers/courses.controller";

const router = Router();

// GET /api/courses
router.get("/", listCourses);

export default router;

