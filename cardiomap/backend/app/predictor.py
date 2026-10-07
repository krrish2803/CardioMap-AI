"""
CardioMap Inference & Explanation Service.
Loads all trained models, base explainers, schemas, and metrics once at startup.
Delivers calibrated predictions, multi-target SHAP explanations, and measurement flags.
"""

import json
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple
import joblib
import pandas as pd
import numpy as np

from cardiomap.backend.app.settings import settings
from cardiomap.backend.app.schemas import (
    PredictResponse,
    TargetPrediction,
    VesselsPrediction,
    ShapContribution,
    MeasurementItem,
)
from cardiomap.ml.src.explain import PipelineExplainer


class PredictorService:
    def __init__(self):
        self.artifacts_loaded = False
        self.calibrated_models = {}
        self.base_models = {}
        self.explainers = {}
        self.metrics_data = {}
        self.feature_schema = {}
        self.model_version = "v1.0.0"
        self.all_expected_features = []

    def load_artifacts(self):
        """Loads all artifacts into memory once at application startup."""
        if self.artifacts_loaded:
            return

        print("⚡ Loading CardioMap artifacts into memory...")
        t0 = time.time()

        # 1. Load model version
        if settings.VERSION_PATH.exists():
            with open(settings.VERSION_PATH, "r") as f:
                self.model_version = f.read().strip()

        # 2. Load metrics
        if settings.METRICS_PATH.exists():
            with open(settings.METRICS_PATH, "r", encoding="utf-8") as f:
                self.metrics_data = json.load(f)

        # 3. Load feature schema
        if settings.SCHEMA_PATH.exists():
            with open(settings.SCHEMA_PATH, "r", encoding="utf-8") as f:
                self.feature_schema = json.load(f)
                self.all_expected_features = list(self.feature_schema.get("features", {}).keys())

        # 4. Load background sample
        background_df = None
        if settings.BACKGROUND_PATH.exists():
            background_df = pd.read_parquet(settings.BACKGROUND_PATH)

        # 5. Load models and instantiate explainers for each target
        targets = ["cad", "LAD", "LCX", "RCA"]
        for target in targets:
            calib_path = settings.MODELS_DIR / f"{target}.joblib"
            base_path = settings.BASE_MODELS_DIR / f"{target}.joblib"

            if calib_path.exists():
                self.calibrated_models[target] = joblib.load(calib_path)
            if base_path.exists():
                base_pipe = joblib.load(base_path)
                self.base_models[target] = base_pipe
                # Instantiate SHAP explainer
                self.explainers[target] = PipelineExplainer(
                    base_pipeline=base_pipe,
                    background_df=background_df,
                    target_name=target,
                )

        self.artifacts_loaded = True
        print(f"✅ All artifacts loaded in {time.time() - t0:.2f}s.")

    def validate_and_prepare_input(self, raw_features: Dict[str, Any]) -> Tuple[pd.DataFrame, List[str]]:
        """
        Validates input boundaries against schema, identifies imputed features,
        and constructs a single-row DataFrame.
        """
        schema_features = self.feature_schema.get("features", {})
        imputed_features = []
        cleaned_row = {}

        # 1. Boundary validation
        for k, v in raw_features.items():
            if k in schema_features:
                f_meta = schema_features[k]
                ftype = f_meta.get("type", "numeric")
                if v is not None and ftype == "numeric":
                    try:
                        num_v = float(v)
                        # Range check (allow generous medical limits, flag extreme anomalies)
                        min_v = f_meta.get("min", 0.0)
                        max_v = f_meta.get("max", 1000.0)
                        margin = max(10.0, (max_v - min_v) * 0.5)
                        if num_v < (min_v - margin) or num_v > (max_v + margin * 2):
                            raise ValueError(
                                f"Feature '{k}' value {num_v} is out of allowable clinical bounds "
                                f"[{min_v - margin:.1f}, {max_v + margin * 2:.1f}]."
                            )
                        cleaned_row[k] = num_v
                    except (TypeError, ValueError) as e:
                        raise ValueError(f"Invalid numeric value for '{k}': {v} ({str(e)})")
                else:
                    cleaned_row[k] = v

        # 2. Check for missing features that will be imputed
        for feat in self.all_expected_features:
            if feat not in cleaned_row or cleaned_row[feat] is None or pd.isna(cleaned_row[feat]):
                imputed_features.append(feat)
                # Let scikit-learn SimpleImputer fill from pipeline
                cleaned_row[feat] = np.nan

        instance_df = pd.DataFrame([cleaned_row])
        return instance_df, imputed_features

    def evaluate_abnormal_flag(self, feature_name: str, value: Any) -> str:
        """Determines clinical abnormal flag ('normal', 'high', 'low', 'unknown')."""
        if value is None or pd.isna(value):
            return "unknown"

        f_meta = self.feature_schema.get("features", {}).get(feature_name, {})
        ref_range = f_meta.get("reference_range")
        if not ref_range or len(ref_range) != 2:
            return "unknown"

        try:
            val = float(value)
            low, high = ref_range[0], ref_range[1]
            if val < low:
                return f_meta.get("abnormal_below") or "low"
            if val > high:
                return f_meta.get("abnormal_above") or "high"
            return "normal"
        except (ValueError, TypeError):
            return "unknown"

    def predict(self, raw_features: Dict[str, Any], explain: bool = True) -> PredictResponse:
        """
        Executes calibrated inference and SHAP attribution across all 4 targets.

        With ``explain=False`` the SHAP pass is skipped entirely and the
        explanation fields return empty. This is the fast path used by the
        What-If sliders, which only need recalculated probabilities; a full
        explanation is fetched separately once the input settles.
        """
        if not self.artifacts_loaded:
            self.load_artifacts()

        t_start = time.time()
        instance_df, imputed_features = self.validate_and_prepare_input(raw_features)

        targets_meta = self.metrics_data.get("targets", {})

        predictions = {}
        shap_results = {}
        base_values = {}
        explanation_spaces = {}

        # 1. Predictions for each target
        for target in ["cad", "LAD", "LCX", "RCA"]:
            model = self.calibrated_models[target]
            prob = float(model.predict_proba(instance_df)[0, 1])

            # Retrieve threshold
            thresh = targets_meta.get(target, {}).get("optimal_threshold", 0.50)
            is_pos = prob >= thresh
            
            if target == "cad":
                label = "CAD" if is_pos else "Normal"
            else:
                label = "Stenosis" if is_pos else "Normal"

            predictions[target] = TargetPrediction(
                probability=round(prob, 4),
                label=label,
                threshold=round(thresh, 4),
            )

            # 2. SHAP explanation (skipped on the fast path)
            if explain:
                explainer = self.explainers[target]
                exp_out = explainer.explain_instance(instance_df)

                shap_results[target] = [
                    ShapContribution(
                        feature=c["feature"],
                        value=c["value"],
                        contribution=c["contribution"],
                        relative_contribution=c["relative_contribution"],
                    )
                    for c in exp_out["contributions"]
                ]
                base_values[target] = exp_out["base_value"]
                explanation_spaces[target] = exp_out["explanation_space"]

        # 3. Build measurements list with CAD contributions (SHAP-derived)
        measurements = []
        if explain:
            cad_shap_lookup = {c.feature: c for c in shap_results["cad"]}

            schema_features = self.feature_schema.get("features", {})
            for feat_name, f_meta in schema_features.items():
                val = instance_df[feat_name].iloc[0] if feat_name in instance_df.columns else None
                if val is not None:
                    if pd.isna(val) or (isinstance(val, float) and np.isnan(val)):
                        val = None

                flag = self.evaluate_abnormal_flag(feat_name, val)
                cad_c = cad_shap_lookup.get(feat_name)
                contrib = cad_c.contribution if cad_c else 0.0
                rel_contrib = cad_c.relative_contribution if cad_c else 0.0

                measurements.append(MeasurementItem(
                    feature=feat_name,
                    group=f_meta.get("group", "Other"),
                    value=val,
                    unit=f_meta.get("unit"),
                    reference_range=f_meta.get("reference_range"),
                    flag=flag,
                    contribution=contrib,
                    relative_contribution=rel_contrib,
                ))

            # Sort measurements by CAD relative contribution descending
            measurements.sort(key=lambda m: abs(m.contribution), reverse=True)

        elapsed_ms = (time.time() - t_start) * 1000
        # print(f"Inference latency: {elapsed_ms:.1f}ms")

        return PredictResponse(
            cad=predictions["cad"],
            vessels=VesselsPrediction(
                LAD=predictions["LAD"],
                LCX=predictions["LCX"],
                RCA=predictions["RCA"],
            ),
            shap=shap_results,
            base_value=base_values,
            explanation_space=explanation_spaces,
            measurements=measurements,
            imputed_features=imputed_features,
            model_version=self.model_version,
            disclaimer=settings.DISCLAIMER,
        )


predictor_service = PredictorService()
