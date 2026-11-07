/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  ArrowRight,
  Hand,
  MousePointer,
  CheckCircle2,
  Award,
  Clock,
  Sparkles,
  Layers,
  ShieldAlert,
} from 'lucide-react';

interface WelcomePageProps {
  initialOperatorName?: string;
  onStartSimulation: (operatorName: string) => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  initialOperatorName = '',
  onStartSimulation,
}) => {
  const [operatorName, setOperatorName] = useState<string>(initialOperatorName);
  const [showError, setShowError] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = operatorName.trim();
    if (!trimmed) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onStartSimulation(trimmed);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col font-sans text-slate-100 select-none relative overflow-x-hidden">
      {/* Main Container */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 pt-10 pb-10 flex flex-col items-center justify-center">
        {/* Title Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            2D Industrial Robotics Pick-and-Place Simulator
          </div>
          <h1 className="font-tech text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-wider uppercase">
            SORTING SIMULATION
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mt-2 font-mono">
            Vision-Guided & Touch-Controlled 2R Articulated Robotic Arm Pick-and-Place Simulation
          </p>
        </div>

        {/* Operator Name Form Card */}
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-blue-500" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="operator-name-input"
                className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Operator Identification (Required)</span>
              </label>
              <div className="relative">
                <input
                  id="operator-name-input"
                  type="text"
                  value={operatorName}
                  onChange={(e) => {
                    setOperatorName(e.target.value);
                    if (showError && e.target.value.trim()) {
                      setShowError(false);
                    }
                  }}
                  placeholder="Enter Operator Name or Student ID..."
                  autoFocus
                  className={`w-full px-4 py-3 bg-slate-950 rounded-xl border font-tech text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all ${
                    showError
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                      : 'border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                  }`}
                />
              </div>
              {showError && (
                <div className="flex items-center gap-1.5 mt-2 text-rose-400 text-xs font-mono">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Please enter an Operator Name before beginning the simulation.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-cyan-600 hover:from-amber-400 hover:to-cyan-500 active:scale-98 text-slate-950 font-tech font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all cursor-pointer border border-amber-300"
            >
              <span>PROCEED TO SIMULATION WORKSPACE</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Operating Instructions Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
          {/* Card 1: Game Mission */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-amber-400 font-tech font-bold text-sm uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>3-Minute Production Run</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Colored boxes advance automatically on the conveyor. Move the robotic end-effector to the pickup station, grasp the box, and transfer it into the matching color bin (Red, Yellow, Blue, Green).
            </p>
            <div className="bg-amber-950/60 border border-amber-600/40 rounded-lg p-2 text-[10px] text-amber-200 leading-tight">
              <span className="font-bold text-amber-300">⚡ FIRST HALF vs SECOND HALF (1:30):</span> First Half boxes simply stop at pickup. Second Half boxes arrive every 4s, stop and wait for exactly 3s (showing dwell timer), then continuously move to the end!
            </div>
            <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono text-[10px] text-slate-400">
              <span className="text-emerald-400 font-bold">+10 pts Correct Sort</span>
              <span className="text-rose-400 font-bold">-5 pts Drop/Collision</span>
            </div>
          </div>

          {/* Card 2: Hand Tracking Mode */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold text-sm uppercase tracking-wider">
              <Hand className="w-4 h-4" />
              <span>Vision Hand Gestures</span>
            </div>
            <ul className="text-slate-300 text-[11px] space-y-1.5 leading-tight">
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>Index Finger:</strong> Moves robot arm</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Pinch Thumb+Index:</strong> Closes gripper (Pick)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Release Pinch:</strong> Opens gripper (Drop)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>Closed Fist:</strong> Emergency pause safety stop</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Touch & Mouse Mode */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-blue-400 font-tech font-bold text-sm uppercase tracking-wider">
              <MousePointer className="w-4 h-4" />
              <span>iPad Touch & Mouse</span>
            </div>
            <ul className="text-slate-300 text-[11px] space-y-1.5 leading-tight">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong>Mouse Mode:</strong> Click & hold to grab; release click to drop</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>iPad Touch:</strong> Drag finger to aim; tap the on-screen button to open/close</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-purple-400 font-bold">•</span>
                <span><strong>Keyboard:</strong> Spacebar toggles gripper</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer info */}
        <div
          data-dept="Department of Mechanical Engineering, Faculty of Engineering, Burapha Univerity"
          aria-label="Department of Mechanical Engineering, Faculty of Engineering, Burapha Univerity"
          className="mt-8 text-center text-xs sm:text-sm font-mono text-slate-400 tracking-wide font-medium"
        >
          Department of Mechanical Engineering, Faculty of Engineering, Burapha University
        </div>
      </div>
    </div>
  );
};
