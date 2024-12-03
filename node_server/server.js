const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".wav"; // Default to .wav if no extension
    const filename = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
});

// Middleware for error handling during file upload
const uploadHandler = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      console.error("Multer error:", err.message);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      // Other errors
      console.error("Unknown error during upload:", err.message);
      return res.status(500).json({ error: "Internal server error during upload" });
    }
    next();
  });
};

// Endpoint for file upload and transcription
app.post("/transcribe", uploadHandler, async (req, res) => {
  try {
    console.log("File upload request received.");

    if (!req.file) {
      console.error("No file uploaded.");
      return res.status(400).json({ error: "No file uploaded." });
    }

    const filePath = req.file.path;
    console.log(`File uploaded successfully. Saved at: ${filePath}`);

    // Prepare form-data for the Python server
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    // Send the file to the Python server
    const response = await axios.post("http://localhost:5000/transcribe", formData, {
      headers: formData.getHeaders(),
    });

    console.log("Response from Python server:", response.data);

    // Send the transcription response to the client
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error during transcription:", error.message);

    // Handle Python server errors
    if (error.response) {
      console.error("Python server error response:", error.response.data);
      return res.status(500).json({ error: error.response.data });
    }

    // Generic error response
    res.status(500).json({ error: "An error occurred during transcription." });
  }
});

// Catch-all route for unhandled paths
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Start the Node.js server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Node.js server running on http://localhost:${PORT}`);
});
