/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { HandTracker, TrackerStatus } from './vision/handTracker';
import { GestureRecognizer, ProcessedGesture } from './vision/gestureRecognition';
import { coordinateMapper } from './vision/coordinateMapping';
import { soundManager } from './audio/soundManager';
import { GameStats, GameStatus } from './types/game';

import { WelcomePage } from './components/WelcomePage';
import { GameHeader } from './components/GameHeader';
import { RobotSimulation } from './components/RobotSimulation';
import { WebcamPanel } from './components/WebcamPanel';
import { GestureStatus } from './components/GestureStatus';
import { CalibrationModal } from './components/CalibrationModal';
import { GameOverModal } from './components/GameOverModal';

export default function App() {
  // Page Navigation State: starts on 'welcome' page before simulation
  const [currentPage, setCurrentPage] = useState<'welcome' | 'simulation'>('welcome');
  const [operatorName, setOperatorName] = useState<string>('');

  // Game & Physics Engine instance
  const engineRef = useRef<GameEngine>(new GameEngine());
  const engine = engineRef.current;

  // Vision & Tracking instances
  const trackerRef = useRef<HandTracker | null>(null);
  const recognizerRef = useRef<GestureRecognizer>(new GestureRecognizer());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // React State for UI
  const [status, setStatus] = useState<GameStatus>('idle');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    sortedCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    accuracy: 0,
    timeRemaining: 180,
    streak: 0,
  });

  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [useMouseFallback, setUseMouseFallback] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);

  const [gesture, setGesture] = useState<ProcessedGesture>({
    hasHand: false,
    isPinched: false,
    isFist: false,
    pinchDistance: 1,
    pinchRatio: 0,
    indexTip: null,
    thumbTip: null,
    handLandmarks: null,
  });

  // Keep track of gripper state in React for immediate UI feedback
  const [isGripperClosed, setIsGripperClosed] = useState<boolean>(false);
  const [isRobotPaused, setIsRobotPaused] = useState<boolean>(false);



  // Initialize tracker instance on mount
  useEffect(() => {
    const tracker = new HandTracker({
      onStatusChange: (newStatus, msg) => {
        setTrackerStatus(newStatus);
        if (msg) setStatusMessage(msg);
        if (newStatus === 'permission_denied' || newStatus === 'no_camera' || newStatus === 'error') {
          setUseMouseFallback(true);
        }
      },
      onResults: (landmarksList) => {
        const processed = recognizerRef.current.process(landmarksList);
        setGesture(processed);

        if (engine.status === 'running' && !useMouseFallback && currentPage === 'simulation') {
          // Closed fist pauses robot
          if (processed.isFist) {
            engine.robot.setPaused(true);
            setIsRobotPaused(true);
          } else {
            engine.robot.setPaused(false);
            setIsRobotPaused(false);

            // If index tip is detected, map coordinates to workspace
            if (processed.indexTip) {
              const mapped = coordinateMapper.mapToWorkspace(
                processed.indexTip.x,
                processed.indexTip.y,
                {
                  canvasWidth: 840,
                  canvasHeight: 560,
                  minX: 110,
                  maxX: 660,
                  minY: 70,
                  maxY: 450,
                }
              );

              engine.robot.setTargetPosition(mapped.x, mapped.y);
            }
          }

          // Handle Gripper Pinch Actuation
          engine.handleGripperInput(processed.isPinched);
          setIsGripperClosed(engine.robot.getGripperClosed());
        }
      },
    });

    trackerRef.current = tracker;

    return () => {
      tracker.destroy();
    };
  }, [engine, useMouseFallback, currentPage]);

  // Main game physics tick loop & state synchronization
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let lastUiSync = 0;

    const gameLoop = (currentTime: number) => {
      const dt = Math.min(32, currentTime - lastTime);
      lastTime = currentTime;

      // Update engine simulation
      engine.update(dt);

      // Throttle React state sync to ~15fps to keep rendering ultra smooth
      if (currentTime - lastUiSync > 66) {
        lastUiSync = currentTime;
        setStatus(engine.status);
        setStats({ ...engine.stats });
        setIsGripperClosed(engine.robot.getGripperClosed());
        setIsRobotPaused(engine.robot.getPaused());
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Keyboard shortcut listener (Spacebar for pinch/grip, Esc for pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentPage !== 'simulation') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const currentClosed = engine.robot.getGripperClosed();
        engine.handleGripperInput(!currentClosed);
        setIsGripperClosed(!currentClosed);
      } else if (e.code === 'Escape') {
        if (engine.status === 'running') {
          engine.pauseGame();
          setStatus('paused');
        } else if (engine.status === 'paused') {
          engine.resumeGame();
          setStatus('running');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, currentPage]);

  // Camera start handler
  const handleStartCamera = useCallback(async () => {
    if (videoRef.current && trackerRef.current) {
      const success = await trackerRef.current.startCamera(videoRef.current);
      if (success) {
        setUseMouseFallback(false);
      }
    }
  }, []);

  // Camera stop handler
  const handleStopCamera = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.stopCamera();
    }
    setGesture({
      hasHand: false,
      isPinched: false,
      isFist: false,
      pinchDistance: 1,
      pinchRatio: 0,
      indexTip: null,
      thumbTip: null,
      handLandmarks: null,
    });
  }, []);

  // Game action controls
  const handleStartGame = () => {
    engine.startGame();
    setStatus('running');
  };

  const handlePauseGame = () => {
    engine.pauseGame();
    setStatus('paused');
  };

  const handleResumeGame = () => {
    engine.resumeGame();
    setStatus('running');
  };

  const handleResetGame = () => {
    engine.resetGame();
    setStatus('idle');
    setStats({ ...engine.stats });
  };

  const handleStopGame = () => {
    engine.stopGame();
    setStatus('idle');
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleMouse = () => {
    const nextState = !useMouseFallback;
    setUseMouseFallback(nextState);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleToggleGripper = () => {
    const isCurrentlyClosed = engine.robot.getGripperClosed();
    engine.handleGripperInput(!isCurrentlyClosed);
    setIsGripperClosed(!isCurrentlyClosed);
  };

  // If user is on Welcome Page, show Entry screen with Operator Name requirement & BUU banner
  if (currentPage === 'welcome') {
    return (
      <WelcomePage
        initialOperatorName={operatorName}
        onStartSimulation={(name) => {
          setOperatorName(name);
          setCurrentPage('simulation');
        }}
      />
    );
  }

  // Simulation Page: Aligned rectangular cockpit tailored for iPad 11-inch & Desktop
  return (
    <div className="h-screen max-h-screen w-full bg-slate-950 flex flex-col font-sans text-slate-100 overflow-hidden select-none selection:bg-cyan-500 selection:text-black">
      {/* 1. Rectangular Header Bar with Burapha University Branding & Aligned Stats Cards */}
      <GameHeader
        stats={stats}
        status={status}
        operatorName={operatorName}
        isMuted={isMuted}
        useMouseFallback={useMouseFallback}
        onStart={handleStartGame}
        onPause={handlePauseGame}
        onResume={handleResumeGame}
        onReset={handleResetGame}
        onStop={handleStopGame}
        onCalibrate={() => setIsCalibrationOpen(true)}
        onToggleMute={handleToggleMute}
        onToggleMouse={handleToggleMouse}
        onToggleFullscreen={handleToggleFullscreen}
        onChangeOperator={() => setCurrentPage('welcome')}
      />

      {/* 2. Main Two-Panel Workspace: Clean aligned rectangular cockpit preserving native aspect ratio */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto p-2 sm:p-2.5 flex flex-col justify-center min-h-0 overflow-y-auto lg:overflow-hidden">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
          {/* LEFT PANEL (~67% width: 8 of 12 columns) - High-Fidelity 2D Robot Workspace */}
          <div className="lg:col-span-8 w-full flex flex-col min-h-0">
            <RobotSimulation
              engine={engine}
              useMouseFallback={useMouseFallback}
              onToggleGripper={handleToggleGripper}
              onCanvasPointerDown={() => {
                setIsGripperClosed(engine.robot.getGripperClosed());
              }}
            />
          </div>

          {/* RIGHT PANEL (~33% width: 4 of 12 columns) - Rectangular Vision & Telemetry Cards */}
          <div className="lg:col-span-4 w-full flex flex-col gap-2 min-h-0">
            {/* Live Webcam Card */}
            <WebcamPanel
              videoRef={videoRef}
              trackerStatus={trackerStatus}
              statusMessage={statusMessage}
              gesture={gesture}
              onStartCamera={handleStartCamera}
              onStopCamera={handleStopCamera}
            />

            {/* Real-time Gesture Telemetry & Instruction Cards */}
            <GestureStatus
              gesture={gesture}
              isGripperClosed={isGripperClosed}
              isRobotPaused={isRobotPaused}
              useMouseFallback={useMouseFallback}
            />

            {/* Institutional Credit Footer */}
            <div
              data-dept="Department of Mechanical Engineering, Faculty of Engineering, Burapha Univerity"
              aria-label="Department of Mechanical Engineering, Faculty of Engineering, Burapha Univerity"
              className="text-center text-[10px] font-mono text-slate-500 py-1 shrink-0"
            >
              Department of Mechanical Engineering, Faculty of Engineering, Burapha University
            </div>
          </div>
        </div>
      </main>

      {/* Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        gesture={gesture}
        onClose={() => setIsCalibrationOpen(false)}
        onCalibrationComplete={() => {
          engine.addFeedback('CALIBRATION UPDATED', 'info', 400, 300);
        }}
      />

      {/* Game Over Shift Debrief Modal */}
      <GameOverModal
        isOpen={status === 'game_over'}
        stats={stats}
        operatorName={operatorName}
        onPlayAgain={handleStartGame}
      />
    </div>
  );
}
