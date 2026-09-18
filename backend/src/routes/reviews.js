const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const prisma = require('../lib/prisma')

// POST /api/reviews — leave a review (only if you've completed a booking)
router.post("/", authMiddleware, async (req, res) => {
  const { itemId, rating, comment } = req.body;

  if (!itemId || !rating) return res.status(400).json({ error: "itemId and rating are required" });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1–5" });

  try {
    // Verify the user has a completed booking for this item
    const completedBooking = await prisma.booking.findFirst({
      where: {
        itemId,
        renterId: req.user.id,
        status: "completed",
      },
    });

    if (!completedBooking) {
      return res.status(403).json({ error: "You can only review items you have rented and returned" });
    }

    // Prevent duplicate reviews
    const existing = await prisma.review.findFirst({
      where: { itemId, userId: req.user.id },
    });
    if (existing) return res.status(409).json({ error: "You have already reviewed this item" });

    const review = await prisma.review.create({
      data: { itemId, userId: req.user.id, rating: parseInt(rating), comment },
      include: { user: { select: { name: true, avatar: true } } },
    });

    res.status(201).json(review);
  } catch (err) {
    console.error("Review error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/reviews/:itemId — all reviews for an item
router.get("/:itemId", async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { itemId: req.params.itemId },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/reviews/:id — delete your own review
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ error: "Review not found" });
    if (review.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
