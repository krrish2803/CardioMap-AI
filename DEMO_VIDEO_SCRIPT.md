# CardioMap 3D: Demonstration Video Script & Storyboard
## YouTube Demonstration Guide (Suggested Duration: ~5 to 7 Minutes)

**Video Title:** CardioMap 3D: Vessel-Level Cardiovascular Risk Visualization & Explainable ML Dashboard  
**Format:** Screen Recording + Voiceover Narration  
**Target Audience:** Clinical informaticians, interventional cardiologists, ML engineers, healthcare researchers.

---

## 🎬 Video Overview & Chapter Timestamps

- **[0:00 - 0:45]** — **Chapter 1: The Clinical Challenge & The Diagnostic Blind Spot**
- **[0:45 - 1:40]** — **Chapter 2: Scrollytelling Walkthrough & The 4-Step Pipeline**
- **[1:40 - 2:45]** — **Chapter 3: Interactive 3D Anatomy & Flow Metaphor**
- **[2:45 - 3:50]** — **Chapter 4: Live Clinical Dashboard & Bi-Directional Selection**
- **[3:50 - 4:45]** — **Chapter 5: "What-If" Counterfactual Simulation & SHAP Decomposition**
- **[4:45 - 5:40]** — **Chapter 6: Machine Learning Architecture & Nested CV Rigor**
- **[5:40 - 6:00]** — **Chapter 7: Summary, Safety Disclaimers & Conclusion**

---

## 🎙️ Scene-by-Scene Storyboard & Voiceover Script

### Chapter 1: The Clinical Challenge & The Diagnostic Blind Spot
**Timestamp:** `0:00 - 0:45`  
**Visuals on Screen:**
- Camera begins on the CardioMap 3D Hero section. Full-screen 3D dark clinical heart gently pulsing at 72 bpm with glowing coronary arteries.
- Cursor hovers over headline: *"See where risk lives inside the heart."*
- Scroll down slightly to Section 2 (**The Problem Statement**). Highlight the lone `"37%"` metric fading into a prominent `"?"` question mark over a dim, unlit grey heart.

**Spoken Voiceover (Narrator):**
> *"Cardiovascular disease remains the leading cause of mortality worldwide. Yet, standard clinical risk calculators output a single, abstract number—like '37% risk'.*  
> *To an interventional cardiologist or a worried patient, that percentage leaves a critical diagnostic blind spot: Where is the lesion? Is it in the Left Anterior Descending artery—the 'widowmaker'—or the Right Coronary Artery? And why did the model predict that?*  
> *Welcome to CardioMap 3D: a clinical decision-support prototype that estimates cardiovascular risk across major coronary branches—with performance varying from good for CAD and LAD to modest for LCX and RCA—and maps calibrated probabilities directly onto an interactive 3D heart."*

---

### Chapter 2: Scrollytelling Walkthrough & The 4-Step Pipeline
**Timestamp:** `0:45 - 1:40`  
**Visuals on Screen:**
- Smooth scroll to Section 3 (**The Proposed Solution**). Click on the 4 animated steps:
  1. *Multimodal Patient Data*
  2. *Disaggregated ML Models*
  3. *Isotonic Calibration*
  4. *Spatialized 3D Heart*
- Scroll to Section 4 (**How It Works in 3D**). Use the interactive stepper to demonstrate Step 1 (neutral anatomy), Step 2 (color-lerping), Step 3 (orbit to LAD focus), and Step 4 (hemodynamic particle pulses).

**Spoken Voiceover (Narrator):**
> *"Our pipeline bridges multimodal patient measurements—vitals, lipid panels, 12-lead ECG findings, and echocardiography—with four independent, leakage-free machine learning models.*  
> *Instead of lumping risk together, our models independently estimate overall CAD alongside branch-specific risk for the LAD, LCX, and RCA. Crucially, the system highlights confidence tiers: strong predictive power for CAD (AUC 0.93) and LAD (AUC 0.85), alongside visible low-confidence warnings for LCX (AUC 0.75) and RCA (AUC 0.71), communicating weak vessels via relative dataset rank rather than false precision.*  
> *Every probability is calibrated so that colors map directly to reality, accompanied by an honest anatomical principle: each artery maps one-to-one to a model output, without inferring sub-vessel lesion geography."*

---

### Chapter 3: Interactive 3D Anatomy & Flow Metaphor
**Timestamp:** `1:40 - 2:45`  
**Visuals on Screen:**
- Zoom in on the 3D heart in Section 4.
- Demonstrate free orbit: left-click to rotate around the heart, showing the LAD on the anterior groove, LCX wrapping around the lateral wall, and RCA coursing down the right coronary sulcus.
- Highlight the **Hemodynamic Particle Flow Metaphor**: point out how particles travel briskly through unobstructed vessels (low risk, blue), while high-risk vessels (severe stenosis, magenta) show sluggish, impeded flow pulses.
- Click the "Motion" button in the navigation header to show instant compliance with reduced motion (heartbeat and particles pause).

**Spoken Voiceover (Narrator):**
> *"Notice the coronary arteries wrapping around the ventricles. We've built these procedurally using 3D CatmullRom splines, making them completely independent from mesh topology.*  
> *We've also integrated a hemodynamic flow metaphor: animated particles travel down each vessel, and their transit speed slows as stenosis probability increases, visually simulating luminal flow impedance.*  
> *The color palette is strictly colorblind-safe: electric blue for minimal risk, yellow for mild, orange for moderate, and vivid magenta for severe narrowing—completely avoiding red/green confusion."*

---

### Chapter 4: Live Clinical Dashboard & Bi-Directional Selection
**Timestamp:** `2:45 - 3:50`  
**Visuals on Screen:**
- Click "Launch Workbench" CTA. The page smoothly scrolls to `#demo` (**Live Dashboard**).
- Point out the pinned clinical advisory banner at the top: *"Decision support / educational use only."*
- Demonstrate **Bi-Directional Selection**:
  1. Click the **LAD Vessel Card** on the right summary panel: the 3D camera smoothly glides and orbits to focus directly on the LAD, dimming the other arteries.
  2. Click the **RCA artery** in the 3D viewport: the RCA card instantly activates on the right, and the floating HTML label updates.
  3. Click **Reset View** to return camera to canonical orientation.
  4. Toggle the **Echo Wall Territory** button to show the localized anteroseptal regional wall motion highlight (*"Input finding, not a prediction"*).

**Spoken Voiceover (Narrator):**
> *"Here is the live clinical workbench. Pinned prominently at the top is our clinical disclaimer.*  
> *The layout features a 60/40 split: on the left, an interactive WebGL viewport; on the right, our clinical insights dashboard.*  
> *Selection is fully bi-directional: clicking an artery card on the right animates the 3D camera to focus on that specific branch, while clicking the vessel directly in 3D syncs the dashboard and exposes its territory."*

---

### Chapter 5: "What-If" Counterfactual Simulation & SHAP Decomposition
**Timestamp:** `3:50 - 4:45`  
**Visuals on Screen:**
- Switch to the **Explain Tab**: Show the SHAP horizontal bar chart. Toggle between CAD, LAD, LCX, and RCA. Point out cyan bars (push risk up) and amber bars (push risk down).
- Switch to the **Inputs & What-If Tab**:
  - Load "Patient C — High Risk Archetype". Show the 3D heart lighting up magenta.
  - Turn on **Live "What-If" Recoloring**.
  - Adjust the **LDL slider** down from $188\text{ mg/dL}$ to $75\text{ mg/dL}$, and toggle Smoking from Current to Never.
  - Watch the debounced live inference update the 3D heart, turning the LAD from magenta to warm yellow within 300ms!

**Spoken Voiceover (Narrator):**
> *"Under the Explain tab, clinicians can inspect game-theoretic SHAP attributions for any target. Notice that our phrasing emphasizes 'contribution to this prediction', never causal certainty.*  
> *Under Inputs, clinicians can run real-time counterfactuals. Watch as we lower this patient's LDL cholesterol and simulate smoking cessation: within 300 milliseconds, the models re-evaluate in the background, and the 3D heart dynamically recolors to reflect their reduced ischemic risk."*

---

### Chapter 6: Machine Learning Architecture & Nested CV Rigor
**Timestamp:** `4:45 - 5:40`  
**Visuals on Screen:**
- Switch to the **Model Validation Tab**:
  - Show the performance metrics table with 95% bootstrap confidence intervals.
  - Display the interactive ROC curve and calibration reliability diagram.
- Briefly switch to terminal: show `make test` passing all 8 tests in 2 seconds, and show `make report` displaying the nested cross-validation comparison table.

**Spoken Voiceover (Narrator):**
> *"Behind this interface is a rigorous ML pipeline trained on the Z-Alizadeh Sani cohort.*  
> *We enforce a strict zero-leakage protocol: all target labels are completely purged from inputs, verified by unit tests.*  
> *Rather than a simple train-test split, we evaluated our models using double nested cross-validation with 15 outer folds. Random Forest achieved a 0.928 ROC-AUC on CAD and 0.853 on LAD, while Logistic Regression was selected for RCA under our 1-Standard-Error parsimony rule.*  
> *All models are calibrated via sigmoid scaling, and our FastAPI backend serves predictions and SHAP explanations in just 60 milliseconds."*

---

### Chapter 7: Summary, Safety Disclaimers & Conclusion
**Timestamp:** `5:40 - 6:00`  
**Visuals on Screen:**
- Return to full dashboard view.
- Pan over the persistent disclaimer and footer citations (SCCT Guidelines, Zadrozny & Elkan, Lundberg et al.).
- Final outro card with GitHub repository link and documentation references.

**Spoken Voiceover (Narrator):**
> *"CardioMap 3D demonstrates how modern machine learning and creative web technology can make medical algorithms transparent, spatially intuitive, and clinically actionable.*  
> *Thank you for watching. The complete codebase, documentation, and Docker configurations are available in the project repository."*
