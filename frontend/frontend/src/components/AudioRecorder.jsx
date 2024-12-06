import { useState, useRef } from "react";

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);

  // Start recording
  const handleRecordingStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" }); // WebM format

      setAudioChunks([]);
      mediaRecorderRef.current.ondataavailable = (event) => {
        setAudioChunks((prevChunks) => [...prevChunks, event.data]);
      };

      mediaRecorderRef.current.onstop = handleRecordingStop;
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(""); // Clear any previous error
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
      console.error("Error starting recording:", err);
    }
  };

  // Stop recording
  const handleRecordingStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send the recorded audio to the backend for transcription
  const handleTranscribeAudio = async () => {
    try {
      if (audioChunks.length === 0) {
        setError("No audio recorded to transcribe.");
        return;
      }

      const audioBlob = new Blob(audioChunks, { type: "audio/webm" }); // Ensure the correct format is sent

      // Create a FormData object and append the WebM file
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm"); // Send WebM format to the backend

      const response = await fetch("http://localhost:3000/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Server Error: ${errorMessage}`);
      }

      const result = await response.json();
      if (result.transcription) {
        setTranscription(result.transcription);
      } else {
        throw new Error(result.error || "An unknown error occurred");
      }
    } catch (err) {
      setError(`Failed to transcribe the audio: ${err.message}`);
      console.error("Error during transcription:", err);
    }
  };

  return (
    <div className="container">
      <h1>Audio Recorder and Transcription</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {!isRecording ? (
        <button onClick={handleRecordingStart}>Start Recording</button>
      ) : (
        <button onClick={handleRecordingStop}>Stop Recording</button>
      )}
      {!isRecording && audioChunks.length > 0 && (
        <button onClick={handleTranscribeAudio}>Transcribe Audio</button>
      )}
      {transcription && (
        <div>
          <h2>Transcription:</h2>
          <p>{transcription}</p>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
