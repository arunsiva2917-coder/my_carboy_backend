// db.js
// This file connects our Node app to the PostgreSQL database.

const { Pool } = require("pg");
require("dotenv").config();

// A "Pool" keeps a few database connections open and reuses them.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test the connection once when the server starts
pool
  .connect()
  .then((client) => {
    console.log("Connected to PostgreSQL database");
    client.release();
  })
  .catch((err) => {
    // err.code is shown when message is empty (e.g. ECONNREFUSED = PostgreSQL is not running)
    console.error("Database connection failed:", err.message || err.code);
  });

module.exports = pool;