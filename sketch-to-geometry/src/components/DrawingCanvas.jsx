import React, { useRef, useEffect, useCallback } from 'react';
import { recognizeShape } from '../utils/shapeRecognition';
import './DrawingCanvas.css';

const DrawingCanvas = ({ onStrokeComplete, strokes, recognizedShapes, onStrokeDelete, onStrokeUpdate }) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef([]);
  const selectedStrokeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    redrawCanvas();
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [strokes, recognizedShapes]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes - semi-transparent
    ctx.strokeStyle = 'rgba(44, 62, 80, 0.3)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach((stroke, index) => {
      if (stroke.points.length < 2) return;

      // Highlight selected stroke
      if (selectedStrokeRef.current === index) {
        ctx.strokeStyle = 'rgba(44, 62, 80, 0.6)';
        ctx.lineWidth = 5;
      } else {
        ctx.strokeStyle = 'rgba(44, 62, 80, 0.3)';
        ctx.lineWidth = 4;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.stroke();
    });

    // Draw recognized shapes - black, solid
    drawShapesOverlay(ctx);
  }, [strokes, recognizedShapes]);

  const drawShapesOverlay = (ctx) => {
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
  };

  const handlePointerDown = (e) => {
    isDrawingRef.current = true;
    currentStrokeRef.current = [];
    selectedStrokeRef.current = null;

    const rect = canvasRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: Date.now(),
      pressure: e.pressure || 0.5,
    };

    currentStrokeRef.current.push(point);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: Date.now(),
      pressure: e.pressure || 0.5,
    };

    currentStrokeRef.current.push(point);

    // Draw the stroke in real-time
    drawStroke(point);
  };

  const drawStroke = (point) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (currentStrokeRef.current.length < 2) return;

    const prevPoint = currentStrokeRef.current[currentStrokeRef.current.length - 2];

    ctx.strokeStyle = 'rgba(44, 62, 80, 0.3)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;

    if (currentStrokeRef.current.length > 1) {
      const strokeData = {
        id: Date.now(),
        timestamp: Date.now(),
        points: currentStrokeRef.current,
      };

      // Recognize shape from the stroke
      const recognizedShape = recognizeShape(currentStrokeRef.current);

      onStrokeComplete(strokeData, recognizedShape);
    }

    currentStrokeRef.current = [];
  };

  return (
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      touch-action="none"
    />
  );
};

export default DrawingCanvas;

