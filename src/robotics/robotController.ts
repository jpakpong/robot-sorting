/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JointAngles, SCARARobotModel } from '../types/game';
import { SCARAKinematics } from './scaraKinematics';

export interface RobotState {
  model: SCARARobotModel;
  currentAngles: JointAngles;
  targetAngles: JointAngles;
  angularVelocities: { w1: number; w2: number };
  currentEndEffector: { x: number; y: number };
  targetEndEffector: { x: number; y: number };
  gripperWidth: number; // in pixels
  isGripperClosed: boolean;
  isPaused: boolean;
  isCarryingPayload: boolean;
  velocity: number;
}

export class RobotController {
  public kinematics: SCARAKinematics;
  private currentQ1: number = 0;
  private currentQ2: number = 1.0;
  private targetQ1: number = 0;
  private targetQ2: number = 1.0;

  // Filtered target end-effector coordinates to desensitize abrupt mouse/hand movements
  private desiredTargetX: number = 230;
  private desiredTargetY: number = 250;
  private filteredTargetX: number = 230;
  private filteredTargetY: number = 250;

  // Physical dynamics: angular velocities
  private velQ1: number = 0;
  private velQ2: number = 0;

  // Heavy industrial damping & inertia parameters (specifically calibrated to prevent over-sensitive rotation)
  // Joint 1 (Base/Shoulder): Carries entire arm assembly -> High inertia, heavy viscous damping
  private kp1: number = 15.0; // Moderate drive torque to avoid rapid jerk
  private damping1: number = 38.0; // Strong viscous damping (resists fast base rotation)
  private baseInertia1: number = 4.5; // Heavy rotational inertia
  private coulombFriction1: number = 0.32; // Static friction prevents micro-jitters
  private maxVelocity1: number = 1.6; // rad/s controlled base joint speed (~90 deg/s max)
  private maxAcceleration1: number = 5.2; // rad/s^2 smooth mechanical ramp

  // Joint 2 (Elbow/Forearm)
  private kp2: number = 19.0;
  private damping2: number = 28.0;
  private baseInertia2: number = 2.4;
  private coulombFriction2: number = 0.24;
  private maxVelocity2: number = 2.2;
  private maxAcceleration2: number = 7.0;

  // Payload flag (adds mass & rotational inertia when carrying a box)
  public isCarryingPayload: boolean = false;

  // Gripper dimensions
  public readonly GRIPPER_OPEN_WIDTH = 36;
  public readonly GRIPPER_CLOSED_WIDTH = 12;
  private currentGripperWidth: number = 36;
  private isGripperClosed: boolean = false;
  private isPaused: boolean = false;

  private prevEE: { x: number; y: number } = { x: 0, y: 0 };
  private currentVelocity: number = 0;

  constructor(baseX: number = 350, baseY: number = 280, l1: number = 190, l2: number = 180) {
    this.kinematics = new SCARAKinematics(baseX, baseY, l1, l2);
    // Initial home position: resting naturally towards pickup station
    const homeTarget = { x: 230, y: 250 };
    this.desiredTargetX = homeTarget.x;
    this.desiredTargetY = homeTarget.y;
    this.filteredTargetX = homeTarget.x;
    this.filteredTargetY = homeTarget.y;

    const ik = this.kinematics.inverse(homeTarget.x, homeTarget.y);
    this.currentQ1 = ik.jointAngles.q1;
    this.currentQ2 = ik.jointAngles.q2;
    this.targetQ1 = this.currentQ1;
    this.targetQ2 = this.currentQ2;

    const initialFk = this.kinematics.forward(this.currentQ1, this.currentQ2);
    this.prevEE = { ...initialFk.endEffector };
  }

  public setTargetPosition(targetX: number, targetY: number) {
    if (this.isPaused) return;
    this.desiredTargetX = targetX;
    this.desiredTargetY = targetY;
  }

  public setGripper(close: boolean) {
    this.isGripperClosed = close;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      // Mechanical brakes engage
      this.velQ1 = 0;
      this.velQ2 = 0;
    }
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  public getGripperClosed(): boolean {
    return this.isGripperClosed;
  }

  public update(deltaTime: number = 16): RobotState {
    const dt = Math.min(0.033, Math.max(0.008, deltaTime / 1000));

    if (!this.isPaused) {
      // 1. Soft target position filtering to prevent rapid mouse/finger twitching from jerking the arm
      const targetFilterRate = 0.13;
      this.filteredTargetX += (this.desiredTargetX - this.filteredTargetX) * targetFilterRate;
      this.filteredTargetY += (this.desiredTargetY - this.filteredTargetY) * targetFilterRate;

      // 2. Compute Inverse Kinematics for smoothed target
      const ik = this.kinematics.inverse(this.filteredTargetX, this.filteredTargetY);
      this.targetQ1 = ik.jointAngles.q1;
      this.targetQ2 = ik.jointAngles.q2;

      // 3. Shortest Angular Path error calculation (eliminates 360-degree branch cut spinning!)
      let err1 = this.targetQ1 - this.currentQ1;
      err1 = Math.atan2(Math.sin(err1), Math.cos(err1));

      let err2 = this.targetQ2 - this.currentQ2;
      err2 = Math.atan2(Math.sin(err2), Math.cos(err2));

      // 4. Inertia scales up when carrying payload
      const j1 = this.baseInertia1 + (this.isCarryingPayload ? 0.8 : 0);
      const j2 = this.baseInertia2 + (this.isCarryingPayload ? 0.5 : 0);

      // 5. Servo drive torque: Proportional control minus viscous damping
      let torque1 = this.kp1 * err1 - this.damping1 * this.velQ1;
      let torque2 = this.kp2 * err2 - this.damping2 * this.velQ2;

      // 6. Apply dry Coulomb friction resistance opposing velocity
      if (Math.abs(this.velQ1) > 0.01) {
        torque1 -= Math.sign(this.velQ1) * this.coulombFriction1;
      }
      if (Math.abs(this.velQ2) > 0.01) {
        torque2 -= Math.sign(this.velQ2) * this.coulombFriction2;
      }

      // 7. Calculate angular accelerations with torque limits
      let acc1 = torque1 / j1;
      let acc2 = torque2 / j2;
      acc1 = Math.max(-this.maxAcceleration1, Math.min(this.maxAcceleration1, acc1));
      acc2 = Math.max(-this.maxAcceleration2, Math.min(this.maxAcceleration2, acc2));

      // 8. Euler integration of velocity
      this.velQ1 += acc1 * dt;
      this.velQ2 += acc2 * dt;

      // 9. Velocity limits
      this.velQ1 = Math.max(-this.maxVelocity1, Math.min(this.maxVelocity1, this.velQ1));
      this.velQ2 = Math.max(-this.maxVelocity2, Math.min(this.maxVelocity2, this.velQ2));

      // 10. Position update with static settling deadband
      if (Math.abs(err1) < 0.005 && Math.abs(this.velQ1) < 0.02) {
        this.velQ1 = 0;
        this.currentQ1 = this.targetQ1;
      } else {
        this.currentQ1 += this.velQ1 * dt;
      }

      if (Math.abs(err2) < 0.005 && Math.abs(this.velQ2) < 0.02) {
        this.velQ2 = 0;
        this.currentQ2 = this.targetQ2;
      } else {
        this.currentQ2 += this.velQ2 * dt;
      }

      // Keep angles clean in [-PI, PI]
      this.currentQ1 = Math.atan2(Math.sin(this.currentQ1), Math.cos(this.currentQ1));
      this.currentQ2 = Math.atan2(Math.sin(this.currentQ2), Math.cos(this.currentQ2));
    }

    // Smoothly actuate pneumatic gripper width
    const targetWidth = this.isGripperClosed ? this.GRIPPER_CLOSED_WIDTH : this.GRIPPER_OPEN_WIDTH;
    this.currentGripperWidth += (targetWidth - this.currentGripperWidth) * 0.32;

    // Calculate current forward kinematics
    const currentFk = this.kinematics.forward(this.currentQ1, this.currentQ2);
    const targetFk = this.kinematics.forward(this.targetQ1, this.targetQ2);

    // Calculate velocity for sound and visuals
    const dx = currentFk.endEffector.x - this.prevEE.x;
    const dy = currentFk.endEffector.y - this.prevEE.y;
    this.currentVelocity = Math.hypot(dx, dy) / (deltaTime || 16);
    this.prevEE = { ...currentFk.endEffector };

    const model: SCARARobotModel = {
      baseX: this.kinematics.baseX,
      baseY: this.kinematics.baseY,
      l1: this.kinematics.l1,
      l2: this.kinematics.l2,
      shoulderAngle: this.currentQ1,
      elbowAngle: this.currentQ2,
      minReach: this.kinematics.minReach,
      maxReach: this.kinematics.maxReach,
      endEffector: {
        x: currentFk.endEffector.x,
        y: currentFk.endEffector.y,
        gripperWidth: this.currentGripperWidth,
        isClosed: this.isGripperClosed,
        targetX: targetFk.endEffector.x,
        targetY: targetFk.endEffector.y,
      },
    };

    return {
      model,
      currentAngles: { q1: this.currentQ1, q2: this.currentQ2 },
      targetAngles: { q1: this.targetQ1, q2: this.targetQ2 },
      angularVelocities: { w1: this.velQ1, w2: this.velQ2 },
      currentEndEffector: currentFk.endEffector,
      targetEndEffector: targetFk.endEffector,
      gripperWidth: this.currentGripperWidth,
      isGripperClosed: this.isGripperClosed,
      isPaused: this.isPaused,
      isCarryingPayload: this.isCarryingPayload,
      velocity: this.currentVelocity * 100,
    };
  }

  public reset(homeX: number = 230, homeY: number = 250) {
    this.desiredTargetX = homeX;
    this.desiredTargetY = homeY;
    this.filteredTargetX = homeX;
    this.filteredTargetY = homeY;

    const ik = this.kinematics.inverse(homeX, homeY);
    this.currentQ1 = ik.jointAngles.q1;
    this.currentQ2 = ik.jointAngles.q2;
    this.targetQ1 = this.currentQ1;
    this.targetQ2 = this.currentQ2;
    this.velQ1 = 0;
    this.velQ2 = 0;
    this.isGripperClosed = false;
    this.isCarryingPayload = false;
    this.currentGripperWidth = this.GRIPPER_OPEN_WIDTH;
    this.isPaused = false;
  }
}
