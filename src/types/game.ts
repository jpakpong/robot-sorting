/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BoxColor = 'red' | 'yellow' | 'blue' | 'green';

export interface Box {
  id: string;
  color: BoxColor;
  x: number;
  y: number;
  size: number;
  status: 'on_conveyor' | 'at_pickup' | 'in_gripper' | 'dropping' | 'sorted' | 'rejected';
  dropProgress?: number; // 0 to 1 for dropping animation
  targetBinIndex?: number;
}

export interface SortingBin {
  color: BoxColor;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
  isHovered: boolean;
  highlightState: 'none' | 'valid' | 'invalid';
}

export interface JointAngles {
  q1: number; // Shoulder angle in radians
  q2: number; // Elbow angle in radians
}

export interface EndEffector {
  x: number;
  y: number;
  gripperWidth: number; // in pixels (e.g., 36px open, 14px closed)
  isClosed: boolean;
  targetX: number;
  targetY: number;
}

export interface SCARARobotModel {
  baseX: number;
  baseY: number;
  l1: number; // Length of link 1
  l2: number; // Length of link 2
  elbowAngle: number;
  shoulderAngle: number;
  endEffector: EndEffector;
  minReach: number;
  maxReach: number;
}

export type ConveyorState =
  | 'WAITING_FOR_BOX'
  | 'BOX_MOVING'
  | 'BOX_AT_PICKUP'
  | 'ROBOT_PICKING'
  | 'ROBOT_CARRYING'
  | 'ROBOT_PLACING'
  | 'SORTING_COMPLETE';

export type GameStatus = 'idle' | 'running' | 'paused' | 'game_over';

export type ControlMode = 'camera' | 'touch_mouse';

export interface GestureDetection {
  hasHand: boolean;
  indexTip: { x: number; y: number } | null;
  thumbTip: { x: number; y: number } | null;
  pinchDistance: number;
  isPinched: boolean;
  isFist: boolean;
  confidence: number;
}

export interface GameStats {
  score: number;
  sortedCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  timeRemaining: number;
  streak: number;
}

export interface CalibrationData {
  centerX: number;
  centerY: number;
  rangeX: number;
  rangeY: number;
  isCalibrated: boolean;
}
