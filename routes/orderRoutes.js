const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const auth = require("./auth");

// 🔹 Get ALL orders (ADMIN) - This is the main GET
router.get("/", auth, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        
        console.log("✅ Orders found:", orders.length);
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: error.message });
    }
});

// 🔹 Get orders of logged-in user (USER) - optional
router.get("/my-orders", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Server error while fetching orders" });
  }
});

// 🔹 Create new order
router.post("/", auth, async (req, res) => {
    try {
        if (!req.body.items || !req.body.totalAmount) {
            return res.status(400).json({ message: "Items and total amount are required" });
        }

        const orderData = {
            user: req.user.id,
            items: req.body.items,
            totalAmount: req.body.totalAmount,
            paymentStatus: req.body.paymentStatus || "pending",
            address: req.body.address || null,
            createdAt: new Date()
        };
        
        const order = new Order(orderData);
        await order.save();
        
        res.status(201).json(order);
        
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;