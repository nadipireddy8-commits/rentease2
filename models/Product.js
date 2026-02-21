const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  rent: Number,
  deposit: Number,
  image: String,
  available: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("Product", productSchema);