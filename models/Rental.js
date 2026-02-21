const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["Active", "Returned"],
    default: "Active"
  },
  rentDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date
  },
  tenure: {
    type: Number,
    required: true
  },
  lateFee: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("Rental", rentalSchema);