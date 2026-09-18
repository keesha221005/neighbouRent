const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
// Fallback to dummy if key is "dummy_key_for_now" or not set
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "dummy");

router.post("/suggest-price", async (req, res) => {
  const { title, description, category, location } = req.body;

  if (!title || !location) {
    return res.status(400).json({ error: "Title and location are required for AI suggestion." });
  }

  try {
    // If using the dummy key, return a mock response for now
    if (!apiKey || apiKey === "dummy_key_for_now" || apiKey === "dummy") {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockPrice = Math.floor(Math.random() * (500 - 50 + 1)) + 50;
      return res.json({ suggestedPrice: mockPrice });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Act as an expert rental pricing assistant. I am listing an item on a hyperlocal rental marketplace.
      Please suggest a fair and realistic daily rental price in INR (₹) for the following item.
      Consider the item's condition (if described), its category, and its location.

      Item Title: ${title}
      Description: ${description || "N/A"}
      Category: ${category || "N/A"}
      Location (Address/Landmark): ${location}

      Respond ONLY with a single integer number representing the suggested daily price in INR. No explanation, no symbols, just the number.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Parse the number from the response
    const suggestedPrice = parseInt(text.replace(/[^0-9]/g, ""), 10);

    if (isNaN(suggestedPrice)) {
      throw new Error("AI returned an invalid response.");
    }

    res.json({ suggestedPrice });
  } catch (error) {
    console.error("AI suggestion error:", error);
    res.status(500).json({ error: "Failed to generate AI price suggestion." });
  }
});

module.exports = router;
