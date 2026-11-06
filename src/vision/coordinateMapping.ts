/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CalibrationData } from '../types/game';

export interface WorkspaceMappingConfig {
  canvasWidth: number;
  canvasHeight: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class CoordinateMapper {
  private calibration: CalibrationData = {
    centerX: 0.5,
    centerY: 0.5,
    rangeX: 0.35, // active movement range from center
    rangeY: 0.32,
    isCalibrated: false,
  };

  public setCalibration(centerX: number, centerY: number, rangeX: number = 0.35, rangeY: number = 0.32) {
    this.calibration = {
      centerX,
      centerY,
      rangeX: Math.max(0.15, rangeX),
      rangeY: Math.max(0.15, rangeY),
      isCalibrated: true,
    };
  }

  public getCalibration(): CalibrationData {
    return { ...this.calibration };
  }

  public resetCalibration() {
    this.calibration = {
      centerX: 0.5,
      centerY: 0.5,
      rangeX: 0.35,
      rangeY: 0.32,
      isCalibrated: false,
    };
  }

  /**
   * Maps normalized index fingertip coordinates (0 to 1) to simulation workspace (pixels).
   * Supports calibrated center and range scaling.
   */
  public mapToWorkspace(
    normalizedX: number,
    normalizedY: number,
    config: WorkspaceMappingConfig
  ): { x: number; y: number } {
    // Offset from calibrated center
    const deltaX = (normalizedX - this.calibration.centerX) / this.calibration.rangeX;
    const deltaY = (normalizedY - this.calibration.centerY) / this.calibration.rangeY;

    // Clamp normalized offset to [-1, 1]
    const clampedOffsetNormX = Math.max(-1, Math.min(1, deltaX));
    const clampedOffsetNormY = Math.max(-1, Math.min(1, deltaY));

    // Map [-1, 1] to workspace bounding box [minX, maxX] and [minY, maxY]
    const centerX = (config.minX + config.maxX) / 2;
    const centerY = (config.minY + config.maxY) / 2;
    const spanX = (config.maxX - config.minX) / 2;
    const spanY = (config.maxY - config.minY) / 2;

    const mappedX = centerX + clampedOffsetNormX * spanX;
    const mappedY = centerY + clampedOffsetNormY * spanY;

    return {
      x: Math.max(config.minX, Math.min(config.maxX, mappedX)),
      y: Math.max(config.minY, Math.min(config.maxY, mappedY)),
    };
  }
}

export const coordinateMapper = new CoordinateMapper();
