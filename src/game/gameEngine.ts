/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundManager } from '../audio/soundManager';
import { Box, BoxColor, GameStats, GameStatus, SortingBin } from '../types/game';
import { ConveyorController } from './conveyorController';
import { RobotController } from '../robotics/robotController';

export interface FloatingFeedback {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
  x: number;
  y: number;
  opacity: number;
}

export class GameEngine {
  public robot: RobotController;
  public conveyor: ConveyorController;

  // Sorting bins repositioned closer to base (x: 570) for ergonomic reach
  public bins: SortingBin[] = [
    {
      color: 'red',
      name: 'RED BIN',
      x: 570,
      y: 80,
      width: 110,
      height: 76,
      count: 0,
      isHovered: false,
      highlightState: 'none',
    },
    {
      color: 'yellow',
      name: 'YELLOW BIN',
      x: 570,
      y: 175,
      width: 110,
      height: 76,
      count: 0,
      isHovered: false,
      highlightState: 'none',
    },
    {
      color: 'blue',
      name: 'BLUE BIN',
      x: 570,
      y: 270,
      width: 110,
      height: 76,
      count: 0,
      isHovered: false,
      highlightState: 'none',
    },
    {
      color: 'green',
      name: 'GREEN BIN',
      x: 570,
      y: 365,
      width: 110,
      height: 76,
      count: 0,
      isHovered: false,
      highlightState: 'none',
    },
  ];

  public carriedBox: Box | null = null;
  public droppingBoxes: Box[] = [];
  public status: GameStatus = 'idle';
  // 3-minute shift countdown = 180 seconds
  public readonly DEFAULT_GAME_TIME = 180;
  public stats: GameStats = {
    score: 0,
    sortedCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    accuracy: 0,
    timeRemaining: 180,
    streak: 0,
  };

  public feedbackList: FloatingFeedback[] = [];
  private feedbackIdCounter: number = 0;
  private prevPinchState: boolean = false;
  private timerInterval: number | null = null;

  constructor() {
    // SCARA Base at (350, 280), Link 1 = 190, Link 2 = 180 -> reach 364px
    this.robot = new RobotController(350, 280, 190, 180);
    this.conveyor = new ConveyorController();
  }

  public startGame() {
    this.resetGame();
    this.status = 'running';
    this.startTimer();
  }

  public pauseGame() {
    if (this.status === 'running') {
      this.status = 'paused';
      this.robot.setPaused(true);
      this.stopTimer();
    }
  }

  public resumeGame() {
    if (this.status === 'paused') {
      this.status = 'running';
      this.robot.setPaused(false);
      this.startTimer();
    }
  }

  public stopGame() {
    this.status = 'idle';
    this.robot.setPaused(true);
    this.stopTimer();
    soundManager.stopAll();
  }

  public resetGame() {
    this.stopTimer();
    this.status = 'idle';
    this.stats = {
      score: 0,
      sortedCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      accuracy: 0,
      timeRemaining: this.DEFAULT_GAME_TIME,
      streak: 0,
    };
    this.bins.forEach((b) => {
      b.count = 0;
      b.isHovered = false;
      b.highlightState = 'none';
    });
    this.carriedBox = null;
    this.robot.isCarryingPayload = false;
    this.droppingBoxes = [];
    this.feedbackList = [];
    this.robot.reset(230, 250);
    this.conveyor.reset();
    soundManager.stopAll();
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = window.setInterval(() => {
      if (this.status === 'running') {
        this.stats.timeRemaining -= 1;
        if (this.stats.timeRemaining <= 0) {
          this.stats.timeRemaining = 0;
          this.handleTimeUp();
        }
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private handleTimeUp() {
    this.status = 'game_over';
    this.robot.setPaused(true);
    this.stopTimer();
    soundManager.stopAll();
  }

  public addFeedback(text: string, type: 'success' | 'error' | 'info', x: number, y: number) {
    this.feedbackIdCounter++;
    this.feedbackList.push({
      id: `fb_${this.feedbackIdCounter}`,
      text,
      type,
      x,
      y,
      opacity: 1.0,
    });
  }

  public updateFeedbacks() {
    for (let i = this.feedbackList.length - 1; i >= 0; i--) {
      const fb = this.feedbackList[i];
      fb.y -= 0.8;
      fb.opacity -= 0.02;
      if (fb.opacity <= 0) {
        this.feedbackList.splice(i, 1);
      }
    }
  }

  public checkBinHover(eeX: number, eeY: number): SortingBin | null {
    for (const bin of this.bins) {
      // Generous drop zone tolerance for comfortable reach and placement
      if (
        eeX >= bin.x - 30 &&
        eeX <= bin.x + bin.width + 35 &&
        eeY >= bin.y - 18 &&
        eeY <= bin.y + bin.height + 18
      ) {
        return bin;
      }
    }
    return null;
  }

  /**
   * Main per-frame update loop
   */
  public update(deltaTime: number = 16) {
    const isGameActive = this.status === 'running';

    // 1. Update robot kinematics & physical dynamics
    const robotState = this.robot.update(deltaTime);
    const ee = robotState.currentEndEffector;

    // 2. Play subtle servo sound on movement
    if (isGameActive && !robotState.isPaused) {
      soundManager.updateRobotMotionHum(robotState.velocity);
    } else {
      soundManager.updateRobotMotionHum(0);
    }

    // 3. Update conveyor
    if (isGameActive && !this.carriedBox && this.droppingBoxes.length === 0) {
      const conveyorRes = this.conveyor.update(false);
      if (conveyorRes.arrivedAtPickup) {
        soundManager.playBoxArrivalSound();
      }
    }

    // 4. Update carried box position
    if (this.carriedBox) {
      this.carriedBox.x = ee.x;
      this.carriedBox.y = ee.y + 12; // align with gripper fingers
    }

    // 5. Update dropping boxes animations
    for (let i = this.droppingBoxes.length - 1; i >= 0; i--) {
      const b = this.droppingBoxes[i];
      b.dropProgress = (b.dropProgress || 0) + 0.06;
      b.size = Math.max(10, b.size * 0.94);
      b.y += 2.5;

      if (b.dropProgress >= 1.0) {
        this.droppingBoxes.splice(i, 1);
        // Advance next box on conveyor after previous box finishes dropping
        if (isGameActive && !this.carriedBox) {
          this.conveyor.spawnNextBox();
        }
      }
    }

    // 6. Update hover states of bins
    const hoveredBin = this.checkBinHover(ee.x, ee.y);
    this.bins.forEach((bin) => {
      bin.isHovered = bin === hoveredBin;
      if (bin.isHovered && this.carriedBox) {
        bin.highlightState = bin.color === this.carriedBox.color ? 'valid' : 'invalid';
      } else {
        bin.highlightState = 'none';
      }
    });

    // 7. Update floating feedback texts
    this.updateFeedbacks();

    return {
      robotState,
      carriedBox: this.carriedBox,
      hoveredBin,
    };
  }

  /**
   * Handle Gripper State changes from Hand Gesture, Mouse or Touch
   */
  public handleGripperInput(isClosed: boolean) {
    if (this.status !== 'running') return;

    const ee = this.robot.kinematics.forward(
      this.robot.update(16).currentAngles.q1,
      this.robot.update(16).currentAngles.q2
    ).endEffector;

    // Detect transition from OPEN to CLOSED -> Attempt PICK
    if (isClosed && !this.prevPinchState) {
      this.robot.setGripper(true);
      soundManager.playGripperSound(true);

      if (!this.carriedBox) {
        const activeBox = this.conveyor.getActiveBox();
        if (activeBox && activeBox.status === 'at_pickup') {
          // Check proximity to pickup box
          const dist = Math.hypot(ee.x - activeBox.x, ee.y - activeBox.y);
          if (dist <= 55) {
            // Picked up!
            activeBox.status = 'in_gripper';
            this.carriedBox = activeBox;
            this.robot.isCarryingPayload = true; // adds realistic inertia
            this.conveyor.setActiveBox(null);
            this.addFeedback('BOX SECURED', 'info', ee.x, ee.y - 25);
          }
        }
      }
    }

    // Detect transition from CLOSED to OPEN -> Attempt PLACE
    if (!isClosed && this.prevPinchState) {
      this.robot.setGripper(false);
      soundManager.playGripperSound(false);

      if (this.carriedBox) {
        const hoveredBin = this.checkBinHover(ee.x, ee.y);
        const boxToDrop = this.carriedBox;
        this.carriedBox = null;
        this.robot.isCarryingPayload = false; // removes payload inertia
        boxToDrop.status = 'dropping';
        boxToDrop.dropProgress = 0;
        this.droppingBoxes.push(boxToDrop);

        if (hoveredBin) {
          // Dropped in a bin!
          if (boxToDrop.color === hoveredBin.color) {
            // CORRECT SORT!
            this.stats.score += 10;
            this.stats.correctCount += 1;
            this.stats.sortedCount += 1;
            this.stats.streak += 1;
            hoveredBin.count += 1;
            soundManager.playSuccessSound();
            this.addFeedback(
              `+10 PTS! ${boxToDrop.color.toUpperCase()} SORTED`,
              'success',
              hoveredBin.x + 35,
              hoveredBin.y
            );
          } else {
            // WRONG BIN!
            this.stats.score = Math.max(0, this.stats.score - 5);
            this.stats.incorrectCount += 1;
            this.stats.streak = 0;
            soundManager.playErrorSound();
            this.addFeedback(
              `-5 PTS: WRONG BIN! (${boxToDrop.color.toUpperCase()})`,
              'error',
              hoveredBin.x + 35,
              hoveredBin.y
            );
          }
        } else {
          // Missed all bins
          this.stats.score = Math.max(0, this.stats.score - 5);
          this.stats.incorrectCount += 1;
          this.stats.streak = 0;
          soundManager.playErrorSound();
          this.addFeedback('DROPPED OUTSIDE BIN (-5 PTS)', 'error', ee.x, ee.y);
        }

        // Calculate accuracy
        const totalAttempts = this.stats.correctCount + this.stats.incorrectCount;
        this.stats.accuracy =
          totalAttempts > 0 ? Math.round((this.stats.correctCount / totalAttempts) * 100) : 0;
      }
    }

    this.prevPinchState = isClosed;
  }
}
