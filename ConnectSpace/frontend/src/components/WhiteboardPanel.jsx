import { useState } from 'react';
import { useWhiteboard } from '../hooks/useWhiteboard';
import './WhiteboardPanel.css';

export default function WhiteboardPanel({ socket }) {
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState(3);
  const { canvasRef, startDraw, draw, endDraw, clear, setColor: setWbColor, setSize: setWbSize } =
    useWhiteboard(socket);

  function handleColorChange(e) {
    setColor(e.target.value);
    setWbColor(e.target.value);
  }

  function handleSizeChange(e) {
    const val = Number(e.target.value);
    setSize(val);
    setWbSize(val);
  }

  return (
    <div className="whiteboard-panel">
      <div className="whiteboard-toolbar">
        <input type="color" value={color} onChange={handleColorChange} title="Color" />
        <input
          type="range"
          min="1"
          max="20"
          value={size}
          onChange={handleSizeChange}
          title="Brush size"
        />
        <button className="btn-secondary btn-small" onClick={clear}>
          Clear
        </button>
      </div>
      <div className="whiteboard-canvas-wrap">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
    </div>
  );
}
