import { useRef, useEffect, useCallback } from 'react';
import { recognizeShape } from '../utils/shapeRecognition';
import './DrawingCanvas.css';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
};

const DrawingCanvas = ({
  onStrokeComplete,
  strokes,
  recognizedShapes,
  currentTool,
  currentColor,
  currentWidth,
}) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef([]);
  const selectedStrokeRef = useRef(null);
  const nextStrokeIdRef = useRef(1);
  const activePointerIdRef = useRef(null);
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  const getCanvasPoint = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: e.timeStamp,
      pressure: e.pressure || 0.5,
    };
  }, []);

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    canvasSizeRef.current = { width, height, dpr };

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }, []);

  const drawShapesOverlay = useCallback((ctx) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';

    recognizedShapes.forEach((shape) => {
      if (!shape.type) return;

      switch (shape.type) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          ctx.lineTo(shape.points[1].x, shape.points[1].y);
          ctx.stroke();
          break;

        case 'polyline':
          if (shape.points && shape.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
              ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'circle':
          ctx.beginPath();
          ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'rectangle':
          if (shape.bbox) {
            ctx.fillRect(shape.bbox.minX, shape.bbox.minY, shape.bbox.width, shape.bbox.height);
            ctx.strokeRect(shape.bbox.minX, shape.bbox.minY, shape.bbox.width, shape.bbox.height);
          }
          break;

        case 'polygon':
          if (shape.corners && shape.corners.length > 0) {
            ctx.beginPath();
            ctx.moveTo(shape.corners[0].x, shape.corners[0].y);
            for (let i = 1; i < shape.corners.length; i++) {
              ctx.lineTo(shape.corners[i].x, shape.corners[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          break;

        case 'arc':
          if (shape.points && shape.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
              ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.stroke();
          }
          break;

        default:
          break;
      }
    });
  }, [recognizedShapes]);

  const redrawCanvas = useCallback(() => {
    const ctx = prepareCanvas();
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSizeRef.current.width, canvasSizeRef.current.height);

    // Draw all strokes
    strokes.forEach((stroke, index) => {
      if (stroke.points.length < 2) return;

      // Highlight selected stroke
      if (selectedStrokeRef.current === index) {
        ctx.strokeStyle = 'rgba(44, 62, 80, 0.6)';
        ctx.lineWidth = stroke.width + 2;
      } else {
        ctx.strokeStyle = `rgba(${hexToRgb(stroke.color).join(',')}, 0.3)`;
        ctx.lineWidth = stroke.width;
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.stroke();
    });

    // Draw recognized shapes - black, solid
    drawShapesOverlay(ctx);
  }, [drawShapesOverlay, prepareCanvas, strokes]);

  useEffect(() => {
    redrawCanvas();

    const resizeObserver = new ResizeObserver(() => {
      redrawCanvas();
    });

    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [redrawCanvas]);

  const handlePointerDown = (e) => {
    if (!e.isPrimary || (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId)) {
      return;
    }

    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    isDrawingRef.current = true;
    currentStrokeRef.current = [];
    selectedStrokeRef.current = null;

    currentStrokeRef.current.push(getCanvasPoint(e));
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || e.pointerId !== activePointerIdRef.current) return;

    e.preventDefault();
    const point = getCanvasPoint(e);

    currentStrokeRef.current.push(point);

    // Draw the stroke in real-time
    drawStroke(point);
  };

  const drawStroke = (point) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(canvasSizeRef.current.dpr, 0, 0, canvasSizeRef.current.dpr, 0, 0);

    if (currentStrokeRef.current.length < 2) return;

    const prevPoint = currentStrokeRef.current[currentStrokeRef.current.length - 2];

    if (currentTool === 'eraser') {
      ctx.clearRect(point.x - currentWidth / 2, point.y - currentWidth / 2, currentWidth, currentWidth);
    } else {
      ctx.strokeStyle = `rgba(${hexToRgb(currentColor).join(',')}, 0.3)`;
      ctx.lineWidth = currentWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current || e.pointerId !== activePointerIdRef.current) return;

    e.preventDefault();
    if (canvasRef.current.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }

    isDrawingRef.current = false;
    activePointerIdRef.current = null;

    if (currentTool === 'eraser') {
      // Eraser mode - no stroke to save
      currentStrokeRef.current = [];
      return;
    }

    if (currentStrokeRef.current.length > 1) {
      const completedAt = currentStrokeRef.current[currentStrokeRef.current.length - 1].time;
      const strokeData = {
        id: nextStrokeIdRef.current,
        timestamp: completedAt,
        points: currentStrokeRef.current,
        color: currentColor,
        width: currentWidth,
      };
      nextStrokeIdRef.current += 1;

      // Recognize shape from the stroke
      const recognizedShape = recognizeShape(currentStrokeRef.current);

      onStrokeComplete(strokeData, recognizedShape);
    }

    currentStrokeRef.current = [];
  };

  const handlePointerCancel = (e) => {
    if (e.pointerId !== activePointerIdRef.current) return;

    if (canvasRef.current.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }

    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    currentStrokeRef.current = [];
    redrawCanvas();
  };

  return (
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ touchAction: 'none' }}
    />
  );
};

export default DrawingCanvas;


