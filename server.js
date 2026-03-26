require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "https://rentease2-frontend.onrender.com",
  credentials: true
}));
app.use(express.json());
app.use(express.static("public"));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ========== LOAD ROUTES (ONCE) ==========
console.log("Loading routes...");

// Users route
app.use("/api/users", require("./routes/userRoutes"));
console.log("✅ Users route loaded");

// Orders route
app.use("/api/orders", require("./routes/orderRoutes"));
console.log("✅ Orders route loaded");

// Rentals route
app.use("/api/rentals", require("./routes/rentalRoutes"));
console.log("✅ Rentals route loaded");

// Products route
app.use("/api/products", require("./routes/productRoutes"));
console.log("✅ Products route loaded");

// Payments route
app.use("/api/payments", require("./routes/paymentRoutes"));
console.log("✅ Payments route loaded");

// Maintenance route
app.use("/api/maintenance", require("./routes/maintenanceRoutes"));
console.log("✅ Maintenance route loaded");

// Admin route
app.use("/api/admin", require("./routes/adminRoutes"));
console.log("✅ Admin route loaded");

// Test Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// 404 Handler (keep at the end)
app.use((req, res) => {
  res.status(404).json({ message: "Route Not Found" });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});