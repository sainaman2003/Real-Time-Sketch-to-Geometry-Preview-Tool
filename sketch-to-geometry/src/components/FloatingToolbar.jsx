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
  const [position, setPosition] = useState({ x: 16, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showPenSettings, setShowPenSettings] = useState(false);
  const [showEraserSettings, setShowEraserSettings] = useState(false);
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
      x: Math.max(0, Math.min(newX, window.innerWidth - 60)),
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

  const handlePenClick = (e) => {
    e.stopPropagation();
    if (currentTool === 'pen' && showPenSettings) {
      setShowPenSettings(false);
    } else {
      onToolChange('pen');
      setShowPenSettings(true);
      setShowEraserSettings(false);
    }
  };

  const handleEraserClick = (e) => {
    e.stopPropagation();
    if (currentTool === 'eraser' && showEraserSettings) {
      setShowEraserSettings(false);
    } else {
      onToolChange('eraser');
      setShowEraserSettings(true);
      setShowPenSettings(false);
    }
  };

  const handleColorSelect = (color) => {
    onColorChange(color);
    setShowPenSettings(false);
  };

  const handleWidthChange = (width) => {
    onWidthChange(width);
  };

  const handleEraserWidthChange = (width) => {
    onWidthChange(width);
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
      {/* Tool buttons */}
      <div className="toolbar-section">
        <div
          className={`toolbar-icon ${currentTool === 'pen' ? 'active' : ''}`}
          title="Pen Tool"
          onClick={handlePenClick}
        >
          🖊️
        </div>
        <div
          className={`toolbar-icon ${currentTool === 'eraser' ? 'active' : ''}`}
          title="Eraser Tool"
          onClick={handleEraserClick}
        >
          🧹
        </div>
      </div>

      {/* Pen settings - shows only when pen is selected */}
      {showPenSettings && currentTool === 'pen' && (
        <div className="toolbar-settings" onClick={(e) => e.stopPropagation()}>
          <div className="settings-section">
            <div className="settings-label">Width</div>
            <input
              type="range"
              min="1"
              max="20"
              value={currentWidth}
              onChange={(e) => handleWidthChange(parseInt(e.target.value))}
              className="width-slider"
            />
            <div className="settings-value">{currentWidth}px</div>
          </div>

          <div className="settings-divider"></div>

          <div className="settings-section">
            <div className="settings-label">Color</div>
            <div className="color-grid">
              {COLORS.map((color) => (
                <div
                  key={color.value}
                  className={`color-swatch ${currentColor === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorSelect(color.value);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Eraser settings - shows only when eraser is selected */}
      {showEraserSettings && currentTool === 'eraser' && (
        <div className="toolbar-settings" onClick={(e) => e.stopPropagation()}>
          <div className="settings-section">
            <div className="settings-label">Size</div>
            <input
              type="range"
              min="1"
              max="30"
              value={currentWidth}
              onChange={(e) => handleEraserWidthChange(parseInt(e.target.value))}
              className="width-slider"
            />
            <div className="settings-value">{currentWidth}px</div>
          </div>
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


