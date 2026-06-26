import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import multer from "multer";
import authRoutes from "./routes/auth.routes.js";
import requestRoutes from "./routes/request.routes.js";
import orderRoutes from "./routes/order.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import productRoutes from "./routes/product.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import { RequestService } from "./services/request.service.js";
import { NotificationService } from "./services/notification.service.js";

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "https://localhost:3000",
].filter(Boolean) as string[];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, SSE, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS_NOT_ALLOWED"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.resolve("./uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/notifications", notificationRoutes);

// Config endpoint (deadline from env)
app.get("/api/config", (_req, res) => {
  res.json({ deadline: process.env.DEADLINE_DATE || "2026-07-08T23:59:59.000Z" });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", deadline: process.env.DEADLINE_DATE });
});

// Global multer error handler
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "FILE_TOO_LARGE" });
      return;
    }
    res.status(400).json({ error: "UPLOAD_ERROR" });
    return;
  }
  if (err?.message === "Only JPEG, PNG, and WebP images are allowed" || err?.message === "File type not allowed") {
    res.status(400).json({ error: "INVALID_FILE_TYPE" });
    return;
  }
  if (err?.message === "CORS_NOT_ALLOWED") {
    res.status(403).json({ error: "CORS_NOT_ALLOWED" });
    return;
  }
  next(err);
});

// Expire overdue requests every hour
setInterval(async () => {
  try {
    const result = await RequestService.expireOverdueRequests();
    if (result.count > 0) {
      console.log(`Expired ${result.count} overdue requests`);
      // Phase 4: notify buyers about expired requests
      await NotificationService.onRequestsExpired(result.ids).catch(() => {});
    }
  } catch (err) {
    console.error("Error expiring requests:", err);
  }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
