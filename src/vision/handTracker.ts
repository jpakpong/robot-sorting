/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { NormalizedLandmark } from './gestureRecognition';

export type TrackerStatus =
  | 'idle'
  | 'loading_model'
  | 'requesting_camera'
  | 'running'
  | 'permission_denied'
  | 'no_camera'
  | 'error';

export interface HandTrackerCallbacks {
  onResults?: (landmarks: NormalizedLandmark[][], timestampMs: number) => void;
  onStatusChange?: (status: TrackerStatus, message?: string) => void;
}

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private lastVideoTime: number = -1;
  private status: TrackerStatus = 'idle';
  private callbacks: HandTrackerCallbacks = {};
  private isProcessing: boolean = false;

  constructor(callbacks?: HandTrackerCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  public setCallbacks(callbacks: HandTrackerCallbacks) {
    this.callbacks = callbacks;
  }

  public getStatus(): TrackerStatus {
    return this.status;
  }

  private setStatus(status: TrackerStatus, message?: string) {
    this.status = status;
    this.callbacks.onStatusChange?.(status, message);
  }

  public async initialize(): Promise<boolean> {
    if (this.handLandmarker) return true;

    try {
      this.setStatus('loading_model', 'Initializing MediaPipe AI Vision Engine...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (gpuErr) {
        console.warn('GPU delegate failed, falling back to CPU delegate:', gpuErr);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      }

      this.setStatus('idle', 'Vision model ready');
      return true;
    } catch (err: unknown) {
      console.error('Failed to initialize MediaPipe Hand Landmarker:', err);
      const msg = err instanceof Error ? err.message : 'Model loading error';
      this.setStatus('error', `Failed to load hand vision model: ${msg}`);
      return false;
    }
  }

  public async startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    this.videoElement = videoElement;

    if (!this.handLandmarker) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    this.setStatus('requesting_camera', 'Requesting webcam permissions...');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.setStatus('no_camera', 'Webcam API not supported in this browser.');
        return false;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      this.videoElement.srcObject = this.stream;

      await new Promise<void>((resolve) => {
        if (!this.videoElement) return resolve();
        this.videoElement.onloadedmetadata = () => {
          this.videoElement?.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.setStatus('running', 'Webcam active');
      this.startPredictionLoop();
      return true;
    } catch (err: unknown) {
      console.error('Webcam start failed:', err);
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        this.setStatus('permission_denied', 'Camera permission was denied.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        this.setStatus('no_camera', 'No camera detected on this device.');
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown camera error';
        this.setStatus('error', `Camera access failed: ${msg}`);
      }
      return false;
    }
  }

  private startPredictionLoop() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const processFrame = () => {
      if (!this.isProcessing) return;

      if (
        this.videoElement &&
        this.videoElement.readyState >= 2 &&
        this.handLandmarker
      ) {
        if (this.videoElement.currentTime !== this.lastVideoTime) {
          this.lastVideoTime = this.videoElement.currentTime;
          const startTimeMs = performance.now();

          try {
            const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
            if (results && results.landmarks) {
              this.callbacks.onResults?.(
                results.landmarks as unknown as NormalizedLandmark[][],
                startTimeMs
              );
            }
          } catch (e) {
            // Frame detection error, skip frame safely
            console.warn('Frame detection skipped:', e);
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  public stopCamera() {
    this.isProcessing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.lastVideoTime = -1;
    this.setStatus('idle', 'Camera stopped');
  }

  public destroy() {
    this.stopCamera();
    if (this.handLandmarker) {
      try {
        this.handLandmarker.close();
      } catch (err) {
        console.warn('Error closing hand landmarker:', err);
      }
      this.handLandmarker = null;
    }
  }
}
