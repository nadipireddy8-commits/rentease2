const express = require("express");
const router = express.Router();
const Rental = require("../models/Rental");
const auth=require("./auth");
const Product=require("../models/Product");


// Admin Dashboard Stats
router.get("/stats",auth, async (req, res) => {
  try {
    const totalRentals = await Rental.countDocuments();
    const active = await Rental.countDocuments({ status: "Active" });
    const returned = await Rental.countDocuments({ status: "Returned" });

    const revenue = await Rental.aggregate([
      { $group: { _id: null, total: { $sum: "$lateFee" } } }
    ]);

    res.json({
      totalRentals,
      active,
      returned,
      revenue: revenue[0]?.total || 0
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching stats" });
  }
});

module.exports = router;