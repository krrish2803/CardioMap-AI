# CardioMap: Comprehensive Clinical Data Audit
**Dataset Shape:** `303 patients` × `59 columns`
**Missing Values Total:** `0`

## 1. Ground Truth Target Distributions
| Target | Positive Label | Positive (N) | Negative (N) | Prevalence (%) | Imbalance Ratio (Neg:Pos) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **cad** | CAD | 216 | 87 | 71.3% | 0.40:1 |
| **LAD** | Stenotic | 177 | 126 | 58.4% | 0.71:1 |
| **LCX** | Stenotic | 119 | 184 | 39.3% | 1.55:1 |
| **RCA** | Stenotic | 114 | 189 | 37.6% | 1.66:1 |

## 2. Anatomical Vessel vs. Systemic CAD Relationship
> **Clinical Observation:** Does composite CAD diagnosis equal 'at least one major vessel stenotic'?

- **CAD(+) patients with 0 major vessels stenotic:** `0` patients (0.0%)
- **CAD(+) patients with 1 vessel stenotic:** `86` patients (28.4%)
- **CAD(+) patients with 2 vessels stenotic:** `67` patients (22.1%)
- **CAD(+) patients with 3 vessels stenotic (Triple):** `63` patients (20.8%)
- **CAD(-) patients with any major vessel stenotic:** `1` patients (0.3%)

**Audit Takeaway:** The data shows that CAD status largely concordance with vessel stenosis, but subtle discordances may exist in patients with microvascular or non-major-branch disease. Models must therefore be trained independently per vessel target rather than deriving vessel predictions trivially from CAD.

## 3. Feature Grouping & Column Coverage
| Clinical Group | Configured Features (N) | Data Types Included |
| :--- | :---: | :--- |
| **Demographic** | 17 | binary, numeric |
| **Clinical examination** | 14 | binary, numeric, ordinal |
| **ECG** | 7 | binary, nominal |
| **Laboratory** | 14 | numeric |
| **Echocardiography** | 3 | nominal, numeric |

✅ **All non-target features (100%) are mapped to clinical groups.**

## 4. Missing Values Analysis
✅ **No missing values found across all columns.** (Complete case cohort)

## 5. Leakage Prevention Protocol
The following columns are permanently excluded from feature matrices for all targets:
- `CAD`
- `Cath`
- `LAD`
- `LCX`
- `RCA`
- `cad`

