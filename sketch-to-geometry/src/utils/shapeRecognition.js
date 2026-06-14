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

const calculateSegmentDeviation = (points, startIndex, endIndex) => {
  if (endIndex - startIndex < 2) return 0;

  const start = points[startIndex];
  const end = points[endIndex];
  const totalDist = distance(start, end);

  if (totalDist < 1) return Infinity;

  let maxDeviation = 0;

  for (let i = startIndex + 1; i < endIndex; i++) {
    const point = points[i];
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

const perpendicularDistance = (point, lineStart, lineEnd) => {
  const segmentLength = distance(lineStart, lineEnd);

  if (segmentLength < 1) return distance(point, lineStart);

  return Math.abs(
    (lineEnd.y - lineStart.y) * point.x -
      (lineEnd.x - lineStart.x) * point.y +
      lineEnd.x * lineStart.y -
      lineEnd.y * lineStart.x
  ) / segmentLength;
};

const simplifyStroke = (points, tolerance) => {
  if (points.length <= 2) return points.map((point, index) => ({ point, index }));

  let maxDistance = 0;
  let splitIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const deviation = perpendicularDistance(points[i], start, end);
    if (deviation > maxDistance) {
      maxDistance = deviation;
      splitIndex = i;
    }
  }

  if (maxDistance <= tolerance) {
    return [
      { point: start, index: 0 },
      { point: end, index: points.length - 1 },
    ];
  }

  const left = simplifyStroke(points.slice(0, splitIndex + 1), tolerance);
  const right = simplifyStroke(points.slice(splitIndex), tolerance);
  const adjustedRight = right.map((item) => ({
    point: item.point,
    index: item.index + splitIndex,
  }));

  return left.slice(0, -1).concat(adjustedRight);
};

const getTurnAngle = (prev, curr, next) => {
  const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
  const v2 = { x: next.x - curr.x, y: next.y - curr.y };
  const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (len1 < 1 || len2 < 1) return 0;

  const dot = v1.x * v2.x + v1.y * v2.y;
  return Math.acos(Math.max(-1, Math.min(1, dot / (len1 * len2))));
};

// Check if shape is closed (first and last points are close)
const isClosed = (points, threshold = 20) => {
  if (points.length < 3) return false;
  return distance(points[0], points[points.length - 1]) < threshold;
};

// Check if shape is nearly closed (for incomplete rectangles/shapes)
const isNearlyClosed = (points, threshold = 50) => {
  if (points.length < 4) return false;
  const closureDistance = distance(points[0], points[points.length - 1]);
  const bbox = getBoundingBox(points);
  const diagonalDistance = distance(
    { x: bbox.minX, y: bbox.minY },
    { x: bbox.maxX, y: bbox.maxY }
  );
  // Consider it nearly closed if closure distance is less than 25% of diagonal
  return closureDistance < Math.max(threshold, diagonalDistance * 0.25);
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
  const totalLength = distance(points[0], points[points.length - 1]);
  
  // Line threshold based on total length (more lenient for longer lines)
  const lineThreshold = Math.max(15, totalLength * 0.08);

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

// Recognize open strokes made from connected straight segments, such as L shapes
const recognizePolyline = (points) => {
  if (points.length < 6 || isClosed(points, 40) || isNearlyClosed(points)) return null;

  const bbox = getBoundingBox(points);
  if (!bbox) return null;

  const diagonal = distance(
    { x: bbox.minX, y: bbox.minY },
    { x: bbox.maxX, y: bbox.maxY }
  );
  const tolerance = Math.max(12, diagonal * 0.04);
  const simplified = simplifyStroke(points, tolerance);

  if (simplified.length < 3 || simplified.length > 6) return null;

  const minSegmentLength = Math.max(24, diagonal * 0.12);
  const segmentDeviationLimit = Math.max(16, diagonal * 0.06);
  let hasMajorTurn = false;

  for (let i = 1; i < simplified.length; i++) {
    const segmentLength = distance(simplified[i - 1].point, simplified[i].point);
    if (segmentLength < minSegmentLength) return null;

    const deviation = calculateSegmentDeviation(points, simplified[i - 1].index, simplified[i].index);
    if (deviation > segmentDeviationLimit) return null;
  }

  for (let i = 1; i < simplified.length - 1; i++) {
    const angle = getTurnAngle(
      simplified[i - 1].point,
      simplified[i].point,
      simplified[i + 1].point
    );

    if (angle > Math.PI / 4) {
      hasMajorTurn = true;
      break;
    }
  }

  if (!hasMajorTurn) return null;

  return {
    type: 'polyline',
    points: simplified.map((item) => item.point),
    segmentCount: simplified.length - 1,
  };
};

// Recognize circle
const recognizeCircle = (points) => {
  if (!isClosed(points) && !isNearlyClosed(points)) return null;

  const bbox = getBoundingBox(points);
  if (!bbox) return null;

  const aspectRatio = bbox.width / (bbox.height + 0.1);

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

  // For nearly-closed shapes, also check the connection between end and start
  const extendedPoints = points;
  
  for (let i = 1; i < extendedPoints.length - 1; i++) {
    const prev = extendedPoints[i - 1];
    const curr = extendedPoints[i];
    const next = extendedPoints[i + 1];

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

  // Also check corners at stroke boundaries for nearly-closed shapes
  if (isNearlyClosed(points)) {
    // Check if start/end point is a corner
    if (extendedPoints.length >= 3) {
      const start = extendedPoints[0];
      const second = extendedPoints[1];
      const end = extendedPoints[extendedPoints.length - 1];

      // Check start point
      const v1start = { x: second.x - start.x, y: second.y - start.y };
      const v2start = { x: end.x - start.x, y: end.y - start.y };
      const len1start = Math.sqrt(v1start.x * v1start.x + v1start.y * v1start.y);
      const len2start = Math.sqrt(v2start.x * v2start.x + v2start.y * v2start.y);
      
      if (len1start > 0 && len2start > 0) {
        const dotStart = v1start.x * v2start.x + v1start.y * v2start.y;
        const crossStart = v1start.x * v2start.y - v1start.y * v2start.x;
        const angleStart = Math.atan2(crossStart, dotStart);
        const curvatureStart = Math.abs(angleStart);
        
        if (curvatureStart > threshold) {
          // Check if not too close to other corners
          let farFromOthers = true;
          for (const c of corners) {
            if (distance(start, c.point) < 30) {
              farFromOthers = false;
              break;
            }
          }
          if (farFromOthers) {
            corners.push({ index: 0, point: start, curvature: curvatureStart });
          }
        }
      }
    }
  }

  // Filter corners that are too close together (keep the sharper one)
  const filteredCorners = [];
  const minDistance = 25; // Reduced from 30 for better detection

  for (const corner of corners) {
    let isFarEnough = true;
    let indexToRemove = -1;
    
    for (let j = 0; j < filteredCorners.length; j++) {
      const existing = filteredCorners[j];
      if (distance(corner.point, existing.point) < minDistance) {
        isFarEnough = false;
        // Keep the corner with higher curvature
        if (corner.curvature > existing.curvature) {
          indexToRemove = j;
          isFarEnough = true; // Mark for replacement
        }
        break;
      }
    }
    
    if (indexToRemove >= 0) {
      filteredCorners.splice(indexToRemove, 1);
      filteredCorners.push(corner);
    } else if (isFarEnough) {
      filteredCorners.push(corner);
    }
  }

  return filteredCorners;
};

// Recognize rectangle
const recognizeRectangle = (points) => {
  // Accept both closed and nearly-closed shapes
  if (!isClosed(points) && !isNearlyClosed(points)) return null;

  const corners = findCorners(points, 0.45); // Slightly lower threshold for better detection

  // Must have 3 or 4 corners for rectangle (3 corners suggests missing closure corner)
  if (corners.length >= 3 && corners.length <= 4) {
    const bbox = getBoundingBox(points);
    const aspectRatio = bbox.width / (bbox.height + 0.1);

    // Accept rectangles and squares (0.4 to 2.5 ratio to be more lenient)
    if (aspectRatio > 0.4 && aspectRatio < 2.5) {
      const cornerPoints = corners.map((c) => c.point);
      const angles = [];
      
      // Calculate angles between corners
      for (let i = 0; i < cornerPoints.length; i++) {
        const prev = cornerPoints[(i - 1 + cornerPoints.length) % cornerPoints.length];
        const curr = cornerPoints[i];
        const next = cornerPoints[(i + 1) % cornerPoints.length];

        const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
        const v2 = { x: next.x - curr.x, y: next.y - curr.y };

        const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        if (len1 > 0 && len2 > 0) {
          const dot = v1.x * v2.x + v1.y * v2.y;
          const angle = Math.acos(Math.max(-1, Math.min(1, dot / (len1 * len2))));
          angles.push(angle);
        }
      }

      // Check if most angles are close to 90 degrees (π/2)
      // More lenient: allow angles between 70 and 110 degrees
      const validAngles = angles.filter((a) => Math.abs(a - Math.PI / 2) < 0.5);
      
      if (validAngles.length >= cornerPoints.length - 1) {
        return {
          type: 'rectangle',
          corners: cornerPoints,
          bbox,
        };
      }
    }
  }

  return null;
};

// Recognize polygon (3+ corners)
const recognizePolygon = (points) => {
  // Accept both closed and nearly-closed shapes
  if (!isClosed(points) && !isNearlyClosed(points)) return null;

  const corners = findCorners(points, 0.45);

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

  const totalLength = distance(points[0], points[points.length - 1]);
  const pathLength = points.reduce((sum, point, i) => {
    if (i === 0) return sum;
    return sum + distance(points[i - 1], point);
  }, 0);

  // Arc should have significant path length relative to straight line distance
  const arcFactor = pathLength / (totalLength + 0.1);

  // Arc: path is significantly longer than straight distance
  // Aspect ratio should suggest curvature
  // Arc factor should be > 1.2
  if (arcFactor > 1.2 && arcFactor < 3) {
    const curvature = calculateLineDeviation(points);
    const arcThreshold = 20; // pixels

    if (curvature > arcThreshold) {
      return {
        type: 'arc',
        bbox,
        curvature,
        arcFactor,
        points: points.slice(0, points.length),
      };
    }
  }

  return null;
};

// Main recognition function
export const recognizeShape = (points) => {
  if (points.length < 2) return null;

  // Try line first (open shape) - most common
  // Use a slightly larger threshold for open shape detection
  if (!isClosed(points, 40) && !isNearlyClosed(points)) {
    const line = recognizeLine(points);
    if (line) return line;

    const polyline = recognizePolyline(points);
    if (polyline) return polyline;

    // Only try arc if not a line
    const arc = recognizeArc(points);
    if (arc) return arc;

    return null;
  }

  // Closed or nearly-closed shapes - try in order of specificity
  const rectangle = recognizeRectangle(points);
  if (rectangle) return rectangle;

  const circle = recognizeCircle(points);
  if (circle) return circle;

  const polygon = recognizePolygon(points);
  if (polygon) return polygon;

  return null;
};

export default {
  recognizeShape,
  distance,
  getBoundingBox,
  isClosed,
  isNearlyClosed,
};
