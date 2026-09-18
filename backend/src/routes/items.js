const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const prisma = require('../lib/prisma')

// Helper: calculate distance between two lat/lng points in km (Haversine formula)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/items — list all items with optional filters
router.get("/", async (req, res) => {
  const { category, minPrice, maxPrice, lat, lng, radius = 10, search } = req.query;

  try {
    const where = { available: true };

    if (category) where.category = category;
    if (minPrice || maxPrice) {
      where.pricePerDay = {};
      if (minPrice) where.pricePerDay.gte = parseFloat(minPrice);
      if (maxPrice) where.pricePerDay.lte = parseFloat(maxPrice);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    let items = await prisma.item.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, avatar: true, verified: true } },
        reviews: { select: { rating: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      items = items.filter((item) => {
        const dist = haversineDistance(userLat, userLng, item.latitude, item.longitude);
        item.distanceKm = Math.round(dist * 10) / 10;
        return dist <= radiusKm;
      });

      items.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    const result = items.map((item) => ({
      ...item,
      avgRating:
        item.reviews.length > 0
          ? Math.round((item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length) * 10) / 10
          : null,
      reviewCount: item.reviews.length,
    }));

    res.json(result);
  } catch (err) {
    console.error("Get items error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/items/my
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { ownerId: req.user.id },
      include: {
        reviews: { select: { rating: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/items/:id
router.get("/:id", async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, avatar: true, verified: true, createdAt: true } },
        reviews: {
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
        },
        bookings: {
          where: { status: { in: ["confirmed", "active"] } },
          select: { startDate: true, endDate: true },
        },
      },
    });

    if (!item) return res.status(404).json({ error: "Item not found" });

    const avgRating =
      item.reviews.length > 0
        ? Math.round((item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length) * 10) / 10
        : null;

    res.json({ ...item, avgRating, reviewCount: item.reviews.length });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/items — create a new listing
router.post("/", authMiddleware, async (req, res) => {
  const { title, description, category, pricePerDay, deposit, estimatedValue, images, latitude, longitude, address } = req.body;

  if (!title || !description || !category || !pricePerDay || !latitude || !longitude || !address) {
    return res.status(400).json({ error: "All required fields must be provided" });
  }
  const imageArray = images || [];

  try {
    const item = await prisma.item.create({
      data: {
        title,
        description,
        category,
        pricePerDay: parseFloat(pricePerDay),
        deposit: parseFloat(deposit || 0),
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        images: imageArray,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address,
        ownerId: req.user.id,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    console.error("Create item error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/items/:id — update an item (owner only)
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const { title, description, category, pricePerDay, deposit, estimatedValue, images, available, address } = req.body;

    const updated = await prisma.item.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(category && { category }),
        ...(pricePerDay && { pricePerDay: parseFloat(pricePerDay) }),
        ...(deposit !== undefined && { deposit: parseFloat(deposit) }),
        ...(estimatedValue !== undefined && { estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null }),
        ...(images && { images }),
        ...(available !== undefined && { available }),
        ...(address && { address }),
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/items/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    await prisma.item.delete({ where: { id: req.params.id } });
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;