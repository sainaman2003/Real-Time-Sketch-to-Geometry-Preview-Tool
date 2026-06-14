import { useState } from 'react';
import DrawingCanvas from './components/DrawingCanvas';
import FloatingToolbar from './components/FloatingToolbar';
import './App.css';

function App() {
  const [strokes, setStrokes] = useState([]);
  const [recognizedShapes, setRecognizedShapes] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(4);

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
    console.log('Event:', event);
  };

  return (
    <div className="app">
      {/* Header overlay */}
      <div className="canvas-header">
        Sketch to Geometry
      </div>

      {/* Canvas */}
      <DrawingCanvas
        onStrokeComplete={handleStrokeComplete}
        strokes={strokes}
        recognizedShapes={recognizedShapes}
        currentTool={currentTool}
        currentColor={currentColor}
        currentWidth={currentWidth}
      />

      {/* Credit overlay */}
      <div className="canvas-credit">
        by Sai Naman
      </div>

      {/* Floating Toolbar */}
      <FloatingToolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={strokes.length > 0}
        canRedo={undoStack.length > 0}
        onToolChange={setCurrentTool}
        onColorChange={setCurrentColor}
        onWidthChange={setCurrentWidth}
        currentTool={currentTool}
        currentColor={currentColor}
        currentWidth={currentWidth}
      />
    </div>
  );
}

export default App;

