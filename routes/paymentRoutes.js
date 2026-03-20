const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Order = require("../models/Order");
const Rental = require("../models/Rental");
const Product = require("../models/Product"); // Add this to fetch product details
const auth = require("./auth");

// Create Checkout Session
router.post("/create-checkout-session", auth, async (req, res) => {
  try {
    const { cartItems, address } = req.body; // Make sure address is received

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

    // Fetch product details for each item
    const itemsWithDetails = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item._id);
        return {
          ...item,
          productDetails: product
        };
      })
    );

    // Save order first with address
    const order = await Order.create({
      user: req.user.id,
      items: itemsWithDetails.map((item) => ({
        product: item._id,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      totalAmount,
      paymentStatus: "pending",
      address: address || null // Save address if provided
    });

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: itemsWithDetails.map((item) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name,
            images: item.productDetails?.image ? [item.productDetails.image] : [],
          },
          unit_amount: Number(item.price) * 100,
        },
        quantity: Number(item.quantity),
      })),
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout.html`,
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id,
        address: JSON.stringify(address || {})
      },
    });

    res.status(200).json({ id: session.id });

  } catch (error) {
    console.error("Stripe Session Error:", error);
    res.status(500).json({
      message: "Server error while creating checkout session",
      error: error.message
    });
  }
});

// Webhook to handle successful payments (MORE RELIABLE than confirm-payment)
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Use your webhook secret from environment variables
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      const orderId = session.metadata.orderId;
      const address = JSON.parse(session.metadata.address || '{}');

      // Find and update order
      const order = await Order.findById(orderId);
      if (!order) {
        console.error('Order not found:', orderId);
        return res.status(404).json({ message: "Order not found" });
      }

      // Mark order as paid
      order.paymentStatus = "paid";
      await order.save();

      // Create rentals for each item
      for (let item of order.items) {
        const product = await Product.findById(item.product);
        
        const rental = new Rental({
          productId: item.product,
          productName: product?.name || "Product",
          productImage: product?.image || "",
          pricePerDay: item.price,
          days: item.quantity, // Using quantity as days
          totalPrice: item.price * item.quantity,
          userId: order.user.toString(),
          address: address // Save address to rental too
        });

        await rental.save();
      }

      console.log(`✅ Order ${orderId} processed successfully`);

    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ message: "Error processing payment" });
    }
  }

  res.json({ received: true });
});

// Keep confirm-payment for backward compatibility
router.put("/confirm-payment/:orderId", auth, async (req, res) => {
  console.log("CONFIRM ROUTE HIT");

  try {
    const { orderId } = req.params;
    const { address } = req.body; // Get address from request body

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Mark order as paid
    order.paymentStatus = "paid";
    await order.save();

    // Create rentals
    for (let item of order.items) {
      const product = await Product.findById(item.product);

      const rental = new Rental({
        productId: item.product,
        productName: product?.name || "Product",
        productImage: product?.image || "",
        pricePerDay: item.price,
        days: item.quantity, // Using quantity as days
        totalPrice: item.price * item.quantity,
        userId: order.user.toString(),
        address: address || null // Save address if provided
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