"""Batch convert STEP files in `_input/neu` to STL meshes.

Usage::
    python3 tools/convert_step.py [--keep-mm]

Requires the `cadquery-ocp` package (provides OpenCascade bindings).
"""

from __future__ import annotations

import argparse
import re
import unicodedata
from pathlib import Path
from typing import Iterable

from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.gp import gp_Trsf
from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
from OCP.STEPControl import STEPControl_Reader
from OCP.StlAPI import StlAPI_Writer

INPUT_DIR = Path("_input/neu")
OUTPUT_DIR = Path("public/3d/converted")


def iter_step_files(directory: Path) -> Iterable[Path]:
    return sorted(directory.glob("*.STP"))


def read_step(path: Path):
    reader = STEPControl_Reader()
    status = reader.ReadFile(str(path))
    if status != 1:  # IFSelect_RetDone
        raise RuntimeError(f"Failed to read STEP file {path}: status {status}")
    reader.TransferRoots()
    return reader.OneShape()


def mesh_shape(shape, linear_deflection: float = 0.5, angular_deflection: float = 0.5):
    mesher = BRepMesh_IncrementalMesh(shape, linear_deflection, True, angular_deflection, True)
    mesher.Perform()


def scale_shape(shape, factor: float):
    transf = gp_Trsf()
    transf.SetScaleFactor(factor)
    transformed = BRepBuilderAPI_Transform(shape, transf, True)
    return transformed.Shape()


def export_stl(shape, target: Path):
    writer = StlAPI_Writer()
    success = writer.Write(shape, str(target))
    if not success:
        raise RuntimeError(f"Failed to write STL to {target}")


def convert(step_path: Path, keep_millimetre: bool):
    shape = read_step(step_path)
    if not keep_millimetre:
        shape = scale_shape(shape, 0.001)  # mm → m

    mesh_shape(shape)

    filename = slugify(step_path.stem) + ".stl"
    target = OUTPUT_DIR / filename
    export_stl(shape, target)
    return target


def slugify(name: str) -> str:
    normalized = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')
    normalized = normalized.replace(' ', '-').lower()
    normalized = re.sub(r'[^a-z0-9._-]', '', normalized)
    normalized = re.sub(r'-{2,}', '-', normalized).strip('-')
    return normalized or 'converted'


def main():
    parser = argparse.ArgumentParser(description="Convert STEP files to STL meshes")
    parser.add_argument("--keep-mm", action="store_true", help="Do not rescale to metres")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    step_files = list(iter_step_files(INPUT_DIR))
    if not step_files:
        print(f"No STEP files found in {INPUT_DIR}")
        return

    for step_file in step_files:
        try:
            target = convert(step_file, keep_millimetre=args.keep_mm)
            print(f"Converted {step_file.name} → {target}")
        except Exception as exc:
            print(f"[ERROR] {step_file.name}: {exc}")


if __name__ == "__main__":
    main()
