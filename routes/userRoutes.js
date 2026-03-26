const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password,
      role: "user"
    });

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    console.error("REGISTER ERROR:",error);
    res.status(500).json({ message: error.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({ token,
          user:{
            _id:user._id,
            email:user.email
          }
         });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;