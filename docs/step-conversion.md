# STEP → STL Konvertierung

Werkzeuge im Repo:

- `python3 -m pip install cadquery-ocp` (nur einmalig erforderlich)
- `python3 tools/convert_step.py`

Das Script liest alle `.STP` Dateien aus `_input/neu`, trianguliert sie mit OpenCascade und schreibt skalierte Meshes (metermassstab) nach `public/3d/converted/*.stl`.

Optionen:

- `--keep-mm`: behält Millimeter statt Meter beim Export.

Weitere Verarbeitung (z. B. OBJ/GLB) kann anschließend in Blender, MeshLab oder via `meshio` erfolgen.
