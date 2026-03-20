const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

// Log Stripe key status (don't log the actual key)
console.log("STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
console.log("STRIPE_SECRET_KEY length:", process.env.STRIPE_SECRET_KEY?.length);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Order = require("../models/Order");
const Rental = require("../models/Rental");
const Product = require("../models/Product");
const auth = require("./auth");

// Create Checkout Session
router.post("/create-checkout-session", auth, async (req, res) => {
  console.log("\n========== CHECKOUT SESSION START ==========");
  console.log("1. Request received");
  
  try {
    console.log("2. Request body:", JSON.stringify(req.body, null, 2));
    console.log("3. User ID:", req.user?.id);
    
    const { cartItems, address } = req.body;

    // Validate cart
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      console.log("❌ ERROR: Cart is empty");
      return res.status(400).json({ message: "Cart is empty or invalid" });
    }
    console.log("4. Cart items count:", cartItems.length);

    // Calculate total
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + Number(item.price) * Number(item.quantity);
    }, 0);
    console.log("5. Total amount:", totalAmount);

    if (isNaN(totalAmount) || totalAmount <= 0) {
      console.log("❌ ERROR: Invalid total amount");
      return res.status(400).json({ message: "Invalid total amount" });
    }

    // Fetch product details
    console.log("6. Fetching product details...");
    const itemsWithDetails = await Promise.all(
      cartItems.map(async (item) => {
        console.log("   Fetching product:", item._id);
        const product = await Product.findById(item._id);
        if (!product) {
          console.log("   ⚠️ Product not found:", item._id);
        }
        return {
          ...item,
          productDetails: product
        };
      })
    );
    console.log("7. Products fetched");

    // Create order
    console.log("8. Creating order...");
    const order = await Order.create({
      user: req.user.id,
      items: itemsWithDetails.map((item) => ({
        product: item._id,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      totalAmount,
      paymentStatus: "pending",
      address: address || null
    });
    console.log("9. Order created:", order._id);

    // Create Stripe session
    console.log("10. Creating Stripe session...");
    console.log("11. Stripe key exists:", !!process.env.STRIPE_SECRET_KEY);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: itemsWithDetails.map((item) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: Number(item.quantity),
      })),
      mode: "payment",
      success_url: "https://rentease2-frontend.onrender.com/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://rentease2-frontend.onrender.com/checkout.html",
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id,
        address: JSON.stringify(address || {})
      },
    });
    
    console.log("12. Stripe session created:", session.id);
    console.log("========== CHECKOUT SESSION SUCCESS ==========\n");
    
    res.status(200).json({ id: session.id });

  } catch (error) {
    console.error("\n========== ERROR ==========");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("==========================\n");
    
    res.status(500).json({
      message: "Server error while creating checkout session",
      error: error.message
    });
  }
});

module.exports = router;