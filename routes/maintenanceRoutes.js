const express = require("express");
const router = express.Router();
const Maintenance = require("../models/Maintenance");
const auth = require("./auth");

// Create maintenance request
router.post("/", auth, async (req, res) => {
    try {
        const maintenance = new Maintenance({
            ...req.body,
            userId: req.user.id,
            createdAt: new Date()
        });
        await maintenance.save();
        res.status(201).json(maintenance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's maintenance requests
router.get("/my-requests", auth, async (req, res) => {
    try {
        const requests = await Maintenance.find({ userId: req.user.id });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all maintenance requests (admin)
router.get("/", auth, async (req, res) => {
    try {
        const requests = await Maintenance.find();
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update maintenance status
router.put("/:id", auth, async (req, res) => {
    try {
        const maintenance = await Maintenance.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json(maintenance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;