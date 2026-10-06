"""
Preprocessing pipeline builder using scikit-learn ColumnTransformer.
All transformations (imputation, encoding, scaling) live strictly inside the pipeline.
"""

from typing import List, Tuple, Dict, Any
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, OrdinalEncoder
from cardiomap.ml.src.data import load_config


def get_feature_type_lists(feature_groups_cfg: dict = None) -> Dict[str, List[str]]:
    """
    Extracts lists of feature names segregated by their preprocessing type.
    """
    if feature_groups_cfg is None:
        feature_groups_cfg = load_config("feature_groups.yaml")["groups"]

    numeric_features = []
    binary_features = []
    ordinal_features = []
    nominal_features = []

    for group_name, group_info in feature_groups_cfg.items():
        for feat in group_info["features"]:
            name = feat["name"]
            ftype = feat.get("type", "numeric")
            if ftype == "numeric":
                numeric_features.append(name)
            elif ftype == "binary":
                binary_features.append(name)
            elif ftype == "ordinal":
                ordinal_features.append(name)
            elif ftype == "nominal":
                nominal_features.append(name)
            else:
                numeric_features.append(name)

    return {
        "numeric": numeric_features,
        "binary": binary_features,
        "ordinal": ordinal_features,
        "nominal": nominal_features,
    }


def build_preprocessor(feature_groups_cfg: dict = None) -> ColumnTransformer:
    """
    Builds a scikit-learn ColumnTransformer based on feature_groups.yaml.
    
    Transforms:
    - Numeric: SimpleImputer(strategy='median') -> StandardScaler()
    - Binary: SimpleImputer(strategy='most_frequent')
    - Ordinal: SimpleImputer(strategy='most_frequent') -> OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
    - Nominal: SimpleImputer(strategy='most_frequent') -> OneHotEncoder(handle_unknown='ignore', sparse_output=False)
    """
    type_lists = get_feature_type_lists(feature_groups_cfg)

    # 1. Numeric pipeline
    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    # 2. Binary pipeline (impute with mode, values are 0/1)
    binary_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
    ])

    # 3. Ordinal pipeline (impute with mode, map to ordered integers)
    ordinal_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OrdinalEncoder(
            handle_unknown="use_encoded_value",
            unknown_value=-1
        )),
    ])

    # 4. Nominal pipeline (impute with mode, one-hot encode, tolerate unseen categories)
    nominal_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(
            handle_unknown="ignore",
            sparse_output=False
        )),
    ])

    transformers = []
    if type_lists["numeric"]:
        transformers.append(("num", numeric_pipeline, type_lists["numeric"]))
    if type_lists["binary"]:
        transformers.append(("bin", binary_pipeline, type_lists["binary"]))
    if type_lists["ordinal"]:
        transformers.append(("ord", ordinal_pipeline, type_lists["ordinal"]))
    if type_lists["nominal"]:
        transformers.append(("nom", nominal_pipeline, type_lists["nominal"]))

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="drop", # Dropping any unexpected column
        verbose_feature_names_out=False,
    )

    return preprocessor


def get_transformed_feature_names(preprocessor: ColumnTransformer) -> List[str]:
    """
    Retrieves the list of output feature names after preprocessor transformation.
    """
    return list(preprocessor.get_feature_names_out())
