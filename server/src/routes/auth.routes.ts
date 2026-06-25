import { Router, Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { authenticate, AuthRequest } from "../middleware/auth";
import { upload } from "../config/multer";

const router = Router();

// Register (buyer only)
router.post(
  "/register",
  upload.single("profileImage"),
  async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, username, pin } = req.body;
      if (!firstName || !lastName || !username || !pin) {
        res.status(400).json({ error: "First name, last name, username and PIN are required" });
        return;
      }
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        res.status(400).json({ error: "PIN must be exactly 6 digits" });
        return;
      }

      const profileImage = req.file ? `/uploads/${req.file.filename}` : undefined;

      const result = await AuthService.register({
        firstName,
        lastName,
        username,
        pin,
        profileImage,
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Login (both buyer and seller)
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) {
      res.status(400).json({ error: "Username and PIN are required" });
      return;
    }
    const result = await AuthService.login(username, pin);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.get("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await AuthService.getProfile(req.user!.id);
    res.json(user);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Update profile
router.patch(
  "/profile",
  authenticate,
  upload.single("profileImage"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { firstName, lastName } = req.body;
      const profileImage = req.file ? `/uploads/${req.file.filename}` : undefined;
      const user = await AuthService.updateProfile(req.user!.id, {
        firstName,
        lastName,
        profileImage,
      });
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Change PIN
router.patch("/pin", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin) {
      res.status(400).json({ error: "Current PIN and new PIN are required" });
      return;
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      res.status(400).json({ error: "New PIN must be exactly 6 digits" });
      return;
    }
    const result = await AuthService.changePin(req.user!.id, currentPin, newPin);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
