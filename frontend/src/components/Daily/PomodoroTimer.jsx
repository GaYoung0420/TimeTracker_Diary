import { useState, useEffect, useRef } from 'react';
import HamsterStudying from './HamsterStudying';
import HamsterFaceIcon from './HamsterFaceIcon';

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds

function PomodoroTimer({ todoText, pomodoroCount, onComplete, onClose }) {
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPIP, setIsPIP] = useState(false);

  const intervalRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            onComplete();
            return POMODORO_DURATION;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, onComplete]);

  // Setup video element for PIP
  useEffect(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');

      const drawFrame = () => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw time
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatTime(timeLeft), canvas.width / 2, canvas.height / 2);

        if (isPIP) {
          requestAnimationFrame(drawFrame);
        }
      };

      if (isPIP) {
        const stream = canvas.captureStream(30);
        videoRef.current.srcObject = stream;
        drawFrame();
      }
    }
  }, [timeLeft, isPIP]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(POMODORO_DURATION);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const togglePIP = async () => {
    if (!isPIP && videoRef.current) {
      try {
        // Wait for video to be ready
        if (videoRef.current.readyState < 2) {
          await new Promise((resolve) => {
            videoRef.current.onloadedmetadata = resolve;
          });
        }
        await videoRef.current.requestPictureInPicture();
        setIsPIP(true);
      } catch (err) {
        console.error('Error entering PIP mode:', err);
      }
    } else if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPIP(false);
    }
  };

  const progress = ((POMODORO_DURATION - timeLeft) / POMODORO_DURATION) * 100;

  return (
    <div className="pomodoro-overlay">
      <div className={`pomodoro-modal ${isFullscreen ? 'fullscreen' : ''}`}>
        <button className="pomodoro-close" onClick={onClose}>×</button>

        <div className="pomodoro-content-wrapper">
          <div className="pomodoro-timer-section">
            <div className="pomodoro-header">
              <div className="pomodoro-todo-title">{todoText}</div>
              <div className="pomodoro-count-display">
                완료한 뽀모도로: {pomodoroCount}개 🍅
              </div>
            </div>

            <div className="pomodoro-circle-container">
              <div className="pomodoro-hamster-wrapper">
                <HamsterStudying isStudying={isRunning && !isPaused} progress={progress} />
              </div>
              <svg className="pomodoro-circle" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="#e0e0e0"
                  strokeWidth="10"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="#ff6b6b"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  strokeDashoffset={`${2 * Math.PI * 90 * (progress / 100)}`}
                  transform="rotate(-90 100 100)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="pomodoro-time">{formatTime(timeLeft)}</div>
            </div>

            <div className="pomodoro-controls">
              {!isRunning ? (
                <button className="pomodoro-btn pomodoro-btn-primary" onClick={handleStart}>
                  시작
                </button>
              ) : isPaused ? (
                <>
                  <button className="pomodoro-btn pomodoro-btn-primary" onClick={handleResume}>
                    재개
                  </button>
                  <button className="pomodoro-btn pomodoro-btn-secondary" onClick={handleReset}>
                    초기화
                  </button>
                </>
              ) : (
                <>
                  <button className="pomodoro-btn pomodoro-btn-secondary" onClick={handlePause}>
                    일시정지
                  </button>
                  <button className="pomodoro-btn pomodoro-btn-secondary" onClick={handleReset}>
                    초기화
                  </button>
                </>
              )}
            </div>

            <div className="pomodoro-actions">
              <button className="pomodoro-action-btn" onClick={toggleFullscreen}>
                {isFullscreen ? '종료' : '전체화면'}
              </button>
              <button className="pomodoro-action-btn" onClick={togglePIP}>
                {isPIP ? 'PIP 종료' : 'PIP'}
              </button>
            </div>
          </div>
        </div>

        {/* Hidden video for PIP */}
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          autoPlay
          muted
          playsInline
        />
      </div>
    </div>
  );
}

export default PomodoroTimer;
