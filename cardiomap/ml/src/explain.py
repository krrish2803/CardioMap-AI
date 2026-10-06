"""
SHAP explainability module for CardioMap.
Extracts linear and tree attributions, aggregates one-hot dummies to original feature names,
computes feature importance stability across CV folds, and generates global summary plots.
"""

from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
import shap
import matplotlib.pyplot as plt
from pathlib import Path
from scipy.stats import spearmanr
from cardiomap.ml.src.data import load_config


class PipelineExplainer:
    """
    Explains the base fitted pipeline (preprocessor + base classifier).
    Aggregates one-hot dummy features back to canonical original feature names.
    """

    def __init__(self, base_pipeline, background_df: pd.DataFrame = None, target_name: str = "cad"):
        self.pipeline = base_pipeline
        self.target_name = target_name
        self.preprocessor = base_pipeline.named_steps["preprocessor"]
        self.classifier = base_pipeline.named_steps["classifier"]

        # Determine explanation space
        clf_type = type(self.classifier).__name__
        if "LogisticRegression" in clf_type:
            self.explanation_space = "log-odds"
        elif "XGB" in clf_type:
            self.explanation_space = "log-odds"
        else: # RandomForest
            self.explanation_space = "probability"

        # Fit background data through preprocessor
        if background_df is not None:
            self.background_transformed = self.preprocessor.transform(background_df)
        else:
            self.background_transformed = None

        # Build appropriate SHAP explainer
        if "LogisticRegression" in clf_type:
            # LinearExplainer with background or independent masker
            if self.background_transformed is not None:
                masker = shap.maskers.Independent(data=self.background_transformed)
                self.explainer = shap.LinearExplainer(self.classifier, masker=masker)
            else:
                self.explainer = shap.LinearExplainer(self.classifier)
        elif "RandomForest" in clf_type or "XGB" in clf_type:
            self.explainer = shap.TreeExplainer(self.classifier)
        else:
            self.explainer = shap.Explainer(self.classifier, self.background_transformed)

        # Map transformed feature names to original feature names
        self._build_feature_mapping()

    def _build_feature_mapping(self):
        """
        Builds mapping from transformed column indices to original input feature names.
        """
        # Read original feature list from feature_groups.yaml
        groups_cfg = load_config("feature_groups.yaml")["groups"]
        original_features = []
        for g in groups_cfg.values():
            for f in g["features"]:
                original_features.append(f["name"])
        self.original_feature_names = original_features

        # Output feature names from ColumnTransformer
        transformed_names = list(self.preprocessor.get_feature_names_out())
        self.transformed_names = transformed_names

        # Map each transformed column to an original feature
        self.col_to_orig = {}
        for idx, trans_name in enumerate(transformed_names):
            matched = False
            # Check prefixes or exact names
            for orig in original_features:
                if trans_name == orig or trans_name.startswith(f"{orig}_") or trans_name.endswith(f"_{orig}"):
                    self.col_to_orig[idx] = orig
                    matched = True
                    break
            if not matched:
                # Fallback: remove transformer prefix if any (e.g., 'num__Age' -> 'Age')
                clean_name = trans_name.split("__")[-1] if "__" in trans_name else trans_name
                clean_orig = clean_name.split("_")[0]
                self.col_to_orig[idx] = clean_orig

    def explain_instance(self, instance_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Explains a single input instance (or 1-row DataFrame).
        Returns aggregated feature attributions, base value, and relative percentages.
        """
        # Transform through preprocessor
        X_trans = self.preprocessor.transform(instance_df)
        
        # Compute raw SHAP values
        shap_vals = self.explainer(X_trans)

        # Handle binary classification shapes
        raw_values = shap_vals.values
        if len(raw_values.shape) == 3:
            # Shape is (n_samples, n_features, n_classes) -> take positive class (1)
            raw_contribs = raw_values[0, :, 1]
            base_val = float(shap_vals.base_values[0, 1]) if hasattr(shap_vals, "base_values") else 0.0
        elif len(raw_values.shape) == 2:
            raw_contribs = raw_values[0, :]
            base_val = float(shap_vals.base_values[0]) if hasattr(shap_vals, "base_values") else 0.0
        else:
            raw_contribs = raw_values.flatten()
            base_val = float(shap_vals.base_values) if hasattr(shap_vals, "base_values") else 0.0

        # Aggregate one-hot dummy contributions back to original feature names
        aggregated_contribs = {orig: 0.0 for orig in self.original_feature_names}
        for idx, contrib in enumerate(raw_contribs):
            orig_name = self.col_to_orig.get(idx, self.transformed_names[idx])
            aggregated_contribs[orig_name] = aggregated_contribs.get(orig_name, 0.0) + float(contrib)

        # Total absolute attribution for relative percentage calculation
        total_abs = sum(abs(c) for c in aggregated_contribs.values())
        if total_abs == 0:
            total_abs = 1e-6

        # Build sorted list of feature attributions
        features_shap = []
        for feat, contrib in aggregated_contribs.items():
            # Get original patient value if present
            orig_val = instance_df[feat].iloc[0] if feat in instance_df.columns else None
            if orig_val is not None:
                if pd.isna(orig_val) or (isinstance(orig_val, float) and np.isnan(orig_val)):
                    orig_val = None
            features_shap.append({
                "feature": feat,
                "value": orig_val,
                "contribution": round(float(contrib), 4),
                "relative_contribution": round(float(abs(contrib) / total_abs * 100), 2),
            })

        # Sort descending by absolute contribution
        features_shap.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        return {
            "target": self.target_name,
            "explanation_space": self.explanation_space,
            "base_value": round(base_val, 4),
            "contributions": features_shap,
        }

    def explain_dataset(self, X_df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
        """
        Computes SHAP matrix aggregated to original features across a full dataset.
        """
        X_trans = self.preprocessor.transform(X_df)
        shap_vals = self.explainer(X_trans)

        raw_values = shap_vals.values
        if len(raw_values.shape) == 3:
            raw_matrix = raw_values[:, :, 1]
        else:
            raw_matrix = raw_values

        # Aggregate columns to original feature names
        n_samples = len(X_df)
        agg_matrix = np.zeros((n_samples, len(self.original_feature_names)))

        for orig_idx, orig_name in enumerate(self.original_feature_names):
            matching_cols = [t_idx for t_idx, o_name in self.col_to_orig.items() if o_name == orig_name]
            if matching_cols:
                agg_matrix[:, orig_idx] = raw_matrix[:, matching_cols].sum(axis=1)

        return agg_matrix, self.original_feature_names


def compute_shap_stability(fold_shap_matrices: List[Tuple[np.ndarray, List[str]]], top_k: int = 15) -> Dict[str, Any]:
    """
    Computes stability of SHAP feature importance rankings across CV folds.
    Evaluates pairwise Spearman rank correlation of top-K most important features.
    """
    if len(fold_shap_matrices) < 2:
        return {"mean_spearman": 1.0, "top_features": []}

    feature_names = fold_shap_matrices[0][1]
    # Mean |SHAP| per fold
    fold_importances = []
    for mat, _ in fold_shap_matrices:
        mean_abs = np.mean(np.abs(mat), axis=0)
        fold_importances.append(mean_abs)

    # Average importance overall to pick top-K
    overall_imp = np.mean(fold_importances, axis=0)
    top_indices = np.argsort(overall_imp)[::-1][:top_k]
    top_feature_names = [feature_names[i] for i in top_indices]

    # Pairwise Spearman correlations
    spearman_scores = []
    n_folds = len(fold_importances)
    for i in range(n_folds):
        for j in range(i + 1, n_folds):
            ranks_i = fold_importances[i][top_indices]
            ranks_j = fold_importances[j][top_indices]
            corr, _ = spearmanr(ranks_i, ranks_j)
            if not np.isnan(corr):
                spearman_scores.append(corr)

    mean_spearman = float(np.mean(spearman_scores)) if spearman_scores else 1.0

    return {
        "mean_spearman": round(mean_spearman, 3),
        "std_spearman": round(float(np.std(spearman_scores)), 3) if spearman_scores else 0.0,
        "top_features": top_feature_names,
        "importance_scores": {top_feature_names[idx]: float(overall_imp[top_indices[idx]]) for idx in range(len(top_indices))},
    }


def plot_global_shap_summary(
    target_name: str,
    shap_matrix: np.ndarray,
    feature_names: List[str],
    output_path: Path,
    top_k: int = 15,
):
    """
    Plots horizontal bar chart of top-K mean |SHAP| values for reports.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    mean_abs = np.mean(np.abs(shap_matrix), axis=0)
    top_idx = np.argsort(mean_abs)[::-1][:top_k]

    sorted_names = [feature_names[i] for i in top_idx][::-1]
    sorted_vals = [mean_abs[i] for i in top_idx][::-1]

    plt.figure(figsize=(8, 6), dpi=150)
    y_pos = np.arange(len(sorted_names))
    plt.barh(y_pos, sorted_vals, color="#00F0FF", edgecolor="#0284C7", alpha=0.85)
    plt.yticks(y_pos, sorted_names, fontsize=10)
    plt.xlabel("Mean |SHAP Value| (Attribution Magnitude)", fontsize=11)
    plt.title(f"Global SHAP Feature Importance: {target_name}", fontsize=12, fontweight="bold")
    plt.grid(axis="x", linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
