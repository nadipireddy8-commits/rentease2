const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema({
    rentalId: String,
    issue: String,
    status: { type: String, default: "Pending" }
});

module.exports = mongoose.model("Maintenance", maintenanceSchema);