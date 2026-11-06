/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, BoxColor, ConveyorState } from '../types/game';

export class ConveyorController {
  // Geometry
  public readonly conveyorX: number = 70;
  public readonly conveyorWidth: number = 72;
  public readonly conveyorStartY: number = 540;
  public readonly pickupY: number = 250;
  public readonly pickupX: number = 106; // center of belt
  public readonly boxSize: number = 42;

  // Animation & Motion
  public speed: number = 3.2; // pixels per frame
  public beltOffset: number = 0;
  public state: ConveyorState = 'WAITING_FOR_BOX';

  // Boxes on conveyor
  private activeBox: Box | null = null;
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

  public getActiveBox(): Box | null {
    return this.activeBox;
  }

  public setActiveBox(box: Box | null) {
    this.activeBox = box;
  }

  public spawnNextBox() {
    const color = this.boxSequence[this.sequenceIndex % this.boxSequence.length];
    this.sequenceIndex++;
    this.boxIdCounter++;

    this.activeBox = {
      id: `box_${this.boxIdCounter}_${color}`,
      color,
      x: this.pickupX,
      y: this.conveyorStartY,
      size: this.boxSize,
      status: 'on_conveyor',
    };

    this.state = 'BOX_MOVING';
  }

  public update(isConveyorStopped: boolean = false): {
    arrivedAtPickup: boolean;
    state: ConveyorState;
  } {
    let arrivedAtPickup = false;

    if (!isConveyorStopped && this.state === 'BOX_MOVING' && this.activeBox) {
      // Advance belt texture
      this.beltOffset = (this.beltOffset + this.speed) % 24;

      // Advance box upward towards pickup position
      if (this.activeBox.y > this.pickupY) {
        this.activeBox.y -= this.speed;

        // Check if reached pickup
        if (this.activeBox.y <= this.pickupY) {
          this.activeBox.y = this.pickupY;
          this.activeBox.status = 'at_pickup';
          this.state = 'BOX_AT_PICKUP';
          arrivedAtPickup = true;
        }
      }
    }

    return {
      arrivedAtPickup,
      state: this.state,
    };
  }

  public reset() {
    this.sequenceIndex = 0;
    this.boxIdCounter = 0;
    this.beltOffset = 0;
    this.spawnNextBox();
  }
}
