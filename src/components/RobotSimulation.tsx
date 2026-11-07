/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { GameEngine, FloatingFeedback } from '../game/gameEngine';
import { Box, BoxColor, SortingBin } from '../types/game';
import { Minimize2, Maximize2, Hand, Move, HelpCircle } from 'lucide-react';

interface RobotSimulationProps {
  engine: GameEngine;
  useMouseFallback: boolean;
  onCanvasPointerMove?: (x: number, y: number) => void;
  onCanvasPointerDown?: () => void;
  onCanvasPointerUp?: () => void;
  onToggleGripper?: () => void;
}

const COLOR_MAP: Record<BoxColor, { bg: string; border: string; glow: string; text: string }> = {
  red: {
    bg: '#ef4444',
    border: '#b91c1c',
    glow: 'rgba(239, 68, 68, 0.5)',
    text: '#ffffff',
  },
  yellow: {
    bg: '#eab308',
    border: '#a16207',
    glow: 'rgba(234, 179, 8, 0.5)',
    text: '#000000',
  },
  blue: {
    bg: '#3b82f6',
    border: '#1d4ed8',
    glow: 'rgba(59, 130, 246, 0.5)',
    text: '#ffffff',
  },
  green: {
    bg: '#22c55e',
    border: '#15803d',
    glow: 'rgba(34, 197, 94, 0.5)',
    text: '#ffffff',
  },
};

export const RobotSimulation: React.FC<RobotSimulationProps> = ({
  engine,
  useMouseFallback,
  onCanvasPointerMove,
  onCanvasPointerDown,
  onCanvasPointerUp,
  onToggleGripper,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas internal coordinate resolution (fixed 840 x 560 for crisp scaling on iPad 11-inch)
  const V_WIDTH = 840;
  const V_HEIGHT = 560;

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

    // 1. Draw floor grid and safety markings
    drawFloor(ctx);

    // 2. Draw robot workspace boundary
    drawWorkspaceEnvelope(ctx);

    // 3. Draw Conveyor belt and pickup station
    drawConveyor(ctx);

    // 4. Draw Sorting Bins (positioned within reachable range)
    drawSortingBins(ctx);

    // 5. Draw SCARA Robotic Arm (Base, Link 1, Elbow, Link 2, Gripper)
    drawSCARARobot(ctx);

    // 6. Draw carried or dropping boxes
    drawBoxes(ctx);

    // 7. Draw floating feedback texts
    drawFeedbacks(ctx);

    // 8. Draw industrial telemetry HUD
    drawTelemetryHUD(ctx);
  }, [engine]);

  // Render loop synchronized with browser refresh rate
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderFrame();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderFrame]);

  // Helper drawing functions
  const drawFloor = (ctx: CanvasRenderingContext2D) => {
    // Light clean industrial floor
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Subtle grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 35;
    for (let x = 0; x < V_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, V_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < V_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(V_WIDTH, y);
      ctx.stroke();
    }

    // Safety boundary line separating conveyor, robot cell, and bins
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 1.5;
    // Left boundary
    ctx.beginPath();
    ctx.moveTo(175, 20);
    ctx.lineTo(175, V_HEIGHT - 20);
    ctx.stroke();
    // Right boundary near bins
    ctx.beginPath();
    ctx.moveTo(540, 20);
    ctx.lineTo(540, V_HEIGHT - 20);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawWorkspaceEnvelope = (ctx: CanvasRenderingContext2D) => {
    const { baseX, baseY, minReach, maxReach } = engine.robot.kinematics;

    // Reachable workspace annulus
    ctx.save();
    ctx.beginPath();
    ctx.arc(baseX, baseY, maxReach, 0, Math.PI * 2);
    ctx.arc(baseX, baseY, minReach, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(241, 245, 249, 0.4)';
    ctx.fill();

    // Outer boundary dashed circle
    ctx.beginPath();
    ctx.arc(baseX, baseY, maxReach, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();

    // Inner limit circle
    ctx.beginPath();
    ctx.arc(baseX, baseY, minReach, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Workspace label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ROBOT REACHABLE ENVELOPE (R=365mm)', baseX, baseY + maxReach - 10);
    ctx.restore();
  };

  const drawConveyor = (ctx: CanvasRenderingContext2D) => {
    const { conveyorX, conveyorWidth, conveyorStartY, pickupY, pickupX, beltOffset } =
      engine.conveyor;

    ctx.save();

    // Belt bed shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(conveyorX - 8, 12, conveyorWidth + 16, conveyorStartY - 10);

    // Conveyor structural frame (metallic dark gray)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(conveyorX - 6, 20, conveyorWidth + 12, conveyorStartY - 18);

    // Conveyor Belt Bed
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(conveyorX, 22, conveyorWidth, conveyorStartY - 22);

    // Moving Belt Slats / Rollers
    const isMoving = engine.status === 'running' && engine.conveyor.state === 'BOX_MOVING';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;

    for (let y = 24 - (isMoving ? beltOffset : 0); y < conveyorStartY; y += 18) {
      if (y >= 22 && y <= conveyorStartY - 2) {
        ctx.beginPath();
        ctx.moveTo(conveyorX + 4, y);
        ctx.lineTo(conveyorX + conveyorWidth - 4, y);
        ctx.stroke();
      }
    }

    // Side safety rails
    ctx.fillStyle = engine.isChallengeActive ? '#f59e0b' : '#475569';
    ctx.fillRect(conveyorX - 7, 20, 5, conveyorStartY - 18);
    ctx.fillRect(conveyorX + conveyorWidth + 2, 20, 5, conveyorStartY - 18);

    // Continuous Challenge Mode Header Pill on Conveyor
    if (engine.isChallengeActive) {
      const nextSpawnSec = Math.max(0, (4000 - engine.conveyor.spawnTimer) / 1000).toFixed(1);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(conveyorX - 16, 24, conveyorWidth + 32, 24, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ NEXT BOX: ${nextSpawnSec}s`, conveyorX + conveyorWidth / 2, 36);
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillText(`4s PICKUP STOP`, conveyorX + conveyorWidth / 2, 44);
    }

    // Pickup Station Zone
    const isBoxAtPickup =
      engine.conveyor.getActiveBox()?.status === 'at_pickup' && !engine.carriedBox;

    // Target crosshair background
    ctx.fillStyle = isBoxAtPickup ? 'rgba(34, 197, 94, 0.15)' : 'rgba(6, 182, 212, 0.1)';
    ctx.strokeStyle = isBoxAtPickup ? '#22c55e' : '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.strokeRect(pickupX - 28, pickupY - 28, 56, 56);
    ctx.fillRect(pickupX - 28, pickupY - 28, 56, 56);

    // Corner brackets on pickup station
    const bracketSize = 8;
    ctx.strokeStyle = isBoxAtPickup ? '#16a34a' : '#0284c7';
    ctx.lineWidth = 3;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(pickupX - 28, pickupY - 28 + bracketSize);
    ctx.lineTo(pickupX - 28, pickupY - 28);
    ctx.lineTo(pickupX - 28 + bracketSize, pickupY - 28);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(pickupX + 28 - bracketSize, pickupY - 28);
    ctx.lineTo(pickupX + 28, pickupY - 28);
    ctx.lineTo(pickupX + 28, pickupY - 28 + bracketSize);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(pickupX - 28, pickupY + 28 - bracketSize);
    ctx.lineTo(pickupX - 28, pickupY + 28);
    ctx.lineTo(pickupX - 28 + bracketSize, pickupY + 28);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(pickupX + 28 - bracketSize, pickupY + 28);
    ctx.lineTo(pickupX + 28, pickupY + 28);
    ctx.lineTo(pickupX + 28, pickupY + 28 - bracketSize);
    ctx.stroke();

    // Crosshair target center
    ctx.strokeStyle = isBoxAtPickup ? '#22c55e' : '#38bdf8';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pickupX - 20, pickupY);
    ctx.lineTo(pickupX + 20, pickupY);
    ctx.moveTo(pickupX, pickupY - 20);
    ctx.lineTo(pickupX, pickupY + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pickup LED beacon indicator
    ctx.beginPath();
    ctx.arc(conveyorX + conveyorWidth / 2, pickupY - 42, 6, 0, Math.PI * 2);
    ctx.fillStyle = isBoxAtPickup ? '#22c55e' : engine.isChallengeActive ? '#f59e0b' : '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Station Label
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillStyle = engine.isChallengeActive ? '#f59e0b' : '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(
      engine.isChallengeActive ? '3s STOP PICKUP' : 'PICKUP STATION',
      pickupX,
      pickupY - 48
    );

    ctx.restore();
  };

  const drawSortingBins = (ctx: CanvasRenderingContext2D) => {
    engine.bins.forEach((bin: SortingBin) => {
      const colors = COLOR_MAP[bin.color];
      const isHovered = bin.isHovered;
      const highlight = bin.highlightState;

      ctx.save();

      // Drop zone highlight glow
      if (highlight === 'valid') {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 24;
      } else if (highlight === 'invalid') {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 24;
      } else if (isHovered) {
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 15;
      }

      // Bin Chute Body (Industrial metallic enclosure)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle =
        highlight === 'valid'
          ? '#22c55e'
          : highlight === 'invalid'
          ? '#ef4444'
          : isHovered
          ? colors.bg
          : '#334155';
      ctx.lineWidth = highlight !== 'none' || isHovered ? 3 : 2;

      // Rounded rectangle for bin
      const r = 8;
      ctx.beginPath();
      ctx.roundRect(bin.x, bin.y, bin.width, bin.height, r);
      ctx.fill();
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Colored interior collection hopper
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(bin.x + 8, bin.y + 6, bin.width - 16, bin.height - 12);

      // Color accent indicator bar
      ctx.fillStyle = colors.bg;
      ctx.fillRect(bin.x + 4, bin.y + 4, 8, bin.height - 8);

      // Bin Name & Color Label
      ctx.font = 'bold 11px "Chakra Petch", sans-serif';
      ctx.fillStyle = colors.bg;
      ctx.textAlign = 'left';
      ctx.fillText(bin.name, bin.x + 18, bin.y + 24);

      // Drop zone target crosshair inside hopper
      const hopperCenterX = bin.x + bin.width / 2 + 8;
      const hopperCenterY = bin.y + bin.height / 2;
      ctx.strokeStyle = colors.bg;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(hopperCenterX, hopperCenterY, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Sorted Count Badge
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bin.x + bin.width - 34, bin.y + bin.height - 28, 26, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(`${bin.count}`, bin.x + bin.width - 21, bin.y + bin.height - 14);

      // Status text
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(`DROP ZONE`, bin.x + 18, bin.y + 42);

      ctx.restore();
    });
  };

  const drawSCARARobot = (ctx: CanvasRenderingContext2D) => {
    const { model, currentAngles, isCarryingPayload } = engine.robot.update(16);
    const { baseX, baseY, l1, l2 } = model;
    const { q1, q2 } = currentAngles;

    // Calculate joints
    const elbowX = baseX + l1 * Math.cos(q1);
    const elbowY = baseY + l1 * Math.sin(q1);
    const eeX = elbowX + l2 * Math.cos(q1 + q2);
    const eeY = elbowY + l2 * Math.sin(q1 + q2);

    ctx.save();

    // 1. Robot Base Shadow
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + 6, 48, 32, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fill();

    // 2. Robot Base Flange (Industrial pedestal with anchor bolts)
    ctx.beginPath();
    ctx.arc(baseX, baseY, 44, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Base inner rotary ring
    ctx.beginPath();
    ctx.arc(baseX, baseY, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Anchor bolt heads
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const bx = baseX + 38 * Math.cos(angle);
      const by = baseY + 38 * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
    }

    // Active status ring on base
    ctx.beginPath();
    ctx.arc(baseX, baseY, 15, 0, Math.PI * 2);
    ctx.fillStyle = engine.status === 'running' ? '#0ea5e9' : '#64748b';
    ctx.fill();

    // 3. Link 1 Arm (Heavy cast robotic arm from Base to Elbow)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.lineWidth = 32;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY + 4);
    ctx.lineTo(elbowX, elbowY + 4);
    ctx.stroke();

    // Main Link 1 body
    const link1Grad = ctx.createLinearGradient(baseX, baseY, elbowX, elbowY);
    link1Grad.addColorStop(0, '#0284c7');
    link1Grad.addColorStop(1, '#0369a1');

    ctx.strokeStyle = link1Grad;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(elbowX, elbowY);
    ctx.stroke();

    // Highlight strip on Link 1
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(baseX + 10 * Math.cos(q1), baseY + 10 * Math.sin(q1));
    ctx.lineTo(elbowX - 10 * Math.cos(q1), elbowY - 10 * Math.sin(q1));
    ctx.stroke();
    ctx.restore();

    // 4. Elbow Joint (Rotary servo housing)
    ctx.beginPath();
    ctx.arc(elbowX, elbowY, 21, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(elbowX, elbowY, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // 5. Link 2 Arm (Forearm from Elbow to Wrist)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(elbowX, elbowY + 4);
    ctx.lineTo(eeX, eeY + 4);
    ctx.stroke();

    // Link 2 body
    const link2Grad = ctx.createLinearGradient(elbowX, elbowY, eeX, eeY);
    link2Grad.addColorStop(0, '#0284c7');
    link2Grad.addColorStop(1, '#0ea5e9');

    ctx.strokeStyle = link2Grad;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(elbowX, elbowY);
    ctx.lineTo(eeX, eeY);
    ctx.stroke();

    // Forearm detail groove
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(elbowX + 12 * Math.cos(q1 + q2), elbowY + 12 * Math.sin(q1 + q2));
    ctx.lineTo(eeX - 12 * Math.cos(q1 + q2), eeY - 12 * Math.sin(q1 + q2));
    ctx.stroke();
    ctx.restore();

    // 6. Wrist Joint & Tool Flange
    ctx.beginPath();
    ctx.arc(eeX, eeY, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 7. Gripper Actuator & Parallel Fingers
    const gripperWidth = model.endEffector.gripperWidth;
    const isClosed = model.endEffector.isClosed;

    // Gripper mount bar perpendicular to forearm
    const armAngle = q1 + q2;
    const perpAngle = armAngle + Math.PI / 2;

    const barHalfWidth = 24;
    const barX1 = eeX - barHalfWidth * Math.cos(perpAngle);
    const barY1 = eeY - barHalfWidth * Math.sin(perpAngle);
    const barX2 = eeX + barHalfWidth * Math.cos(perpAngle);
    const barY2 = eeY + barHalfWidth * Math.sin(perpAngle);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(barX1, barY1);
    ctx.lineTo(barX2, barY2);
    ctx.stroke();

    // Dual Gripper Fingers
    const halfGrip = gripperWidth / 2;
    const fingerLength = 26;

    // Finger 1 (left side)
    const f1BaseX = eeX - halfGrip * Math.cos(perpAngle);
    const f1BaseY = eeY - halfGrip * Math.sin(perpAngle);
    const f1TipX = f1BaseX + fingerLength * Math.cos(armAngle);
    const f1TipY = f1BaseY + fingerLength * Math.sin(armAngle);

    // Finger 2 (right side)
    const f2BaseX = eeX + halfGrip * Math.cos(perpAngle);
    const f2BaseY = eeY + halfGrip * Math.sin(perpAngle);
    const f2TipX = f2BaseX + fingerLength * Math.cos(armAngle);
    const f2TipY = f2BaseY + fingerLength * Math.sin(armAngle);

    ctx.strokeStyle = isClosed ? '#22c55e' : '#f59e0b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'square';

    // Draw fingers with rubber grip pads
    ctx.beginPath();
    ctx.moveTo(f1BaseX, f1BaseY);
    ctx.lineTo(f1TipX, f1TipY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(f2BaseX, f2BaseY);
    ctx.lineTo(f2TipX, f2TipY);
    ctx.stroke();

    // Laser target reticle projecting to floor from end effector
    ctx.beginPath();
    ctx.arc(eeX, eeY, 26, 0, Math.PI * 2);
    ctx.strokeStyle = isClosed ? 'rgba(34, 197, 94, 0.45)' : 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(eeX, eeY, 3, 0, Math.PI * 2);
    ctx.fillStyle = isClosed ? '#22c55e' : '#06b6d4';
    ctx.fill();

    ctx.restore();
  };

  const drawBoxes = (ctx: CanvasRenderingContext2D) => {
    // 1. Boxes on Conveyor
    const conveyorBoxes = engine.conveyor.getBoxes();
    conveyorBoxes.forEach((b: Box) => {
      if (b.status !== 'in_gripper') {
        drawSingleBox(ctx, b);
      }
    });

    // 2. Carried Box in Gripper
    if (engine.carriedBox) {
      drawSingleBox(ctx, engine.carriedBox);
    }

    // 3. Dropping Boxes (into bins or dropped from collisions/overflow)
    engine.droppingBoxes.forEach((b: Box) => {
      drawSingleBox(ctx, b);
    });
  };

  const drawSingleBox = (ctx: CanvasRenderingContext2D, box: Box) => {
    const colors = COLOR_MAP[box.color];
    const half = box.size / 2;

    ctx.save();
    ctx.translate(box.x, box.y);

    if (box.rotation) {
      ctx.rotate(box.rotation);
    }

    // If collided, draw flashing red collision warning aura
    if (box.isCollided) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, half + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Box Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(-half + 3, -half + 4, box.size, box.size);

    // Box Body
    ctx.fillStyle = box.isCollided ? '#ef4444' : colors.bg;
    ctx.strokeStyle = box.isCollided ? '#f87171' : colors.border;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(-half, -half, box.size, box.size, 5);
    ctx.fill();
    ctx.stroke();

    // Industrial package tape detail across box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(-half, -4, box.size, 8);

    // Barcode / Label stamp
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(box.isCollided ? 'COLLISION' : box.color.toUpperCase(), 0, 3);

    // Second Half: 3-second dwell countdown indicator while stopped at pickup station (First Half does not show stop time, just stops)
    if (
      engine.isChallengeActive &&
      box.status === 'at_pickup' &&
      box.dwellTimeRemaining !== undefined &&
      box.dwellTimeRemaining > 0
    ) {
      const dwellSec = (box.dwellTimeRemaining / 1000).toFixed(1);
      const isUrgent = box.dwellTimeRemaining <= 1000;

      // Floating dwell countdown badge above box
      ctx.fillStyle = isUrgent ? 'rgba(239, 68, 68, 0.95)' : 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = isUrgent ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-26, -half - 19, 52, 15, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillStyle = isUrgent ? '#fee2e2' : '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(`STOP ${dwellSec}s`, 0, -half - 8);

      // Radial countdown progress arc (based on 3000ms dwell window)
      const progress = Math.max(0, Math.min(1, box.dwellTimeRemaining / 3000));
      ctx.strokeStyle = isUrgent ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, half + 5, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    } else if (box.hasCompletedPickupDwell && box.status === 'on_conveyor') {
      // Box moving continuously to conveyor end indicator
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▲ PASSING', 0, -half - 6);
    }

    ctx.restore();
  };

  const drawFeedbacks = (ctx: CanvasRenderingContext2D) => {
    engine.feedbackList.forEach((fb: FloatingFeedback) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, fb.opacity);

      // Feedback pill background
      const textWidth = ctx.measureText(fb.text).width + 24;
      ctx.fillStyle =
        fb.type === 'success'
          ? 'rgba(22, 163, 74, 0.95)'
          : fb.type === 'error'
          ? 'rgba(220, 38, 38, 0.95)'
          : 'rgba(14, 165, 233, 0.95)';

      ctx.beginPath();
      ctx.roundRect(fb.x - textWidth / 2, fb.y - 12, textWidth, 24, 12);
      ctx.fill();

      // Text
      ctx.font = 'bold 11px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(fb.text, fb.x, fb.y + 4);

      ctx.restore();
    });
  };

  const drawTelemetryHUD = (ctx: CanvasRenderingContext2D) => {
    const { model, currentAngles, isPaused, isCarryingPayload } = engine.robot.update(16);
    const ee = model.endEffector;
    const q1Deg = Math.round((currentAngles.q1 * 180) / Math.PI);
    const q2Deg = Math.round((currentAngles.q2 * 180) / Math.PI);

    ctx.save();
    // HUD Card at right-bottom corner
    const hudW = 230;
    const hudH = 64;
    const hudX = V_WIDTH - hudW - 20;
    const hudY = V_HEIGHT - hudH - 18;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 6);
    ctx.fill();
    ctx.stroke();

    // Status dot
    ctx.beginPath();
    ctx.arc(hudX + 14, hudY + 14, 4, 0, Math.PI * 2);
    ctx.fillStyle = isPaused ? '#ef4444' : '#22c55e';
    ctx.fill();

    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(
      isPaused ? 'ROBOT: PAUSED' : 'ROBOT: PHYSICAL DYNAMICS ACTIVE',
      hudX + 24,
      hudY + 17
    );

    // Coordinates Readout
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`EE: X=${Math.round(ee.x)} Y=${Math.round(ee.y)}`, hudX + 12, hudY + 34);

    // Joint Angles Readout
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`q1=${q1Deg}°  q2=${q2Deg}°`, hudX + 12, hudY + 47);

    // Inertia & Payload indicator
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = isCarryingPayload ? '#eab308' : '#64748b';
    ctx.fillText(
      isCarryingPayload ? 'INERTIA: +PAYLOAD' : 'INERTIA: NOMINAL',
      hudX + 12,
      hudY + 59
    );

    // Gripper status readout
    ctx.textAlign = 'right';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = ee.isClosed ? '#22c55e' : '#94a3b8';
    ctx.fillText(ee.isClosed ? 'GRIPPER: CLOSED' : 'GRIPPER: OPEN', hudX + hudW - 10, hudY + 34);

    ctx.restore();
  };

  // Coordinates mapping helper for pointer / touch
  const [deviceType, setDeviceType] = React.useState<'mouse' | 'touch'>('mouse');
  const isMouseDownRef = useRef<boolean>(false);

  // Global window pointerup to guarantee mouse release anywhere (even outside canvas)
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (useMouseFallback && isMouseDownRef.current && e.pointerType !== 'touch') {
        isMouseDownRef.current = false;
        engine.handleGripperInput(false);
        onCanvasPointerUp?.();
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [engine, useMouseFallback, onCanvasPointerUp]);

  const getScaledCoordinates = (e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return null;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Pointer move handler (mouse or touch pen)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') {
      setDeviceType('touch');
    } else {
      setDeviceType('mouse');
    }

    const coords = getScaledCoordinates(e);
    if (!coords) return;

    if (useMouseFallback) {
      engine.robot.setTargetPosition(coords.x, coords.y);
    }
    onCanvasPointerMove?.(coords.x, coords.y);
  };

  // Pointer down handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isTouch = e.pointerType === 'touch';
    setDeviceType(isTouch ? 'touch' : 'mouse');

    if (useMouseFallback) {
      if (!isTouch && e.button === 0) {
        // MOUSE MODE: Left click + HOLD to pick up box
        isMouseDownRef.current = true;
        engine.handleGripperInput(true);
      }
      // Note: On touch devices, dragging aims the arm; the dedicated button controls gripper
    }
    onCanvasPointerDown?.();
  };

  // Pointer up handler
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isTouch = e.pointerType === 'touch';
    if (useMouseFallback) {
      if (!isTouch && e.button === 0) {
        // MOUSE MODE: Release left click to open gripper and drop box
        isMouseDownRef.current = false;
        engine.handleGripperInput(false);
      }
    }
    onCanvasPointerUp?.();
  };

  // Direct touch handlers for iPad / Touchscreens
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setDeviceType('touch');
    const coords = getScaledCoordinates(e);
    if (coords && useMouseFallback) {
      engine.robot.setTargetPosition(coords.x, coords.y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setDeviceType('touch');
    const coords = getScaledCoordinates(e);
    if (!coords) return;

    if (useMouseFallback) {
      engine.robot.setTargetPosition(coords.x, coords.y);
    }
    onCanvasPointerMove?.(coords.x, coords.y);
  };

  const isGripperClosed = engine.robot.getGripperClosed();

  return (
    <div className="relative w-full h-full min-h-0 flex flex-col items-center justify-between p-1.5 lg:p-2 overflow-hidden simulation-grid rounded-xl border border-slate-800 shadow-xl">
      {/* Simulation Title bar */}
      <div className="w-full flex items-center justify-between px-3 py-1 bg-slate-900/95 border-b border-slate-800 rounded-t-lg text-xs text-slate-300 font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-tech font-bold text-slate-100 tracking-wider">
            SORTING SIMULATION [2D TOP-VIEW]
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {engine.isChallengeActive ? (
            <span className="text-amber-300 font-bold bg-amber-950/90 px-2 py-0.5 rounded border border-amber-500 animate-pulse flex items-center gap-1">
              <span>⚡ SECOND HALF: BOX STOPS 3s AT PICKUP BEFORE MOVING TO END (PREVENT COLLISIONS!)</span>
            </span>
          ) : (
            <>
              <span className="hidden sm:inline">PICKUP: LEFT CONVEYOR</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">SORT BINS: RIGHT</span>
            </>
          )}
          {useMouseFallback && (
            <span className="text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/60">
              {deviceType === 'mouse' ? 'MOUSE ACTIVE (HOLD CLICK TO GRAB)' : 'TOUCH ACTIVE (USE BUTTON)'}
            </span>
          )}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="relative w-full flex-1 min-h-0 flex items-center justify-center bg-slate-100 rounded-b-lg overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{ touchAction: 'none' }}
          className="w-full h-full object-contain cursor-crosshair select-none"
        />

        {/* Floating Tactile Grip Button (Positioned at bottom-left to leave bottom-right HUD completely visible) */}
        {useMouseFallback && (
          <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleGripper) {
                  onToggleGripper();
                } else {
                  engine.handleGripperInput(!isGripperClosed);
                }
              }}
              className={`px-4 py-2.5 rounded-xl font-tech font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xl transition-all active:scale-95 cursor-pointer border ${
                isGripperClosed
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-amber-500/30'
              }`}
            >
              {isGripperClosed ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>TOUCH GRIPPER: CLOSED (TAP TO OPEN / DROP)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>TOUCH GRIPPER: OPEN (TAP TO CLOSE / PICK)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Control instruction footer */}
      {useMouseFallback && (
        <div className="w-full mt-2 py-1 px-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center justify-between text-[11px] text-slate-300 font-mono">
          <div className="flex items-center gap-1.5 text-amber-300">
            <Move className="w-3.5 h-3.5" />
            <span>
              {deviceType === 'mouse'
                ? 'MOUSE: MOVE CURSOR TO AIM • HOLD LEFT CLICK TO GRAB • RELEASE CLICK TO DROP'
                : 'TOUCH: DRAG FINGER TO DIRECT ARM • TAP BUTTON TO OPEN/CLOSE GRIPPER'}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-cyan-300">
            <Hand className="w-3.5 h-3.5" />
            <span>OR PRESS SPACEBAR TO TOGGLE GRIPPER</span>
          </div>
        </div>
      )}
    </div>
  );
};
