/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Camera, CameraOff, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { TrackerStatus } from '../vision/handTracker';
import { NormalizedLandmark, ProcessedGesture } from '../vision/gestureRecognition';

interface WebcamPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  trackerStatus: TrackerStatus;
  statusMessage?: string;
  gesture: ProcessedGesture;
  onStartCamera: () => void;
  onStopCamera: () => void;
}

// MediaPipe 21 hand landmarks connection pairs
const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  // Index
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  // Middle
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  // Ring
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  // Pinky
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  // Palm Base
  [5, 9],
  [9, 13],
  [13, 17],
];

export const WebcamPanel: React.FC<WebcamPanelProps> = ({
  videoRef,
  trackerStatus,
  statusMessage,
  gesture,
  onStartCamera,
  onStopCamera,
}) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw landmarks on video overlay canvas
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gesture.hasHand && gesture.handLandmarks) {
      const landmarks = gesture.handLandmarks;
      const w = canvas.width;
      const h = canvas.height;

      // Note: We mirror X because front webcam is displayed mirrored (scaleX(-1))
      // So landmark x coordinates match the mirrored video: mirroredX = (1 - lm.x) * w
      const getPt = (lm: NormalizedLandmark) => ({
        x: (1 - lm.x) * w,
        y: lm.y * h,
      });

      // 1. Draw Skeleton Connection Lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.lineWidth = 2;
      HAND_CONNECTIONS.forEach(([i, j]) => {
        const p1 = getPt(landmarks[i]);
        const p2 = getPt(landmarks[j]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // 2. Highlight Pinch Line between Thumb Tip (4) and Index Tip (8)
      const thumbPt = getPt(landmarks[4]);
      const indexPt = getPt(landmarks[8]);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(thumbPt.x, thumbPt.y);
      ctx.lineTo(indexPt.x, indexPt.y);

      if (gesture.isPinched) {
        ctx.strokeStyle = '#22c55e'; // Bright neon green for pinch
        ctx.lineWidth = 4;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = '#f59e0b'; // Amber warning / proximity
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
      }
      ctx.stroke();
      ctx.restore();

      // 3. Draw All Landmark Dots
      landmarks.forEach((lm: NormalizedLandmark, idx: number) => {
        const pt = getPt(lm);
        ctx.beginPath();

        if (idx === 8) {
          // Index tip: Target reticle
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#06b6d4';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Outer pulse ring
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (idx === 4) {
          // Thumb tip
          ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = gesture.isPinched ? '#22c55e' : '#f59e0b';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Other joints
          ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#94a3b8';
          ctx.fill();
        }
      });
    }
  }, [gesture]);

  const isRunning = trackerStatus === 'running';
  const isLoading = trackerStatus === 'loading_model' || trackerStatus === 'requesting_camera';
  const isError =
    trackerStatus === 'permission_denied' ||
    trackerStatus === 'no_camera' ||
    trackerStatus === 'error';

  return (
    <div className="relative w-full bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-xl flex flex-col gap-2">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          <h2 className="font-tech text-xs font-bold text-slate-100 uppercase tracking-wider">
            VISION CONTROLLER (CAMERA)
          </h2>
        </div>

        {isRunning && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE 30FPS
          </div>
        )}
      </div>

      {/* Video Display Container */}
      <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        {/* Video element - mirrored horizontally for intuitive natural hand interaction */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transform -scale-x-100 ${
            isRunning ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Transparent Canvas Overlay for Hand Landmarks */}
        <canvas
          ref={overlayCanvasRef}
          width={400}
          height={300}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* State Overlays when Camera is NOT active */}
        {!isRunning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/95 z-20">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2.5">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <div className="font-tech text-xs text-slate-200 uppercase font-semibold">
                  {statusMessage || 'INITIALIZING VISION ENGINE...'}
                </div>
                <p className="text-[11px] text-slate-400 max-w-[200px]">
                  Downloading MediaPipe hand neural network & requesting camera
                </p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-2 text-rose-400">
                <AlertCircle className="w-8 h-8" />
                <div className="font-tech text-xs font-bold uppercase">CAMERA INITIALIZATION ERROR</div>
                <p className="text-[11px] text-slate-300 max-w-[220px]">
                  {statusMessage || 'Camera access was blocked or is unavailable.'}
                </p>
                <button
                  onClick={onStartCamera}
                  className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-mono border border-slate-700 cursor-pointer"
                >
                  RETRY CAMERA
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="font-tech text-sm font-bold text-slate-100 uppercase">
                  READY TO TRACK
                </div>
                <p className="text-[11px] text-slate-400 max-w-[220px]">
                  Enable your webcam to control the robot arm with index finger & pinch gestures.
                </p>
                <button
                  onClick={onStartCamera}
                  className="mt-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-tech font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-600/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  ENABLE WEBCAM
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hand gesture badge overlay inside video when active */}
        {isRunning && (
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
            {gesture.hasHand ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur rounded-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                {gesture.isFist ? (
                  <span className="text-rose-400 font-bold">FIST DETECTED (PAUSED)</span>
                ) : gesture.isPinched ? (
                  <span className="text-emerald-400 font-bold">PINCH GRIP (CLOSED)</span>
                ) : (
                  <span>INDEX TRACKING (OPEN)</span>
                )}
              </div>
            ) : (
              <div className="px-2 py-1 bg-amber-950/90 backdrop-blur rounded-md border border-amber-600/40 text-[10px] font-mono text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                SHOW HAND IN CAMERA
              </div>
            )}
          </div>
        )}

        {/* Camera Stop button if active */}
        {isRunning && (
          <button
            onClick={onStopCamera}
            className="absolute top-2 right-2 z-20 p-1.5 bg-slate-900/80 hover:bg-rose-950/90 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-lg transition-all cursor-pointer"
            title="Stop Webcam"
          >
            <CameraOff className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
