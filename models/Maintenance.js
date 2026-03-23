const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema({
    rentalId: { type: String, required: true },
    productName: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    issue: { type: String, required: true },
    status: { type: String, enum: ["pending", "in-progress", "resolved"], default: "pending" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Maintenance", maintenanceSchema);