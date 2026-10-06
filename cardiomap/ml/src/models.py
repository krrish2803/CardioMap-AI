"""
Model zoo and hyperparameter search space definitions for CardioMap.
"""

from typing import Dict, Any, Tuple
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from cardiomap.ml.src.data import load_config
from cardiomap.ml.src.preprocess import build_preprocessor


def get_candidate_models(y_train=None, random_seed: int = 42) -> Dict[str, Any]:
    """
    Constructs the un-fitted base estimator instances with fixed parameters.
    """
    # Calculate scale_pos_weight for XGBoost from training label balance
    scale_pos_weight = 1.0
    if y_train is not None:
        pos_count = int(y_train.sum())
        neg_count = len(y_train) - pos_count
        if pos_count > 0:
            scale_pos_weight = float(neg_count / pos_count)

    models = {
        "logistic_regression": LogisticRegression(
            solver="saga",
            penalty="elasticnet",
            class_weight="balanced",
            max_iter=1200,
            random_state=random_seed,
            tol=1e-3,
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=150,
            class_weight="balanced_subsample",
            random_state=random_seed,
            n_jobs=1,
        ),
        "xgboost": XGBClassifier(
            eval_metric="logloss",
            scale_pos_weight=scale_pos_weight,
            random_state=random_seed,
            n_jobs=1,
            subsample=0.8,
            colsample_bytree=0.8,
        ),
    }

    return models


def build_pipeline(model_name: str, y_train=None, random_seed: int = 42) -> Pipeline:
    """
    Builds the full Pipeline: ColumnTransformer -> Classifier.
    """
    preprocessor = build_preprocessor()
    models = get_candidate_models(y_train=y_train, random_seed=random_seed)
    if model_name not in models:
        raise ValueError(f"Unknown model: '{model_name}'. Available: {list(models.keys())}")

    classifier = models[model_name]
    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])
    return pipeline


def get_search_spaces() -> Dict[str, Dict[str, Any]]:
    """
    Loads parameter search grids from config/model_grids.yaml.
    """
    cfg = load_config("model_grids.yaml")
    return {
        m_name: {
            "search_type": m_cfg.get("search_type", "grid"),
            "n_iter": m_cfg.get("n_iter", 18),
            "grid": m_cfg.get("grid", {}),
        }
        for m_name, m_cfg in cfg["models"].items()
    }
