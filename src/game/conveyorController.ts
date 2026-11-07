/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, BoxColor, ConveyorState } from '../types/game';

export interface ConveyorUpdateResult {
  arrivedAtPickup: boolean;
  state: ConveyorState;
  fallenBoxes: Box[];
  collisions: Box[];
}

export class ConveyorController {
  // Geometry
  public readonly conveyorX: number = 70;
  public readonly conveyorWidth: number = 72;
  public readonly conveyorStartY: number = 540;
  public readonly conveyorEndY: number = 38;
  public readonly pickupY: number = 250;
  public readonly pickupX: number = 106; // center of belt
  public readonly boxSize: number = 42;

  // Animation & Motion
  public speed: number = 2.4; // pixels per nominal frame
  public beltOffset: number = 0;
  public state: ConveyorState = 'WAITING_FOR_BOX';

  // Continuous Challenge Mode (Half-time at 1:30 remaining)
  public isContinuousMode: boolean = false;
  public spawnTimer: number = 0; // accumulated ms
  public readonly SPAWN_INTERVAL: number = 4000; // each coming box every 4 seconds
  public readonly PICKUP_DWELL_MS: number = 3000; // Second Half: stops and waits for exactly 3 seconds

  // Boxes on conveyor
  private boxes: Box[] = [];
  private boxSequence: BoxColor[] = [
    'red',
    'blue',
    'yellow',
    'green',
    'red',
    'yellow',
    'blue',
    'green',
  ];
  private sequenceIndex: number = 0;
  private boxIdCounter: number = 0;

  constructor() {
    this.spawnNextBox();
  }

  public getBoxes(): Box[] {
    return this.boxes;
  }

  public getActiveBox(): Box | null {
    // Return closest box to pickup point, prioritizing box currently at pickup
    if (this.boxes.length === 0) return null;
    const atPickup = this.boxes.find((b) => b.status === 'at_pickup');
    if (atPickup) return atPickup;

    let closest: Box | null = null;
    let minDist = Infinity;
    for (const b of this.boxes) {
      const dist = Math.abs(b.y - this.pickupY);
      if (dist < minDist) {
        minDist = dist;
        closest = b;
      }
    }
    return closest;
  }

  public setActiveBox(box: Box | null) {
    if (box) {
      if (!this.boxes.find((b) => b.id === box.id)) {
        this.boxes.push(box);
      }
    } else {
      this.boxes = [];
    }
  }

  public removeBox(boxId: string): Box | null {
    const idx = this.boxes.findIndex((b) => b.id === boxId);
    if (idx !== -1) {
      const [removed] = this.boxes.splice(idx, 1);
      return removed;
    }
    return null;
  }

  public spawnNextBox(): Box {
    const color = this.boxSequence[this.sequenceIndex % this.boxSequence.length];
    this.sequenceIndex++;
    this.boxIdCounter++;

    const newBox: Box = {
      id: `box_${this.boxIdCounter}_${color}`,
      color,
      x: this.pickupX,
      y: this.conveyorStartY,
      size: this.boxSize,
      status: 'on_conveyor',
      dwellTimeRemaining: this.isContinuousMode ? this.PICKUP_DWELL_MS : undefined,
      hasCompletedPickupDwell: false,
    };

    this.boxes.push(newBox);
    this.state = 'BOX_MOVING';
    return newBox;
  }

  public update(
    dt: number = 16,
    isContinuousMode: boolean = false,
    isPaused: boolean = false,
    isNormalStopped: boolean = false
  ): ConveyorUpdateResult {
    this.isContinuousMode = isContinuousMode;
    let arrivedAtPickup = false;
    const fallenBoxes: Box[] = [];
    const collisions: Box[] = [];

    if (isPaused) {
      return {
        arrivedAtPickup,
        state: this.state,
        fallenBoxes,
        collisions,
      };
    }

    const frameStep = Math.min(2.0, dt / 16.67);

    // MODE 1: CONTINUOUS CHALLENGE MODE (Half-time passed: boxes spawn every 4s, stop at pickup for 4s, then continue moving to end)
    if (this.isContinuousMode) {
      this.beltOffset = (this.beltOffset + this.speed * frameStep) % 24;
      this.state = 'BOX_MOVING';

      // 4-second spawn timer for incoming boxes
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.SPAWN_INTERVAL) {
        this.spawnTimer = 0;
        this.spawnNextBox();
      }

      // Update motion & dwell for all boxes on the conveyor
      for (const box of this.boxes) {
        if (!box.hasCompletedPickupDwell) {
          if (box.status === 'at_pickup') {
            // Box is currently stopped at pickup station for 4 seconds!
            box.y = this.pickupY;
            box.dwellTimeRemaining = (box.dwellTimeRemaining ?? this.PICKUP_DWELL_MS) - dt;
            if (box.dwellTimeRemaining <= 0) {
              // 4 seconds elapsed! Resumes continuous moving to end
              box.dwellTimeRemaining = 0;
              box.hasCompletedPickupDwell = true;
              box.status = 'on_conveyor';
            }
          } else if (box.y > this.pickupY) {
            // Moving towards pickup station
            box.y -= this.speed * frameStep;
            if (box.y <= this.pickupY) {
              // Reached pickup station: STOP for 4 seconds!
              box.y = this.pickupY;
              box.status = 'at_pickup';
              box.dwellTimeRemaining = this.PICKUP_DWELL_MS;
              arrivedAtPickup = true;
            }
          }
        } else {
          // Already completed 4s dwell at pickup: continues moving upward to the conveyor end!
          box.y -= this.speed * frameStep;
        }
      }

      // 1. Check for boxes reaching the end of the conveyor (overflow)
      for (let i = this.boxes.length - 1; i >= 0; i--) {
        const box = this.boxes[i];
        if (box.y <= this.conveyorEndY) {
          box.status = 'dropping';
          box.dropProgress = 0;
          box.vx = (Math.random() - 0.5) * 2;
          box.vy = 2.0;
          fallenBoxes.push(box);
          this.boxes.splice(i, 1);
        }
      }

      // 2. Check for inter-box collisions on conveyor ("if the boxes are collided, they are dropped")
      const collidedIds = new Set<string>();
      for (let i = 0; i < this.boxes.length; i++) {
        for (let j = i + 1; j < this.boxes.length; j++) {
          const b1 = this.boxes[i];
          const b2 = this.boxes[j];
          const distY = Math.abs(b1.y - b2.y);
          if (distY < this.boxSize - 2) {
            collidedIds.add(b1.id);
            collidedIds.add(b2.id);
          }
        }
      }

      if (collidedIds.size > 0) {
        for (let i = this.boxes.length - 1; i >= 0; i--) {
          const box = this.boxes[i];
          if (collidedIds.has(box.id)) {
            box.status = 'dropping';
            box.dropProgress = 0;
            box.isCollided = true;
            box.vx = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);
            box.vy = 2.0;
            collisions.push(box);
            this.boxes.splice(i, 1);
          }
        }
      }

      return {
        arrivedAtPickup,
        state: this.state,
        fallenBoxes,
        collisions,
      };
    }

    // MODE 2: NORMAL OPERATION (First 90s: single box advances to pickup, conveyor stops, waits for robot)
    if (this.boxes.length === 0) {
      this.state = 'WAITING_FOR_BOX';
      return { arrivedAtPickup, state: this.state, fallenBoxes, collisions };
    }

    const currentBox = this.boxes[0];

    if (!isNormalStopped && currentBox.y > this.pickupY) {
      this.beltOffset = (this.beltOffset + this.speed * frameStep) % 24;
      currentBox.y -= this.speed * frameStep;

      if (currentBox.y <= this.pickupY) {
        currentBox.y = this.pickupY;
        currentBox.status = 'at_pickup';
        this.state = 'BOX_AT_PICKUP';
        arrivedAtPickup = true;
      } else {
        this.state = 'BOX_MOVING';
      }
    } else if (currentBox.y <= this.pickupY) {
      currentBox.y = this.pickupY;
      currentBox.status = 'at_pickup';
      this.state = 'BOX_AT_PICKUP';
    }

    return {
      arrivedAtPickup,
      state: this.state,
      fallenBoxes,
      collisions,
    };
  }

  public reset() {
    this.sequenceIndex = 0;
    this.boxIdCounter = 0;
    this.beltOffset = 0;
    this.spawnTimer = 0;
    this.isContinuousMode = false;
    this.boxes = [];
    this.spawnNextBox();
  }
}
