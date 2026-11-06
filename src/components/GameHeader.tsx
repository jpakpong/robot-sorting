/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Crosshair,
  Volume2,
  VolumeX,
  MousePointer,
  Touchpad,
  Camera,
  Maximize2,
  CheckCircle2,
  Clock,
  Award,
  Target,
} from 'lucide-react';
import { GameStats, GameStatus } from '../types/game';

interface GameHeaderProps {
  stats: GameStats;
  status: GameStatus;
  isMuted: boolean;
  useMouseFallback: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStop: () => void;
  onCalibrate: () => void;
  onToggleMute: () => void;
  onToggleMouse: () => void;
  onToggleFullscreen: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  stats,
  status,
  isMuted,
  useMouseFallback,
  onStart,
  onPause,
  onResume,
  onReset,
  onStop,
  onCalibrate,
  onToggleMute,
  onToggleMouse,
  onToggleFullscreen,
}) => {
  const isTimeCritical = stats.timeRemaining <= 20 && stats.timeRemaining > 0;
  const minutes = Math.floor(stats.timeRemaining / 60);
  const seconds = stats.timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <header className="h-20 bg-slate-900 border-b border-slate-800 px-3 md:px-6 flex items-center justify-between text-white shadow-xl select-none relative z-20">
      {/* Brand & Mode */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
          <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-tech text-base md:text-lg font-bold tracking-wider text-slate-100 uppercase">
              SORTING SIMULATION
            </h1>
            <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 hidden sm:inline-block">
              2R Robotic Arm
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden lg:block">
            Vision Gestures & Touch/Mouse Controlled Industrial Pick-and-Place
          </p>
        </div>
      </div>

      {/* Center Dashboard Statistics */}
      <div className="flex items-center gap-3 md:gap-5 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800/80 shadow-inner">
        {/* Time Remaining (3 Min Countdown M:SS) */}
        <div className="flex items-center gap-2">
          <Clock
            className={`w-4 h-4 ${
              isTimeCritical ? 'text-red-500 animate-bounce' : 'text-cyan-400'
            }`}
          />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Shift Time</div>
            <div
              className={`font-mono text-base md:text-lg font-bold leading-none ${
                isTimeCritical ? 'text-red-400 animate-pulse' : 'text-slate-100'
              }`}
            >
              {formattedTime}
            </div>
          </div>
        </div>

        <div className="w-px h-7 bg-slate-800" />

        {/* Score */}
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Score</div>
            <div className="font-mono text-base md:text-lg font-bold leading-none text-amber-300">
              {stats.score}
            </div>
          </div>
        </div>

        <div className="w-px h-7 bg-slate-800" />

        {/* Sorted Boxes */}
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Sorted</div>
            <div className="font-mono text-base md:text-lg font-bold leading-none text-emerald-400">
              {stats.sortedCount}
            </div>
          </div>
        </div>

        <div className="w-px h-7 bg-slate-800 hidden sm:block" />

        {/* Accuracy */}
        <div className="hidden sm:flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Accuracy</div>
            <div className="font-mono text-base md:text-lg font-bold leading-none text-blue-400">
              {stats.accuracy}%
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Actions */}
      <div className="flex items-center gap-2">
        {/* Game State Control */}
        {status === 'idle' || status === 'game_over' ? (
          <button
            onClick={onStart}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-tech font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            title="Start 3-minute sorting shift"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            START SHIFT
          </button>
        ) : status === 'running' ? (
          <button
            onClick={onPause}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-tech font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            title="Pause simulation"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            PAUSE
          </button>
        ) : (
          <button
            onClick={onResume}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-tech font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
            title="Resume simulation"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            RESUME
          </button>
        )}

        {/* Stop button */}
        {(status === 'running' || status === 'paused') && (
          <button
            onClick={onStop}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Stop robot and conveyor motion"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        )}

        {/* Reset button */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
          title="Reset score and conveyor"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-slate-800 hidden md:block" />

        {/* Calibrate button */}
        <button
          onClick={onCalibrate}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs cursor-pointer transition-all"
          title="Calibrate neutral hand position"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          CALIBRATE
        </button>

        {/* Input Mode Switch (Webcam vs Mouse/Touch Fallback) */}
        <button
          onClick={onToggleMouse}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs cursor-pointer transition-all ${
            useMouseFallback
              ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
          title={
            useMouseFallback
              ? 'Mouse/Touch mode active. Click to switch to Hand Tracking'
              : 'Webcam gesture mode active. Click for Mouse/Touch mode'
          }
        >
          {useMouseFallback ? (
            <>
              <Touchpad className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">MOUSE / TOUCH</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">HAND GESTURE</span>
            </>
          )}
        </button>

        {/* Mute Toggle */}
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
          title={isMuted ? 'Unmute industrial audio' : 'Mute audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer hidden sm:block"
          title="Toggle Fullscreen for iPad/Desktop"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
