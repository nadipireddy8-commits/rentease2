const express = require("express");
const router = express.Router();
const Maintenance = require("../models/Maintenance");

// Create Request
router.post("/", async (req, res) => {
    const request = new Maintenance(req.body);
    await request.save();
    res.json(request);
});

// Get All Requests (Admin)
router.get("/", async (req, res) => {
    const requests = await Maintenance.find();
    res.json(requests);
});

module.exports = router;