import React, { useState, useRef } from 'react';
import './FloatingToolbar.css';

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Purple', value: '#6735b7' },
  { name: 'Red', value: '#d32f2f' },
  { name: 'Blue', value: '#1976d2' },
  { name: 'Green', value: '#388e3c' },
];

const FloatingToolbar = ({
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onWidthChange,
  currentTool,
  currentColor,
  currentWidth,
}) => {
  const [position, setPosition] = useState({ x: 16, y: window.innerHeight / 2 - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWidthSlider, setShowWidthSlider] = useState(false);
  const toolbarRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.toolbar-settings')) return;

    const rect = toolbarRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setPosition({
      x: Math.max(0, Math.min(newX, window.innerWidth - 80)),
      y: Math.max(0, Math.min(newY, window.innerHeight - 100)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleToolSelect = (tool) => {
    onToolChange(tool);
    setShowColorPicker(false);
    setShowWidthSlider(false);
  };

  return (
    <div
      ref={toolbarRef}
      className="floating-toolbar"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Main toolbar header */}
      <div className="toolbar-header">
        <div className="toolbar-label">Tools</div>
      </div>

      {/* Tool buttons */}
      <div className="toolbar-section">
        <div
          className={`toolbar-icon ${currentTool === 'pen' ? 'active' : ''}`}
          title="Pen"
          onClick={(e) => {
            e.stopPropagation();
            handleToolSelect('pen');
            setShowWidthSlider(!showWidthSlider);
          }}
        >
          ✏️
        </div>
        <div
          className={`toolbar-icon ${currentTool === 'eraser' ? 'active' : ''}`}
          title="Eraser"
          onClick={(e) => {
            e.stopPropagation();
            handleToolSelect('eraser');
            setShowWidthSlider(false);
          }}
        >
          ⌫
        </div>
      </div>

      {/* Width slider */}
      {showWidthSlider && currentTool === 'pen' && (
        <div className="toolbar-settings" onClick={(e) => e.stopPropagation()}>
          <div className="settings-label">Width: {currentWidth}px</div>
          <input
            type="range"
            min="1"
            max="20"
            value={currentWidth}
            onChange={(e) => onWidthChange(parseInt(e.target.value))}
            className="width-slider"
          />
        </div>
      )}

      {/* Color picker */}
      <div className="toolbar-section">
        <div
          className="color-preview"
          title="Colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(!showColorPicker);
          }}
          style={{ backgroundColor: currentColor }}
        />
      </div>

      {showColorPicker && (
        <div className="color-picker" onClick={(e) => e.stopPropagation()}>
          {COLORS.map((color) => (
            <div
              key={color.value}
              className={`color-option ${currentColor === color.value ? 'selected' : ''}`}
              style={{ backgroundColor: color.value }}
              title={color.name}
              onClick={(e) => {
                e.stopPropagation();
                onColorChange(color.value);
                setShowColorPicker(false);
              }}
            />
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="toolbar-divider"></div>

      {/* Action buttons */}
      <div className="toolbar-section">
        <div
          className="toolbar-icon"
          title="Undo"
          onClick={(e) => {
            e.stopPropagation();
            onUndo();
          }}
          style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
        >
          ↶
        </div>
        <div
          className="toolbar-icon"
          title="Redo"
          onClick={(e) => {
            e.stopPropagation();
            onRedo();
          }}
          style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed' }}
        >
          ↷
        </div>
        <div
          className="toolbar-icon danger"
          title="Clear"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          🗑
        </div>
      </div>
    </div>
  );
};

export default FloatingToolbar;

