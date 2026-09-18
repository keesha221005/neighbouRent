const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const authMiddleware = require("../middleware/auth");
const prisma = require("../lib/prisma");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Admin auth helper — used by all /admin routes below ──────────────────────
function checkAdminSecret(req, res, next) {
  const adminSecret = req.headers["x-admin-secret"];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// GET /api/users/me/verification
router.get("/me/verification", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { idStatus: true, idVerified: true, idType: true, idDocument: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/users/me/verification
router.post("/me/verification", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const { idType } = req.body;
    if (!["aadhaar", "pan"].includes(idType)) {
      return res.status(400).json({ error: "idType must be 'aadhaar' or 'pan'" });
    }

    const existing = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { idVerified: true },
    });
    if (existing.idVerified) {
      return res.status(409).json({ error: "Your ID is already verified" });
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "neighbrent/id-documents", resource_type: "image" },
        (error, result) => (error ? reject(error) : resolve(result))
      ).end(req.file.buffer);
    });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { idDocument: result.secure_url, idType, idStatus: "pending", idVerified: false },
      select: { idStatus: true, idVerified: true, idType: true },
    });

    res.json({ message: "ID document submitted for review", ...updated });
  } catch (err) {
    console.error("ID upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — all protected by x-admin-secret header
// ═════════════════════════════════════════════════════════════════════════════

// PATCH /api/users/:id/verify — approve/reject ID document
router.patch("/:id/verify", checkAdminSecret, async (req, res) => {
  const { action } = req.body;
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        idStatus: action === "approve" ? "verified" : "rejected",
        idVerified: action === "approve",
      },
      select: { id: true, name: true, email: true, idStatus: true, idVerified: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users/pending-verifications — list all pending ID submissions
router.get("/pending-verifications", checkAdminSecret, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { idStatus: "pending" },
      select: {
        id: true, name: true, email: true,
        idType: true, idDocument: true, idStatus: true, createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users/admin/all — list all users with summary stats
router.get("/admin/all", checkAdminSecret, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, phone: true,
        verified: true, emailVerified: true,
        idStatus: true, idVerified: true,
        createdAt: true,
        _count: { select: { items: true, bookings: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    console.error("Admin list users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users/admin/bookings — list all bookings across the platform
router.get("/admin/bookings", checkAdminSecret, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        item: { select: { id: true, title: true, category: true, pricePerDay: true } },
        renter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // limit to most recent 100 to keep it light
    });
    res.json(bookings);
  } catch (err) {
    console.error("Admin list bookings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users/admin/stats — quick platform overview numbers
router.get("/admin/stats", checkAdminSecret, async (req, res) => {
  try {
    const [totalUsers, totalItems, totalBookings, pendingVerifications, completedBookings] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.booking.count(),
      prisma.user.count({ where: { idStatus: "pending" } }),
      prisma.booking.count({ where: { status: "completed" } }),
    ]);

    const co2Agg = await prisma.booking.aggregate({
      where: { status: "completed" },
      _sum: { co2Saved: true },
    });

    res.json({
      totalUsers,
      totalItems,
      totalBookings,
      pendingVerifications,
      completedBookings,
      totalCO2Saved: co2Agg._sum.co2Saved || 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;