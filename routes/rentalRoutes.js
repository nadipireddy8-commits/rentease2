const express = require("express");
const router = express.Router();
const Rental = require("../models/Rental");
const auth=require("./auth");

// ✅ GET rentals by userId
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ message: "UserId required" });
    }

    const rentals = await Rental.find({ userId: userId });
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ CREATE rental
// routes/rentalRoutes.js
router.post("/", async (req, res) => {
  try {
    console.log("Creating rental:", req.body);
    
    const rental = new Rental({
      productId: req.body.productId,
      productName: req.body.productName,
      productImage: req.body.productImage,
      pricePerDay: req.body.pricePerDay,
      days: req.body.days,
      totalPrice: req.body.totalPrice,
      userId: req.body.userId
    });

    await rental.save();
    res.status(201).json(rental);
  } catch (err) {
    console.error("Error creating rental:", err);
    res.status(500).json({ message: err.message });
  }
});
// ✅ DELETE rental
router.delete("/:id", async (req, res) => {
  try {
    await Rental.findByIdAndDelete(req.params.id);
    res.json({ message: "Rental deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Schedule return for rental
router.post("/schedule-return/:rentalId", auth, async (req, res) => {
    try {
        const { rentalId } = req.params;
        const { returnDate } = req.body;
        
        const rental = await Rental.findById(rentalId);
        if (!rental) {
            return res.status(404).json({ message: "Rental not found" });
        }
        
        // Update rental with return schedule
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