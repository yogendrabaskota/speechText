const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const cors = require("cors");

const app = express();

// Configure CORS
app.use(
  cors({
    origin: "http://localhost:5173", // Update with your frontend origin
    methods: ["GET", "POST"], // Allow GET and POST methods
    allowedHeaders: ["Content-Type"], // Allow Content-Type header
  })
);

// Configure multer for .wav files
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

// File filter to only accept .wav files
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["audio/wav", "audio/x-wav", "audio/vnd.wave", "audio/wave"];
  console.log("Received MIME type:", file.mimetype);
  if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
  } else {
      cb(new Error("Invalid file format. Only .wav files are allowed."), false);
  }
};



const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB file size limit
  fileFilter: fileFilter,
});

// Middleware for file upload handling
const uploadHandler = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      console.error("Unknown error during upload:", err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Endpoint for .wav file transcription
app.post("/transcribe", uploadHandler, async (req, res) => {
  try {
    console.log("File upload request received.");

    if (!req.file) {
      console.error("No file uploaded.");
      return res.status(400).json({ error: "No file uploaded." });
    }

    const filePath = req.file.path;
    console.log(`File uploaded successfully. Saved at: ${filePath}`);

    // Prepare form-data to send the file to the Python server
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    // Send the .wav file to the Python server
    const response = await axios.post("http://localhost:5000/transcribe", formData, {
      headers: formData.getHeaders(),
    });

    console.log("Response from Python server:", response.data);

    // Send the transcription response to the client
    res.status(200).json(response.data);

    // Delete the uploaded .wav file after processing
    fs.unlinkSync(filePath);
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
