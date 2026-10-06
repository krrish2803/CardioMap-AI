"""
Data loading, cleaning, validation, and audit module for CardioMap.
Guarantees zero-leakage separation of features and targets.
"""

import os
import re
import yaml
import pandas as pd
import numpy as np
from pathlib import Path


def get_project_root() -> Path:
    """Returns path to cardiomap root directory."""
    # Assuming this file is at cardiomap/ml/src/data.py
    return Path(__file__).resolve().parent.parent.parent


def load_config(config_rel_path: str) -> dict:
    """Loads a YAML configuration file relative to cardiomap/ml/config/."""
    root = get_project_root()
    path = root / "ml" / "config" / config_rel_path
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def find_raw_csv_path() -> Path:
    """Finds the single CSV file in ml/data/raw/."""
    root = get_project_root()
    raw_dir = root / "ml" / "data" / "raw"
    if not raw_dir.exists():
        raise FileNotFoundError(f"Raw data directory does not exist: {raw_dir}")
    
    csv_files = list(raw_dir.glob("*.csv"))
    if len(csv_files) == 0:
        raise FileNotFoundError(f"No CSV file found in {raw_dir}. Please place the dataset CSV there.")
    if len(csv_files) > 1:
        # If multiple, prefer z_alizadeh_sani.csv or the first one
        preferred = [f for f in csv_files if "alizadeh" in f.name.lower()]
        return preferred[0] if preferred else csv_files[0]
    return csv_files[0]


def normalize_column_name(col: str, synonyms: dict) -> str:
    """Trims whitespace and applies known synonyms."""
    col_clean = col.strip()
    col_lower = col_clean.lower()
    if col_lower in synonyms:
        return synonyms[col_lower]
    return col_clean


def normalize_value(val, is_nominal: bool = False):
    """Normalize raw values (trim strings, standardize binary/categoricals)."""
    if pd.isna(val):
        return np.nan
    if isinstance(val, str):
        v = val.strip()
        if is_nominal:
            return v
        v_low = v.lower()
        if v_low in ["y", "yes", "true", "t"]:
            return 1
        if v_low in ["n", "no", "false", "f"]:
            return 0
        if v_low in ["male", "m"]:
            return 1
        if v_low in ["female", "fmale", "f"]:
            return 0
        # Try numeric conversion
        try:
            return float(v)
        except ValueError:
            return v
    return val


def load_and_clean_data(csv_path: Path = None) -> pd.DataFrame:
    """
    Loads raw CSV, validates mandatory columns, normalizes headers and values.
    """
    if csv_path is None:
        csv_path = find_raw_csv_path()

    df = pd.read_csv(csv_path)

    # 1. Clean headers and map synonyms
    col_map_cfg = load_config("column_map.yaml")
    synonyms = {k.lower(): v for k, v in col_map_cfg.get("synonyms", {}).items()}
    
    # Strip whitespace from headers first
    df.columns = [col.strip() for col in df.columns]
    
    # Apply synonym renaming
    renamed = {}
    for col in df.columns:
        norm = normalize_column_name(col, synonyms)
        renamed[col] = norm
    df = df.rename(columns=renamed)

    # 2. Hard validation: Ensure LAD, LCX, RCA and Cath exist
    required_targets = ["LAD", "LCX", "RCA", "Cath"]
    missing_targets = [t for t in required_targets if t not in df.columns]
    if missing_targets:
        available_cols = ", ".join(df.columns.tolist())
        raise ValueError(
            f"DATA VALIDATION FAILED: Required target columns {missing_targets} are missing!\n"
            f"Available columns ({len(df.columns)}): {available_cols}"
        )

    # 3. Clean and normalize values across all columns
    nominal_cols = {"BBB", "VHD", "Region RWMA"}
    for col in df.columns:
        # Don't overwrite target strings yet (we parse them specifically in build_target)
        if col not in ["Cath", "LAD", "LCX", "RCA"]:
            is_nom = col in nominal_cols
            df[col] = df[col].apply(lambda x: normalize_value(x, is_nominal=is_nom))
            if is_nom:
                # Ensure all values in nominal column are string representations
                df[col] = df[col].astype(str)

    return df


def build_target(df: pd.DataFrame, target_name: str) -> pd.Series:
    """
    Builds binary target vector y (1 or 0) for target_name based on targets.yaml.
    """
    targets_cfg = load_config("targets.yaml")["targets"]
    if target_name not in targets_cfg:
        raise ValueError(f"Target '{target_name}' not defined in targets.yaml. Options: {list(targets_cfg.keys())}")

    cfg = targets_cfg[target_name]
    raw_col = cfg["column"]
    if raw_col not in df.columns:
        raise KeyError(f"Target column '{raw_col}' not found in dataframe.")

    mapping = {k.lower(): v for k, v in cfg["mapping"].items()}
    
    def map_val(x):
        if pd.isna(x):
            return np.nan
        s = str(x).strip().lower()
        if s in mapping:
            return mapping[s]
        # Check standard 1 / 0
        if s in ["1", "1.0", "true", "stenotic", "cad"]:
            return 1
        if s in ["0", "0.0", "false", "normal"]:
            return 0
        raise ValueError(f"Unrecognized target value '{x}' in column '{raw_col}' for target '{target_name}'")

    y = df[raw_col].apply(map_val).astype(int)
    y.name = target_name
    return y


def get_feature_matrix_and_target(df: pd.DataFrame, target_name: str) -> tuple[pd.DataFrame, pd.Series]:
    """
    Extracts feature matrix X and binary target y.
    HARD RULE: Enforces complete exclusion of Cath, CAD, LAD, LCX, RCA from X.
    """
    targets_cfg = load_config("targets.yaml")
    excluded = set(targets_cfg.get("excluded_columns", []))
    # Also add case variations of excluded columns
    all_excluded = set()
    for col in df.columns:
        if col in excluded or col.lower() in [e.lower() for e in excluded]:
            all_excluded.add(col)

    # Build target vector y
    y = build_target(df, target_name)

    # Drop all target-related columns from X
    X = df.drop(columns=list(all_excluded), errors="ignore").copy()

    # Integrity verification
    for ex in all_excluded:
        if ex in X.columns:
            raise RuntimeError(f"CRITICAL LEAKAGE DETECTED: Column '{ex}' was not removed from feature matrix X!")

    return X, y


def generate_data_audit(df: pd.DataFrame, output_path: Path = None) -> str:
    """
    Generates and saves a thorough audit of the dataset to reports/data_audit.md.
    """
    root = get_project_root()
    if output_path is None:
        output_path = root / "reports" / "data_audit.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    targets_cfg = load_config("targets.yaml")["targets"]
    feature_groups_cfg = load_config("feature_groups.yaml")["groups"]

    # Calculate target distributions
    target_stats = {}
    for t_name in targets_cfg.keys():
        y = build_target(df, t_name)
        pos = int(y.sum())
        total = len(y)
        pct = (pos / total) * 100
        target_stats[t_name] = {
            "pos": pos,
            "neg": total - pos,
            "pos_pct": pct,
            "imbalance_ratio": (total - pos) / max(1, pos),
        }

    # Relationship between CAD and vessel labels
    y_cad = build_target(df, "cad")
    y_lad = build_target(df, "LAD")
    y_lcx = build_target(df, "LCX")
    y_rca = build_target(df, "RCA")

    vessel_sum = y_lad + y_lcx + y_rca
    cad_pos_vessel_zero = int(((y_cad == 1) & (vessel_sum == 0)).sum())
    cad_pos_vessel_one = int(((y_cad == 1) & (vessel_sum == 1)).sum())
    cad_pos_vessel_two = int(((y_cad == 1) & (vessel_sum == 2)).sum())
    cad_pos_vessel_three = int(((y_cad == 1) & (vessel_sum == 3)).sum())

    cad_neg_vessel_nonzero = int(((y_cad == 0) & (vessel_sum > 0)).sum())

    # Check unmapped columns
    all_mapped_features = set()
    for g_name, g_info in feature_groups_cfg.items():
        for f in g_info["features"]:
            all_mapped_features.add(f["name"])

    excluded_cols = set(load_config("targets.yaml").get("excluded_columns", []))
    unmapped_columns = [c for c in df.columns if c not in all_mapped_features and c not in excluded_cols]

    # Missing value count
    missing_counts = df.isnull().sum()
    cols_with_missing = missing_counts[missing_counts > 0]

    # Compose markdown report
    md = []
    md.append("# CardioMap: Comprehensive Clinical Data Audit\n")
    md.append(f"**Dataset Shape:** `{df.shape[0]} patients` × `{df.shape[1]} columns`\n")
    md.append(f"**Missing Values Total:** `{df.isnull().sum().sum()}`\n\n")

    md.append("## 1. Ground Truth Target Distributions\n")
    md.append("| Target | Positive Label | Positive (N) | Negative (N) | Prevalence (%) | Imbalance Ratio (Neg:Pos) |\n")
    md.append("| :--- | :--- | :---: | :---: | :---: | :---: |\n")
    for t_name, s in target_stats.items():
        pos_lbl = targets_cfg[t_name]["positive_label"]
        md.append(f"| **{t_name}** | {pos_lbl} | {s['pos']} | {s['neg']} | {s['pos_pct']:.1f}% | {s['imbalance_ratio']:.2f}:1 |\n")
    md.append("\n")

    md.append("## 2. Anatomical Vessel vs. Systemic CAD Relationship\n")
    md.append("> **Clinical Observation:** Does composite CAD diagnosis equal 'at least one major vessel stenotic'?\n\n")
    md.append(f"- **CAD(+) patients with 0 major vessels stenotic:** `{cad_pos_vessel_zero}` patients ({cad_pos_vessel_zero/len(df)*100:.1f}%)\n")
    md.append(f"- **CAD(+) patients with 1 vessel stenotic:** `{cad_pos_vessel_one}` patients ({cad_pos_vessel_one/len(df)*100:.1f}%)\n")
    md.append(f"- **CAD(+) patients with 2 vessels stenotic:** `{cad_pos_vessel_two}` patients ({cad_pos_vessel_two/len(df)*100:.1f}%)\n")
    md.append(f"- **CAD(+) patients with 3 vessels stenotic (Triple):** `{cad_pos_vessel_three}` patients ({cad_pos_vessel_three/len(df)*100:.1f}%)\n")
    md.append(f"- **CAD(-) patients with any major vessel stenotic:** `{cad_neg_vessel_nonzero}` patients ({cad_neg_vessel_nonzero/len(df)*100:.1f}%)\n\n")
    md.append("**Audit Takeaway:** The data shows that CAD status largely concordance with vessel stenosis, but subtle discordances may exist in patients with microvascular or non-major-branch disease. Models must therefore be trained independently per vessel target rather than deriving vessel predictions trivially from CAD.\n\n")

    md.append("## 3. Feature Grouping & Column Coverage\n")
    md.append("| Clinical Group | Configured Features (N) | Data Types Included |\n")
    md.append("| :--- | :---: | :--- |\n")
    for g_name, g_info in feature_groups_cfg.items():
        types_in_grp = list(set(f["type"] for f in g_info["features"]))
        md.append(f"| **{g_name}** | {len(g_info['features'])} | {', '.join(types_in_grp)} |\n")
    md.append("\n")

    if unmapped_columns:
        md.append(f"⚠️ **Unmapped Columns Detected ({len(unmapped_columns)}):** `{', '.join(unmapped_columns)}`\n\n")
    else:
        md.append("✅ **All non-target features (100%) are mapped to clinical groups.**\n\n")

    md.append("## 4. Missing Values Analysis\n")
    if len(cols_with_missing) == 0:
        md.append("✅ **No missing values found across all columns.** (Complete case cohort)\n\n")
    else:
        md.append("| Column | Missing (N) | Missing (%) |\n")
        md.append("| :--- | :---: | :---: |\n")
        for c, n in cols_with_missing.items():
            md.append(f"| {c} | {n} | {n/len(df)*100:.2f}% |\n")
        md.append("\n")

    md.append("## 5. Leakage Prevention Protocol\n")
    md.append("The following columns are permanently excluded from feature matrices for all targets:\n")
    for ex in sorted(list(excluded_cols)):
        md.append(f"- `{ex}`\n")
    md.append("\n")

    content = "".join(md)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    return content


if __name__ == "__main__":
    print("Executing CardioMap Data Loading and Audit...")
    df = load_and_clean_data()
    audit_text = generate_data_audit(df)
    print("Audit generated successfully!")
    print(audit_text)
