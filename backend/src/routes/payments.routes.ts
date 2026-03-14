import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { listPayments, upsertPayment } from "../controllers/payments.controller";

const router = Router();

// Restituisce tutti i pagamenti salvati
router.get("/", authenticateToken, listPayments);

// Salva o aggiorna lo stato di pagamento per un utente / corso / mese
router.put("/", authenticateToken, upsertPayment);

export default router;

