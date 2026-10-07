"""
Pydantic v2 schemas for CardioMap API request and response contracts.
"""

from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field


class TargetPrediction(BaseModel):
    probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated risk probability [0, 1]")
    label: str = Field(..., description="Binary classification outcome at optimal operating threshold")
    threshold: float = Field(..., ge=0.0, le=1.0, description="Operating decision threshold optimized for F1")


class VesselsPrediction(BaseModel):
    LAD: TargetPrediction
    LCX: TargetPrediction
    RCA: TargetPrediction


class ShapContribution(BaseModel):
    feature: str = Field(..., description="Canonical clinical feature name")
    value: Optional[Union[float, int, str]] = Field(None, description="Patient observation value")
    contribution: float = Field(..., description="Signed additive contribution to prediction")
    relative_contribution: float = Field(..., description="Relative magnitude percentage (|c| / sum(|c|) * 100)")


class MeasurementItem(BaseModel):
    feature: str
    group: str
    value: Optional[Union[float, int, str]] = None
    unit: Optional[str] = None
    reference_range: Optional[List[float]] = None
    flag: str = Field(..., description="'normal', 'high', 'low', 'abnormal', or 'unknown'")
    contribution: float = Field(..., description="Contribution to overall CAD risk prediction")
    relative_contribution: float = Field(..., description="Relative attribution percentage to CAD")


class PredictRequest(BaseModel):
    features: Dict[str, Any] = Field(
        default_factory=dict,
        description="Clinical input dictionary (demographics, vitals, labs, ECG, Echo)",
        examples=[{
            "Age": 62,
            "Sex": 1,
            "Typical Chest Pain": 1,
            "BP": 145,
            "LDL": 165,
            "EF-TTE": 45,
            "Region RWMA": "2"
        }]
    )
    explain: bool = Field(
        default=True,
        description=(
            "Compute SHAP attributions for this request. Set false for the "
            "fast path (probabilities only); shap, base_value, "
            "explanation_space and measurements then come back empty."
        ),
    )


class PredictResponse(BaseModel):
    cad: TargetPrediction
    vessels: VesselsPrediction
    shap: Dict[str, List[ShapContribution]]
    base_value: Dict[str, float]
    explanation_space: Dict[str, str]
    measurements: List[MeasurementItem]
    imputed_features: List[str]
    model_version: str
    disclaimer: str


class HealthResponse(BaseModel):
    status: str
    model_version: str
    artifacts_loaded: bool
    targets: List[str]
    threadpools: Dict[str, int] = Field(
        default_factory=dict,
        description="Loaded numeric thread pools and their configured width.",
    )
