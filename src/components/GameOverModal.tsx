/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Target,
  Award,
  Zap,
} from 'lucide-react';
import { GameStats } from '../types/game';

interface GameOverModalProps {
  isOpen: boolean;
  stats: GameStats;
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  stats,
  onPlayAgain,
}) => {
  useEffect(() => {
    if (isOpen && stats.score > 0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#22c55e', '#eab308', '#ef4444'],
        });
      } catch {
        // Safe catch
      }
    }
  }, [isOpen, stats.score]);

  if (!isOpen) return null;

  // Calculate Performance Tier
  let tierTitle = 'TRAINEE OPERATOR';
  let tierColor = 'text-slate-300';
  let tierBadge = 'border-slate-500 bg-slate-800';

  if (stats.score >= 80 && stats.accuracy >= 85) {
    tierTitle = 'S-TIER ROBOT AUTOMATION MASTER';
    tierColor = 'text-amber-300';
    tierBadge = 'border-amber-500 bg-amber-950/60 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
  } else if (stats.score >= 50 && stats.accuracy >= 70) {
    tierTitle = 'A-TIER SENIOR ROBOTICS OPERATOR';
    tierColor = 'text-cyan-300';
    tierBadge = 'border-cyan-500 bg-cyan-950/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]';
  } else if (stats.score >= 20) {
    tierTitle = 'B-TIER INDUSTRIAL LINE TECHNICIAN';
    tierColor = 'text-emerald-300';
    tierBadge = 'border-emerald-500 bg-emerald-950/60';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative flex flex-col items-center text-center">
        {/* Top Trophy Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/25 mb-4 border border-amber-300">
          <Trophy className="w-8 h-8 fill-current" />
        </div>

        {/* Title */}
        <h2 className="font-tech text-2xl md:text-3xl font-bold text-white uppercase tracking-wider">
          SHIFT COMPLETE!
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-4 font-mono">
          3-MINUTE ROBOT PICK-AND-PLACE PRODUCTION RUN TERMINATED
        </p>

        {/* Performance Tier Badge */}
        <div className={`px-4 py-1.5 rounded-full border text-xs font-tech font-bold uppercase tracking-wider mb-6 flex items-center gap-2 ${tierBadge}`}>
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span className={tierColor}>{tierTitle}</span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          {/* Total Score */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col items-center justify-center">
            <div className="text-[11px] text-slate-400 font-mono uppercase flex items-center gap-1.5 mb-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Score</span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-amber-300">
              {stats.score}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">points earned</div>
          </div>

          {/* Accuracy */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col items-center justify-center">
            <div className="text-[11px] text-slate-400 font-mono uppercase flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sorting Accuracy</span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-cyan-300">
              {stats.accuracy}%
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">precision index</div>
          </div>

          {/* Correct Sorts */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center">
            <div className="text-[11px] text-slate-400 font-mono uppercase flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Correct Sorts</span>
            </div>
            <div className="font-mono text-2xl font-bold text-emerald-400">
              {stats.correctCount}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">(+10 pts each)</div>
          </div>

          {/* Incorrect Sorts */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center">
            <div className="text-[11px] text-slate-400 font-mono uppercase flex items-center gap-1.5 mb-1">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Incorrect / Missed</span>
            </div>
            <div className="font-mono text-2xl font-bold text-rose-400">
              {stats.incorrectCount}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">(-5 pts each)</div>
          </div>
        </div>

        {/* Play Again button */}
        <button
          onClick={onPlayAgain}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 active:scale-98 text-white font-tech font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer border border-emerald-400/40"
        >
          <RotateCcw className="w-4 h-4" />
          START NEXT SHIFT (PLAY AGAIN)
        </button>
      </div>
    </div>
  );
};
