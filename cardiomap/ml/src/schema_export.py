"""
Schema export utility to generate backend/artifacts/feature_schema.json
combining clinical configuration and dataset distribution statistics.
"""

import json
from pathlib import Path
import pandas as pd
import numpy as np
from cardiomap.ml.src.data import load_config, get_project_root, load_and_clean_data


def generate_feature_schema(df: pd.DataFrame = None, output_path: Path = None) -> dict:
    """
    Constructs the dynamic feature schema with empirical ranges, defaults, and clinical reference ranges.
    """
    if df is None:
        df = load_and_clean_data()

    root = get_project_root()
    if output_path is None:
        output_path = root / "backend" / "artifacts" / "feature_schema.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    feature_groups_cfg = load_config("feature_groups.yaml")["groups"]
    ref_ranges_cfg = load_config("reference_ranges.yaml").get("ranges", {})
    ref_disclaimer = load_config("reference_ranges.yaml").get("disclaimer", "")

    groups_output = []
    features_flat = {}

    for grp_id, grp_info in feature_groups_cfg.items():
        grp_fields = []
        for feat in grp_info["features"]:
            name = feat["name"]
            ftype = feat.get("type", "numeric")
            unit = feat.get("unit")
            desc = feat.get("description", name)

            field_dict = {
                "key": name,
                "label": name,
                "group": grp_id,
                "type": ftype,
                "unit": unit,
                "description": desc,
            }

            # Reference range if defined
            if name in ref_ranges_cfg:
                field_dict["reference_range"] = ref_ranges_cfg[name]["range"]
                field_dict["abnormal_below"] = ref_ranges_cfg[name].get("abnormal_below")
                field_dict["abnormal_above"] = ref_ranges_cfg[name].get("abnormal_above")

            # Extract empirical distribution if present in df
            if name in df.columns:
                series = df[name].dropna()
                if ftype == "numeric":
                    val_min = float(series.min())
                    val_max = float(series.max())
                    val_median = float(series.median())
                    field_dict["min"] = round(val_min, 1)
                    field_dict["max"] = round(val_max, 1)
                    field_dict["default"] = round(val_median, 1)
                elif ftype == "binary":
                    mode_val = int(series.mode()[0]) if len(series) > 0 else 0
                    field_dict["min"] = 0
                    field_dict["max"] = 1
                    field_dict["default"] = mode_val
                    field_dict["options"] = [
                        {"label": "No / Absent", "value": 0},
                        {"label": "Yes / Present", "value": 1},
                    ]
                elif ftype == "ordinal":
                    cats = feat.get("categories", [1, 2, 3, 4])
                    mode_val = int(series.mode()[0]) if len(series) > 0 else cats[0]
                    field_dict["categories"] = cats
                    field_dict["default"] = mode_val
                    field_dict["min"] = min(cats)
                    field_dict["max"] = max(cats)
                    # Emit `options` alongside `categories` so every categorical
                    # field in the schema carries one consistent key for UIs.
                    labels = feat.get("category_labels") or [str(c) for c in cats]
                    field_dict["options"] = [
                        {"label": labels[i] if i < len(labels) else str(c), "value": c}
                        for i, c in enumerate(cats)
                    ]
                elif ftype == "nominal":
                    unique_vals = sorted(series.unique().tolist())
                    mode_val = series.mode()[0] if len(series) > 0 else unique_vals[0]
                    field_dict["options"] = [{"label": str(v), "value": v} for v in unique_vals]
                    field_dict["default"] = mode_val

            grp_fields.append(field_dict)
            features_flat[name] = field_dict

        groups_output.append({
            "id": grp_id,
            "title": grp_id,
            "description": grp_info.get("description", ""),
            "fields": grp_fields,
        })

    schema = {
        "version": "2.0.0",
        "name": "CardioMap Feature Schema",
        "disclaimer": ref_disclaimer,
        "groups": groups_output,
        "features": features_flat,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)

    return schema


if __name__ == "__main__":
    print("Exporting feature_schema.json...")
    schema = generate_feature_schema()
    print(f"Schema exported with {len(schema['features'])} features across {len(schema['groups'])} groups.")
