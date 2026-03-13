import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Lista venue - da implementare" });
});

export default router;
