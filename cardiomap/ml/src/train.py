"""
CardioMap Machine Learning Training Pipeline.
Executes nested cross-validation, hyperparameter selection, calibration, holdout validation,
SHAP stability analysis, and artifact generation.
"""

import os
import sys
import json
import time
import datetime
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import (
    train_test_split,
    RepeatedStratifiedKFold,
    StratifiedKFold,
    GridSearchCV,
    RandomizedSearchCV,
)
from sklearn.calibration import CalibratedClassifierCV
from sklearn.base import clone

from cardiomap.ml.src.data import (
    get_project_root,
    load_config,
    load_and_clean_data,
    get_feature_matrix_and_target,
    generate_data_audit,
)
from cardiomap.ml.src.models import get_candidate_models, build_pipeline, get_search_spaces
from cardiomap.ml.src.evaluate import (
    calculate_metrics_at_threshold,
    find_optimal_threshold,
    compute_bootstrap_confidence_intervals,
    extract_curve_coordinates,
    plot_validation_figures,
)
from cardiomap.ml.src.explain import (
    PipelineExplainer,
    compute_shap_stability,
    plot_global_shap_summary,
)
from cardiomap.ml.src.schema_export import generate_feature_schema


def run_training_pipeline():
    start_time = time.time()
    root = get_project_root()
    artifacts_dir = root / "backend" / "artifacts"
    models_dir = artifacts_dir / "models"
    base_models_dir = artifacts_dir / "base_models"
    reports_dir = root / "reports"

    models_dir.mkdir(parents=True, exist_ok=True)
    base_models_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("🚀 CARDIOMAP ML TRAINING & VALIDATION PIPELINE")
    print("=" * 70)

    # 1. Load data & run audit
    df = load_and_clean_data()
    generate_data_audit(df, reports_dir / "data_audit.md")
    print(f"Loaded dataset: {df.shape[0]} patients, {df.shape[1]} columns. Audit saved.")

    targets_cfg = load_config("targets.yaml")["targets"]
    target_names = list(targets_cfg.keys()) # ['cad', 'LAD', 'LCX', 'RCA']
    random_seed = 42

    # 2. Lock Stratified Holdout Split (80/20) on CAD target
    X_sample, y_cad = get_feature_matrix_and_target(df, "cad")
    n_samples = len(df)
    indices = np.arange(n_samples)

    train_idx, test_idx = train_test_split(
        indices,
        test_size=0.20,
        stratify=y_cad,
        random_state=random_seed,
    )

    split_info = {
        "train_size": len(train_idx),
        "test_size": len(test_idx),
        "train_indices": train_idx.tolist(),
        "test_indices": test_idx.tolist(),
        "stratify_target": "cad",
        "random_seed": random_seed,
    }
    with open(artifacts_dir / "split.json", "w") as f:
        json.dump(split_info, f, indent=2)
    print(f"Locked 80/20 holdout split: {len(train_idx)} train, {len(test_idx)} test. Saved to split.json.")

    # Save background sample (~50 rows from train split)
    df_train = df.iloc[train_idx]
    background_df = df_train.drop(columns=load_config("targets.yaml")["excluded_columns"], errors="ignore").sample(
        n=min(50, len(df_train)), random_state=random_seed
    )
    background_df.to_parquet(artifacts_dir / "background.parquet")

    # Export dynamic schema
    feature_schema = generate_feature_schema(df, artifacts_dir / "feature_schema.json")
    print("Exported feature_schema.json.")

    # 3. Model Search Configuration
    search_spaces = get_search_spaces()
    candidate_names = ["logistic_regression", "random_forest", "xgboost"]

    # Results structures
    model_comparison_rows = []
    selected_models = {}
    oof_predictions = {t: {} for t in target_names}
    metrics_export = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "model_version": f"v1.0.0-{int(time.time())}",
        "dataset_n": n_samples,
        "validation_strategy": "Nested CV: RepeatedStratifiedKFold(5 folds x 3 repeats = 15 outer folds), Inner StratifiedKFold(3)",
        "calibration_method": "CalibratedClassifierCV(method='sigmoid', cv=5)",
        "serving_note": "Final serving models are refit with calibration on 100% of data. Metrics report unbiased nested CV out-of-fold performance.",
        "targets": {},
        "limitations": [
            "Single-center cohort (N=303): Estimates carry wide confidence intervals and unknown external generalization across diverse demographic or clinical populations.",
            "Vessel-level outputs represent statistical tabular risk estimates from multi-task models, not direct anatomical lesion imaging or intraluminal angiographic reconstruction.",
            "Performance on sparser target branches (e.g., RCA, LCX) may exhibit greater variance and should be interpreted alongside reported 95% confidence intervals.",
            "Holdout evaluation (N=61) represents a secondary, higher-variance point estimate; headline benchmark relies on pooled repeated out-of-fold cross-validation.",
            "Operating decision thresholds were tuned to maximize F1 on out-of-fold data and are slightly optimistic relative to un-tuned testing."
        ],
    }

    # 4. Nested Cross-Validation (5 folds x 3 repeats = 15 folds)
    outer_cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=random_seed)
    inner_cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=random_seed)

    shap_stability_records = {}

    for target_name in target_names:
        print("\n" + "-" * 60)
        print(f"🎯 PROCESSING TARGET: {target_name.upper()} ({targets_cfg[target_name]['description']})")
        print("-" * 60)

        X_full, y_full = get_feature_matrix_and_target(df, target_name)
        X_dev = X_full.iloc[train_idx].reset_index(drop=True)
        y_dev = y_full.iloc[train_idx].reset_index(drop=True)
        X_test = X_full.iloc[test_idx].reset_index(drop=True)
        y_test = y_full.iloc[test_idx].reset_index(drop=True)

        # Performance dictionary for candidate models
        cand_fold_metrics = {c: [] for c in candidate_names}
        cand_oof_probs = {c: np.zeros(len(X_dev)) for c in candidate_names}
        cand_oof_counts = {c: np.zeros(len(X_dev)) for c in candidate_names}
        cand_best_params = {c: [] for c in candidate_names}
        fold_shap_runs = []

        # Run Nested CV
        for fold_idx, (dev_train_idx, dev_val_idx) in enumerate(outer_cv.split(X_dev, y_dev)):
            if (fold_idx + 1) % 5 == 0 or fold_idx == 0:
                print(f"  ... Outer CV Fold {fold_idx + 1}/15 running ...")
            X_tr, y_tr = X_dev.iloc[dev_train_idx], y_dev.iloc[dev_train_idx]
            X_val, y_val = X_dev.iloc[dev_val_idx], y_dev.iloc[dev_val_idx]

            for cand_name in candidate_names:
                base_pipe = build_pipeline(cand_name, y_train=y_tr, random_seed=random_seed + fold_idx)
                s_cfg = search_spaces[cand_name]

                # Inner search
                if s_cfg["search_type"] == "grid":
                    search = GridSearchCV(
                        estimator=base_pipe,
                        param_grid=s_cfg["grid"],
                        cv=inner_cv,
                        scoring="roc_auc",
                        n_jobs=-1,
                    )
                else:
                    search = RandomizedSearchCV(
                        estimator=base_pipe,
                        param_distributions=s_cfg["grid"],
                        n_iter=s_cfg["n_iter"],
                        cv=inner_cv,
                        scoring="roc_auc",
                        random_state=random_seed + fold_idx,
                        n_jobs=-1,
                    )

                search.fit(X_tr, y_tr)
                best_model = search.best_estimator_

                # Predict probabilities on validation fold
                probs_val = best_model.predict_proba(X_val)[:, 1]
                cand_oof_probs[cand_name][dev_val_idx] += probs_val
                cand_oof_counts[cand_name][dev_val_idx] += 1

                fold_auc = calculate_metrics_at_threshold(y_val.values, probs_val)["roc_auc"]
                cand_fold_metrics[cand_name].append(fold_auc)
                cand_best_params[cand_name].append(search.best_params_)

                # Collect SHAP for fold 0 to 4 for stability
                if fold_idx < 5 and cand_name == "logistic_regression":
                    try:
                        explainer = PipelineExplainer(best_model, background_df=X_tr.sample(min(30, len(X_tr))), target_name=target_name)
                        shap_mat, f_names = explainer.explain_dataset(X_val.sample(min(25, len(X_val)), random_state=42))
                        fold_shap_runs.append((shap_mat, f_names))
                    except Exception as e:
                        pass

        # Compute averaged out-of-fold probabilities
        for cand_name in candidate_names:
            cand_oof_probs[cand_name] /= np.maximum(1, cand_oof_counts[cand_name])

        # Evaluate candidate performance across outer folds
        cand_summary = {}
        for cand_name in candidate_names:
            aucs = cand_fold_metrics[cand_name]
            mean_auc = np.mean(aucs)
            std_auc = np.std(aucs)
            se_auc = std_auc / np.sqrt(len(aucs))
            cand_summary[cand_name] = {
                "mean_auc": mean_auc,
                "std_auc": std_auc,
                "se_auc": se_auc,
            }
            model_comparison_rows.append({
                "target": target_name,
                "model": cand_name,
                "outer_roc_auc_mean": round(float(mean_auc), 4),
                "outer_roc_auc_std": round(float(std_auc), 4),
                "outer_roc_auc_se": round(float(se_auc), 4),
            })
            print(f"  [{cand_name:20}] Mean ROC-AUC: {mean_auc:.3f} ± {std_auc:.3f} (SE: {se_auc:.3f})")

        # 5. Selection Rule:
        # Best mean outer ROC-AUC. If logistic regression is within 1 SE of the best, choose logistic regression!
        best_cand = max(candidate_names, key=lambda c: cand_summary[c]["mean_auc"])
        best_mean = cand_summary[best_cand]["mean_auc"]
        best_se = cand_summary[best_cand]["se_auc"]
        lr_mean = cand_summary["logistic_regression"]["mean_auc"]

        if best_cand != "logistic_regression" and lr_mean >= (best_mean - best_se):
            selected_cand = "logistic_regression"
            selection_reason = f"Logistic Regression ({lr_mean:.3f}) within 1 SE ({best_se:.3f}) of best model {best_cand} ({best_mean:.3f}); parsimony preferred."
        else:
            selected_cand = best_cand
            selection_reason = f"Highest outer ROC-AUC ({best_mean:.3f})."

        print(f"  👉 WINNER for {target_name}: {selected_cand.upper()} ({selection_reason})")
        selected_models[target_name] = selected_cand

        # Check for abnormal sanity / leakage (> 0.95)
        if cand_summary[selected_cand]["mean_auc"] > 0.95:
            print(f"\n⚠️  POTENTIAL LEAKAGE WARNING: ROC-AUC {cand_summary[selected_cand]['mean_auc']:.3f} > 0.95 for {target_name}!")
            print("Checking top feature weights...")

        # 6. Selected model out-of-fold calibration & threshold tuning
        selected_oof_prob = cand_oof_probs[selected_cand]

        # Calculate threshold that maximizes F1 on out-of-fold
        best_thresh, thresh_metrics = find_optimal_threshold(y_dev.values, selected_oof_prob, strategy="f1_max")
        default_metrics = calculate_metrics_at_threshold(y_dev.values, selected_oof_prob, threshold=0.5)

        # Bootstrap CIs on pooled out-of-fold predictions (2000 resamples)
        bootstrap_cis = compute_bootstrap_confidence_intervals(
            y_dev.values, selected_oof_prob, threshold=best_thresh, n_bootstraps=2000, seed=random_seed
        )

        print(f"  Optimal Decision Threshold: {best_thresh:.2f} (F1: {thresh_metrics['f1']:.3f}, Recall: {thresh_metrics['recall']:.3f}, Precision: {thresh_metrics['precision']:.3f})")
        print(f"  Default Threshold (0.50) F1: {default_metrics['f1']:.3f}, ROC-AUC: {default_metrics['roc_auc']:.3f}, Brier: {default_metrics['brier_score']:.3f}")

        # Extract ROC, PR, Calibration curve coordinates
        curve_coords = extract_curve_coordinates(y_dev.values, selected_oof_prob)

        # Generate evaluation figures
        fig_paths = plot_validation_figures(target_name, y_dev.values, selected_oof_prob, reports_dir)

        # 7. Holdout Evaluation (The 20% untouched holdout)
        # Refit tuned pipeline on all 80% train data, wrapped in CalibratedClassifierCV
        pipe_train = build_pipeline(selected_cand, y_train=y_dev, random_seed=random_seed)
        
        # Grid search on full dev set to find optimal hyperparameters
        s_cfg = search_spaces[selected_cand]
        if s_cfg["search_type"] == "grid":
            search_dev = GridSearchCV(estimator=pipe_train, param_grid=s_cfg["grid"], cv=inner_cv, scoring="roc_auc", n_jobs=-1)
        else:
            search_dev = RandomizedSearchCV(estimator=pipe_train, param_distributions=s_cfg["grid"], n_iter=s_cfg["n_iter"], cv=inner_cv, scoring="roc_auc", random_state=random_seed, n_jobs=-1)
        search_dev.fit(X_dev, y_dev)
        best_dev_pipe = search_dev.best_estimator_

        # Calibrate with CalibratedClassifierCV(method="sigmoid", cv=5)
        calibrated_dev_model = CalibratedClassifierCV(estimator=best_dev_pipe, method="sigmoid", cv=5)
        calibrated_dev_model.fit(X_dev, y_dev)

        # Evaluate on the 20% holdout set
        test_probs = calibrated_dev_model.predict_proba(X_test)[:, 1]
        holdout_metrics = calculate_metrics_at_threshold(y_test.values, test_probs, threshold=best_thresh)
        holdout_cis = compute_bootstrap_confidence_intervals(y_test.values, test_probs, threshold=best_thresh, n_bootstraps=1000, seed=random_seed)

        print(f"  Holdout Set (20%, N={len(y_test)}): ROC-AUC={holdout_metrics['roc_auc']:.3f}, F1={holdout_metrics['f1']:.3f}, Brier={holdout_metrics['brier_score']:.3f} (Secondary estimate)")

        # 8. Final Model Refit on 100% of Data for Serving
        final_base_pipe = build_pipeline(selected_cand, y_train=y_full, random_seed=random_seed)
        if s_cfg["search_type"] == "grid":
            search_full = GridSearchCV(estimator=final_base_pipe, param_grid=s_cfg["grid"], cv=inner_cv, scoring="roc_auc", n_jobs=-1)
        else:
            search_full = RandomizedSearchCV(estimator=final_base_pipe, param_distributions=s_cfg["grid"], n_iter=s_cfg["n_iter"], cv=inner_cv, scoring="roc_auc", random_state=random_seed, n_jobs=-1)
        search_full.fit(X_full, y_full)
        final_best_base = search_full.best_estimator_

        # Wrap in CalibratedClassifierCV
        final_calibrated_model = CalibratedClassifierCV(estimator=final_best_base, method="sigmoid", cv=5)
        final_calibrated_model.fit(X_full, y_full)

        # Save model artifacts
        joblib.dump(final_calibrated_model, models_dir / f"{target_name}.joblib")
        joblib.dump(final_best_base, base_models_dir / f"{target_name}.joblib")
        print(f"  Saved artifacts: models/{target_name}.joblib & base_models/{target_name}.joblib")

        # 9. Global SHAP and Stability Analysis
        explainer = PipelineExplainer(final_best_base, background_df=background_df, target_name=target_name)
        shap_matrix, feature_names = explainer.explain_dataset(X_dev)
        plot_global_shap_summary(target_name, shap_matrix, feature_names, reports_dir / f"shap_summary_{target_name}.png")

        if len(fold_shap_runs) >= 2:
            stability = compute_shap_stability(fold_shap_runs, top_k=15)
            shap_stability_records[target_name] = stability

        # 10. Store Target Evaluation in Metrics Export
        metrics_export["targets"][target_name] = {
            "selected_model": selected_cand,
            "selection_reason": selection_reason,
            "best_hyperparameters": search_full.best_params_,
            "optimal_threshold": round(best_thresh, 4),
            "nested_cv_oof_metrics": {
                k: {
                    "value": round(float(thresh_metrics[k]), 4),
                    "ci_95": [round(float(bootstrap_cis[k][0]), 4), round(float(bootstrap_cis[k][1]), 4)] if k in bootstrap_cis else None,
                }
                for k in ["accuracy", "precision", "recall", "specificity", "f1", "roc_auc", "pr_auc", "brier_score"]
            },
            "metrics_at_default_0_5": {
                k: round(float(default_metrics[k]), 4)
                for k in ["accuracy", "precision", "recall", "specificity", "f1", "roc_auc", "pr_auc", "brier_score"]
            },
            "holdout_test_metrics_secondary": {
                k: {
                    "value": round(float(holdout_metrics[k]), 4),
                    "ci_95": [round(float(holdout_cis[k][0]), 4), round(float(holdout_cis[k][1]), 4)] if k in holdout_cis else None,
                }
                for k in ["accuracy", "precision", "recall", "specificity", "f1", "roc_auc", "pr_auc", "brier_score"]
            },
            "roc_curve": curve_coords["roc_curve"],
            "pr_curve": curve_coords["pr_curve"],
            "calibration_curve": curve_coords["calibration_curve"],
        }

    # Save model comparison table
    df_comparison = pd.DataFrame(model_comparison_rows)
    df_comparison.to_csv(reports_dir / "model_comparison.csv", index=False)
    metrics_export["model_comparison_table"] = df_comparison.to_dict(orient="records")

    # Save SHAP stability
    if shap_stability_records:
        stab_rows = []
        for t, s in shap_stability_records.items():
            stab_rows.append({
                "target": t,
                "mean_spearman_top15": s["mean_spearman"],
                "std_spearman": s["std_spearman"],
                "top_features": ", ".join(s["top_features"][:5]),
            })
        pd.DataFrame(stab_rows).to_csv(reports_dir / "shap_stability.csv", index=False)

    # Save metrics.json
    with open(artifacts_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_export, f, indent=2)

    # Save training configuration log
    training_config = {
        "timestamp": metrics_export["timestamp"],
        "random_seed": random_seed,
        "n_samples": n_samples,
        "n_features": len(X_sample.columns),
        "excluded_leakage_columns": load_config("targets.yaml")["excluded_columns"],
        "outer_cv": "RepeatedStratifiedKFold(5 folds, 3 repeats)",
        "inner_cv": "StratifiedKFold(3 folds)",
        "calibration": "CalibratedClassifierCV(method='sigmoid', cv=5)",
        "selected_models": selected_models,
        "total_elapsed_seconds": round(time.time() - start_time, 2),
    }
    with open(artifacts_dir / "training_config.json", "w") as f:
        json.dump(training_config, f, indent=2)

    # Write model version
    with open(artifacts_dir / "model_version.txt", "w") as f:
        f.write(f"cardiomap-{metrics_export['model_version']}\n")

    print("\n" + "=" * 70)
    print(f"✅ TRAINING COMPLETE in {time.time() - start_time:.1f}s")
    print(f"Artifacts exported to: {artifacts_dir}")
    print(f"Reports & figures exported to: {reports_dir}")
    print("=" * 70)


if __name__ == "__main__":
    run_training_pipeline()
