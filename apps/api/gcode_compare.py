"""G-Code comparison helpers for MOLDURIZE validation.

The comparator is intentionally independent from the generator. It parses a
reference file and a candidate file, then reports the metrics that matter for
hot-wire CNC validation: G1 counts, mirrored axes, duplicate moves, total XY
distance, first textual difference, and coordinate deltas.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple


COORD_RE = re.compile(r"([XYZAIJ])(-?\d+(?:\.\d+)?)")
COMMAND_RE = re.compile(r"^\s*([GMT]\d+|F-?\d+(?:\.\d+)?)", re.IGNORECASE)


Point = Tuple[float, float]


@dataclass(frozen=True)
class ParsedLine:
    number: int
    raw: str
    command: Optional[str]
    coords: Dict[str, float]


@dataclass(frozen=True)
class GCodeMetrics:
    line_count: int
    command_counts: Dict[str, int]
    g1_count: int
    xy_distance: float
    duplicate_g1_moves: int
    mirror_errors: int
    min_x: Optional[float]
    max_x: Optional[float]
    min_y: Optional[float]
    max_y: Optional[float]


@dataclass(frozen=True)
class FirstDifference:
    line: int
    reference: Optional[str]
    candidate: Optional[str]


@dataclass(frozen=True)
class GCodeComparison:
    reference: GCodeMetrics
    candidate: GCodeMetrics
    first_difference: Optional[FirstDifference]
    equal_line_count: int
    max_line_coordinate_delta: Optional[float]
    max_g1_sequence_delta: Optional[float]


def parse_gcode(text: str) -> List[ParsedLine]:
    parsed: List[ParsedLine] = []
    for idx, raw in enumerate(text.splitlines(), start=1):
        command_match = COMMAND_RE.match(raw)
        command = command_match.group(1).upper() if command_match else None
        if command and command.startswith("F"):
            command = "F"
        coords = {axis: float(value) for axis, value in COORD_RE.findall(raw.upper())}
        parsed.append(ParsedLine(number=idx, raw=raw, command=command, coords=coords))
    return parsed


def _g1_points(lines: Sequence[ParsedLine]) -> List[Point]:
    points: List[Point] = []
    for line in lines:
        if line.command == "G1" and "X" in line.coords and "Y" in line.coords:
            points.append((line.coords["X"], line.coords["Y"]))
    return points


def _path_distance(points: Sequence[Point]) -> float:
    return sum(math.hypot(x2 - x1, y2 - y1) for (x1, y1), (x2, y2) in zip(points, points[1:]))


def _duplicate_moves(points: Sequence[Point], tolerance: float) -> int:
    return sum(
        1
        for (x1, y1), (x2, y2) in zip(points, points[1:])
        if math.isclose(x1, x2, abs_tol=tolerance) and math.isclose(y1, y2, abs_tol=tolerance)
    )


def _mirror_errors(lines: Sequence[ParsedLine], tolerance: float) -> int:
    errors = 0
    for line in lines:
        if line.command != "G1":
            continue
        coords = line.coords
        if {"X", "Z"}.issubset(coords) and not math.isclose(coords["X"], coords["Z"], abs_tol=tolerance):
            errors += 1
        if {"Y", "A"}.issubset(coords) and not math.isclose(coords["Y"], coords["A"], abs_tol=tolerance):
            errors += 1
    return errors


def metrics(lines: Sequence[ParsedLine], tolerance: float = 0.0001) -> GCodeMetrics:
    command_counts: Dict[str, int] = {}
    for line in lines:
        if line.command:
            command_counts[line.command] = command_counts.get(line.command, 0) + 1

    points = _g1_points(lines)
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return GCodeMetrics(
        line_count=len(lines),
        command_counts=dict(sorted(command_counts.items())),
        g1_count=len(points),
        xy_distance=round(_path_distance(points), 4),
        duplicate_g1_moves=_duplicate_moves(points, tolerance),
        mirror_errors=_mirror_errors(lines, tolerance),
        min_x=min(xs) if xs else None,
        max_x=max(xs) if xs else None,
        min_y=min(ys) if ys else None,
        max_y=max(ys) if ys else None,
    )


def _first_difference(reference: Sequence[ParsedLine], candidate: Sequence[ParsedLine]) -> Optional[FirstDifference]:
    max_len = max(len(reference), len(candidate))
    for idx in range(max_len):
        ref_line = reference[idx].raw if idx < len(reference) else None
        cand_line = candidate[idx].raw if idx < len(candidate) else None
        if ref_line != cand_line:
            return FirstDifference(line=idx + 1, reference=ref_line, candidate=cand_line)
    return None


def _coordinate_delta(left: ParsedLine, right: ParsedLine) -> Optional[float]:
    shared_axes = set(left.coords).intersection(right.coords)
    if not shared_axes:
        return None
    return max(abs(left.coords[axis] - right.coords[axis]) for axis in shared_axes)


def _max_line_coordinate_delta(reference: Sequence[ParsedLine], candidate: Sequence[ParsedLine]) -> Optional[float]:
    deltas = [
        delta
        for left, right in zip(reference, candidate)
        for delta in [_coordinate_delta(left, right)]
        if delta is not None
    ]
    return round(max(deltas), 4) if deltas else None


def _max_g1_sequence_delta(reference: Sequence[ParsedLine], candidate: Sequence[ParsedLine]) -> Optional[float]:
    ref_g1 = [line for line in reference if line.command == "G1" and "X" in line.coords and "Y" in line.coords]
    cand_g1 = [line for line in candidate if line.command == "G1" and "X" in line.coords and "Y" in line.coords]
    deltas = [
        math.hypot(left.coords["X"] - right.coords["X"], left.coords["Y"] - right.coords["Y"])
        for left, right in zip(ref_g1, cand_g1)
    ]
    return round(max(deltas), 4) if deltas else None


def compare_gcode(reference_text: str, candidate_text: str, tolerance: float = 0.0001) -> GCodeComparison:
    reference = parse_gcode(reference_text)
    candidate = parse_gcode(candidate_text)
    equal_lines = sum(1 for left, right in zip(reference, candidate) if left.raw == right.raw)
    return GCodeComparison(
        reference=metrics(reference, tolerance=tolerance),
        candidate=metrics(candidate, tolerance=tolerance),
        first_difference=_first_difference(reference, candidate),
        equal_line_count=equal_lines,
        max_line_coordinate_delta=_max_line_coordinate_delta(reference, candidate),
        max_g1_sequence_delta=_max_g1_sequence_delta(reference, candidate),
    )


def validate_comparison(
    comparison: GCodeComparison,
    *,
    max_g1_delta: Optional[float] = None,
    max_distance_delta: Optional[float] = None,
    require_same_counts: bool = False,
    require_clean_candidate: bool = False,
) -> List[str]:
    failures: List[str] = []

    if require_same_counts:
        if comparison.reference.line_count != comparison.candidate.line_count:
            failures.append(
                "line count differs: "
                f"reference {comparison.reference.line_count}, candidate {comparison.candidate.line_count}"
            )
        if comparison.reference.g1_count != comparison.candidate.g1_count:
            failures.append(
                "G1 count differs: "
                f"reference {comparison.reference.g1_count}, candidate {comparison.candidate.g1_count}"
            )
        if comparison.reference.command_counts != comparison.candidate.command_counts:
            failures.append(
                "command counts differ: "
                f"reference {comparison.reference.command_counts}, candidate {comparison.candidate.command_counts}"
            )

    if max_g1_delta is not None:
        delta = comparison.max_g1_sequence_delta
        if delta is None:
            failures.append("G1 sequence delta is unavailable")
        elif delta > max_g1_delta:
            failures.append(f"G1 sequence delta {delta:.4f} exceeds limit {max_g1_delta:.4f}")

    if max_distance_delta is not None:
        distance_delta = abs(comparison.candidate.xy_distance - comparison.reference.xy_distance)
        if distance_delta > max_distance_delta:
            failures.append(f"XY distance delta {distance_delta:.4f} exceeds limit {max_distance_delta:.4f}")

    if require_clean_candidate:
        if comparison.candidate.duplicate_g1_moves:
            failures.append(f"candidate has {comparison.candidate.duplicate_g1_moves} duplicate G1 moves")
        if comparison.candidate.mirror_errors:
            failures.append(f"candidate has {comparison.candidate.mirror_errors} mirror errors")

    return failures


def format_report(comparison: GCodeComparison) -> str:
    first = comparison.first_difference
    lines = [
        "G-Code comparison",
        "",
        f"Reference lines: {comparison.reference.line_count}",
        f"Candidate lines: {comparison.candidate.line_count}",
        f"Reference commands: {comparison.reference.command_counts}",
        f"Candidate commands: {comparison.candidate.command_counts}",
        f"Reference G1: {comparison.reference.g1_count}",
        f"Candidate G1: {comparison.candidate.g1_count}",
        f"Reference XY distance: {comparison.reference.xy_distance:.4f} mm",
        f"Candidate XY distance: {comparison.candidate.xy_distance:.4f} mm",
        f"Distance delta: {comparison.candidate.xy_distance - comparison.reference.xy_distance:.4f} mm",
        (
            "Reference range: "
            f"X {comparison.reference.min_x}..{comparison.reference.max_x}, "
            f"Y {comparison.reference.min_y}..{comparison.reference.max_y}"
        ),
        (
            "Candidate range: "
            f"X {comparison.candidate.min_x}..{comparison.candidate.max_x}, "
            f"Y {comparison.candidate.min_y}..{comparison.candidate.max_y}"
        ),
        f"Reference duplicate G1 moves: {comparison.reference.duplicate_g1_moves}",
        f"Candidate duplicate G1 moves: {comparison.candidate.duplicate_g1_moves}",
        f"Reference mirror errors: {comparison.reference.mirror_errors}",
        f"Candidate mirror errors: {comparison.candidate.mirror_errors}",
        f"Equal same-index lines: {comparison.equal_line_count}",
        f"Max same-line coordinate delta: {comparison.max_line_coordinate_delta}",
        f"Max G1 sequence delta: {comparison.max_g1_sequence_delta}",
    ]
    if first:
        lines.extend(
            [
                "",
                f"First difference at line {first.line}:",
                f"  reference: {first.reference}",
                f"  candidate: {first.candidate}",
            ]
        )
    else:
        lines.extend(["", "Files are text-identical."])
    return "\n".join(lines)


def _main() -> int:
    parser = argparse.ArgumentParser(description="Compare two hot-wire G-Code files.")
    parser.add_argument("reference", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--tolerance", type=float, default=0.0001)
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    parser.add_argument("--max-g1-delta", type=float, default=None, help="Fail if G1 sequence delta exceeds this value.")
    parser.add_argument(
        "--max-distance-delta",
        type=float,
        default=None,
        help="Fail if absolute XY distance delta exceeds this value.",
    )
    parser.add_argument("--require-same-counts", action="store_true", help="Fail when line/G1/command counts differ.")
    parser.add_argument(
        "--require-clean-candidate",
        action="store_true",
        help="Fail when candidate has duplicate G1 moves or mirrored-axis errors.",
    )
    args = parser.parse_args()

    comparison = compare_gcode(
        args.reference.read_text(encoding="utf-8"),
        args.candidate.read_text(encoding="utf-8"),
        tolerance=args.tolerance,
    )
    failures = validate_comparison(
        comparison,
        max_g1_delta=args.max_g1_delta,
        max_distance_delta=args.max_distance_delta,
        require_same_counts=args.require_same_counts,
        require_clean_candidate=args.require_clean_candidate,
    )
    if args.json:
        payload = asdict(comparison)
        payload["validation_failures"] = failures
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        print(format_report(comparison))
        if failures:
            print()
            print("Validation failures:")
            for failure in failures:
                print(f"- {failure}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(_main())
