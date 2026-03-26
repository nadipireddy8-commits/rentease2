const express = require("express");
const router = express.Router();
const Rental = require("../models/Rental");
const auth = require("./auth");

// ✅ GET ALL rentals (no userId needed)
router.get("/", async (req, res) => {
  try {
    const rentals = await Rental.find();
    console.log("Returning all rentals:", rentals.length);
    res.json(rentals);
  } catch (err) {
    console.error("Error fetching rentals:", err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ GET rentals by userId (for user page)
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const rentals = await Rental.find({ userId: userId });
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE rental
router.post("/", async (req, res) => {
  try {
    const rental = new Rental({
      productId: req.body.productId,
      productName: req.body.productName,
      productImage: req.body.productImage,
      pricePerDay: req.body.pricePerDay,
      days: req.body.days,
      totalPrice: req.body.totalPrice,
      userId: req.body.userId,
      address: req.body.address || null
    });
    await rental.save();
    res.status(201).json(rental);
  } catch (err) {
    console.error("Error creating rental:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE rental
router.delete("/:id", async (req, res) => {
  try {
    await Rental.findByIdAndDelete(req.params.id);
    res.json({ message: "Rental deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SCHEDULE RETURN
router.post("/schedule-return/:rentalId", auth, async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { returnDate } = req.body;
    
    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }
    
    rental.returnScheduled = returnDate;
    rental.returnStatus = "scheduled";
    await rental.save();
    
    res.json({ success: true, message: "Return scheduled successfully" });
    
  } catch (error) {
    console.error("Schedule return error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;