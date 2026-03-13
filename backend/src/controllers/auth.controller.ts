import { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";

export async function register(req: Request, res: Response) {
  try {
    const result = await registerUser(req.body);
    res.status(201).json({ message: "Utente registrato", user: result.user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) throw new Error("Utente non autenticato");
    const user = await getCurrentUser(req.user.id);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
