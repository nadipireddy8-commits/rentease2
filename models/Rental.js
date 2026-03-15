const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    productImage: {
      type: String,
      required: true
    },
    pricePerDay: {
      type: Number,
      required: true
    },
    days: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    userId: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);