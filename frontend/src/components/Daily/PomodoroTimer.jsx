import { useState, useEffect, useRef } from 'react';
import HamsterStudying from './HamsterStudying';
import HamsterFaceIcon from './HamsterFaceIcon';
import { api } from '../../utils/api';

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds

function PomodoroTimer({ todoId, todoText, pomodoroCount, onComplete, onClose, initialTimeLeft }) {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft || POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPIP, setIsPIP] = useState(false);

  const intervalRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const progress = ((POMODORO_DURATION - timeLeft) / POMODORO_DURATION) * 100;

  // Update timeLeft when initialTimeLeft changes (when reopening the timer)
  useEffect(() => {
    if (initialTimeLeft !== undefined && initialTimeLeft !== null) {
      setTimeLeft(initialTimeLeft);
    }
  }, [initialTimeLeft]);

  // Save pomodoro time to DB
  const savePomodoroTime = async (time) => {
    if (!todoId) return;
    try {
      await api.updateTodo(todoId, { pomodoro_time_left: time });
    } catch (error) {
      console.error('Failed to save pomodoro time:', error);
    }
  };

  // Save time periodically while running (every 5 seconds)
  useEffect(() => {
    if (isRunning && !isPaused) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePomodoroTime(timeLeft);
      }, 5000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [timeLeft, isRunning, isPaused, todoId]);

  // Save time when component unmounts or timer stops
  useEffect(() => {
    return () => {
      if (timeLeft < POMODORO_DURATION && timeLeft > 0) {
        savePomodoroTime(timeLeft);
      }
    };
  }, [timeLeft, todoId]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            // Clear saved time when completed
            savePomodoroTime(null);
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

  // Setup canvas and video stream once
  useEffect(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    // Increase resolution for sharper text
    canvas.width = 800;
    canvas.height = 400;
    canvasRef.current = canvas;

    // Set up the stream once
    const stream = canvas.captureStream(30);
    videoRef.current.srcObject = stream;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Draw frames continuously
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const drawFrame = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background with gradient for better visibility
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#f5f5f5');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw hamster and background elements
      drawScene(ctx, isRunning && !isPaused, progress);

      // Draw time on the right side with higher resolution and anti-aliasing
      ctx.fillStyle = '#1a202c'; // Darker text for better contrast
      ctx.font = 'bold 128px "Outfit", -apple-system, BlinkMacSystemFont, sans-serif'; // Use Outfit font if available
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Enable text smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw todo text at the top
      if (todoText) {
        ctx.fillStyle = '#4a5568';
        ctx.font = '600 33px "Outfit", -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // Add ellipsis if text is too long
        let text = todoText;
        const maxWidth = canvas.width * 0.8;
        if (ctx.measureText(text).width > maxWidth) {
          while (ctx.measureText(text + '...').width > maxWidth && text.length > 0) {
            text = text.slice(0, -1);
          }
          text += '...';
        }
        ctx.fillText(text, canvas.width / 2, 40);
      }

      ctx.fillStyle = '#1a202c'; // Darker text for better contrast
      ctx.font = 'bold 128px "Outfit", -apple-system, BlinkMacSystemFont, sans-serif'; // Use Outfit font if available
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(formatTime(timeLeft), canvas.width * 0.72, canvas.height / 2); // Shift text slightly right

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [timeLeft, isRunning, isPaused, progress, todoText]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const drawScene = (ctx, isStudying, progress) => {
    const scale = 1.2; // Increased scale
    const offsetX = 20; // Adjusted X to center the scene better
    const offsetY = 60; // Adjusted Y to align center with timer text

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // --- Background Elements ---

    // Stack of Books (Left) - translate(40, 130)
    ctx.save();
    ctx.translate(40, 130);
    // Bottom Book
    ctx.fillStyle = '#5D6D7E';
    ctx.beginPath();
    ctx.moveTo(0, 20); ctx.lineTo(50, 20); ctx.lineTo(60, 30); ctx.lineTo(10, 30); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#34495E';
    ctx.fillRect(0, 30, 60, 10);
    ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(10, 20); ctx.stroke();
    
    // Top Book
    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.moveTo(5, 5); ctx.lineTo(55, 5); ctx.lineTo(65, 15); ctx.lineTo(15, 15); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#922B21';
    ctx.fillRect(5, 15, 60, 10);
    ctx.strokeStyle = '#641E16';
    ctx.beginPath(); ctx.moveTo(5, 15); ctx.lineTo(15, 5); ctx.stroke();
    ctx.restore();

    // Loose Papers (Left Front) - translate(30, 160) rotate(-10)
    ctx.save();
    ctx.translate(30, 160);
    ctx.rotate(-10 * Math.PI / 180);
    ctx.fillStyle = '#FDFEFE'; ctx.strokeStyle = '#BDC3C7'; ctx.lineWidth = 1;
    ctx.fillRect(0, 0, 40, 50); ctx.strokeRect(0, 0, 40, 50);
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.moveTo(5, 10); ctx.lineTo(35, 10);
    ctx.moveTo(5, 20); ctx.lineTo(35, 20);
    ctx.moveTo(5, 30); ctx.lineTo(35, 30);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(50, 165);
    ctx.rotate(5 * Math.PI / 180);
    ctx.fillStyle = '#FDFEFE'; ctx.strokeStyle = '#BDC3C7'; ctx.lineWidth = 1;
    ctx.fillRect(0, 0, 40, 50); ctx.strokeRect(0, 0, 40, 50);
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.moveTo(5, 10); ctx.lineTo(35, 10);
    ctx.moveTo(5, 20); ctx.lineTo(35, 20);
    ctx.stroke();
    ctx.restore();

    // Closed Book (Right Front) - translate(200, 160) rotate(5)
    ctx.save();
    ctx.translate(200, 160);
    ctx.rotate(5 * Math.PI / 180);
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, 0); ctx.lineTo(70, 10); ctx.lineTo(10, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6D4C41';
    ctx.fillRect(0, 10, 70, 15);
    ctx.fillStyle = '#FDFEFE';
    ctx.fillRect(2, 12, 66, 11);
    ctx.restore();

    // Coffee Mug (Right) - translate(240, 130)
    ctx.save();
    ctx.translate(240, 130);
    ctx.fillStyle = '#FDFEFE'; ctx.strokeStyle = '#BDC3C7'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(5, 0); ctx.lineTo(35, 0);
    ctx.bezierCurveTo(35, 0, 40, 30, 20, 30);
    ctx.bezierCurveTo(0, 30, 5, 0, 5, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#6F4E37';
    ctx.beginPath(); ctx.ellipse(20, 0, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    
    ctx.strokeStyle = '#FDFEFE'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(35, 5); ctx.bezierCurveTo(45, 5, 45, 20, 35, 20); ctx.stroke();

    // Steam
    if (isStudying) {
      ctx.strokeStyle = '#BDC3C7'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(15, -10); ctx.quadraticCurveTo(20, -15, 15, -20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(25, -8); ctx.quadraticCurveTo(30, -13, 25, -18); ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();


    // --- Hamster ---
    
    // Paws behind body (translate 150 100 centerish)
    // Actually in SVG paws are at end. But to match Z-index properly:
    // Paws are lowest in SVG group if I recall correctly? No, Paws are on top of Face in SVG group?
    // Let's check: Body -> Ears -> Face -> Paws -> Book.
    
    // Body/Head Shape
    ctx.fillStyle = '#F0C987';
    ctx.beginPath();
    ctx.ellipse(150, 110, 60, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // White belly
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(100, 130);
    ctx.quadraticCurveTo(150, 170, 200, 130);
    ctx.fill();

    // Dark stripe on head
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.moveTo(140, 60);
    ctx.quadraticCurveTo(150, 50, 160, 60);
    ctx.lineTo(158, 90);
    ctx.quadraticCurveTo(150, 95, 142, 90);
    ctx.closePath();
    ctx.fill();

    // Ears
    ctx.save();
    ctx.translate(105, 60);
    ctx.rotate(-20 * Math.PI / 180);
    ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E6B0AA'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(195, 60);
    ctx.rotate(20 * Math.PI / 180);
    ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E6B0AA'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Face Group
    // Eyes
    ctx.fillStyle = '#2C3E50';
    ctx.beginPath(); ctx.arc(130, 100, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(170, 100, 4, 0, Math.PI * 2); ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    if (isStudying) {
      ctx.beginPath(); ctx.moveTo(125, 90); ctx.lineTo(135, 95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(175, 90); ctx.lineTo(165, 95); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(125, 90); ctx.lineTo(135, 90); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(165, 90); ctx.lineTo(175, 90); ctx.stroke();
    }

    // Nose
    ctx.fillStyle = '#E6B0AA';
    ctx.beginPath(); ctx.moveTo(148, 108); ctx.lineTo(152, 108); ctx.lineTo(150, 112); ctx.closePath(); ctx.fill();

    // Mouth
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(144, 114);
    ctx.quadraticCurveTo(147, 117, 150, 114);
    ctx.quadraticCurveTo(153, 117, 156, 114);
    ctx.stroke();

    // Glasses
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(130, 100, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(170, 100, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(142, 100); ctx.lineTo(158, 100); ctx.stroke();

    // Paws
    ctx.fillStyle = '#F0C987';
    ctx.beginPath(); ctx.ellipse(125, isStudying ? 145 : 160, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(175, isStudying ? 145 : 160, 8, 6, 0, 0, Math.PI * 2); ctx.fill();

    // Open book when studying (Front Center)
    if (isStudying) {
      ctx.save();
      ctx.translate(110, 140);

      // Left page
      ctx.fillStyle = '#FDFEFE'; ctx.strokeStyle = '#BDC3C7'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 20); ctx.quadraticCurveTo(20, 25, 40, 20);
      ctx.lineTo(40, 5); ctx.quadraticCurveTo(20, 10, 0, 5); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Right page
      ctx.beginPath();
      ctx.moveTo(40, 20); ctx.quadraticCurveTo(60, 25, 80, 20);
      ctx.lineTo(80, 5); ctx.quadraticCurveTo(60, 10, 40, 5); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Spine
      ctx.beginPath(); ctx.moveTo(40, 5); ctx.lineTo(40, 20); ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
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
    // Clear saved time when reset
    savePomodoroTime(null);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const togglePIP = async () => {
    if (!videoRef.current) return;

    try {
      if (!isPIP) {
        // Make sure video is playing before entering PIP
        if (videoRef.current.paused) {
          await videoRef.current.play();
        }

        // Wait for video to be ready with a timeout
        if (videoRef.current.readyState < 2) {
          await Promise.race([
            new Promise((resolve) => {
              videoRef.current.onloadedmetadata = resolve;
            }),
            new Promise((resolve) => setTimeout(resolve, 1000))
          ]);
        }

        await videoRef.current.requestPictureInPicture();
        setIsPIP(true);

        // Listen for PIP exit
        videoRef.current.onleavepictureinpicture = () => {
          setIsPIP(false);
        };
      } else if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPIP(false);
      }
    } catch (err) {
      console.error('Error toggling PIP mode:', err);
      alert('PIP 모드를 실행할 수 없습니다. 브라우저가 PIP를 지원하는지 확인해주세요.');
    }
  };

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
