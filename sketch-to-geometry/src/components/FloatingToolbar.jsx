import React, { useState, useRef } from 'react';
import './FloatingToolbar.css';

const FloatingToolbar = ({ onUndo, onRedo, onClear, canUndo, canRedo }) => {
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    
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
      y: Math.max(0, Math.min(newY, window.innerHeight - 60)),
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
      <div className="toolbar-icon" title="Undo" onClick={(e) => { e.stopPropagation(); onUndo(); }} disabled={!canUndo}>
        ↶
      </div>
      <div className="toolbar-icon" title="Redo" onClick={(e) => { e.stopPropagation(); onRedo(); }} disabled={!canRedo}>
        ↷
      </div>
      <div className="toolbar-divider"></div>
      <div className="toolbar-icon danger" title="Clear" onClick={(e) => { e.stopPropagation(); onClear(); }}>
        🗑
      </div>
    </div>
  );
};

export default FloatingToolbar;
