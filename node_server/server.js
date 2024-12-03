const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const app = express();

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Endpoint for file upload and transcription
app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    console.log("File upload request received.");

    if (!req.file) {
      console.error("No file uploaded.");
      return res.status(400).send("No file uploaded.");
    }

    const filePath = req.file.path;
    console.log("File uploaded successfully:", filePath);

    // Prepare form-data for the Python server
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    // Send the file to the Python server
    const response = await axios.post("http://localhost:5000/transcribe", formData, {
      headers: formData.getHeaders(),
    });

    console.log("Response from Python server:", response.data);
    res.status(200).send(response.data);
  } catch (error) {
    console.error("Error during transcription:", error.message);
    if (error.response) {
      console.error("Python server error response:", error.response.data);
    }
    res.status(500).send("An error occurred during transcription.");
  }
});

// Start the Node.js server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Node.js server running on http://localhost:${PORT}`);
});
