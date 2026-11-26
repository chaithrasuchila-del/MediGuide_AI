require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const healthRoutes = require("./routes/health");
const reminderRoutes = require("./routes/reminders");

const app = express();
const PORT = process.env.PORT || 5000;

// Create data folder and files if missing
const dataDirectory = path.join(__dirname, "data");

if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
}

["users.json", "chats.json", "health.json"].forEach(file => {
    const filePath = path.join(dataDirectory, file);

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]");
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Frontend
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/health-tracker", healthRoutes);
app.use("/api/reminders", reminderRoutes);

//Handle unknown API routes
app.use("/api", (req, res)=>{
    res.status(404).json({
        message: "API route not found."
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "success",
        message: "MediGuide AI server is running",
        database: "JSON file storage"
    });
});

// Handle unknown API routes
app.use("/api", (req, res) => {
    res.status(404).json({
        message: "API route not found."
    });
});

// Start server
if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing in .env");
    process.exit(1);
}

app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log("MediGuide AI server is running");
    console.log(`Website: http://localhost:${PORT}`);
    console.log("Storage: JSON files");
    console.log("--------------------------------");
});