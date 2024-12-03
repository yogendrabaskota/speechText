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
      // Request permission to access the microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      // Reset audioChunks state before starting new recording
      setAudioChunks([]);

      // Collect audio data as it's being recorded
      mediaRecorderRef.current.ondataavailable = (event) => {
        setAudioChunks((prevChunks) => [...prevChunks, event.data]);
      };

      // When recording stops, process the audio
      mediaRecorderRef.current.onstop = handleRecordingStop;

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(""); // Clear previous errors if any
    } catch (err) {
      setError("Failed to start recording: " + err.message);
      console.error("Error starting recording:", err);
    }
  };

  // Stop recording
  const handleRecordingStop = () => {
    if (!mediaRecorderRef.current) return;

    // Stop the recording
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  // Send the recorded audio to the backend for transcription
  const handleTranscribeAudio = async () => {
    try {
      if (audioChunks.length === 0) {
        setError("No audio recorded.");
        return;
      }

      // Create a Blob from the recorded audio chunks
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });

      // Log the Blob details for debugging
      console.log("Audio Blob:", audioBlob);
      console.log("Blob Size (bytes):", audioBlob.size);
      console.log("Blob Type:", audioBlob.type);

      // Validate the blob size (e.g., prevent empty files)
      if (audioBlob.size === 0) {
        setError("Recorded audio is empty.");
        return;
      }

      // Create a FormData object and append the audio file
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.wav");

      // Log the FormData details
      console.log("FormData:", formData.get("file"));

      // Send the audio file to the backend using fetch
      const response = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Server Error: ${errorMessage}`);
      }

      // Parse the response JSON and update the state with the transcription
      const result = await response.json();
      if (result.transcription) {
        setTranscription(result.transcription);
        setError(""); // Clear previous errors if transcription is successful
      } else {
        throw new Error(result.error || "An unknown error occurred");
      }
    } catch (err) {
      setError("Failed to transcribe the audio: " + err.message);
      console.error("Error during transcription:", err);
    }
  };

  return (
    <div className="container">
      <h1>Audio Recorder and Transcription</h1>

      {/* Display error message if there is an error */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Recording buttons */}
      {!isRecording ? (
        <button onClick={handleRecordingStart}>Start Recording</button>
      ) : (
        <button onClick={handleRecordingStop}>Stop Recording</button>
      )}

      {/* Transcribe button */}
      {!isRecording && audioChunks.length > 0 && (
        <button onClick={handleTranscribeAudio}>Transcribe Audio</button>
      )}

      {/* Display transcription result */}
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
