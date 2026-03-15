const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Order = require("../models/Order");
const auth = require("./auth");

// Create Checkout Session
router.post("/create-checkout-session", auth, async (req, res) => {
  try {
    const { cartItems } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty or invalid" });
    }

    // Calculate total
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + Number(item.price) * Number(item.quantity);
    }, 0);

    if (isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    // Save order first
    const order = await Order.create({
      user: req.user.id,
      items: cartItems.map((item) => ({
        product: item._id,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      totalAmount,
      paymentStatus: "pending",
    });

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: cartItems.map((item) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name,
          },
          unit_amount: Number(item.price) * 100,
        },
        quantity: Number(item.quantity),
      })),
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success.html?orderId=${order._id}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel.html`,
      metadata: {
        orderId: order._id.toString(),
      },
    });

    res.status(200).json({ id: session.id });

  } catch (error) {
    console.error("Stripe Session Error:", error);
    res.status(500).json({
      message: "Server error while creating checkout session",
    });
  }
});

const Rental = require("../models/Rental");

router.put("/confirm-payment/:orderId", auth, async (req, res) => {
  console.log("CONFIRM ROUTE HIT");

  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Mark order as paid
    order.paymentStatus = "paid";
    await order.save();

    // 🔥 CREATE RENTALS HERE
    for (let item of order.items) {

      const rental = new Rental({
        productId: item.product,
        productName: "Product",   // You are not storing name in order
        productImage: "",         // You are not storing image in order
        pricePerDay: item.price,
        days: item.quantity,
        totalPrice: item.price * item.quantity,
        userId: order.user.toString()
      });

      await rental.save();
    }

    res.json({ message: "Payment confirmed & rentals created" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;