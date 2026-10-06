# CardioMap API — Machine Learning Pipeline & Clinical Decision Backend

CardioMap API is the predictive engine for the CardioMap 3D cardiovascular risk visualization system. It trains independent, leakage-free statistical classifiers to predict overall coronary artery disease (**CAD**) and individual coronary branch stenosis (**LAD**, **LCX**, **RCA**), serving calibrated probabilities, game-theoretic **SHAP** biomarker attributions, and dynamic clinical schemas over a high-performance FastAPI interface.

---

## 🔬 Methodological Rigor & Architecture

1. **Strict Zero-Leakage Protocol**: For every target model, `Cath`, `CAD`, `LAD`, `LCX`, and `RCA` are strictly absent from the input feature matrix. Enforced by programmatic assertion and verified by unit test `test_leakage_prevention`.
2. **Encapsulated Preprocessing**: Imputation (median for numeric, mode for categorical), scaling (`StandardScaler`), and encoding (`OneHotEncoder(handle_unknown="ignore")`, `OrdinalEncoder`) live strictly inside scikit-learn `Pipeline` objects.
3. **Double Stratified Nested Cross-Validation**:
   - **Outer Loop**: `RepeatedStratifiedKFold` (5 folds $\times$ 3 repeats = 15 outer folds). Out-of-fold predictions form the primary benchmark.
   - **Inner Loop**: `StratifiedKFold` (3 folds) for hyperparameter search.
   - **Candidate Models**: ElasticNet Logistic Regression, Random Forest, and XGBoost.
4. **Parsimonious Selection Rule**: Chooses the model with the highest mean outer ROC-AUC. If Logistic Regression is within one standard error of the best, Logistic Regression is chosen to favor parsimony and clinical interpretability.
5. **Sigmoid Probability Calibration**: Wrapped with `CalibratedClassifierCV(method="sigmoid", cv=5)` to produce reliable probabilities.
6. **Aggregated SHAP Explainability**: Explains the base uncalibrated models in pre-calibration space (`log-odds` for LR/XGB, `probability` for RF). Aggregates one-hot categorical dummies back to canonical original feature names.
7. **Sub-100ms Inference Latency**: Benchmarked at ~60ms on CPU for simultaneous 4-target inference and multi-target SHAP attribution.

---

## 🚀 Quickstart & Makefile Commands

### 1. Environment Setup
```bash
# Create and activate Python 3.11/3.12 virtual environment
python3 -m venv cardiomap/venv
source cardiomap/venv/bin/activate

# Install dependencies
pip install -r cardiomap/requirements.txt
```

### 2. Execution via Make
```bash
# Run full nested CV training, calibration, and artifact export
make train

# Run the complete pytest test suite (leakage, schema, contract, SHAP)
make test

# Launch the FastAPI backend server (http://localhost:8000)
make serve

# Print dataset audit and model comparison summary
make report
```

---

## 🐳 Docker Containerization

### Build Image
```bash
docker build -t cardiomap-api -f cardiomap/backend/Dockerfile cardiomap
```

### Run Container
```bash
docker run -d --name cardiomap-backend -p 8000:8000 cardiomap-api
```
Interactive Swagger UI will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 API Endpoints & cURL Examples

### 1. Health Status (`GET /health`)
```bash
curl -X GET "http://localhost:8000/health"
```
**Response**:
```json
{
  "status": "healthy",
  "model_version": "cardiomap-v1.0.0-1741234567",
  "artifacts_loaded": true,
  "targets": ["cad", "LAD", "LCX", "RCA"]
}
```

### 2. Dynamic Schema (`GET /schema`)
Returns the dynamic JSON schema defining feature groups, types, units, empirical defaults, and clinical reference ranges.

### 3. Validation Metrics & Limitations (`GET /metrics`)
Returns nested cross-validation out-of-fold metrics (mean, std, 95% bootstrap CIs), ROC/PR coordinates, calibration curves, and project document tables.

### 4. Real Patient Archetypes (`GET /samples`)
Returns three empirical patient feature dictionaries (Low Risk, Moderate Risk, and High Risk).

### 5. Multi-Vessel Prediction & SHAP (`POST /predict`)
```bash
curl -X POST "http://localhost:8000/predict" \
     -H "Content-Type: application/json" \
     -d '{
       "features": {
         "Age": 62,
         "Sex": 1,
         "Typical Chest Pain": 1,
         "BP": 145,
         "LDL": 165,
         "EF-TTE": 45,
         "Region RWMA": "2"
       }
     }'
```

---

## ⚙️ How to Extend the Pipeline

### How to Add a Feature
1. Open `cardiomap/ml/config/feature_groups.yaml`.
2. Add the feature under its corresponding clinical group (`Demographic`, `Clinical examination`, `ECG`, `Laboratory`, or `Echocardiography`) specifying its `type` (`numeric`, `binary`, `ordinal`, or `nominal`), `unit`, and `description`.
3. If an adult reference range exists, add it to `cardiomap/ml/config/reference_ranges.yaml`.
4. Run `make train`. The pipeline automatically adapts the `ColumnTransformer`, imputers, scalers, schema, and API validators without writing any manual parsing code!

### How to Add a Target (e.g. Left Main / LMCA)
1. Open `cardiomap/ml/config/targets.yaml`.
2. Add the target definition under `targets` specifying the dataset column name, positive label, and value mapping.
3. Ensure the column name is listed in `excluded_columns` to maintain strict leakage prevention.
4. Run `make train`.

---

## ⚠️ Limitations

The following clinical and statistical limitations apply to the model outputs:
- **Single-center cohort ($N = 303$)**: Estimates carry wide confidence intervals and unknown external generalization across diverse demographic or clinical populations.
- **Vessel-level tabular risk estimates**: Predictions represent tabular statistical risk derived from multi-task models, not direct anatomical lesion imaging or intraluminal angiographic reconstruction.
- **Sparser target branch variance**: Performance on sparser target branches (e.g., RCA, LCX) exhibits greater variance and should be interpreted alongside reported 95% confidence intervals.
- **Secondary holdout variance**: The holdout evaluation ($N = 61$) represents a secondary, higher-variance point estimate; headline benchmark relies on pooled repeated out-of-fold cross-validation.
- **Optimized decision thresholds**: Operating decision thresholds were tuned to maximize F1 on out-of-fold data and are slightly optimistic relative to un-tuned testing.

---

## 📜 Citation & License

- **Dataset**: Alizadeh Sani, Z., et al. *"Extension of Z-Alizadeh Sani Dataset for Coronary Artery Disease Detection."*
- **License**: Educational & Clinical Research Decision Support Prototype. Not FDA approved for standalone diagnostic intervention.
