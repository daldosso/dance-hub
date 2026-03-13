import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Lista eventi - da implementare" });
});

router.get("/:id", (req, res) => {
  res.json({ message: `Evento con id ${req.params.id} - da implementare` });
});

export default router;
