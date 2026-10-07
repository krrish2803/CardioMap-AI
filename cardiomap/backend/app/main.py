"""
CardioMap API — FastAPI application entry point.
Clinical Decision Support Backend for 3D Cardiovascular Risk Visualization.
"""

# Must run before numpy/sklearn import: the free-tier container is a single
# shared vCPU, so a 1-row predict that wakes a 10-thread BLAS pool just makes
# the threads contend with each other. setdefault keeps any explicit Render
# env var authoritative.
import os

for _thread_var in (
    "OPENBLAS_NUM_THREADS",
    "OMP_NUM_THREADS",
    "MKL_NUM_THREADS",
    "NUMEXPR_NUM_THREADS",
):
    os.environ.setdefault(_thread_var, "1")

from contextlib import asynccontextmanager
from typing import Dict, Any, List
import json
import pandas as pd
import numpy as np

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from cardiomap.backend.app.settings import settings
from cardiomap.backend.app.schemas import (
    PredictRequest,
    PredictResponse,
    HealthResponse,
)
from cardiomap.backend.app.predictor import predictor_service
from cardiomap.ml.src.data import load_and_clean_data, get_feature_matrix_and_target


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load all ML models and artifacts once
    predictor_service.load_artifacts()
    yield
    # Shutdown
    pass


description = f"""
### CardioMap 3D Clinical Predictive Backend
**Decision Support & Educational Use Only.** Not a substitute for formal diagnostic imaging or clinical judgement.

Estimates cardiovascular risk across major coronary branches (**CAD**, **LAD**, **LCX**, **RCA**),
with predictive performance that varies from good (CAD, LAD) to modest (LCX, RCA), and yields
real-time, game-theoretic **SHAP** biomarker attributions for 3D anatomical visualization.

**Clinical Advisory:**
> {settings.DISCLAIMER}
"""

app = FastAPI(
    title="CardioMap API",
    version=settings.VERSION,
    description=description,
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    """Health check endpoint indicating model readiness and artifact status."""
    from threadpoolctl import threadpool_info

    return HealthResponse(
        status="healthy" if predictor_service.artifacts_loaded else "uninitialized",
        model_version=predictor_service.model_version,
        artifacts_loaded=predictor_service.artifacts_loaded,
        targets=["cad", "LAD", "LCX", "RCA"],
        threadpools={
            str(pool.get("internal_api", pool.get("user_api", "unknown"))):
                int(pool.get("num_threads", 0))
            for pool in threadpool_info()
        },
    )


@app.get("/schema", tags=["Metadata"])
async def get_schema():
    """Returns the dynamic clinical feature schema, groups, ranges, and defaults."""
    if not predictor_service.feature_schema:
        predictor_service.load_artifacts()
    return predictor_service.feature_schema


@app.get("/metrics", tags=["Validation"])
async def get_metrics():
    """Returns rigorous nested cross-validation performance, 95% CIs, ROC/PR curves, and limitations."""
    if not predictor_service.metrics_data:
        predictor_service.load_artifacts()
    return predictor_service.metrics_data


@app.get("/samples", tags=["Clinical Profiles"])
async def get_samples():
    """
    Returns three real clinical patient archetypes (Low, Moderate, High Risk)
    selected from the empirical dataset.
    """
    try:
        df = load_and_clean_data()
        X_df, _ = get_feature_matrix_and_target(df, "cad")

        # Select representative patients based on predicted CAD risk
        # 1. Low risk archetype
        low_cand = df[
            (df["Age"] < 50) & (df["Typical Chest Pain"] == 0) & (df["EF-TTE"] >= 50)
        ]
        low_idx = low_cand.index[0] if len(low_cand) > 0 else 0

        # 2. Moderate risk archetype
        mod_cand = df[
            (df["Age"].between(52, 65)) & (df["HTN"] == 1) & (df["Typical Chest Pain"] == 0)
        ]
        mod_idx = mod_cand.index[0] if len(mod_cand) > 0 else len(df) // 2

        # 3. High risk / multivessel archetype
        high_cand = df[
            (df["Age"] >= 65) & (df["Typical Chest Pain"] == 1) & (df["Region RWMA"] != "0")
        ]
        high_idx = high_cand.index[0] if len(high_cand) > 0 else len(df) - 1

        samples = [
            {
                "id": "sample-low",
                "name": "Patient 1 — Low Predicted Risk (Real Cohort)",
                "cohort_type": "Real Cohort Patient",
                "description": "Real patient from angiography referral cohort: preserved ejection fraction, non-anginal presentation, and lower predicted CAD risk.",
                "features": {k: (None if pd.isna(v) else v) for k, v in X_df.iloc[low_idx].to_dict().items()},
            },
            {
                "id": "sample-mod",
                "name": "Patient 2 — Moderate Predicted Risk (Real Cohort)",
                "cohort_type": "Real Cohort Patient",
                "description": "Real patient from angiography referral cohort: documented hypertension, borderline hemodynamics, and intermediate predicted risk.",
                "features": {k: (None if pd.isna(v) else v) for k, v in X_df.iloc[mod_idx].to_dict().items()},
            },
            {
                "id": "sample-high",
                "name": "Patient 3 — High Predicted Risk (Real Cohort)",
                "cohort_type": "Real Cohort Patient",
                "description": "Real patient from angiography referral cohort: typical angina, regional wall motion hypokinesia, and elevated predicted risk.",
                "features": {k: (None if pd.isna(v) else v) for k, v in X_df.iloc[high_idx].to_dict().items()},
            },
        ]
        return samples
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate sample patients: {str(e)}")


@app.post("/predict", response_model=PredictResponse, tags=["Inference"])
async def predict(request: PredictRequest):
    """
    Main inference endpoint. Predicts CAD, LAD, LCX, and RCA stenosis risks
    and computes SHAP attributions in pre-calibration space (skipped when
    ``explain`` is false — the fast path used by the What-If sliders).
    """
    try:
        result = predictor_service.predict(request.features, explain=request.explain)
        return result
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failure: {str(e)}",
        )
