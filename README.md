# SORTING SIMULATION – Hand, Finger & Touch Controlled Arm

A complete, interactive, web-based 2D industrial automation simulation game optimized for iPad 11-inch screens and modern desktop web browsers.

Operate a virtual 2-link robotic arm using real-time hand and finger gestures captured by your webcam, or use the direct mouse/touch mode.

---

## 🎮 Simulation Overview

- **Left Panel (Simulation Workspace)**:
  - **Vertical Conveyor Belt**: Carries colored boxes (Red, Yellow, Blue, Green) upward to the pickup station. Pauses automatically when a box arrives.
  - **2R Robotic Arm with Physical Dynamics**:
    - **Inertia & Viscous Friction**: Modeled with realistic drive torque ($K_p$), viscous damping ($D_v$), Coulomb friction, and rotational inertia ($J_1, J_2$).
    - **Payload Dynamics**: Inertia automatically increases when grasping a box.
    - **Optimized Ergonomic Reach**: Robot base at $(350, 280)$ with link lengths $L_1 = 190\,\text{mm}, L_2 = 180\,\text{mm}$ easily reaches the pickup station and all 4 sorting bins.
  - **Four Color-Sorting Bins**: Red, Yellow, Blue, and Green hoppers with generous drop zones and live LED counters.
- **Right Panel (Computer Vision & Telemetry)**:
  - **Live Webcam Feed**: Powered by Google MediaPipe Tasks Vision (`HandLandmarker`).
  - **Hand Landmark Overlay**: Highlights index fingertip (Landmark ID 8), thumb tip (Landmark ID 4), and dynamic pinch distance vector.
  - **Gesture Telemetry**: Real-time status cards for Hand Detection, Index Tracking, Gripper State, Robot Motion, and Analog Pinch Proximity meter.

---

## 🕹️ Controls: Hand Gesture vs. Touch / Mouse Mode

### A. Hand Gesture Controls (Webcam)
| Gesture | Function | Details |
|---|---|---|
| **Index Finger Movement** | Move Robot End-Effector | Landmark 8 mapped with EMA smoothing and deadband |
| **Thumb + Index Pinch** | Close Gripper (Pick Box) | Euclidean distance below hysteresis threshold (~0.068) |
| **Release Pinch** | Open Gripper (Drop Box) | Distance exceeds release threshold (~0.098) |
| **Closed Fist** | Pause Robot Movement | Finger extension metric checks tight curl to palm |

### B. Touch / Mouse Mode (iPad & Touchscreens)
- **Direct Drag**: Touch or click and drag anywhere on the simulation workspace to smoothly direct the robot arm.
- **Dedicated Tactile Gripper Button**: Large on-screen button `GRIPPER: TAP TO PICK / DROP` for convenient thumb actuation on iPad.
- **Click / Tap / Spacebar**: Tapping the canvas or pressing **Spacebar** also toggles the pneumatic gripper.

---

## 📐 Robot Kinematics & Dynamics

### 1. Kinematic Model
- $L_1 = 190\,\text{mm}, L_2 = 180\,\text{mm} \implies R_{max} = 365\,\text{mm}$.
- Pickup Station is at $(110, 250)$ ($\approx 242\,\text{mm}$ from base).
- Sorting Bins are positioned at $X = 570\,\text{mm}$ ($\approx 270 - 330\,\text{mm}$ from base), safely within reach.

### 2. Physical Inertia & Friction Equations
$$\tau = K_p (q_{\text{target}} - q) - D_v \omega - \text{sign}(\omega) F_c$$
$$\alpha = \text{clamp}\left(\frac{\tau}{J_{\text{base}} + J_{\text{payload}}}, -\alpha_{\max}, \alpha_{\max}\right)$$
$$\omega(t + \Delta t) = \text{clamp}(\omega(t) + \alpha \Delta t, -\omega_{\max}, \omega_{\max})$$
$$q(t + \Delta t) = q(t) + \omega \Delta t$$

---

## ⏱️ Scoring & 3-Minute Shift Rules

- **Shift Duration**: **3 Minutes (180 Seconds)** countdown timer (`M:SS`).
- **Correct Sort**: **+10 Points**, +1 Sorted Count, +1 Correct, streak multiplier, success chime.
- **Wrong Bin / Missed Drop**: **-5 Points**, warning buzz, streak reset.
- **Accuracy (%)**:
  $$\text{Accuracy} = \frac{\text{Correct Sorts}}{\text{Total Attempts}} \times 100\%$$
- **Shift Debrief**: Displays total score, accuracy, performance rank (S-Tier, A-Tier, B-Tier), and Play Again option.

---

## 🌐 Vercel Deployment

1. Push to GitHub.
2. Import project in Vercel.
3. Build command: `npm run build`, output directory: `dist`.
