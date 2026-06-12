import { useState, useEffect, useRef } from "react";
import axios from "axios";

import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import jsPDF from "jspdf";

import {
  FaCamera,
  FaSmile,
  FaUserCheck,
  FaMicrophone,
  FaStop,
  FaVolumeUp,
} from "react-icons/fa";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { Line } from "react-chartjs-2";

import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [domain, setDomain] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [cameraOn, setCameraOn] =
  useState(false);
  const webcamRef = useRef(null);

const [faceDetected, setFaceDetected] =
  useState(false);

const [expression, setExpression] =
  useState("Unknown");

const [confidence, setConfidence] =
  useState(0);

const [modelsLoaded, setModelsLoaded] =
  useState(false);

const [seconds, setSeconds] =
  useState(0);
  const [history, setHistory] = useState(
    JSON.parse(localStorage.getItem("history")) || []
  );

  const [loadingQuestion, setLoadingQuestion] =
    useState(false);

  const [loadingEvaluation, setLoadingEvaluation] =
    useState(false);

  const [isRecording, setIsRecording] =
    useState(false);


  const [recognition, setRecognition] =
    useState(null);
    const [eyeContact, setEyeContact] = useState("Good");
const [emotionHistory, setEmotionHistory] = useState([]);
const [tabWarnings, setTabWarnings] = useState(0);
const [faceWarnings, setFaceWarnings] = useState(0);

const [integrityScore, setIntegrityScore] =
  useState(100);
  const [fullscreenWarnings, setFullscreenWarnings] =
  useState(0);
  const [violations, setViolations] = useState([]);
  const [lookingAwayWarnings, setLookingAwayWarnings] =
  useState(0);

const [lookingAway, setLookingAway] =
  useState(false);

  const [mediaRecorder, setMediaRecorder] =
  useState(null);

const [recordedChunks, setRecordedChunks] =
  useState([]);

const [isVideoRecording, setIsVideoRecording] =
  useState(false);
  const [videos, setVideos] =
  useState([]);
    // Save history
useEffect(() => {
  localStorage.setItem(
    "history",
    JSON.stringify(history)
  );
}, [history]);

// Interview timer
useEffect(() => {
  let interval;

  if (cameraOn) {
    interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  }

  return () => {
    if (interval) clearInterval(interval);
  };
}, [cameraOn]);

// Load FaceAPI models
useEffect(() => {
  const loadModels = async () => {
    try {
      const MODEL_URL = "/models";

      await faceapi.nets.tinyFaceDetector.loadFromUri(
        MODEL_URL
      );

      await faceapi.nets.faceLandmark68Net.loadFromUri(
        MODEL_URL
      );

      await faceapi.nets.faceExpressionNet.loadFromUri(
        MODEL_URL
      );

      setModelsLoaded(true);

      console.log("Face Models Loaded");
    } catch (err) {
      console.log(err);
    }
  };

  loadModels();
}, []);
useEffect(() => {
  fetchVideos();
}, []);

useEffect(() => {
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {

      alert(
        "⚠ Fullscreen Exited!"
      );

      setFullscreenWarnings(
        (prev) => prev + 1
      );
      addViolation("Fullscreen Exit");

      setIntegrityScore(
        (prev) =>
          Math.max(prev - 5, 0)
      );
    }
  };

  document.addEventListener(
    "fullscreenchange",
    handleFullscreenChange
  );

  return () => {
    document.removeEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );
  };
}, []);

// Run face detection
useEffect(() => {
  if (!modelsLoaded) return;

  const interval = setInterval(() => {
    console.log("Running Face Detection...");
    detectFace();
  }, 1000);

  return () => clearInterval(interval);
}, [modelsLoaded]);
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      alert("⚠ Tab Switching Detected!");

      setTabWarnings((prev) => prev + 1);
      addViolation("Tab Switch");
      setIntegrityScore((prev) =>
  Math.max(prev - 5, 0)
);
    }
  };

  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );

  return () => {
    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
  };
}, []);

  

  const generateQuestion = async () => {
  try {

    setLoadingQuestion(true);

    const response = await axios.post(
      "https://ai-mock-interview-9s7a.onrender.com/generate-question",
      {
        domain,
      }
    );

    console.log(response.data);

    setQuestion(
      response.data.question
    );

    setAnswer("");
    setResult(null);

  } catch (error) {

    console.log(error);

    alert(
      "Failed to generate question"
    );

  } finally {

    setLoadingQuestion(false);

  }
};

const submitAnswer = async () => {
  try {
    setLoadingEvaluation(true);

    const response = await axios.post(
      "https://ai-mock-interview-9s7a.onrender.com/final-score",
      {
        question,
        answer,
      }
    );

    setResult(response.data);

    setHistory((prev) => [
      ...prev,
      response.data.final_score,
    ]);

    // Auto move to next resume question

  } catch (error) {

    console.log(error);

    alert(
      "Failed to evaluate answer"
    );

  } finally {

    setLoadingEvaluation(false);

  }
};
  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech Recognition not supported in this browser"
      );
      return;
    }

    const recog =
      new SpeechRecognition();

    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = (event) => {
      let transcript = "";

      for (
        let i = 0;
        i < event.results.length;
        i++
      ) {
        transcript +=
          event.results[i][0].transcript;
      }

      setAnswer(transcript);
    };

    recog.start();

    setRecognition(recog);
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
    }

    setIsRecording(false);
  };

  const speakQuestion = () => {
    if (!question) return;

    const speech =
      new SpeechSynthesisUtterance(
        question
      );

    speech.rate = 1;
    speech.pitch = 1;

    window.speechSynthesis.speak(
      speech
    );
  };

  const chartData = {
    labels: history.map(
      (_, index) =>
        `Attempt ${index + 1}`
    ),

    datasets: [
      {
        label: "Final Score",
        data: history,
        borderColor: "#38bdf8",
        backgroundColor: "#38bdf8",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,

    plugins: {
      legend: {
        labels: {
          color: "#ffffff",
        },
      },
    },

    scales: {
      x: {
        ticks: {
          color: "#ffffff",
        },
      },

      y: {
        beginAtZero: true,
        max: 100,

        ticks: {
          color: "#ffffff",
        },
      },
    },
  };

  const bestScore =
    history.length > 0
      ? Math.max(...history).toFixed(1)
      : 0;

  const averageScore =
    history.length > 0
      ? (
          history.reduce(
            (a, b) => a + b,
            0
          ) / history.length
        ).toFixed(1)
      : 0;
const startCamera = () => {
  setCameraOn(true);
};

const stopCamera = () => {
  setCameraOn(false);
  setSeconds(0);
};
const detectFace = async () => {
  if (
    webcamRef.current &&
    webcamRef.current.video &&
    webcamRef.current.video.readyState === 4
  ) {
    const video = webcamRef.current.video;

    try {
      const detection = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.2,
          })
        )
        .withFaceLandmarks()
        .withFaceExpressions();
        console.log("Detection Result:", detection);

      if (detection) {
        setFaceDetected(true);

        const expressions = detection.expressions;

        const dominantExpression =
          Object.keys(expressions).reduce((a, b) =>
            expressions[a] > expressions[b] ? a : b
          );

        setExpression(dominantExpression);
        setEmotionHistory((prev) => [
  ...prev,
  dominantExpression,
]);

       const score = Math.round(
  detection.detection.score * 100
);

setConfidence(score);
if (score < 75) {

  setLookingAway(true);

  setLookingAwayWarnings(
    (prev) => prev + 1
  );

  addViolation(
    "Looking Away"
  );

  setIntegrityScore(
    (prev) =>
      Math.max(prev - 1, 0)
  );

} else {

  setLookingAway(false);

}

if (score > 80) {
  setEyeContact("Good");
} else if (score > 50) {
  setEyeContact("Average");
} else {
  setEyeContact("Poor");
}
      } else {
  setFaceDetected(false);

  setExpression("No Face");

  setConfidence(0);

  setFaceWarnings((prev) => prev + 1);
addViolation("Face Missing");
  setIntegrityScore((prev) =>
    Math.max(prev - 2, 0)
  );
}
    } catch (err) {
      console.log(err);
    }
  }
};
const focusScore =
  confidence > 80
    ? 100
    : confidence;

    const addViolation = (message) => {
  const currentTime =
    new Date().toLocaleTimeString();

  setViolations((prev) => [
    ...prev,
    `${currentTime} - ${message}`,
  ]);
};
const downloadReport = () => {
  const doc = new jsPDF();

  doc.setFontSize(18);

  doc.text(
    "AI Mock Interview Report",
    20,
    20
  );

  doc.setFontSize(12);

  doc.text(
    `Domain: ${domain}`,
    20,
    40
  );

  doc.text(
    `Question: ${question}`,
    20,
    55
  );

  doc.text(
    `Final Score: ${
      result?.final_score || 0
    }`,
    20,
    70
  );

  doc.text(
    `Integrity Score: ${
      integrityScore || 100
    }`,
    20,
    85
  );

  doc.text(
    `Expression: ${expression}`,
    20,
    100
  );

  doc.text(
    `Feedback: ${
      result?.feedback || ""
    }`,
    20,
    120,
    {
      maxWidth: 160,
    }
  );

  doc.save(
    "Interview_Report.pdf"
  );
};

const startVideoRecording = () => {
  if (!webcamRef.current) return;

  const stream =
    webcamRef.current.video.srcObject;

  const recorder =
    new MediaRecorder(stream);

  let chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    setRecordedChunks(chunks);
  };

  recorder.start();

  setMediaRecorder(recorder);
  setIsVideoRecording(true);
};
const downloadRecording = () => {
  if (recordedChunks.length === 0) return;

  const blob = new Blob(recordedChunks, {
    type: "video/webm",
  });

  const url =
    window.URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    "Interview_Recording.webm";

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  window.URL.revokeObjectURL(url);
};
const stopVideoRecording = () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
  }

  setIsVideoRecording(false);
};
const uploadRecording = async () => {
  if (recordedChunks.length === 0) {
    alert("No recording found");
    return;
  }

  const blob = new Blob(
    recordedChunks,
    {
      type: "video/webm",
    }
  );

  const formData =
    new FormData();

  formData.append(
    "file",
    blob,
    "interview.webm"
  );

  try {
    const response =
      await axios.post(
        "https://ai-mock-interview-9s7a.onrender.com/upload-video",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

    console.log(
      response.data
    );

    alert(
      "Video Uploaded Successfully!"
    );
    fetchVideos();
  } catch (error) {
    console.log(error);

    alert(
      "Upload Failed"
    );
  }
};
const fetchVideos = async () => {
  try {
    const response =
      await axios.get(
        "https://ai-mock-interview-9s7a.onrender.com/videos"
      );

    setVideos(
      response.data.videos
    );
  } catch (error) {
    console.log(error);
  }
};

  return (
    <div className="container">

      <h1 className="title">
        🚀 AI Mock Interview Coach
      </h1>


      <div className="card">

        <input
          type="text"
          placeholder="Enter Domain (DSA, HR, System Design)"
          value={domain}
          onChange={(e) =>
            setDomain(e.target.value)
          }
        />
        <button
  onClick={() => {
    document.documentElement.requestFullscreen();
  }}
>
  Enter Fullscreen
</button>

        <button
          onClick={generateQuestion}
          disabled={loadingQuestion}
        >
          {loadingQuestion
            ? "Generating..."
            : "Generate Question"}
        </button>

        {question && (
  <div className="question-box">
    {question}
  </div>
)}
        

        {question && (
          <>
            <textarea
              rows="8"
              placeholder="Write your answer here..."
              value={answer}
              onChange={(e) =>
                setAnswer(e.target.value)
              }
            />

            <div className="voice-buttons">

              {!isRecording ? (
                <button
                  className="voice-btn"
                  onClick={startRecording}
                >
                  <FaMicrophone />
                  Start Speaking
                </button>
              ) : (
                <button
                  className="voice-btn stop"
                  onClick={stopRecording}
                >
                  <FaStop />
                  Stop Recording
                </button>
              )}

              <button
                className="voice-btn"
                onClick={speakQuestion}
              >
                <FaVolumeUp />
                Read Question
              </button>

            </div>

            <button
              onClick={submitAnswer}
              disabled={
                loadingEvaluation
              }
            >
              {loadingEvaluation
                ? "Analyzing..."
                : "Analyze My Answer"}
            </button>
            
          </>
        )}
      </div>
<div className="card">

  <h2 className="section-title">
    🎥 AI Interview Monitor
  </h2>

  <div className="monitor-grid">

    <div className="webcam-box">
     <Webcam
  ref={webcamRef}
  audio={false}
  mirrored={false}
  screenshotFormat="image/jpeg"
  videoConstraints={{
    width: 640,
    height: 480,
    facingMode: "user",
  }}
  onUserMedia={() => {
    console.log("Camera Ready");
  }}
/>


<div className="voice-buttons">

  {!isVideoRecording ? (

    <button
      onClick={startVideoRecording}
    >
      🎥 Start Recording
    </button>

  ) : (

    <button
      onClick={stopVideoRecording}
    >
      ⏹ Stop Recording
    </button>

  )}

  <button
    onClick={downloadRecording}
  >
    ⬇ Download Recording
  </button>
  <button
  onClick={uploadRecording}
>
  ☁ Upload Recording
</button>

</div>
    </div>

    <div className="monitor-stats">

      <div className="monitor-card">
        <FaCamera />
        <h3>Face Status</h3>

        <p>
          {faceDetected
            ? "Detected ✅"
            : "Not Found ❌"}
        </p>
      </div>


      <div className="monitor-card">
        <FaSmile />
        <h3>Expression</h3>

        <p>{expression}</p>
      </div>

      <div className="monitor-card">
        <FaUserCheck />
        <h3>Confidence</h3>

        <p>{confidence}%</p>
      </div>
      <div className="monitor-card">
  <h3>👀 Eye Contact</h3>
  <p>{eyeContact}</p>
</div>
<div className="monitor-card">
  <h3>🎯 Focus Score</h3>
  <p>{focusScore}%</p>

  <div className="card">

  <h2 className="section-title">
    😊 Emotion History
  </h2>
  <div className="card">

  <h2 className="section-title">
    🛡 AI Proctoring
  </h2>

  <div className="result-grid">

    <div className="monitor-card">
      <h3>Tab Switches</h3>
      <p>{tabWarnings}</p>
    </div>

    <div className="monitor-card">
      <h3>Face Missing</h3>
      <p>{faceWarnings}</p>
    </div>

    <div className="monitor-card">
      <h3>Fullscreen Exits</h3>
      <p>{fullscreenWarnings}</p>
    </div>

    <div className="monitor-card">
      <h3>Looking Away</h3>
      <p>{lookingAwayWarnings}</p>
    </div>

    <div className="monitor-card">
      <h3>Current Status</h3>

      <p>
        {lookingAway
          ? "⚠ Looking Away"
          : "✅ Focused"}
      </p>
    </div>

    <div className="monitor-card">
      <h3>Integrity Score</h3>
      <p>{integrityScore}%</p>
    </div>

  </div>

</div>

  <div className="history-list">

    {emotionHistory.length === 0 ? (
      <p>No emotions detected yet</p>
    ) : (
      emotionHistory
        .slice(-10)
        .map((emotion, index) => (
          <p key={index}>
            {index + 1}. {emotion}
          </p>
        ))
    )}

  </div>

</div>
</div>

    </div>

  </div>

</div>

<div className="card">

  <h2 className="section-title">
    🎥 Previous Interviews
  </h2>

  {videos.length === 0 ? (

    <p>
      No interview recordings found.
    </p>

  ) : (

    videos.map(
      (video, index) => (

        <div
          key={index}
          style={{
            marginBottom: "20px",
          }}
        >

          <video
            controls
            width="100%"
            src={`https://ai-mock-interview-9s7a.onrender.com/uploads/${video}`}
          />

          <p>
            {video}
          </p>

        </div>

      )
    )

  )}

</div>
      {result && (
        <div className="card">

          <h2 className="section-title">
            📊 Performance Analysis
          </h2>

          <div className="result-grid">

            <div className="score-card">
              <h3>🤖 LLM Score</h3>
              <h2>
                {Math.round(
                  result.llm_score
                )}
              </h2>
            </div>

            <div className="score-card">
              <h3>🔑 Keyword Score</h3>
              <h2>
                {Math.round(
                  result.keyword_score
                )}
              </h2>
            </div>

            <div className="score-card">
              <h3>🏆 Final Score</h3>
              <h2>
                {Math.round(
                  result.final_score
                )}
              </h2>
            </div>

          </div>

          <div className="result-grid">

            <div className="score-card">
              <h3>Total Attempts</h3>
              <h2>
                {history.length}
              </h2>
            </div>

            <div className="score-card">
              <h3>Best Score</h3>
              <h2>{bestScore}</h2>
            </div>

            <div className="score-card">
              <h3>Average Score</h3>
              <h2>{averageScore}</h2>
            </div>

          </div>

          <div className="progress-section">

            <div className="progress-label">
              <span>LLM Score</span>
              <span>
                {Math.round(
                  result.llm_score
                )}
                %
              </span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${result.llm_score}%`,
                }}
              />
            </div>

            <div className="progress-label">
              <span>Keyword Score</span>
              <span>
                {Math.round(
                  result.keyword_score
                )}
                %
              </span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${result.keyword_score}%`,
                }}
              />
            </div>

            <div className="progress-label">
              <span>Final Score</span>
              <span>
                {Math.round(
                  result.final_score
                )}
                %
              </span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${result.final_score}%`,
                }}
              />
            </div>

          </div>

          <div className="feedback">
            <h3>💡 AI Feedback</h3>
            <p>
              {result.feedback}
            </p>
          </div>

          <h2 className="section-title">
            📈 Score History
          </h2>

          <ul className="history-list">
            {history.map(
              (score, index) => (
                <li key={index}>
                  Attempt {index + 1}
                  {" → "}
                  {Math.round(score)}
                </li>
              )
            )}
          </ul>

          <div className="chart-container">
            <Line
              data={chartData}
              options={chartOptions}
            />
          </div>

          <button
            onClick={() => {
              setHistory([]);
              localStorage.removeItem(
                "history"
              );
            }}
          >
            Clear History
          </button>
          <button
  onClick={downloadReport}
>
  📄 Download Report
</button>

        </div>
      )}
    </div>
  );
}

export default App;