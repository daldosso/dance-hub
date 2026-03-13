import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { upsertPayment } from "../controllers/payments.controller";

const router = Router();

// Salva o aggiorna lo stato di pagamento per un utente / corso / mese
router.put("/", authenticateToken, upsertPayment);

export default router;

