const mongoose = require("mongoose");
const Product = require("./models/Product");

mongoose.connect("mongodb://127.0.0.1:27017/rentEase");

const products = [];

for (let i = 1; i <= 40; i++) {
  products.push({
    name: "Laptop " + i,
    category: "Electronics",
    rent: 500 + i * 10,
    deposit: 2000 + i * 50,
    image: "/images/lap.png"
  });
}

async function seedData() {
  await Product.deleteMany();
  await Product.insertMany(products);
  console.log("40 Products Added Successfully!");
  process.exit();
}

seedData();