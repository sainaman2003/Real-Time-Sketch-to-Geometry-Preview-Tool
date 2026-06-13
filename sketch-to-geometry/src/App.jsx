import React, { useState } from 'react';
import DrawingCanvas from './components/DrawingCanvas';
import './App.css';

function App() {
  const [strokes, setStrokes] = useState([]);
  const [recognizedShapes, setRecognizedShapes] = useState([]);
  const [undoStack, setUndoStack] = useState([]);

  const handleStrokeComplete = (strokeData, recognizedShape) => {
    // Add new stroke
    setStrokes((prevStrokes) => [...prevStrokes, strokeData]);

    // Add recognized shape if any
    if (recognizedShape) {
      setRecognizedShapes((prevShapes) => [...prevShapes, recognizedShape]);
    }

    // Reset undo stack when new stroke is added
    setUndoStack([]);

    // Log event for telemetry
    logEvent('stroke_created', {
      pointCount: strokeData.points.length,
      shapeRecognized: recognizedShape ? recognizedShape.type : 'none',
    });
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;

    const newStrokes = strokes.slice(0, -1);
    const newShapes = recognizedShapes.slice(0, -1);

    // Save current state to undo stack
    setUndoStack([...undoStack, { strokes, shapes: recognizedShapes }]);
    setStrokes(newStrokes);
    setRecognizedShapes(newShapes);

    logEvent('undo_action');
  };

  const handleRedo = () => {
    if (undoStack.length === 0) return;

    const lastState = undoStack[undoStack.length - 1];
    setStrokes(lastState.strokes);
    setRecognizedShapes(lastState.shapes);
    setUndoStack(undoStack.slice(0, -1));

    logEvent('redo_action');
  };

  const handleClear = () => {
    if (strokes.length === 0) return;

    setUndoStack([{ strokes, shapes: recognizedShapes }]);
    setStrokes([]);
    setRecognizedShapes([]);

    logEvent('canvas_cleared');
  };

  const logEvent = (eventName, data = {}) => {
    const event = {
      type: eventName,
      timestamp: Date.now(),
      ...data,
    };
    // In a real app, send this to telemetry
    console.log('Event:', event);
  };

  const shapeStats = recognizedShapes.reduce(
    (acc, shape) => {
      acc[shape.type] = (acc[shape.type] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Sketch to Geometry</h1>
          <p className="app-subtitle">Draw freehand strokes and watch them transform into clean geometry</p>
        </div>
      </header>

      <div className="app-container">
        <div className="canvas-wrapper">
          <DrawingCanvas
            onStrokeComplete={handleStrokeComplete}
            strokes={strokes}
            recognizedShapes={recognizedShapes}
          />
        </div>

        <aside className="sidebar">
          <div className="toolbar">
            <h2 className="toolbar-title">Tools</h2>
            <button
              className="toolbar-button primary"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              title="Undo last stroke (Ctrl+Z)"
            >
              <span className="button-icon">↶</span>
              <span className="button-text">Undo</span>
            </button>
            <button
              className="toolbar-button primary"
              onClick={handleRedo}
              disabled={undoStack.length === 0}
              title="Redo last action"
            >
              <span className="button-icon">↷</span>
              <span className="button-text">Redo</span>
            </button>
            <button
              className="toolbar-button danger"
              onClick={handleClear}
              disabled={strokes.length === 0}
              title="Clear entire canvas"
            >
              <span className="button-icon">🗑</span>
              <span className="button-text">Clear</span>
            </button>
          </div>

          <div className="status-section">
            <h3 className="section-title">Status</h3>
            <div className="status-item">
              <span className="status-label">Strokes:</span>
              <span className="status-value">{strokes.length}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Shapes Recognized:</span>
              <span className="status-value">{recognizedShapes.length}</span>
            </div>
          </div>

          {Object.keys(shapeStats).length > 0 && (
            <div className="shapes-section">
              <h3 className="section-title">Recognized Shapes</h3>
              {Object.entries(shapeStats).map(([shapeType, count]) => (
                <div key={shapeType} className="shape-badge">
                  <span className="shape-name">{shapeType}</span>
                  <span className="shape-count">{count}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
