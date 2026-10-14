# CardioMap 3D — Vessel-Level Cardiovascular Risk Visualization System

**CardioMap 3D** is a clinical-grade web application that bridges statistical cardiovascular risk models and anatomical reality. Instead of outputting a single scalar percentage without spatial context, CardioMap 3D **estimates risk, with performance that varies from good (CAD, LAD) to modest (LCX, RCA)**. It maps calibrated probabilities and empirical patient ranks directly onto an interactive 3D coronary vascular tree (LAD, LCX, RCA), displaying visible low-confidence model badges for weaker vessel branches.

---

## 🔗 Live Demo

| | |
|---|---|
| **Web app** | https://cardio-map-ai.netlify.app |
| **Clinical workbench** (skips the landing page) | https://cardio-map-ai.netlify.app/#demo |
| **Demo video** (3 min) | https://youtu.be/hSCFckUc3Fc |
| **API docs** (Swagger) | https://cardiomap-ai.onrender.com/docs |
| **Source** | https://github.com/krrish2803/CardioMap-AI |

> The backend runs on Render's free tier and sleeps after ~15 minutes idle, so the
> first request after a quiet period can take up to ~50 seconds to wake.

---

## 🔬 Clinical Design Principles

1. **Spatial Localization**: Disaggregates risk into Left Anterior Descending (LAD), Left Circumflex (LCX), and Right Coronary Artery (RCA) territories.
2. **Strict 1-to-1 Mapping**: Every artery color corresponds to an isolated, calibrated model output. No artificial sub-vessel lesion locations are inferred.
3. **Colorblind-Safe Risk Scale**: Utilizes a four-tier perceptual gradient avoiding red/green confusion:
   - **Minimal (<20%)**: Blue (`#3B82F6`)
   - **Mild (20–45%)**: Yellow (`#FACC15`)
   - **Moderate (45–70%)**: Orange (`#FB923C`)
   - **Severe (≥70%)**: Magenta (`#D946EF`)
4. **Game-Theoretic Explainability (SHAP)**: Select any vessel to inspect exact biomarker attributions ("contribution to this prediction", never "cause").
5. **Interactive "What-If" Counterfactuals**: 300ms debounced parameter adjustments for real-time risk recoloring.
6. **Hardware Efficiency**: Optimized for integrated GPUs (DPR capped at 1.5, one 86k-triangle anatomical heart mesh plus lightweight procedural vessels, throttled when inactive).

---

## 🚀 Quickstart & Installation

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)
- Python 3.10+ with `make` (for the FastAPI prediction backend)

### Setup Commands

```bash
# 1. Install frontend dependencies
npm install

# 2. Start the prediction backend (required — the UI calls localhost:8000)
cd cardiomap
make install     # one-time: creates venv and installs Python deps
make serve       # FastAPI at http://localhost:8000
cd ..

# 3. In a second terminal, start the frontend
npm run dev

# 4. (Optional) Run the model test suite
cd cardiomap && make test

# 5. (Optional) Production build / preview
npm run build
npm run preview
```

The dashboard will be available at `http://localhost:5173`.

---

## 🫀 Swapping in a Custom `heart.glb` 3D Model

An anatomical heart mesh **ships with the project** at `public/models/heart.glb` (Visible Human / HuBMAP 3D Reference Organ Library, CC BY 4.0 — attribution in `public/models/README.txt`). If that file is ever missing or fails to load, an organic procedural fallback (sculpted ventricles, aortic root, pulmonary trunk) renders instead, so the app never breaks.

To use a custom clinical or photorealistic GLTF/GLB heart mesh:

1. Place your binary glTF file at:
   ```
   public/models/heart.glb
   ```
2. The loader in `src/components/three/Heart.jsx` will detect `/models/heart.glb` and render it automatically.
3. If your model uses Draco compression, `@react-three/drei`'s `useGLTF` automatically decodes it using Google Draco workers.
4. If your model's orientation or scale differs, adjust the `scale` and `position` props in `src/components/three/Heart.jsx`:
   ```jsx
   <primitive object={cloned} scale={1.15} position={[0, 0, 0]} />
   ```
5. Coronary arteries (LAD, LCX, RCA) are generated procedurally using 3D CatmullRom splines that wrap around the heart. To fine-tune spline anchor points to match your custom heart mesh, modify `controlPoints` in:
   ```
   src/config/vessels.js
   ```

---

## 🔌 Connecting to a Real Backend API

CardioMap 3D is designed with an API toggle and schema-driven architecture.

### 1. Toggle Mock vs Live Mode
Open `src/api/predict.js`. Live mode is the default; the API base resolves by
hostname (`localhost` / `127.0.0.1` → local backend, anything else → the
deployed API), and `VITE_API_BASE_URL` overrides both:
```javascript
// src/api/predict.js — live backend by default, mock available for demos:
export const USE_MOCK = false; // true = run fully offline with a simulated response
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:8000'
    : 'https://cardiomap-ai.onrender.com');
```

If the backend cannot be reached, the UI shows a clearly-labelled **SIMULATED**
result rather than a silent fallback.

### 2. Expected Endpoints

#### `POST /predict`

All 55 clinical fields are optional. The pipeline imputes anything omitted and
reports those names back in `imputed_features`, so a partial request still
returns a valid prediction.

- **Request Body** — `features` keys are the canonical names from `GET /schema`:
  ```json
  {
    "features": {
      "Age": 62,
      "Sex": 1,
      "Typical Chest Pain": 1,
      "BP": 145,
      "LDL": 165,
      "EF-TTE": 45,
      "Region RWMA": "2"
    },
    "explain": true
  }
  ```
  Setting `"explain": false` selects the fast path: probabilities only, with
  `shap`, `base_value`, `explanation_space` and `measurements` returned empty
  (~250 ms faster — used while What-If sliders are being dragged).

- **Response Format** (trimmed for readability — `shap` carries the same
  structure for `cad`, `LAD`, `LCX` and `RCA`, with all 55 features ranked by
  `|contribution|`):
  ```json
  {
    "cad": { "probability": 0.9841, "label": "CAD", "threshold": 0.41 },
    "vessels": {
      "LAD": { "probability": 0.9399, "label": "Stenosis", "threshold": 0.48 },
      "LCX": { "probability": 0.5414, "label": "Stenosis", "threshold": 0.45 },
      "RCA": { "probability": 0.4129, "label": "Normal", "threshold": 0.42 }
    },
    "shap": {
      "cad": [
        { "feature": "Region RWMA", "value": "2", "contribution": 0.0976, "relative_contribution": 25.9 },
        { "feature": "Typical Chest Pain", "value": 1.0, "contribution": 0.0876, "relative_contribution": 23.25 }
      ],
      "LAD": [ "..." ], "LCX": [ "..." ], "RCA": [ "..." ]
    },
    "base_value": { "cad": 0.5, "LAD": 0.5, "LCX": 0.5, "RCA": -0.1755 },
    "explanation_space": { "cad": "probability", "LAD": "probability", "LCX": "probability", "RCA": "log-odds" },
    "measurements": [
      { "feature": "Region RWMA", "group": "Echocardiography", "value": "2", "unit": null,
        "reference_range": null, "flag": "unknown", "contribution": 0.0976, "relative_contribution": 25.9 }
    ],
    "imputed_features": [ "Weight", "Length", "BMI", "..." ],
    "model_version": "cardiomap-v1.0.0-1791132875",
    "disclaimer": "Decision support / educational use only. Not a substitute for formal diagnostic imaging or clinical judgement."
  }
  ```
  `label` is the outcome at that target's F1-optimised `threshold`; compare
  `probability` against `threshold` to read the classification.

#### `GET /schema`
Returns dynamic input definitions (`groups`, `fields`, `ranges`, `defaults`). The UI input form dynamically renders from this JSON, requiring zero front-end code changes when adding new lab tests or biomarkers.

#### `GET /metrics`
Returns validation cohort performance (`ROC-AUC`, `Brier score`, `95% CI`, `ROC points`, `Calibration reliability curve bins`).

---

## ♿ Accessibility & Motion Controls

- **Reduced Motion**: Click the "Motion" button in the navigation bar to instantly disable the 72 bpm heartbeat pulse, particles, and camera transitions. CardioMap 3D also respects the system-level `prefers-reduced-motion` media query.
- **Keyboard Navigation**: All vessel cards and target tabs are keyboard-focusable with ARIA roles and labels.
- **Persistent Clinical Disclaimer**: Pinned at the top of the interactive dashboard to emphasize decision support and research scope.

---

## 🛠 Tech Stack

- **React 18** + **Vite** (JavaScript)
- **Three.js** via `@react-three/fiber` & `@react-three/drei`
- **GSAP** & **Framer Motion**
- **Zustand** (global reactive clinical state)
- **Recharts** (SHAP horizontal bars, ROC curves, calibration diagrams)
- **Tailwind CSS** (dark clinical-tech aesthetic)
