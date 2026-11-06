/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Hand,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Move,
  Minimize2,
  Maximize2,
  HandMetal,
} from 'lucide-react';
import { ProcessedGesture } from '../vision/gestureRecognition';

interface GestureStatusProps {
  gesture: ProcessedGesture;
  isGripperClosed: boolean;
  isRobotPaused: boolean;
  useMouseFallback: boolean;
}

export const GestureStatus: React.FC<GestureStatusProps> = ({
  gesture,
  isGripperClosed,
  isRobotPaused,
  useMouseFallback,
}) => {
  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Telemetry Status Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Hand Detection */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
            <span>Hand Detection</span>
            <Hand className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {gesture.hasHand ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]" />
                <span className="font-tech text-xs font-bold text-emerald-400">DETECTED</span>
              </>
            ) : useMouseFallback ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-tech text-xs font-bold text-amber-400">MOUSE MODE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-tech text-xs font-bold text-rose-400">NOT FOUND</span>
              </>
            )}
          </div>
        </div>

        {/* Index Tracking */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
            <span>Index Tip (ID:8)</span>
            <Move className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {gesture.hasHand && gesture.indexTip ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-tech text-xs font-bold text-cyan-300">
                  X:{Math.round(gesture.indexTip.x * 100)}% Y:
                  {Math.round(gesture.indexTip.y * 100)}%
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-tech text-xs font-bold text-slate-500">STANDBY</span>
              </>
            )}
          </div>
        </div>

        {/* Gripper State */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
            <span>Gripper State</span>
            {isGripperClosed ? (
              <Minimize2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <Maximize2 className="w-3 h-3 text-amber-400" />
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isGripperClosed ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]' : 'bg-amber-400'
              }`}
            />
            <span
              className={`font-tech text-xs font-bold ${
                isGripperClosed ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isGripperClosed ? 'CLOSED (HOLDING)' : 'OPEN (RELEASED)'}
            </span>
          </div>
        </div>

        {/* Robot State */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
            <span>Robot Motion</span>
            {isRobotPaused ? (
              <PauseCircle className="w-3 h-3 text-rose-400" />
            ) : (
              <PlayCircle className="w-3 h-3 text-emerald-400" />
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isRobotPaused ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`font-tech text-xs font-bold ${
                isRobotPaused ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isRobotPaused ? 'FIST PAUSE' : 'ACTIVE / ONLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Pinch Proximity Analog Gauge */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5 shadow-md">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">PINCH PROXIMITY METER</span>
          <span
            className={`font-bold ${
              gesture.isPinched ? 'text-emerald-400' : 'text-cyan-400'
            }`}
          >
            {Math.round(gesture.pinchRatio * 100)}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              gesture.isPinched
                ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_10px_#22c55e]'
                : gesture.pinchRatio > 0.6
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                : 'bg-gradient-to-r from-cyan-600 to-blue-500'
            }`}
            style={{ width: `${Math.max(5, gesture.pinchRatio * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>OPEN (0%)</span>
          <span className="text-emerald-500 font-semibold">PINCH THRESHOLD (80%)</span>
          <span>LOCK (100%)</span>
        </div>
      </div>

      {/* Gesture Instruction Legend Cards */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="font-tech text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <HandMetal className="w-3.5 h-3.5 text-cyan-400" />
          <span>GESTURE CONTROLS QUICK GUIDE</span>
        </div>

        {useMouseFallback ? (
          <div className="flex flex-col gap-1.5 p-2 bg-amber-950/40 border border-amber-600/40 rounded-lg text-[11px] font-mono text-amber-200">
            <div className="font-bold flex items-center gap-1 text-amber-300">
              <Move className="w-3.5 h-3.5" />
              <span>MOUSE & TOUCH CONTROLS ACTIVE</span>
            </div>
            <div>• <strong className="text-white">Mouse:</strong> Click + HOLD to pick box, RELEASE to drop into bin.</div>
            <div>• <strong className="text-white">Touch (iPad):</strong> Drag finger to move arm; tap dedicated button to open/close gripper.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Move */}
            <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
              <div className="w-6 h-6 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0">
                <Move className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-tech font-bold text-slate-200 text-[11px]">INDEX FINGER</div>
                <div className="text-[10px] text-slate-400">Moves End-Effector</div>
              </div>
            </div>

            {/* Pinch */}
            <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
              <div className="w-6 h-6 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0">
                <Minimize2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-tech font-bold text-slate-200 text-[11px]">PINCH THUMB+INDEX</div>
                <div className="text-[10px] text-slate-400">Closes Gripper (Pick)</div>
              </div>
            </div>

            {/* Release */}
            <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
              <div className="w-6 h-6 rounded bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center shrink-0">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-tech font-bold text-slate-200 text-[11px]">RELEASE PINCH</div>
                <div className="text-[10px] text-slate-400">Opens Gripper (Drop)</div>
              </div>
            </div>

            {/* Fist */}
            <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
              <div className="w-6 h-6 rounded bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0">
                <PauseCircle className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-tech font-bold text-slate-200 text-[11px]">CLOSED FIST</div>
                <div className="text-[10px] text-slate-400">Pauses Robot Arm</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
