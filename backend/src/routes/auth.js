const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const prisma = require('../lib/prisma');

// ── Nodemailer transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── Helper: generate 6-digit OTP ────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Helper: generate JWT ─────────────────────────────────────────────────────
function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Name, email and password are required" });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, phone },
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", require("../middleware/auth"), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, phone: true,
        avatar: true, verified: true, createdAt: true,
        emailVerified: true,
        idStatus: true, idVerified: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/auth/me
router.patch("/me", require("../middleware/auth"), async (req, res) => {
  const { name, phone, avatar } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, avatar },
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/send-otp
// Sends a 6-digit OTP to the logged-in user's registered email
router.post("/send-otp", require("../middleware/auth"), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, emailVerified: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.emailVerified) return res.status(409).json({ error: "Email already verified" });

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save OTP and expiry to DB
    await prisma.user.update({
      where: { id: req.user.id },
      data: { otpCode: otp, otpExpiry: expiry },
    });

    // Send email
    await transporter.sendMail({
      from: `"NeighbouRent" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: "Your NeighbouRent Verification Code",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">NeighbouRent</h2>
          <p style="color: #374151; font-size: 16px;">Your verification code is:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #111827;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    console.log(`OTP sent to ${user.email}`);
    res.json({ message: "OTP sent to your registered email address." });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

// POST /api/auth/verify-otp
// Body: { otp: "123456" }
router.post("/verify-otp", require("../middleware/auth"), async (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: "OTP is required" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { otpCode: true, otpExpiry: true, emailVerified: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.emailVerified) return res.status(409).json({ error: "Email already verified" });
    if (!user.otpCode) return res.status(400).json({ error: "No OTP found. Please request a new one." });

    // Check expiry
    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // Check code
    if (user.otpCode !== otp) {
      return res.status(400).json({ error: "Incorrect OTP. Please try again." });
    }

    // Mark as verified and clear OTP
    await prisma.user.update({
      where: { id: req.user.id },
      data: { emailVerified: true, otpCode: null, otpExpiry: null },
    });

    res.json({ message: "Email verified successfully." });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// TEMPORARY — no auth needed for testing
router.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"NeighbouRent" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: "NeighbouRent email test",
      html: "<p>If you see this, Nodemailer is working!</p>",
    });
    res.json({ message: "Test email sent!" });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;