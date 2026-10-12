// server.js
// Main file of our backend. It creates the Express app and all API routes.

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("./db");

const app = express();

// ---------- Middleware ----------
app.use(cors()); // allow the React app (another port) to call this API
app.use(express.json()); // read JSON data sent in the request body

// ---------- Test route ----------
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ---------- REGISTER ----------
// POST /api/register
// Body: { name, email, password }
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check that all fields are filled
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Check if the email is already registered
    const existingUser = await pool.query(
      "SELECT * FROM userss WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 3. Hash (encrypt) the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Save the new user in the database
    const newUser = await pool.query(
      "INSERT INTO userss (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- LOGIN ----------
// POST /api/login
// Body: { email, password }
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check that all fields are filled
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2. Find the user by email
    const result = await pool.query("SELECT * FROM userss WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3. Compare the typed password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 4. Create a JWT token (like a digital ID card) valid for 1 day
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      message: "Login successful",
      token: token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- AUTH MIDDLEWARE ----------
// This function runs BEFORE protected routes.
// It checks if the request has a valid token.
function verifyToken(req, res, next) {
  // The token comes in the header like: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token, access denied" });
  }

  const token = authHeader.split(" ")[1]; // take the part after "Bearer"

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // save user id for the next function
    next(); // token is OK, continue to the route
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// ---------- PROFILE (Protected) ----------
// GET /api/profile
// Header: Authorization: Bearer <token>
app.get("/api/profile", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM userss WHERE id = $1",
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- Start the server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
