/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface ProcessedGesture {
  hasHand: boolean;
  isPinched: boolean;
  isFist: boolean;
  pinchDistance: number;
  pinchRatio: number; // 0 (open) to 1 (tightly pinched)
  indexTip: { x: number; y: number } | null;
  thumbTip: { x: number; y: number } | null;
  handLandmarks: NormalizedLandmark[] | null;
}

export class GestureRecognizer {
  // Hysteresis thresholds for pinch
  private pinchThreshold: number = 0.068;
  private releaseThreshold: number = 0.098;
  private currentPinchState: boolean = false;

  // EMA smoothing variables for index fingertip (calibrated for stable, non-jittery tracking)
  private smoothedX: number = 0.5;
  private smoothedY: number = 0.5;
  private smoothingAlpha: number = 0.22;
  private deadband: number = 0.005;

  public process(landmarksList: NormalizedLandmark[][]): ProcessedGesture {
    if (!landmarksList || landmarksList.length === 0) {
      this.currentPinchState = false;
      return {
        hasHand: false,
        isPinched: false,
        isFist: false,
        pinchDistance: 1,
        pinchRatio: 0,
        indexTip: null,
        thumbTip: null,
        handLandmarks: null,
      };
    }

    const landmarks = landmarksList[0];
    if (landmarks.length < 21) {
      return {
        hasHand: false,
        isPinched: false,
        isFist: false,
        pinchDistance: 1,
        pinchRatio: 0,
        indexTip: null,
        thumbTip: null,
        handLandmarks: null,
      };
    }

    // Landmark 4 is Thumb Tip, Landmark 8 is Index Tip
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const wrist = landmarks[0];

    // Calculate Euclidean distance between thumb tip and index tip in 2D
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const pinchDistance = Math.hypot(dx, dy);

    // Apply Hysteresis for pinch detection
    if (this.currentPinchState) {
      if (pinchDistance > this.releaseThreshold) {
        this.currentPinchState = false;
      }
    } else {
      if (pinchDistance < this.pinchThreshold) {
        this.currentPinchState = true;
      }
    }

    // Ratio for UI meters (1.0 = tightly pinched, 0.0 = wide open)
    const pinchRatio = Math.max(
      0,
      Math.min(1, 1 - (pinchDistance - this.pinchThreshold) / (this.releaseThreshold * 1.5))
    );

    // Detect Closed Fist:
    // Check if fingertips (8, 12, 16, 20) are close to their respective MCP joints (5, 9, 13, 17)
    // or close to the wrist (0)
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const dIndexWrist = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
    const dMiddleWrist = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
    const dRingWrist = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
    const dPinkyWrist = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);

    const mcpIndex = landmarks[5];
    const mcpPinky = landmarks[17];
    const palmSpan = Math.hypot(mcpIndex.x - mcpPinky.x, mcpIndex.y - mcpPinky.y);

    // If all fingers are curled in relative to palm scale
    const isFist =
      dIndexWrist < palmSpan * 1.25 &&
      dMiddleWrist < palmSpan * 1.25 &&
      dRingWrist < palmSpan * 1.25 &&
      dPinkyWrist < palmSpan * 1.25 &&
      pinchDistance < 0.12;

    // Apply smoothing to index tip
    // Note: We mirror X (1 - x) because the webcam is mirrored, so moving hand right moves right on screen
    const rawMirroredX = 1 - indexTip.x;
    const rawY = indexTip.y;

    const deltaX = Math.abs(rawMirroredX - this.smoothedX);
    const deltaY = Math.abs(rawY - this.smoothedY);

    if (deltaX > this.deadband) {
      this.smoothedX += (rawMirroredX - this.smoothedX) * this.smoothingAlpha;
    }
    if (deltaY > this.deadband) {
      this.smoothedY += (rawY - this.smoothedY) * this.smoothingAlpha;
    }

    return {
      hasHand: true,
      isPinched: this.currentPinchState,
      isFist,
      pinchDistance,
      pinchRatio,
      indexTip: { x: this.smoothedX, y: this.smoothedY },
      thumbTip: { x: 1 - thumbTip.x, y: thumbTip.y },
      handLandmarks: landmarks,
    };
  }

  public reset() {
    this.currentPinchState = false;
    this.smoothedX = 0.5;
    this.smoothedY = 0.5;
  }
}
