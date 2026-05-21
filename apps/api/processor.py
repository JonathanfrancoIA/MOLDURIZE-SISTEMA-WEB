"""MOLDURIZE data processor for manual input, DXF and image contours."""

import math

from shapely.geometry import Polygon, box


class DataProcessor:
    """Processes geometry input for the nesting engine."""

    @staticmethod
    def create_rectangle(width, height):
        return box(0, 0, width, height)

    @staticmethod
    def _interpolate_arc(p1, p2, bulge, num_segments=16):
        """Interpolate DXF LWPOLYLINE bulge arcs into points."""
        if abs(bulge) < 1e-6:
            return []

        arc_angle = 4.0 * math.atan(abs(bulge))
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        chord = math.hypot(dx, dy)
        if chord < 1e-6:
            return []

        radius = chord / (2.0 * math.sin(arc_angle / 2.0))
        mid_x = (p1[0] + p2[0]) / 2.0
        mid_y = (p1[1] + p2[1]) / 2.0
        perp_x = -dy / chord
        perp_y = dx / chord
        sagitta = radius * (1.0 - math.cos(arc_angle / 2.0))
        center_dist = radius - sagitta
        sign = 1.0 if bulge > 0 else -1.0
        center_x = mid_x + sign * center_dist * perp_x
        center_y = mid_y + sign * center_dist * perp_y

        start_angle = math.atan2(p1[1] - center_y, p1[0] - center_x)
        end_angle = math.atan2(p2[1] - center_y, p2[0] - center_x)
        if bulge > 0 and end_angle <= start_angle:
            end_angle += 2.0 * math.pi
        elif bulge < 0 and end_angle >= start_angle:
            end_angle -= 2.0 * math.pi

        points = []
        for idx in range(1, num_segments):
            t = idx / float(num_segments)
            angle = start_angle + t * (end_angle - start_angle)
            points.append((center_x + radius * math.cos(angle), center_y + radius * math.sin(angle)))
        return points

    @staticmethod
    def _circle_to_polygon(cx, cy, radius, num_segments=48):
        points = []
        for idx in range(num_segments):
            angle = 2.0 * math.pi * idx / num_segments
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
        return Polygon(points)

    @staticmethod
    def _add_valid_polygon(polygons_with_labels, points, label=""):
        if len(points) < 3:
            return
        poly = Polygon(points)
        if poly.is_valid and poly.area > 0:
            polygons_with_labels.append((poly, label))
            return
        fixed = poly.buffer(0)
        if fixed.is_valid and fixed.area > 0:
            polygons_with_labels.append((fixed, label))

    @staticmethod
    def parse_dxf(filepath):
        """Read closed cuttable geometries from a DXF file.

        Returns:
            List of (Polygon, label) tuples where label is the DXF layer name
            (empty string when the layer is the default "0" layer).
        """
        try:
            import ezdxf
        except ImportError:
            raise ImportError("Biblioteca ezdxf nao instalada. Execute: pip install ezdxf")

        doc = ezdxf.readfile(filepath)
        msp = doc.modelspace()
        polygons_with_labels = []

        for entity in msp.query("LWPOLYLINE"):
            if not entity.closed:
                continue
            layer = entity.dxf.layer if entity.dxf.layer != "0" else ""
            raw_points = list(entity.get_points())
            points = []
            for idx, pt in enumerate(raw_points):
                x, y = float(pt[0]), float(pt[1])
                bulge = float(pt[4]) if len(pt) > 4 else 0.0
                points.append((x, y))
                if abs(bulge) > 1e-6:
                    next_pt = raw_points[(idx + 1) % len(raw_points)]
                    next_point = (float(next_pt[0]), float(next_pt[1]))
                    points.extend(DataProcessor._interpolate_arc((x, y), next_point, bulge))
            DataProcessor._add_valid_polygon(polygons_with_labels, points, label=layer)

        for entity in msp.query("POLYLINE"):
            if entity.is_closed:
                layer = entity.dxf.layer if entity.dxf.layer != "0" else ""
                points = [(v.dxf.location.x, v.dxf.location.y) for v in entity.vertices]
                DataProcessor._add_valid_polygon(polygons_with_labels, points, label=layer)

        for entity in msp.query("CIRCLE"):
            radius = float(entity.dxf.radius)
            if radius > 0:
                layer = entity.dxf.layer if entity.dxf.layer != "0" else ""
                polygons_with_labels.append((
                    DataProcessor._circle_to_polygon(
                        entity.dxf.center.x,
                        entity.dxf.center.y,
                        radius,
                    ),
                    layer,
                ))

        if not polygons_with_labels:
            lines = list(msp.query("LINE"))
            points = [(line.dxf.start.x, line.dxf.start.y) for line in lines]
            DataProcessor._add_valid_polygon(polygons_with_labels, points, label="")

        return polygons_with_labels

    @staticmethod
    def get_dxf_unit(filepath) -> str:
        """Detect unit from DXF INSUNITS header. Returns 'mm', 'inch', or 'unknown'."""
        try:
            import ezdxf
            doc = ezdxf.readfile(filepath)
            insunits = doc.header.get("$INSUNITS", 0)
            if insunits == 4:
                return "mm"
            elif insunits == 1:
                return "inch"
            else:
                return "unknown"
        except Exception:
            return "unknown"

    @staticmethod
    def parse_image(image_path, calibration_mm=100.0):
        """Extract a polygon contour from an image using OpenCV."""
        try:
            import cv2
            import imutils
        except ImportError:
            raise ImportError("OpenCV/imutils nao instalados. Execute: pip install opencv-python imutils")

        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Nao foi possivel ler a imagem: {image_path}")

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        contours = cv2.findContours(edges.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = imutils.grab_contours(contours)
        if not contours:
            return None

        contour = max(contours, key=cv2.contourArea)
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        points = [(point[0][0], point[0][1]) for point in approx]
        if len(points) < 3:
            return None

        poly = Polygon(points)
        if not poly.is_valid or poly.area == 0:
            return None

        minx, _, maxx, _ = poly.bounds
        width_px = maxx - minx
        if width_px == 0:
            return None

        scale = calibration_mm / width_px
        scaled_points = [((x - minx) * scale, y * scale) for x, y in points]
        return Polygon(scaled_points)
