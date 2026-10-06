# CardioMap 3D: Project Documentation
## Multi-Vessel Coronary Artery Stenosis Risk Spatialization & Explainable Clinical AI

**Authors:** Senior Machine Learning & Frontend Engineering Team  
**System:** CardioMap 3D (React 18 / Three.js Frontend + FastAPI / scikit-learn Backend)  
**Dataset:** Extension of Z-Alizadeh Sani Coronary Angiography Cohort ($N = 303$)  
**Status:** Working Software Prototype (Production-Grade)

---

## 1. Executive Summary & Clinical Problem Statement

Standard risk scores (Framingham, ASCVD, SCORE2) return one scalar percentage of composite 10-year MACE risk. That leaves two clinical gaps:
1. **No spatial localization**: a clinician cannot tell whether the LAD, LCX or RCA is the branch at risk.
2. **Opacity**: a probability is shown with no visibility into which biomarkers, ECG findings or functional measurements drove it.

**CardioMap 3D** addresses this by disaggregating risk into **CAD** plus **LAD**, **LCX** and **RCA** estimates — which *estimate* stenosis risk rather than claiming to reconstruct it, with performance honestly labelled as good (CAD, LAD) to modest (LCX, RCA); showing **low-confidence badges** (`AUC 0.75` LCX, `AUC 0.71` RCA); reporting **relative dataset rank rather than pseudo-precise percentages** for modest models (e.g. *"Risk higher than 70% of patients in the dataset"*); mapping calibrated probabilities onto an interactive 3D coronary tree in real time; and decomposing each prediction with game-theoretic **SHAP** attributions in pre-calibration space aggregated back to original clinical features.

```
Patient Data → Zero-Leakage Preprocessing → 4 Calibrated Models → FastAPI → 3D Dashboard
(Demographics, Vitals,      (Impute → Encode →       CAD/LAD/LCX/RCA      (~60ms)   (CatmullRom tubes,
 Labs, 12-Lead ECG,          Scale, inside            + SHAP                 + pulse, colorblind
 Echo EF/RWMA)                sklearn Pipeline)                                risk scale, What-If)
```

---

## 2. Dataset & Zero-Leakage Preprocessing Protocol

### 2.1 Cohort Characteristics
The system was trained on the landmark **Z-Alizadeh Sani** coronary angiography dataset ($N = 303$ consecutive patients referred for diagnostic catheterization):
- **Features**: 59 raw variables across 5 clinical modalities.
- **Completeness**: 0 missing values across all records.
- **Diagnostic Ground Truth**: Angiographic lumen stenosis $\ge 50\%$.

| Target Variable | Clinical Target | Positive ($N$) | Negative ($N$) | Prevalence (%) |
| :--- | :--- | :---: | :---: | :---: |
| **`Cath`** | Overall Significant CAD | 216 | 87 | **71.3%** |
| **`LAD`** | Left Anterior Descending Stenosis | 177 | 126 | **58.4%** |
| **`LCX`** | Left Circumflex Artery Stenosis | 119 | 184 | **39.3%** |
| **`RCA`** | Right Coronary Artery Stenosis | 114 | 189 | **37.6%** |

### 2.2 Strict Zero-Leakage Architecture
To guarantee methodological validity and prevent data snooping:
- **Hard Column Exclusion**: For every single target model, `Cath`, `CAD`, `LAD`, `LCX`, and `RCA` are permanently purged from the input matrix $X$. Predicting LAD never sees LCX or RCA labels.
- **Unit Test Enforcement**: An automated test (`test_leakage_prevention`) verifies that no target column exists in the feature DataFrame or any transformer stage of the fitted pipelines.
- **Encapsulated Preprocessing**: All transformations live inside scikit-learn `Pipeline` / `ColumnTransformer` objects — numeric (21): median imputation then `StandardScaler`; binary (28): mode imputation; ordinal (1, Function Class): `OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)`; nominal (3, Region RWMA / BBB / VHD): `OneHotEncoder(handle_unknown='ignore', sparse_output=False)` so unseen categories can never crash a prediction.

---

## 3. Validation Methodology & Model Selection

### 3.1 Validation Cohorts and Protocol
1. **Locked Stratified Holdout**: 20% of patients ($N = 61$) locked before any experimentation (`train_test_split(test_size=0.20, stratify=y_cad, random_state=42)`, indices in `artifacts/split.json`), evaluated exactly once as secondary verification.
2. **Development Set (80%, $N = 242$)**: **Double Nested CV** — outer `RepeatedStratifiedKFold(5 folds × 3 repeats)` giving 15 splits whose out-of-fold predictions form the primary benchmark; inner `StratifiedKFold(3)` tuning hyperparameters via `GridSearchCV` / `RandomizedSearchCV`.
3. **Parsimonious Selection Rule**: Highest mean outer ROC-AUC wins, with Logistic Regression preferred if within one standard error to favor clinical interpretability.

### 3.2 Signal Assessment vs. Naive Baselines (Development Set $N = 242$)

The table below contrasts predictive performance against uninformative statistical baselines:

| Target | Dev-Cohort Prev ($N=242$) | Full-Cohort Prev ($N=303$) | Always-Majority Baseline Accuracy | Outer CV Accuracy | PR-AUC vs. Dev Prev Baseline | Brier Score vs. Constant Predictor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **CAD** | **71.5%** | 71.3% | 0.713 | **0.880** | **0.968** vs. 0.715 | **0.122** vs. 0.205 |
| **LAD** | **59.1%** | 58.4% | 0.584 | **0.810** | **0.885** vs. 0.591 | **0.166** vs. 0.243 |
| **LCX** | **38.4%** | 39.3% | 0.607 | **0.682** | **0.615** vs. 0.384 | **0.207** vs. 0.238 (13%) |
| **RCA** | **38.8%** | 37.6% | 0.624 | **0.665** | **0.598** vs. 0.388 | **0.215** vs. 0.235 (9%) |

#### **Critical Limitations & Signal Interpretation**
- **Do not headline accuracy for LCX or RCA**: RCA achieves an accuracy of 0.665 compared to 0.624 for a naive rule that simply predicts "no stenosis" for every patient.
- **Signal Quality**: There is real discriminatory signal (PR-AUC is $\sim 1.6\times$ baseline prevalence for both LCX and RCA). However, the probability-quality gain is modest: the calibrated Brier score is only $\sim 13\%$ better than a constant baseline for LCX ($0.207$ vs. $0.238$), and $\sim 9\%$ better for RCA ($0.215$ vs. $0.235$).
- **Associational Nature of What-If Analysis**: Sliders and scenario testing demonstrate conditional statistical responses under cross-sectional observational models. They do not represent causal treatment effects.

---

## 4. Empirical Evaluation Results

### 4.1 Outer CV Candidate Model Comparison ($N = 242$ Development Set)

Mean outer ROC-AUC across the 15 folds (SD $\approx 0.04\text{--}0.07$, SE $\approx 0.01\text{--}0.017$):

| Target | Logistic Regression | Random Forest | XGBoost | Selected |
| :--- | :---: | :---: | :---: | :--- |
| **CAD** | 0.9125 | **0.9276** | 0.9186 | **Random Forest** (AUC 0.928) |
| **LAD** | 0.8213 | **0.8529** | 0.8423 | **Random Forest** (AUC 0.853) |
| **LCX** | 0.7076 | **0.7489** | 0.7259 | **Random Forest** (AUC 0.749) |
| **RCA** | **0.7029** | 0.7037 | 0.6991 | **Logistic Regression** ($0.703 \ge 0.704 - 0.014$) |

### 4.2 Comprehensive Metrics of Selected Calibrated Models ($N = 242$ Development Set)
Post-selection, pipelines were calibrated via `CalibratedClassifierCV(method='sigmoid', cv=5)`:

| **Metric** | Overall CAD (RF) | LAD Risk (RF) | LCX Risk (RF) | RCA Risk (LogReg) |
| :--- | :---: | :---: | :---: | :---: |
| **Operating Threshold (Provisional)** | **0.41** | **0.48** | **0.45** | **0.42** |
| **ROC-AUC [95% Bootstrap CI]** | **0.9264** [0.889, 0.959] | **0.8515** [0.798, 0.899] | **0.7463** [0.683, 0.805] | **0.7129** [0.649, 0.775] |
| **PR-AUC [95% CI]** | **0.9680** [0.945, 0.985] | **0.8847** [0.833, 0.930] | **0.6152** [0.516, 0.728] | **0.5980** [0.501, 0.695] |
| **Accuracy [95% CI]** | **0.8802** [0.839, 0.921] | **0.8099** [0.760, 0.855] | **0.6818** [0.624, 0.740] | **0.6653** [0.603, 0.723] |
| **$F_1$-Score [95% CI]** | **0.9183** [0.886, 0.947] | **0.8477** [0.803, 0.889] | **0.6484** [0.571, 0.719] | **0.6494** [0.574, 0.717] |
| **Sensitivity (Recall) [95% CI]** | **0.9422** [0.905, 0.975] | **0.8951** [0.845, 0.941] | **0.7634** [0.675, 0.848] | **0.7979** [0.716, 0.874] |
| **Specificity [95% CI]** | **0.7246** [0.618, 0.827] | **0.6869** [0.593, 0.774] | **0.6309** [0.554, 0.706] | **0.5811** [0.500, 0.662] |
| **Precision (PPV) [95% CI]** | **0.8956** [0.850, 0.937] | **0.8050** [0.742, 0.863] | **0.5635** [0.476, 0.651] | **0.5474** [0.461, 0.631] |
| **Brier Score (Calibration)** | **0.1219** [0.107, 0.137] | **0.1660** [0.150, 0.183] | **0.2066** [0.194, 0.220] | **0.2148** [0.193, 0.237] |
| **Calibration Slope / Intercept** | **Slope: 1.65**, Intercept: 0.23 | **Slope: 1.70**, Intercept: -0.06 | **Slope: 3.27**, Intercept: 0.42 | **Slope: 1.81**, Intercept: 0.32 |
| **Holdout Test Set ROC-AUC ($N=61$)** | **0.8579** | **0.7832** | **0.7165** | **0.7305** |

### 4.3 What the Holdout Test Set ($N=61$) Can and Cannot Tell Us
With only 61 patients (43 CAD positive, 18 healthy), the holdout is **too small to confirm or refute** cross-validation estimates:
1. **Uncertainty**: Hanley-McNeil standard errors are $\pm 0.09$ (CAD) and $\pm 0.11$ (LAD), so holdout CAD AUC 0.858 is statistically compatible with the CV estimate 0.926, and LAD 0.783 with 0.852. RCA's holdout 0.731 edging past its CV mean 0.713 is sampling noise, not validation.
2. **Threshold optimism**: Recall fell ~20 points on holdout for LCX ($0.76 \rightarrow 0.54$) and RCA ($0.80 \rightarrow 0.60$), so CV-derived thresholds are explicitly **provisional**. CAD holdout specificity of 55.6% is just **10 of 18 healthy patients**.

### 4.4 Calibration Patterns Across Quantile Bins
Predictions are grouped into 10 bins of $\sim 24$ patients each, giving binomial noise of about $\pm 20$ percentage points. **LCX** probabilities compress into $0.24\text{--}0.65$ (slope $3.27$): the top bin predicts $65\%$ while observing $76\%$, so LCX rarely reaches the highest risk band. **RCA** bins 8–9 predict $63\%\text{--}70\%$ but observe $46\%$ (slope $1.81$), so a displayed $70\%$ corresponds to roughly a $50\%$ empirical event rate. Reliability curves with binomial error bars are stored in `cardiomap/reports/calibration_with_err_{LCX,RCA}.png`.

---

## 5. Clinical Explainability & Feature Attribution

### 5.1 SHAP Methodology
Explainability is evaluated on uncalibrated base pipelines using `shap.TreeExplainer` (Random Forest) and `shap.LinearExplainer` (Logistic Regression) with an empirical background reference set ($N = 50$):
- **Attribution Space**: Probability space for Random Forest; log-odds for Logistic Regression.
- **Categorical Aggregation**: One-hot indicator dummies are summed back to canonical parent variables.
- **Contribution Framing**: Displays represent statistical *contributions to this prediction*, not biological causation.

### 5.2 Key Predictive Contributions & Stability Analysis
**Typical Chest Pain** dominates overall CAD at mean absolute SHAP $0.0826$—nearly twice the next feature (Age, $0.0415$). Beeswarm directions: Typical Chest Pain and Age increase risk ($r=+0.995$, $+0.923$), Hypertension increases it ($+0.975$), while Atypical Chest Pain ($-0.992$) and Ejection Fraction ($-0.767$) decrease it. Cross-fold Spearman rank stability is **moderate for CAD/LAD** ($r_s = 0.578 \pm 0.164$; $0.579 \pm 0.197$) and **weak for LCX/RCA** ($0.430 \pm 0.189$; $0.434 \pm 0.228$)—feature rankings for the two modest models are unstable across cohort resamples.

---

## 6. Interactive 3D Visualization System

### 6.1 Three.js & React Three Fiber Setup
- **Procedural Vascular Architecture**: Coronary arteries are built procedurally using 3D `CatmullRomCurve3` splines and `TubeGeometry` wrapping the anatomical heart mesh coordinates:
  - **LAD**: Descends the anterior interventricular groove towards the apex.
  - **LCX**: Sweeps around the left atrioventricular sulcus towards the posterolateral LV wall.
  - **RCA**: Emerges from the right aortic sinus and courses down the right coronary groove.
- **Physiological Heartbeat Simulation**: Gentle systole-diastole twin-pulse scale animation ($1.0 \rightarrow 1.028$) running at $\sim 72\text{ bpm}$ (1.2 Hz), automatically paused when the browser tab is hidden or when the user activates `prefers-reduced-motion`.
- **Hemodynamic Particle Metaphor**: Animated pulses travel each vessel at velocity inversely proportional to risk ($v = v_0 \times (1.1 - 0.75 \times \text{risk})$), simulating flow impedance through narrowed lumens.
- **Colorblind-Safe Risk Gradient**: Minimal (<20%) Electric Azure `#3B82F6` · Mild (20–45%) Amber `#FACC15` · Moderate (45–70%) Deep Orange `#FB923C` · Severe (≥70%) Magenta `#D946EF`.
- **GPU Optimization**: DPR capped at 1.5, one 86k-triangle anatomical heart mesh (`public/models/heart.glb`, Visible Human, CC BY 4.0) with procedural tube vessels, automatic fallback to a procedural heart if the mesh is unavailable, and a WebGL error boundary.

---

## 7. System Architecture & Usage Guide

```
cardiomap/
├── backend/app/                 # FastAPI backend (main.py, predictor.py, schemas.py)
├── backend/artifacts/           # Serialized models, schema, background data
├── ml/src/                      # Data ingestion, preprocessing, nested CV, SHAP
├── ml/tests/                    # Automated pytest test suite (8 tests)
└── reports/                     # Model comparison tables and figures
```

### 7.1 Running the System
```bash
# 1. Start the Machine Learning Backend (from cardiomap/)
cd cardiomap && make serve     # FastAPI at http://localhost:8000

# 2. Run Validation Tests
cd cardiomap && make test      # pytest suite (8 tests, ~2s)

# 3. Start Frontend Dashboard (from project root)
npm run dev                    # React/3D interface at http://localhost:5173
```

### 7.2 Clinical Limitations & Ethical Safeguards
1. **Single-Center Cohort ($N = 303$)**: Wide confidence intervals exist on smaller subgroup metrics. External prospective validation is required prior to bedside deployment.
2. **Tabular Prediction vs. Imaging Reconstruction**: Predicted probabilities represent multi-task statistical hazards, not direct intraluminal angiographic reconstruction or CT fractional flow reserve (FFR-CT).
3. **Clinical Advisory Banner**: Pinned permanently at the top of the interface:
   > *"Decision support / educational use only. Not a substitute for formal diagnostic imaging or clinical judgement."*
