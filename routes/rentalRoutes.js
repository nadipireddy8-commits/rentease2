const express = require("express");
const router = express.Router();
const Rental = require("../models/Rental");
const Product = require("../models/Product");
const auth = require("./auth");


// ============================
// TEST ROUTE (Debug)
// ============================
router.get("/test", (req, res) => {
  res.json({ message: "Rental route working" });
});


// ============================
// CREATE RENTAL
// ============================
router.post("/", auth, async (req, res) => {
  console.log("Decoded user:", req.user);
  try {
    const { productId, tenure } = req.body;

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!product.available) {
      return res.status(400).json({ message: "Product not available" });
    }

    // Validate tenure
    const tenureDays = parseInt(tenure);
    if (isNaN(tenureDays) || tenureDays <= 0) {
      return res.status(400).json({ message: "Invalid tenure" });
    }

    const rentDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(rentDate.getDate() + tenureDays);

    const rental = new Rental({
      productId:req.body.productId,
      userId: req.user.id,
      status: "Active",
      rentDate,
      dueDate,
      tenure: tenureDays,
      lateFee: 0
    });

    await rental.save();

    // Make product unavailable
    product.available = false;
    await product.save();

    res.status(201).json(rental);

  } catch (error) {
    console.error("Create Rental Error:", error);
    res.status(500).json({ message: "Error creating rental" });
  }
});


// ============================
// GET ALL RENTALS (For Logged-in User)
// ============================
router.get("/", auth, async (req, res) => {
  try {
    const rentals = await Rental.find({ userId: req.user._id })
      .populate("productId");

    res.json(rentals);

  } catch (error) {
    console.error("Fetch Rentals Error:", error);
    res.status(500).json({ message: "Error fetching rentals" });
  }
});


// ============================
// RETURN RENTAL
// ============================
router.put("/return/:id", auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Check ownership
    if (rental.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (rental.status === "Returned") {
      return res.status(400).json({ message: "Rental already returned" });
    }

    let lateFee = 0;

    if (new Date() > rental.dueDate) {
      const daysLate = Math.ceil(
        (new Date() - rental.dueDate) / (1000 * 60 * 60 * 24)
      );
      lateFee = daysLate * 100; // ₹100 per day
    }

    rental.status = "Returned";
    rental.returnDate = new Date();
    rental.lateFee = lateFee;

    await rental.save();

    // Make product available again
    await Product.findByIdAndUpdate(rental.productId, {
      available: true
    });

    res.json(rental);

  } catch (error) {
    console.error("Return Rental Error:", error);
    res.status(500).json({ message: "Error returning rental" });
  }
});


// ============================
// CLEAR RENTAL HISTORY (ONLY USER'S)
// ============================
router.delete("/clear-history", auth, async (req, res) => {
  try {
    await Rental.deleteMany({ userId: req.user.id });

    res.json({ message: "Your rental history cleared successfully" });

  } catch (error) {
    console.error("Clear History Error:", error);
    res.status(500).json({ message: "Error clearing history" });
  }
});


module.exports = router;