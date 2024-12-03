// src/components/FileUploadForm.jsx
import { useState } from "react";

const FileUploadForm = () => {
  const [file, setFile] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setTranscription(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe the file.");
      }

      const result = await response.json();
      if (result.transcription) {
        setTranscription(result.transcription);
      } else {
        throw new Error(result.error || "An error occurred");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Upload .wav File for Transcription</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".wav" onChange={handleFileChange} />
        <button type="submit" disabled={loading}>
          {loading ? "Transcribing..." : "Upload and Transcribe"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {transcription && <p>Transcription: {transcription}</p>}
    </div>
  );
};

export default FileUploadForm;
