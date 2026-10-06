Place your custom `heart.glb` file here.
If no `heart.glb` file is present in this directory, CardioMap 3D automatically renders the procedural anatomical 3D heart fallback.

────────────────────────────────────────────────────────────────────────────
CURRENT FILE: heart.glb  (1.7 MB, binary glTF 2.0)
────────────────────────────────────────────────────────────────────────────

Anatomical human heart, segmented into 14 named structures (left/right
ventricle, left/right atrium, interventricular septum, four papillary
muscles, aortic / pulmonary / mitral / tricuspid valves, and the cardiac
chamber shell).

Source
  HuBMAP 3D Reference Organ Library, "Visible Human" heart model
  https://cdn.humanatlas.io/digital-objects/ref-organ/heart-female/v1.3/assets/3d-vh-f-heart.glb
  Derived from the Visible Human Project, U.S. National Library of Medicine.

License
  CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
  Attribution is required when redistributing. Credit as:
  "Visible Human heart model via the HuBMAP 3D Reference Organ Library,
   © The Database Center for Life Science, CC BY 4.0."

Preprocessing applied for CardioMap
  • Geometry baked into app space (metres -> scene units).
  • Rotated into the scene's anatomical frame: +X = patient's left,
    +Y = superior, +Z = anterior (matches src/config/vessels.js).
  • Uniformly scaled to 2.12 units tall and centered on the origin, so the
    coronary curves in src/config/vessels.js sit on the myocardium.
  • Vertex normals recomputed. No Draco/Meshopt compression, so it loads
    with a plain GLTFLoader (no extra decoders required).

  85,914 triangles across 14 meshes.

To swap in a different model
  Any .glb/.gltf/.obj anatomical mesh works — the loader in
  src/components/three/Heart.jsx probes for /models/heart.glb at runtime and
  falls back to the procedural heart automatically if the file is absent or
  fails to parse. Note that a replacement mesh should be normalized to the
  frame above (2.1 units tall, centered at origin, apex toward -Y) or the
  coronary curves will not align to it.