const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const authMiddleware = require("../middleware/auth");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer — store in memory (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// POST /api/upload/file — upload a file from device
router.post("/file", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "neighbrent", resource_type: "image" },
        (error, result) => (error ? reject(error) : resolve(result))
      ).end(req.file.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// POST /api/upload/url — fetch any web URL and re-host on Cloudinary
router.post("/url", authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const result = await cloudinary.uploader.upload(url, {
      folder: "neighbrent",
      resource_type: "image",
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("URL upload error:", err);
    res.status(500).json({ error: "Could not fetch image from that URL. Try a direct image link." });
  }
});

module.exports = router;