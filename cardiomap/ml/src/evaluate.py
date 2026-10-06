"""
Comprehensive clinical model evaluation, bootstrap confidence intervals,
threshold tuning, calibration curves, and figure generation.
"""

from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    roc_curve,
    precision_recall_curve,
)
from sklearn.calibration import calibration_curve
import matplotlib.pyplot as plt
from pathlib import Path


def calculate_metrics_at_threshold(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
    """
    Computes all standard and clinical performance metrics at a given decision threshold.
    """
    y_pred = (y_prob >= threshold).astype(int)

    # Confusion matrix elements for specificity
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    # Handle edge case where all predicted 0 or 1
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    acc = accuracy_score(y_true, y_pred)

    try:
        roc_auc = roc_auc_score(y_true, y_prob)
    except ValueError:
        roc_auc = 0.5

    try:
        pr_auc = average_precision_score(y_true, y_prob)
    except ValueError:
        pr_auc = 0.0

    brier = brier_score_loss(y_true, y_prob)

    return {
        "accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "specificity": float(specificity),
        "f1": float(f1),
        "roc_auc": float(roc_auc),
        "pr_auc": float(pr_auc),
        "brier_score": float(brier),
        "threshold": float(threshold),
        "tp": int(tp),
        "fp": int(fp),
        "tn": int(tn),
        "fn": int(fn),
    }


def find_optimal_threshold(y_true: np.ndarray, y_prob: np.ndarray, strategy: str = "f1_max") -> Tuple[float, Dict[str, float]]:
    """
    Finds the operating threshold that maximizes F1 score.
    Returns (best_threshold, metrics_dict).
    """
    thresholds = np.linspace(0.1, 0.9, 81)
    best_thresh = 0.5
    best_f1 = -1.0
    best_metrics = None

    for th in thresholds:
        m = calculate_metrics_at_threshold(y_true, y_prob, threshold=th)
        if m["f1"] > best_f1:
            best_f1 = m["f1"]
            best_thresh = th
            best_metrics = m

    return float(best_thresh), best_metrics


def compute_bootstrap_confidence_intervals(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5,
    n_bootstraps: int = 2000,
    seed: int = 42,
) -> Dict[str, Tuple[float, float]]:
    """
    Computes 95% percentile bootstrap confidence intervals across 2000 resamples.
    """
    rng = np.random.RandomState(seed)
    n = len(y_true)
    indices = np.arange(n)

    boot_metrics = {
        "accuracy": [],
        "precision": [],
        "recall": [],
        "specificity": [],
        "f1": [],
        "roc_auc": [],
        "pr_auc": [],
        "brier_score": [],
    }

    for _ in range(n_bootstraps):
        boot_idx = rng.choice(indices, size=n, replace=True)
        y_b_true = y_true[boot_idx]
        y_b_prob = y_prob[boot_idx]

        # Skip sample if only single class drawn
        if len(np.unique(y_b_true)) < 2:
            continue

        m = calculate_metrics_at_threshold(y_b_true, y_b_prob, threshold=threshold)
        for k in boot_metrics:
            boot_metrics[k].append(m[k])

    # Compute 2.5% and 97.5% percentiles
    ci_results = {}
    for k, vals in boot_metrics.items():
        if len(vals) > 0:
            low = float(np.percentile(vals, 2.5))
            high = float(np.percentile(vals, 97.5))
            ci_results[k] = (low, high)
        else:
            ci_results[k] = (0.0, 1.0)

    return ci_results


def extract_curve_coordinates(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> Dict[str, Any]:
    """
    Computes coordinates for ROC, PR, and Calibration curves.
    """
    # ROC Curve
    fpr, tpr, roc_thresh = roc_curve(y_true, y_prob)
    # Downsample points for efficient JSON serialization if large
    step = max(1, len(fpr) // 30)
    roc_points = [{"fpr": round(float(f), 4), "tpr": round(float(t), 4)} for f, t in zip(fpr[::step], tpr[::step])]
    if {"fpr": round(float(fpr[-1]), 4), "tpr": round(float(tpr[-1]), 4)} not in roc_points:
        roc_points.append({"fpr": 1.0, "tpr": 1.0})

    # PR Curve
    precision, recall, pr_thresh = precision_recall_curve(y_true, y_prob)
    step_pr = max(1, len(precision) // 30)
    pr_points = [{"recall": round(float(r), 4), "precision": round(float(p), 4)} for r, p in zip(recall[::step_pr], precision[::step_pr])]

    # Calibration Curve (quantile bins)
    try:
        prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy="quantile")
        calib_points = [
            {"pred": round(float(p), 4), "obs": round(float(o), 4)}
            for p, o in zip(prob_pred, prob_true)
        ]
    except Exception:
        prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=5, strategy="uniform")
        calib_points = [
            {"pred": round(float(p), 4), "obs": round(float(o), 4)}
            for p, o in zip(prob_pred, prob_true)
        ]

    return {
        "roc_curve": roc_points,
        "pr_curve": pr_points,
        "calibration_curve": calib_points,
    }


def plot_validation_figures(
    target_name: str,
    y_true: np.ndarray,
    y_prob: np.ndarray,
    output_dir: Path,
) -> Dict[str, Path]:
    """
    Generates and saves publication-quality ROC, PR, and Calibration curves.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = {}

    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")

    # 1. ROC Curve
    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    auc_val = roc_auc_score(y_true, y_prob)
    ax.plot(fpr, tpr, color="#008080", lw=2.2, label=f"{target_name} (AUC = {auc_val:.3f})")
    ax.plot([0, 1], [0, 1], color="#999999", linestyle="--", lw=1.2, label="Chance")
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("1 - Specificity (False Positive Rate)", fontsize=11)
    ax.set_ylabel("Sensitivity (True Positive Rate)", fontsize=11)
    ax.set_title(f"ROC Curve: {target_name} Out-of-Fold", fontsize=12, fontweight="bold")
    ax.legend(loc="lower right", frameon=True)
    roc_path = output_dir / f"roc_{target_name}.png"
    plt.tight_layout()
    plt.savefig(roc_path)
    plt.close()
    paths["roc"] = roc_path

    # 2. PR Curve
    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    prec, rec, _ = precision_recall_curve(y_true, y_prob)
    pr_auc = average_precision_score(y_true, y_prob)
    baseline = np.mean(y_true)
    ax.plot(rec, prec, color="#2B6CB0", lw=2.2, label=f"Model (PR-AUC = {pr_auc:.3f})")
    ax.axhline(y=baseline, color="#999999", linestyle="--", lw=1.2, label=f"Prevalence ({baseline:.2f})")
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("Recall (Sensitivity)", fontsize=11)
    ax.set_ylabel("Precision (PPV)", fontsize=11)
    ax.set_title(f"Precision-Recall Curve: {target_name}", fontsize=12, fontweight="bold")
    ax.legend(loc="upper right", frameon=True)
    pr_path = output_dir / f"pr_{target_name}.png"
    plt.tight_layout()
    plt.savefig(pr_path)
    plt.close()
    paths["pr"] = pr_path

    # 3. Calibration Curve
    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    try:
        p_true, p_pred = calibration_curve(y_true, y_prob, n_bins=8, strategy="quantile")
    except Exception:
        p_true, p_pred = calibration_curve(y_true, y_prob, n_bins=5, strategy="uniform")
    brier = brier_score_loss(y_true, y_prob)
    ax.plot(p_pred, p_true, "s-", color="#D946EF", lw=2.0, label=f"Reliability (Brier={brier:.3f})")
    ax.plot([0, 1], [0, 1], color="#999999", linestyle="--", lw=1.2, label="Perfect Calibration")
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.0])
    ax.set_xlabel("Mean Predicted Probability", fontsize=11)
    ax.set_ylabel("Observed Fraction of Positives", fontsize=11)
    ax.set_title(f"Reliability Diagram: {target_name}", fontsize=12, fontweight="bold")
    ax.legend(loc="lower right", frameon=True)
    calib_path = output_dir / f"calibration_{target_name}.png"
    plt.tight_layout()
    plt.savefig(calib_path)
    plt.close()
    paths["calibration"] = calib_path

    return paths
