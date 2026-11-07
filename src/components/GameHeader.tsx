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
  Touchpad,
  Camera,
  Maximize2,
  CheckCircle2,
  Clock,
  Award,
  Target,
  User,
  LogOut,
} from 'lucide-react';
import { GameStats, GameStatus } from '../types/game';

interface GameHeaderProps {
  stats: GameStats;
  status: GameStatus;
  operatorName: string;
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
  onChangeOperator?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  stats,
  status,
  operatorName,
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
  onChangeOperator,
}) => {
  const isTimeCritical = stats.timeRemaining <= 20 && stats.timeRemaining > 0;
  const minutes = Math.floor(stats.timeRemaining / 60);
  const seconds = stats.timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <header className="h-16 md:h-18 bg-slate-900 border-b border-slate-800 px-3 md:px-5 flex items-center justify-between text-white shadow-xl select-none shrink-0 relative z-20">
      {/* Left: App Branding & Operator */}
      <div className="flex items-center gap-3">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-tech text-sm md:text-base font-bold tracking-wider text-slate-100 uppercase leading-none">
              SORTING SIMULATION
            </h1>
            <span className="text-[9px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 hidden sm:inline-block">
              2R Arm
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono hidden lg:flex items-center gap-1.5 mt-0.5">
            <User className="w-3 h-3 text-cyan-400" />
            <span>OPERATOR:</span>
            <span className="text-amber-300 font-bold uppercase">{operatorName || 'ANONYMOUS'}</span>
          </div>
        </div>
      </div>

      {/* Center: Rectangular Dashboard Statistics Cards (Aligned for 11-inch iPad) */}
      <div className="flex items-center gap-2 md:gap-3 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
        {/* Time Remaining Card */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800/80">
          <Clock
            className={`w-3.5 h-3.5 ${
              isTimeCritical ? 'text-red-500 animate-bounce' : 'text-cyan-400'
            }`}
          />
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-mono leading-none flex items-center gap-1">
              <span>Shift</span>
              {stats.timeRemaining <= 90 && stats.timeRemaining > 0 && status === 'running' && (
                <span className="text-[8px] font-bold text-amber-400 bg-amber-950 px-1 py-0.2 rounded border border-amber-600 animate-pulse">
                  2ND HALF (3s)
                </span>
              )}
            </div>
            <div
              className={`font-mono text-sm md:text-base font-bold leading-none ${
                isTimeCritical
                  ? 'text-red-400 animate-pulse'
                  : stats.timeRemaining <= 90 && status === 'running'
                  ? 'text-amber-300'
                  : 'text-slate-100'
              }`}
            >
              {formattedTime}
            </div>
          </div>
        </div>

        {/* Score Card */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800/80">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-mono leading-none">Score</div>
            <div className="font-mono text-sm md:text-base font-bold leading-none text-amber-300">
              {stats.score}
            </div>
          </div>
        </div>

        {/* Sorted Boxes Card */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-mono leading-none">Sorted</div>
            <div className="font-mono text-sm md:text-base font-bold leading-none text-emerald-400">
              {stats.sortedCount}
            </div>
          </div>
        </div>

        {/* Accuracy Card */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800/80">
          <Target className="w-3.5 h-3.5 text-blue-400" />
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-mono leading-none">Accuracy</div>
            <div className="font-mono text-sm md:text-base font-bold leading-none text-blue-400">
              {stats.accuracy}%
            </div>
          </div>
        </div>
      </div>

      {/* Right: Rectangular Control Action Buttons */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Game State Control */}
        {status === 'idle' || status === 'game_over' ? (
          <button
            onClick={onStart}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-tech font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            title="Start 3-minute sorting shift"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START SHIFT</span>
          </button>
        ) : status === 'running' ? (
          <button
            onClick={onPause}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-tech font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            title="Pause simulation"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>PAUSE</span>
          </button>
        ) : (
          <button
            onClick={onResume}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-tech font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
            title="Resume simulation"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>RESUME</span>
          </button>
        )}

        {/* Stop button */}
        {(status === 'running' || status === 'paused') && (
          <button
            onClick={onStop}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Stop motion"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        {/* Reset button */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
          title="Reset shift stats and conveyor"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Calibrate button */}
        <button
          onClick={onCalibrate}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs cursor-pointer transition-all"
          title="Calibrate neutral hand position"
        >
          <Crosshair className="w-3 h-3 text-cyan-400" />
          <span className="hidden xl:inline">CALIBRATE</span>
        </button>

        {/* Input Mode Switch (Webcam vs Mouse/Touch) */}
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
              <span className="font-semibold text-[11px]">TOUCH/MOUSE</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] hidden sm:inline">GESTURE</span>
            </>
          )}
        </button>

        {/* Mute Toggle */}
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
          title={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
        </button>

        {/* Change Operator button */}
        {onChangeOperator && (
          <button
            onClick={onChangeOperator}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all cursor-pointer"
            title="Change Operator / Exit to Instructions"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Fullscreen toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer hidden sm:block"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
