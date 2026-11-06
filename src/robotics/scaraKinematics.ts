/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JointAngles } from '../types/game';

export interface KinematicResult {
  jointAngles: JointAngles;
  clampedTarget: { x: number; y: number };
  isReachable: boolean;
}

export class SCARAKinematics {
  public baseX: number;
  public baseY: number;
  public l1: number;
  public l2: number;
  public minReach: number;
  public maxReach: number;
  // Elbow configuration: 1 for elbow-down / right, -1 for elbow-up / left
  public elbowSign: number = 1;

  constructor(baseX: number, baseY: number, l1: number = 170, l2: number = 150) {
    this.baseX = baseX;
    this.baseY = baseY;
    this.l1 = l1;
    this.l2 = l2;
    this.minReach = Math.abs(l1 - l2) + 20;
    this.maxReach = (l1 + l2) * 0.985; // slight safety factor inside physical limit
  }

  /**
   * Forward Kinematics: calculates joint 1 (elbow) and joint 2 (wrist/end-effector)
   * positions from joint angles q1 and q2.
   */
  public forward(q1: number, q2: number): {
    elbow: { x: number; y: number };
    endEffector: { x: number; y: number };
  } {
    const elbowX = this.baseX + this.l1 * Math.cos(q1);
    const elbowY = this.baseY + this.l1 * Math.sin(q1);

    const endEffectorX = elbowX + this.l2 * Math.cos(q1 + q2);
    const endEffectorY = elbowY + this.l2 * Math.sin(q1 + q2);

    return {
      elbow: { x: elbowX, y: elbowY },
      endEffector: { x: endEffectorX, y: endEffectorY },
    };
  }

  /**
   * Inverse Kinematics: calculates q1 and q2 to reach the desired target (x, y).
   * Clamps target within reachable workspace envelope.
   */
  public inverse(targetX: number, targetY: number): KinematicResult {
    let dx = targetX - this.baseX;
    let dy = targetY - this.baseY;
    const distance = Math.hypot(dx, dy);

    let isReachable = true;
    let clampedX = targetX;
    let clampedY = targetY;

    if (distance > this.maxReach) {
      isReachable = false;
      const scale = this.maxReach / (distance || 1);
      dx *= scale;
      dy *= scale;
      clampedX = this.baseX + dx;
      clampedY = this.baseY + dy;
    } else if (distance < this.minReach) {
      isReachable = false;
      const scale = this.minReach / (distance || 1);
      dx *= scale;
      dy *= scale;
      clampedX = this.baseX + dx;
      clampedY = this.baseY + dy;
    }

    const r2 = dx * dx + dy * dy;

    // Law of cosines for elbow angle q2
    let cosQ2 = (r2 - this.l1 * this.l1 - this.l2 * this.l2) / (2 * this.l1 * this.l2);
    cosQ2 = Math.max(-1, Math.min(1, cosQ2));

    // Choose elbow orientation. In a top-view sorting setup, elbowSign = -1 points elbow upward/outward
    const q2 = this.elbowSign * Math.acos(cosQ2);

    // Shoulder angle q1
    const k1 = this.l1 + this.l2 * Math.cos(q2);
    const k2 = this.l2 * Math.sin(q2);
    const gamma = Math.atan2(k2, k1);
    const theta = Math.atan2(dy, dx);
    let q1 = theta - gamma;
    // Normalize q1 to [-PI, PI] to prevent 360-degree branch cut discontinuities
    q1 = Math.atan2(Math.sin(q1), Math.cos(q1));

    return {
      jointAngles: { q1, q2 },
      clampedTarget: { x: clampedX, y: clampedY },
      isReachable,
    };
  }

  /**
   * Generates workspace boundary arcs for visualization.
   */
  public getWorkspaceBounds(): {
    minRadius: number;
    maxRadius: number;
    base: { x: number; y: number };
  } {
    return {
      minRadius: this.minReach,
      maxRadius: this.maxReach,
      base: { x: this.baseX, y: this.baseY },
    };
  }
}
