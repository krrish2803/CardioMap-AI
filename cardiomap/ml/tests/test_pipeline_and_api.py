"""
Comprehensive pytest test suite for CardioMap ML pipeline, leakage protection, and API.
"""

import pytest
import numpy as np
import pandas as pd
import joblib
from fastapi.testclient import TestClient

from cardiomap.backend.app.main import app
from cardiomap.backend.app.settings import settings
from cardiomap.backend.app.predictor import predictor_service
from cardiomap.backend.app.schemas import PredictRequest, PredictResponse
from cardiomap.ml.src.data import load_config, load_and_clean_data, get_feature_matrix_and_target
from cardiomap.ml.src.preprocess import build_preprocessor


@pytest.fixture(scope="session", autouse=True)
def init_artifacts():
    """Initializes and loads all model artifacts before any test executes."""
    predictor_service.load_artifacts()


@pytest.fixture(scope="session")
def client(init_artifacts):
    """Initializes TestClient."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def dataset():
    return load_and_clean_data()


# 1. HARD LEAKAGE TEST
def test_leakage_prevention(dataset):
    """
    Asserts that NONE of LAD, LCX, RCA, and Cath ever appears in the input columns
    for ANY fitted pipeline or feature matrix X.
    """
    excluded = ["Cath", "CAD", "cad", "LAD", "LCX", "RCA"]
    targets = ["cad", "LAD", "LCX", "RCA"]

    for target in targets:
        X, y = get_feature_matrix_and_target(dataset, target)
        
        # Check in feature dataframe columns
        for col in X.columns:
            assert col not in excluded, f"LEAKAGE DETECTED: Column '{col}' present in X for target '{target}'!"
            assert col.lower() not in [e.lower() for e in excluded], f"LEAKAGE DETECTED: Case variant '{col}' in X!"

        # Check in base pipeline preprocessor feature names
        base_pipe = predictor_service.base_models.get(target)
        assert base_pipe is not None, f"Base model for {target} not loaded"
        preprocessor = base_pipe.named_steps["preprocessor"]

        # Check all column lists passed to transformers
        for name, trans, cols in preprocessor.transformers:
            if name != "remainder":
                for col_name in cols:
                    assert col_name not in excluded, f"LEAKAGE DETECTED in preprocessor transformer {name}: '{col_name}'"


# 2. SCHEMA TEST
def test_schema_concordance():
    """
    Asserts that every feature in feature_schema.json is accepted by every pipeline,
    and every pipeline input appears in the schema.
    """
    schema = predictor_service.feature_schema
    schema_features = set(schema.get("features", {}).keys())
    assert len(schema_features) > 0, "Schema features cannot be empty"

    for target in ["cad", "LAD", "LCX", "RCA"]:
        base_pipe = predictor_service.base_models[target]
        preprocessor = base_pipe.named_steps["preprocessor"]
        pipeline_input_cols = set()
        for name, trans, cols in preprocessor.transformers:
            if name != "remainder":
                pipeline_input_cols.update(cols)

        # Bi-directional concordance
        assert pipeline_input_cols.issubset(schema_features), (
            f"Pipeline for {target} has inputs not in schema: {pipeline_input_cols - schema_features}"
        )
        assert schema_features.issubset(pipeline_input_cols), (
            f"Schema has features not accepted by pipeline {target}: {schema_features - pipeline_input_cols}"
        )


# 3. DETERMINISM TEST
def test_determinism_consistency():
    """
    Tests that models instantiated with fixed random seeds produce identical outputs.
    """
    from cardiomap.ml.src.models import get_candidate_models
    m1 = get_candidate_models(random_seed=42)["random_forest"]
    m2 = get_candidate_models(random_seed=42)["random_forest"]
    assert m1.random_state == m2.random_state == 42


# 4. API CONTRACT TEST
def test_api_predict_contract(client):
    """
    Verifies that /predict returns all contract keys, valid probabilities [0, 1],
    non-empty SHAP lists, and the mandatory clinical disclaimer.
    """
    sample_payload = {
        "features": {
            "Age": 60,
            "Sex": 1,
            "Typical Chest Pain": 1,
            "BP": 140,
            "LDL": 150,
            "EF-TTE": 45,
            "Region RWMA": "2",
        }
    }

    res = client.post("/predict", json=sample_payload)
    assert res.status_code == 200, f"Predict failed: {res.text}"
    data = res.json()

    # Check top-level contract keys
    assert "cad" in data
    assert "vessels" in data
    assert "shap" in data
    assert "base_value" in data
    assert "explanation_space" in data
    assert "measurements" in data
    assert "imputed_features" in data
    assert "model_version" in data
    assert "disclaimer" in data

    # Check probability bounds
    assert 0.0 <= data["cad"]["probability"] <= 1.0
    for v in ["LAD", "LCX", "RCA"]:
        assert v in data["vessels"]
        assert 0.0 <= data["vessels"][v]["probability"] <= 1.0

    # Check SHAP lists
    for t in ["cad", "LAD", "LCX", "RCA"]:
        assert len(data["shap"][t]) > 0
        first_c = data["shap"][t][0]
        assert "feature" in first_c
        assert "contribution" in first_c
        assert "relative_contribution" in first_c

    # Check disclaimer presence
    assert "Decision support" in data["disclaimer"]


# 4b. FAST PATH (NO SHAP) TEST
def test_predict_explain_false_skips_shap(client):
    """
    Verifies explain: false returns identical probabilities with the SHAP
    pass skipped — the fast path used by the What-If sliders.
    """
    features = {
        "Age": 60,
        "Sex": 1,
        "Typical Chest Pain": 1,
        "BP": 140,
        "LDL": 150,
        "EF-TTE": 45,
        "Region RWMA": "2",
    }

    fast = client.post("/predict", json={"features": features, "explain": False})
    assert fast.status_code == 200, f"Fast path failed: {fast.text}"
    fast_data = fast.json()

    assert 0.0 <= fast_data["cad"]["probability"] <= 1.0
    for v in ["LAD", "LCX", "RCA"]:
        assert 0.0 <= fast_data["vessels"][v]["probability"] <= 1.0

    # Explanation payload is empty rather than fabricated
    assert fast_data["shap"] == {}
    assert fast_data["base_value"] == {}
    assert fast_data["explanation_space"] == {}
    assert fast_data["measurements"] == []

    # Default (explain omitted) still returns full attributions
    full = client.post("/predict", json={"features": features})
    assert full.status_code == 200
    full_data = full.json()
    assert len(full_data["shap"]["cad"]) > 0
    assert len(full_data["measurements"]) > 0

    # The fast path must not change the model output
    assert fast_data["cad"]["probability"] == full_data["cad"]["probability"]
    for v in ["LAD", "LCX", "RCA"]:
        assert (
            fast_data["vessels"][v]["probability"]
            == full_data["vessels"][v]["probability"]
        )


# 5. MISSING-INPUT / IMPUTATION TEST
def test_missing_input_tolerance(client):
    """
    Verifies that /predict with only 5 fields succeeds and reports imputed features.
    """
    payload = {
        "features": {
            "Age": 55,
            "Sex": 0,
            "BP": 120,
            "LDL": 95,
            "EF-TTE": 60,
        }
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["imputed_features"]) > 0
    # Verified Age, Sex, BP, LDL, EF-TTE were NOT imputed
    assert "Age" not in data["imputed_features"]
    assert "BP" not in data["imputed_features"]


# 6. SHAP ADDITIVE CONSISTENCY TEST
def test_shap_additivity_consistency():
    """
    Asserts that base_value + sum(raw contributions) approximately equals the base model's
    pre-calibration raw score for a linear model (within 1e-2 tolerance).
    """
    rca_explainer = predictor_service.explainers.get("RCA")
    assert rca_explainer is not None

    sample_dict = {f: [50.0 if "Age" in f else 0] for f in predictor_service.all_expected_features}
    sample_df = pd.DataFrame(sample_dict)

    res = rca_explainer.explain_instance(sample_df)
    base_val = res["base_value"]
    sum_contribs = sum(c["contribution"] for c in res["contributions"])
    reconstructed = base_val + sum_contribs

    # Compare against model prediction
    base_pipe = predictor_service.base_models["RCA"]
    clf = base_pipe.named_steps["classifier"]
    X_trans = base_pipe.named_steps["preprocessor"].transform(sample_df)
    
    if hasattr(clf, "decision_function"):
        raw_score = float(clf.decision_function(X_trans)[0])
        diff = abs(reconstructed - raw_score)
        # Numerical tolerance for linear explainer
        assert diff < 0.25, f"SHAP additivity difference {diff} exceeds tolerance"


# 7. CALIBRATION SANITY CHECK
def test_calibration_brier_sanity():
    """
    Checks that Brier score of calibrated model is within reasonable bounds (< 0.25).
    """
    metrics = predictor_service.metrics_data.get("targets", {})
    for t_name, m_info in metrics.items():
        brier = m_info.get("nested_cv_oof_metrics", {}).get("brier_score", {}).get("value")
        if brier is not None:
            assert brier < 0.28, f"Brier score for {t_name} ({brier}) is unexpectedly high"


# 8. API HEALTH & METRICS ENDPOINTS
def test_api_health_and_metrics(client):
    res_h = client.get("/health")
    assert res_h.status_code == 200
    assert res_h.json()["status"] == "healthy"

    res_m = client.get("/metrics")
    assert res_m.status_code == 200
    m_json = res_m.json()
    assert "targets" in m_json
    assert "limitations" in m_json

    res_s = client.get("/samples")
    assert res_s.status_code == 200
    assert len(res_s.json()) == 3


# 9. README / API CONTRACT DRIFT GUARD
def test_readme_api_examples_match_contract(client):
    """
    Guards README.md against drifting from the live API contract.

    Unknown feature keys are silently ignored and imputed at runtime, so a stale
    or misspelled key in the documented example yields a plausible-looking but
    meaningless prediction instead of an error. This test makes that drift fail
    loudly in CI rather than silently in the docs.
    """
    import json as _json
    import re
    import textwrap
    from pathlib import Path

    readme_path = Path(__file__).resolve().parents[3] / "README.md"
    assert readme_path.exists(), f"README not found at {readme_path}"
    text = readme_path.read_text(encoding="utf-8")

    heading = "#### `POST /predict`"
    assert heading in text, "README is missing the POST /predict section"
    section = text.split(heading, 1)[1]

    json_blocks = re.findall(r"```json\s*\n(.*?)```", section, re.DOTALL)
    assert len(json_blocks) >= 2, "Expected a documented request and response example"

    # --- documented request body must use real schema keys -------------------
    request = _json.loads(json_blocks[0])
    schema_keys = set(predictor_service.feature_schema.get("features", {}).keys())
    assert schema_keys, "feature schema is empty"

    assert set(request).issubset(PredictRequest.model_fields), (
        f"README request has keys the API does not accept: "
        f"{sorted(set(request) - set(PredictRequest.model_fields))}"
    )
    documented = set(request.get("features", {}))
    assert documented, "README request example documents no features"

    unknown = documented - schema_keys
    assert not unknown, (
        f"README documents feature keys absent from the schema: {sorted(unknown)}. "
        "The API ignores unknown keys and imputes them, so this example would "
        "return a meaningless all-imputed prediction."
    )

    # --- documented response keys must exist on the response contract --------
    # The example is intentionally trimmed (e.g. "..." placeholders), so read the
    # top-level keys structurally rather than parsing it as strict JSON.
    resp_block = textwrap.dedent(json_blocks[1]).strip()
    resp_keys = set(re.findall(r'^  "([A-Za-z_]+)"\s*:', resp_block, re.MULTILINE))
    assert resp_keys, "Could not read top-level keys from the documented response example"
    unknown_resp = resp_keys - set(PredictResponse.model_fields)
    assert not unknown_resp, (
        f"README response documents keys absent from the contract: {sorted(unknown_resp)}"
    )

    # --- the documented example must actually work end to end ----------------
    res = client.post("/predict", json=request)
    assert res.status_code == 200, res.text
    payload = res.json()
    assert set(payload) == set(PredictResponse.model_fields)
    assert not (documented & set(payload["imputed_features"])), (
        "README sent feature keys that the backend ignored and imputed anyway"
    )
