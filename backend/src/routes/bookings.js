const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const authMiddleware = require("../middleware/auth");
const prisma = require('../lib/prisma');

// ── Nodemailer transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── Booking status email to renter ───────────────────────────────────────────
async function sendBookingEmail(renterEmail, renterName, itemTitle, status, startDate, endDate, totalPrice) {
  const statusConfig = {
    confirmed: {
      subject: "Your booking has been confirmed! 🎉",
      color: "#16a34a", emoji: "✅", heading: "Booking Confirmed!",
      message: `Great news! The owner has confirmed your booking for <strong>${itemTitle}</strong>.`,
      action: "Get ready to pick it up on your start date.",
    },
    rejected: {
      subject: `Booking update for ${itemTitle}`,
      color: "#dc2626", emoji: "❌", heading: "Booking Not Accepted",
      message: `Unfortunately, the owner couldn't accept your booking for <strong>${itemTitle}</strong>.`,
      action: "Don't worry — browse other similar items on NeighbouRent.",
    },
    active: {
      subject: "Your rental is now active 🔑",
      color: "#4f46e5", emoji: "🔑", heading: "Rental Active!",
      message: `Your rental of <strong>${itemTitle}</strong> is now active.`,
      action: "Enjoy it and remember to return it in good condition.",
    },
    completed: {
      subject: "Rental completed — leave a review ⭐",
      color: "#6b7280", emoji: "⭐", heading: "Rental Completed",
      message: `Your rental of <strong>${itemTitle}</strong> has been marked as completed.`,
      action: "Head to your dashboard to leave a review for this item.",
    },
    cancelled: {
      subject: `Booking cancelled for ${itemTitle}`,
      color: "#dc2626", emoji: "🚫", heading: "Booking Cancelled",
      message: `The booking for <strong>${itemTitle}</strong> has been cancelled.`,
      action: "Browse other items on NeighbouRent.",
    },
  };

  const config = statusConfig[status];
  if (!config) return;

  const start = new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const end   = new Date(endDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  await transporter.sendMail({
    from: `"NeighbouRent" <${process.env.GMAIL_USER}>`,
    to: renterEmail,
    subject: config.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #4f46e5; margin-bottom: 4px;">NeighbouRent</h2>
        <p style="color: #6b7280; font-size: 13px; margin-top: 0;">Your neighbourhood rental platform</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <div style="text-align: center; padding: 16px 0;">
          <div style="font-size: 40px;">${config.emoji}</div>
          <h3 style="color: ${config.color}; margin: 8px 0;">${config.heading}</h3>
          <p style="color: #374151; font-size: 15px;">${config.message}</p>
        </div>
        <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Item</td>
              <td style="color: #111827; font-weight: 600; text-align: right;">${itemTitle}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">From</td>
              <td style="color: #111827; text-align: right;">${start}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">To</td>
              <td style="color: #111827; text-align: right;">${end}</td>
            </tr>
            <tr style="border-top: 1px solid #e5e7eb;">
              <td style="color: #6b7280; padding: 10px 0 4px;">Total</td>
              <td style="color: #4f46e5; font-weight: 700; font-size: 16px; text-align: right;">₹${totalPrice}</td>
            </tr>
          </table>
        </div>
        <p style="color: #6b7280; font-size: 14px; text-align: center;">${config.action}</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/dashboard"
            style="background: #4f46e5; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            View Dashboard →
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 16px;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          You're receiving this because you have a booking on NeighbouRent.
        </p>
      </div>
    `,
  });
}

// ── CO₂ helpers ───────────────────────────────────────────────────────────────
const CO2_BY_CATEGORY = {
  "Electronics": 28.0, "Tools": 4.5,  "Furniture": 45.0,
  "Appliances":  32.0, "Sports": 6.0, "Vehicles":  800.0,
  "Clothing":     3.0, "Books":  1.0, "Kids":        5.0, "Other": 4.0,
};
const LIFESPAN_BY_CATEGORY = {
  "Electronics": 1825, "Tools": 3650, "Furniture": 5475,
  "Appliances":  2920, "Sports": 2190, "Vehicles": 1825,
  "Clothing":     730, "Books":  3650, "Kids":       730, "Other": 1825,
};
function calculateCO2Saved(category, rentalDays) {
  const totalCO2 = CO2_BY_CATEGORY[category] || CO2_BY_CATEGORY["Other"];
  const lifespan = LIFESPAN_BY_CATEGORY[category] || LIFESPAN_BY_CATEGORY["Other"];
  return parseFloat(((totalCO2 / lifespan) * rentalDays).toFixed(3));
}

// ── Date overlap helper ───────────────────────────────────────────────────────
function datesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

// GET /api/bookings/my
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { renterId: req.user.id },
      include: {
        item: { select: { id: true, title: true, images: true, address: true, pricePerDay: true } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/bookings/owner
router.get("/owner", authMiddleware, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { item: { ownerId: req.user.id } },
      include: {
        item: { select: { id: true, title: true, images: true } },
        renter: { select: { id: true, name: true, email: true, phone: true } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/bookings/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        item: {
          include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
        },
        renter: { select: { id: true, name: true, email: true, phone: true } },
        payment: true,
      },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const isRenter = booking.renterId === req.user.id;
    const isOwner  = booking.item.ownerId === req.user.id;
    if (!isRenter && !isOwner) return res.status(403).json({ error: "Forbidden" });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/bookings
router.post("/", authMiddleware, async (req, res) => {
  const { itemId, startDate, endDate } = req.body;

  if (!itemId || !startDate || !endDate)
    return res.status(400).json({ error: "itemId, startDate and endDate are required" });

  const start = new Date(startDate);
  const end   = new Date(endDate);

  if (start >= end) return res.status(400).json({ error: "endDate must be after startDate" });
  if (start < new Date()) return res.status(400).json({ error: "startDate cannot be in the past" });

  try {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (!item.available) return res.status(409).json({ error: "Item is not available" });
    if (item.ownerId === req.user.id) return res.status(400).json({ error: "You cannot rent your own item" });

    const conflicts = await prisma.booking.findMany({
      where: { itemId, status: { in: ["pending", "confirmed", "active"] } },
    });
    const hasConflict = conflicts.some((b) =>
      datesOverlap(start, end, new Date(b.startDate), new Date(b.endDate))
    );
    if (hasConflict)
      return res.status(409).json({ error: "Item is already booked for the selected dates" });

    const days       = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = days * item.pricePerDay;
    const deposit    = item.deposit;

    const booking = await prisma.booking.create({
      data: { startDate: start, endDate: end, totalPrice, deposit, status: "pending", renterId: req.user.id, itemId },
      include: { item: { select: { id: true, title: true, images: true, address: true } } },
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/bookings/:id/status
router.patch("/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["confirmed", "rejected", "cancelled", "active", "completed"];

  if (!validStatuses.includes(status))
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        item: true,
        renter: { select: { email: true, name: true } },
      },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const isRenter = booking.renterId === req.user.id;
    const isOwner  = booking.item.ownerId === req.user.id;

    if (["confirmed", "rejected", "active"].includes(status) && !isOwner)
      return res.status(403).json({ error: "Only the item owner can perform this action" });
    if (status === "completed" && !isOwner && !isRenter)
      return res.status(403).json({ error: "Forbidden" });
    if (status === "cancelled" && !isRenter && !isOwner)
      return res.status(403).json({ error: "Forbidden" });

    // Calculate CO₂ and money saved on completion
    let co2Saved = booking.co2Saved;
    let moneySaved = booking.moneySaved;
    if (status === "completed" && booking.status !== "completed") {
      const rentalDays = Math.ceil(
        (new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)
      );
      co2Saved = calculateCO2Saved(booking.item.category, rentalDays);

      // Money saved = what it would've cost to buy new minus what they paid to rent
      if (booking.item.estimatedValue && booking.item.estimatedValue > booking.totalPrice) {
        moneySaved = parseFloat((booking.item.estimatedValue - booking.totalPrice).toFixed(2));
      } else {
        moneySaved = 0; // no estimated value set, or renting cost more than buying (edge case)
      }
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status, co2Saved, moneySaved },
    });

    // Send email to renter — fire and forget, doesn't block response
    sendBookingEmail(
      booking.renter.email,
      booking.renter.name,
      booking.item.title,
      status,
      booking.startDate,
      booking.endDate,
      booking.totalPrice
    ).catch(err => console.error("Booking email error:", err));

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/bookings/availability/:itemId
router.get("/availability/:itemId", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { itemId: req.params.itemId, status: { in: ["confirmed", "active"] } },
      select: { startDate: true, endDate: true },
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;