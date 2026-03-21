const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

// Initialize Stripe with your secret key
console.log("🔐 STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
console.log("📏 STRIPE_SECRET_KEY length:", process.env.STRIPE_SECRET_KEY?.length);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Import models
const Order = require("../models/Order");
const Rental = require("../models/Rental");
const Product = require("../models/Product");
const auth = require("./auth");

// ============================================
// 1. CREATE CHECKOUT SESSION
// ============================================
router.post("/create-checkout-session", auth, async (req, res) => {
  console.log("\n========== 🔄 CHECKOUT SESSION START ==========");
  
  try {
    const { cartItems, address } = req.body;

    // Validate cart
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      console.log("❌ ERROR: Cart is empty");
      return res.status(400).json({ message: "Cart is empty or invalid" });
    }

    // Calculate total amount
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + Number(item.price) * Number(item.quantity);
    }, 0);

    if (isNaN(totalAmount) || totalAmount <= 0) {
      console.log("❌ ERROR: Invalid total amount");
      return res.status(400).json({ message: "Invalid total amount" });
    }

    console.log(`📦 Cart items: ${cartItems.length}`);
    console.log(`💰 Total amount: ₹${totalAmount}`);

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

    // Create order with pending status
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

    console.log(`📝 Order created: ${order._id}`);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: itemsWithDetails.map((item) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name,
            description: `Rental for ${item.quantity} days`,
          },
          unit_amount: Math.round(Number(item.price) * 100), // Convert to paise
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

    console.log(`💳 Stripe session created: ${session.id}`);
    console.log("========== ✅ CHECKOUT SESSION SUCCESS ==========\n");
    
    res.status(200).json({ id: session.id });

  } catch (error) {
    console.error("\n========== ❌ STRIPE ERROR ==========");
    console.error("Error message:", error.message);
    console.error("Error type:", error.type);
    console.error("Error code:", error.code);
    console.error("Error stack:", error.stack);
    console.error("====================================\n");
    
    res.status(500).json({
      message: "Server error while creating checkout session",
      error: error.message
    });
  }
});

// ============================================
// 2. CONFIRM PAYMENT (Called from success page)
// ============================================
router.post("/confirm-payment", auth, async (req, res) => {
  console.log("\n========== 🔍 CONFIRMING PAYMENT ==========");
  
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID required" });
    }

    console.log(`🔑 Session ID: ${sessionId}`);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log(`💰 Payment status: ${session.payment_status}`);
    console.log(`📦 Order ID from metadata: ${session.metadata?.orderId}`);

    if (session.payment_status === 'paid') {
      const orderId = session.metadata.orderId;
      
      // Find and update order
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      
      // Check if already paid
      if (order.paymentStatus === 'paid') {
        return res.json({ success: true, message: "Order already paid" });
      }
      
      // Mark order as paid
      order.paymentStatus = 'paid';
      await order.save();
      
      console.log(`✅ Order ${orderId} marked as PAID`);
      
      // Create rentals for each item in the order
      const address = session.metadata.address ? JSON.parse(session.metadata.address) : order.address;
      
      for (let item of order.items) {
        const product = await Product.findById(item.product);
        
        const rental = new Rental({
          productId: item.product,
          productName: product?.name || "Product",
          productImage: product?.image || "",
          pricePerDay: item.price,
          days: item.quantity,
          totalPrice: item.price * item.quantity,
          userId: order.user,
          address: {
            fullName: address?.fullName || "",
            phone: address?.phone || "",
            email: address?.email || "",
            street: address?.street || "",
            city: address?.city || "",
            state: address?.state || "",
            pincode: address?.pincode || "",
            landmark: address?.landmark || "",
            deliveryType: address?.deliveryType || "standard",
            deliveryCharge: address?.deliveryCharge || 49
          }
        });
        
        await rental.save();
        console.log(`✅ Rental created for: ${product?.name}`);
      }
      
      console.log("========== ✅ PAYMENT CONFIRMED ==========\n");
      return res.json({ 
        success: true, 
        message: "Payment confirmed and rentals created",
        orderId: order._id
      });
    }
    
    console.log("⚠️ Payment not completed yet");
    res.json({ success: false, message: "Payment not completed yet" });
    
  } catch (error) {
    console.error("\n========== ❌ CONFIRM PAYMENT ERROR ==========");
    console.error("Error message:", error.message);
    console.error("===========================================\n");
    
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ============================================
// 3. WEBHOOK (For automatic payment confirmation)
// ============================================
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  console.log("\n========== 📡 WEBHOOK RECEIVED ==========");

  try {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log(`✅ Checkout session completed: ${session.id}`);
    console.log(`📦 Order ID: ${session.metadata.orderId}`);
    console.log(`💰 Payment status: ${session.payment_status}`);
    
    try {
      const orderId = session.metadata.orderId;
      const address = session.metadata.address ? JSON.parse(session.metadata.address) : {};

      // Find and update order
      const order = await Order.findById(orderId);
      if (!order) {
        console.error(`❌ Order not found: ${orderId}`);
        return res.status(404).json({ message: "Order not found" });
      }

      // Mark order as paid
      order.paymentStatus = "paid";
      await order.save();
      console.log(`✅ Order ${orderId} marked as PAID via webhook`);

      // Create rentals for each item
      for (let item of order.items) {
        const product = await Product.findById(item.product);
        
        const rental = new Rental({
          productId: item.product,
          productName: product?.name || "Product",
          productImage: product?.image || "",
          pricePerDay: item.price,
          days: item.quantity,
          totalPrice: item.price * item.quantity,
          userId: order.user,
          address: {
            fullName: address?.fullName || "",
            phone: address?.phone || "",
            email: address?.email || "",
            street: address?.street || "",
            city: address?.city || "",
            state: address?.state || "",
            pincode: address?.pincode || "",
            landmark: address?.landmark || "",
            deliveryType: address?.deliveryType || "standard",
            deliveryCharge: address?.deliveryCharge || 49
          }
        });

        await rental.save();
        console.log(`✅ Rental created for: ${product?.name}`);
      }

      console.log("========== ✅ WEBHOOK PROCESSED SUCCESSFULLY ==========\n");

    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      return res.status(500).json({ message: "Error processing payment" });
    }
  }

  res.json({ received: true });
});

// ============================================
// 4. MANUAL CONFIRM (Fallback for testing)
// ============================================
router.put("/confirm-payment/:orderId", auth, async (req, res) => {
  console.log("\n========== 🔧 MANUAL CONFIRM ==========");
  
  try {
    const { orderId } = req.params;
    const { address } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ message: "Order already paid" });
    }

    // Mark order as paid
    order.paymentStatus = "paid";
    await order.save();
    console.log(`✅ Order ${orderId} manually marked as PAID`);

    // Create rentals
    for (let item of order.items) {
      const product = await Product.findById(item.product);
      
      const rental = new Rental({
        productId: item.product,
        productName: product?.name || "Product",
        productImage: product?.image || "",
        pricePerDay: item.price,
        days: item.quantity,
        totalPrice: item.price * item.quantity,
        userId: order.user,
        address: address || order.address || null
      });

      await rental.save();
      console.log(`✅ Rental created for: ${product?.name}`);
    }

    res.json({ message: "Payment confirmed & rentals created" });

  } catch (error) {
    console.error("❌ Manual confirm error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================
// 5. TEST ENDPOINT (Verify Stripe is working)
// ============================================
router.get("/test-stripe", auth, async (req, res) => {
  try {
    const testSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "inr",
          product_data: { name: "Test Product" },
          unit_amount: 1000, // ₹10
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: "https://rentease2-frontend.onrender.com/success.html",
      cancel_url: "https://rentease2-frontend.onrender.com/checkout.html",
    });
    
    res.json({ 
      success: true, 
      sessionId: testSession.id,
      message: "Stripe is working!"
    });
    
  } catch (error) {
    console.error("Stripe test error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

module.exports = router;