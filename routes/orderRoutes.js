const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const auth = require("./auth");

// 🔹 Get orders of logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error while fetching orders" });
  }
});

module.exports = router;