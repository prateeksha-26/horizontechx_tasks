import { useRef, useEffect, useCallback } from 'react';

export function useWhiteboard(socket) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const colorRef = useRef('#ffffff');
  const sizeRef = useRef(3);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const drawLine = useCallback((from, to, color, size) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, []);

  const exportCanvas = useCallback(() => {
    return canvasRef.current?.toDataURL('image/png') || '';
  }, []);

  const importCanvas = useCallback((dataUrl) => {
    if (!dataUrl || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }, []);

  const startDraw = useCallback(
    (e) => {
      isDrawing.current = true;
      lastPos.current = getPos(e);
    },
    [getPos]
  );

  const draw = useCallback(
    (e) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const pos = getPos(e);
      drawLine(lastPos.current, pos, colorRef.current, sizeRef.current);
      lastPos.current = pos;
    },
    [getPos, drawLine]
  );

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const data = exportCanvas();
    socket?.emit('whiteboard-draw', { data });
  }, [socket, exportCanvas]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket?.emit('whiteboard-clear');
  }, [socket]);

  const setColor = useCallback((color) => {
    colorRef.current = color;
  }, []);

  const setSize = useCallback((size) => {
    sizeRef.current = size;
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onDraw = ({ data }) => importCanvas(data);
    const onClear = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    const onState = ({ data }) => importCanvas(data);
    const onSnapshot = ({ snapshot }) => importCanvas(snapshot);

    socket.on('whiteboard-draw', onDraw);
    socket.on('whiteboard-clear', onClear);
    socket.on('whiteboard-state', onState);
    socket.on('whiteboard-snapshot', onSnapshot);

    return () => {
      socket.off('whiteboard-draw', onDraw);
      socket.off('whiteboard-clear', onClear);
      socket.off('whiteboard-state', onState);
      socket.off('whiteboard-snapshot', onSnapshot);
    };
  }, [socket, importCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return {
    canvasRef,
    startDraw,
    draw,
    endDraw,
    clear,
    setColor,
    setSize,
  };
}
