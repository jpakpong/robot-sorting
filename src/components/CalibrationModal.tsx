/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Crosshair, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { ProcessedGesture } from '../vision/gestureRecognition';
import { coordinateMapper } from '../vision/coordinateMapping';

interface CalibrationModalProps {
  isOpen: boolean;
  gesture: ProcessedGesture;
  onClose: () => void;
  onCalibrationComplete: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  gesture,
  onClose,
  onCalibrationComplete,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [calibrated, setCalibrated] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(null);
      setCalibrated(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startCountdown = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Capture reference coordinates
      if (gesture.hasHand && gesture.indexTip) {
        coordinateMapper.setCalibration(gesture.indexTip.x, gesture.indexTip.y);
        setCalibrated(true);
        setTimeout(() => {
          onCalibrationComplete();
          onClose();
        }, 1200);
      } else {
        // Fallback default
        coordinateMapper.setCalibration(0.5, 0.5);
        setCalibrated(true);
        setTimeout(() => {
          onCalibrationComplete();
          onClose();
        }, 1200);
      }
    }
  }, [countdown, gesture, onCalibrationComplete, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col items-center text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20 mb-4">
          <Crosshair className="w-7 h-7" />
        </div>

        <h3 className="font-tech text-lg font-bold text-white uppercase tracking-wider">
          CAMERA WORKSPACE CALIBRATION
        </h3>
        <p className="text-xs text-slate-300 mt-1 mb-5">
          Align your hand to calibrate the neutral center point and set natural index finger movement bounds.
        </p>

        {/* Live Target Center Reticle */}
        <div className="relative w-48 h-48 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center mb-5 overflow-hidden">
          {/* Target grid crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-px bg-cyan-500/30" />
            <div className="h-full w-px bg-cyan-500/30 absolute" />
            <div className="w-24 h-24 rounded-full border border-cyan-500/30" />
            <div className="w-12 h-12 rounded-full border border-cyan-500/50" />
          </div>

          {/* Current Index Tip position dot */}
          {gesture.hasHand && gesture.indexTip ? (
            <div
              className="absolute w-4 h-4 bg-cyan-400 rounded-full border-2 border-white shadow-[0_0_12px_#06b6d4] transition-all duration-75"
              style={{
                left: `${gesture.indexTip.x * 100}%`,
                top: `${gesture.indexTip.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ) : (
            <div className="text-[11px] text-amber-400 font-mono z-10 px-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Position index finger in view</span>
            </div>
          )}

          {/* Countdown overlay */}
          {countdown !== null && countdown > 0 && (
            <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-20">
              <span className="font-mono text-5xl font-bold text-cyan-400 animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {/* Calibrated Success check */}
          {calibrated && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center z-20 text-emerald-400 gap-2">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
              <span className="font-tech text-xs font-bold uppercase tracking-wider">
                CALIBRATION LOCKED!
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {countdown === null && !calibrated && (
          <div className="flex gap-3 w-full">
            <button
              onClick={() => {
                coordinateMapper.resetCalibration();
                onCalibrationComplete();
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer border border-slate-700 transition-all"
            >
              RESET DEFAULT
            </button>
            <button
              onClick={startCountdown}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-tech font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-600/30 transition-all"
            >
              LOCK CENTER POINT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
