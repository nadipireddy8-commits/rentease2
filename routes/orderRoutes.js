const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const auth = require("./auth");

// 🔹 Get orders for logged-in user (USER)
router.get("/", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${orders.length} orders for user ${req.user.id}`);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Server error while fetching orders" });
  }
});


// 🔹 Get ALL orders (ADMIN ONLY) - separate endpoint
router.get("/admin/all", auth, async (req, res) => {
    try {
        // Check if user is admin (you need to add role check)
        // For now, you can check if user has admin role
        // if (req.user.role !== 'admin') {
        //     return res.status(403).json({ message: "Admin access required" });
        // }
        
        const orders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        
        console.log("✅ Admin: Orders found:", orders.length);
        res.json(orders);
    } catch (error) {
        console.error("Error fetching all orders:", error);
        res.status(500).json({ message: error.message });
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