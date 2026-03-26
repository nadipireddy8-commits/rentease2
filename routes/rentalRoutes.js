
const express = require("express");
const router = express.Router();
const Rental = require("../models/Rental");
const auth = require("./auth");

// ✅ GET rentals - ONLY for logged-in user
router.get("/", auth, async (req, res) => {
  try {
    // Get userId from the token, NOT from request body
    const userId = req.user.id;
    const rentals = await Rental.find({ userId: userId });
    console.log(`✅ Found ${rentals.length} rentals for user ${userId}`);
    res.json(rentals);
  } catch (err) {
    console.error("Error fetching rentals:", err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ CREATE rental
router.post("/", auth, async (req, res) => {
  try {
    console.log("Creating rental:", req.body);
    
    const rental = new Rental({
      productId: req.body.productId,
      productName: req.body.productName,
      productImage: req.body.productImage,
      pricePerDay: req.body.pricePerDay,
      days: req.body.days,
      totalPrice: req.body.totalPrice,
      userId: req.user.id,  // ← Use userId from token, not from body
      address: req.body.address || null
    });

    await rental.save();
    res.status(201).json(rental);
  } catch (err) {
    console.error("Error creating rental:", err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ DELETE rental
router.delete("/:id", auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }
    
    // Check if user owns this rental
    if (rental.userId !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own rentals" });
    }
    
    await rental.deleteOne();
    res.json({ message: "Rental deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ SCHEDULE RETURN
router.post("/schedule-return/:rentalId", auth, async (req, res) => {
    try {
        const { rentalId } = req.params;
        const { returnDate } = req.body;
        
        const rental = await Rental.findById(rentalId);
        if (!rental) {
            return res.status(404).json({ message: "Rental not found" });
        }
        
        // Check if user owns this rental
        if (rental.userId !== req.user.id) {
            return res.status(403).json({ message: "You can only schedule return for your own rentals" });
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