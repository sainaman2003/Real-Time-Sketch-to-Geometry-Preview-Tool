/**
 * Shape Recognition Engine
 * Uses rule-based approach to identify shapes from stroke points
 */

// Distance between two points
const distance = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Calculate the average deviation from a line
const calculateLineDeviation = (points) => {
  if (points.length < 3) return 0;

  const start = points[0];
  const end = points[points.length - 1];
  const totalDist = distance(start, end);

  if (totalDist < 1) return Infinity; // Not a line

  let maxDeviation = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i];
    // Distance from point to line segment (perpendicular distance)
    const numerator = Math.abs(
      (end.y - start.y) * point.x - (end.x - start.x) * point.y + end.x * start.y - end.y * start.x
    );
    const denominator = Math.sqrt(
      Math.pow(end.y - start.y, 2) + Math.pow(end.x - start.x, 2)
    );
    const deviation = denominator !== 0 ? numerator / denominator : 0;
    maxDeviation = Math.max(maxDeviation, deviation);
  }

  return maxDeviation;
};

// Check if shape is closed (first and last points are close)
const isClosed = (points, threshold = 20) => {
  if (points.length < 3) return false;
  return distance(points[0], points[points.length - 1]) < threshold;
};

// Get bounding box
const getBoundingBox = (points) => {
  if (points.length === 0) return null;

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

// Recognize line
const recognizeLine = (points) => {
  if (points.length < 2) return null;

  const maxDeviation = calculateLineDeviation(points);
  const lineThreshold = 15; // pixels

  if (maxDeviation < lineThreshold) {
    const start = points[0];
    const end = points[points.length - 1];
    return {
      type: 'line',
      points: [start, end],
      deviation: maxDeviation,
    };
  }

  return null;
};

// Recognize circle
const recognizeCircle = (points) => {
  if (!isClosed(points)) return null;

  const bbox = getBoundingBox(points);
  if (!bbox) return null;

  const aspectRatio = bbox.width / (bbox.height + 0.1);
  const aspectThreshold = 0.7; // Should be between 0.7 and 1.3 for circle

  if (aspectRatio > 0.7 && aspectRatio < 1.3) {
    // Check radius consistency
    const radius = (bbox.width + bbox.height) / 4;
    const center = { x: bbox.centerX, y: bbox.centerY };

    let radiusVariance = 0;
    for (const point of points) {
      const r = distance(center, point);
      radiusVariance += Math.pow(r - radius, 2);
    }
    radiusVariance = Math.sqrt(radiusVariance / points.length);

    if (radiusVariance < radius * 0.2) {
      // Variance less than 20% of radius
      return {
        type: 'circle',
        center,
        radius,
        radiusVariance,
      };
    }
  }

  return null;
};

// Find corners in stroke (high curvature points)
const findCorners = (points, threshold = 0.6) => {
  const corners = [];
  if (points.length < 3) return corners;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (len1 > 0 && len2 > 0) {
      const dot = v1.x * v2.x + v1.y * v2.y;
      const cross = v1.x * v2.y - v1.y * v2.x;
      const angle = Math.atan2(cross, dot);
      const absCurvature = Math.abs(angle);

      if (absCurvature > threshold) {
        corners.push({ index: i, point: curr, curvature: absCurvature });
      }
    }
  }

  // Filter corners that are too close together
  const filteredCorners = [];
  const minDistance = 30;

  for (const corner of corners) {
    let isFarEnough = true;
    for (const existing of filteredCorners) {
      if (distance(corner.point, existing.point) < minDistance) {
        isFarEnough = false;
        break;
      }
    }
    if (isFarEnough) {
      filteredCorners.push(corner);
    }
  }

  return filteredCorners;
};

// Recognize rectangle
const recognizeRectangle = (points) => {
  if (!isClosed(points)) return null;

  const corners = findCorners(points, 0.5);

  if (corners.length === 4) {
    const bbox = getBoundingBox(points);
    const aspectRatio = bbox.width / bbox.height;

    // Rectangle should not be too close to square (unless intentionally drawn)
    if (aspectRatio > 0.5 && aspectRatio < 2) {
      return {
        type: 'rectangle',
        corners: corners.map((c) => c.point),
        bbox,
      };
    }
  }

  return null;
};

// Recognize polygon (3+ corners)
const recognizePolygon = (points) => {
  if (!isClosed(points)) return null;

  const corners = findCorners(points, 0.5);

  if (corners.length >= 3) {
    return {
      type: 'polygon',
      corners: corners.map((c) => c.point),
      cornerCount: corners.length,
    };
  }

  return null;
};

// Recognize arc
const recognizeArc = (points) => {
  if (isClosed(points)) return null;

  const bbox = getBoundingBox(points);
  if (!bbox) return null;

  const aspectRatio = bbox.width / (bbox.height + 0.1);

  // Arc should have aspect ratio between 0.3 and 3
  if (aspectRatio > 0.3 && aspectRatio < 3) {
    const curvature = calculateLineDeviation(points);
    const arcThreshold = 20; // pixels

    if (curvature > arcThreshold) {
      return {
        type: 'arc',
        bbox,
        curvature,
        points: points.slice(0, points.length), // Keep all points for rendering
      };
    }
  }

  return null;
};

// Main recognition function
export const recognizeShape = (points) => {
  if (points.length < 2) return null;

  // Try line first (open shape)
  if (!isClosed(points, 30)) {
    const line = recognizeLine(points);
    if (line) return line;

    const arc = recognizeArc(points);
    if (arc) return arc;

    return null;
  }

  // Closed shapes
  const circle = recognizeCircle(points);
  if (circle) return circle;

  const rectangle = recognizeRectangle(points);
  if (rectangle) return rectangle;

  const polygon = recognizePolygon(points);
  if (polygon) return polygon;

  return null;
};

export default {
  recognizeShape,
  distance,
  getBoundingBox,
  isClosed,
};
