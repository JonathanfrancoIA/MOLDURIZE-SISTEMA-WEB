"""Tests for G-Code comparison helpers."""

from gcode_compare import compare_gcode, validate_comparison


def test_compare_gcode_detects_identical_files():
    gcode = "\n".join(
        [
            "G21",
            "G17",
            "G90",
            "F800.0000",
            "M3",
            "G1X0.0000Y0.0000Z0.0000A0.0000F800.0000",
            "G1X10.0000Y0.0000Z10.0000A0.0000",
            "M5",
        ]
    )

    comparison = compare_gcode(gcode, gcode)

    assert comparison.first_difference is None
    assert comparison.reference.g1_count == 2
    assert comparison.candidate.xy_distance == 10.0
    assert comparison.candidate.duplicate_g1_moves == 0
    assert comparison.candidate.mirror_errors == 0


def test_compare_gcode_reports_first_difference_and_validation_errors():
    reference = "\n".join(
        [
            "G21",
            "G1X0.0000Y0.0000Z0.0000A0.0000F800.0000",
            "G1X10.0000Y0.0000Z10.0000A0.0000",
            "M5",
        ]
    )
    candidate = "\n".join(
        [
            "G21",
            "G1X0.0000Y0.0000Z0.0000A0.0000F800.0000",
            "G1X0.0000Y0.0000Z0.0000A0.0000",
            "G1X10.0000Y0.0000Z11.0000A0.0000",
            "M5",
        ]
    )

    comparison = compare_gcode(reference, candidate)

    assert comparison.first_difference is not None
    assert comparison.first_difference.line == 3
    assert comparison.candidate.duplicate_g1_moves == 1
    assert comparison.candidate.mirror_errors == 1
    assert comparison.candidate.g1_count == 3


def test_validate_comparison_enforces_regression_limits():
    reference = "\n".join(
        [
            "G21",
            "G1X0.0000Y0.0000Z0.0000A0.0000F800.0000",
            "G1X10.0000Y0.0000Z10.0000A0.0000",
            "M5",
        ]
    )
    candidate = "\n".join(
        [
            "G21",
            "G1X0.0000Y0.0000Z0.0000A0.0000F800.0000",
            "G1X12.0000Y0.0000Z12.0000A0.0000",
            "M5",
        ]
    )

    comparison = compare_gcode(reference, candidate)

    failures = validate_comparison(
        comparison,
        max_g1_delta=0.0001,
        max_distance_delta=0.01,
        require_same_counts=True,
        require_clean_candidate=True,
    )

    assert len(failures) == 2
    assert any("G1 sequence delta" in failure for failure in failures)
    assert any("XY distance delta" in failure for failure in failures)
