import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import useImage from 'use-image';
import { ZoomIn, ZoomOut, Trash2 } from 'lucide-react';

interface InpaintingCanvasProps {
  imagePreview: string;
  activeColor: string;
  brushSize: number;
  tool: 'brush' | 'eraser' | 'pan';
  onMasksChange: (masks: { [color: string]: string }) => void;
}

export const COLORS = [
  { id: 'red', hex: '#ef4444', label: 'Rouge' },
  { id: 'blue', hex: '#3b82f6', label: 'Bleu' },
  { id: 'green', hex: '#22c55e', label: 'Vert' },
  { id: 'yellow', hex: '#eab308', label: 'Jaune' },
  { id: 'purple', hex: '#a855f7', label: 'Violet' },
];

interface DrawingLine {
  tool: string;
  points: number[];
  color: string;
  brushSize: number;
}

const InpaintingCanvas: React.FC<InpaintingCanvasProps> = ({
  imagePreview,
  activeColor,
  brushSize,
  tool,
  onMasksChange,
}) => {
  const [image] = useImage(imagePreview);
  const [lines, setLines] = useState<DrawingLine[]>([]);
  
  // Responsive Scale & Layout
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const isDrawing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  // 1. Responsive Fit Logic
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && image) {
        const cw = containerRef.current.offsetWidth;
        const ch = containerRef.current.offsetHeight;
        setContainerSize({ width: cw, height: ch });

        // Calculate 'contain' scale
        const scaleW = cw / image.width;
        const scaleH = ch / image.height;
        const newScale = Math.min(scaleW, scaleH, 1) * 0.95; // 0.95 for padding

        setScale(newScale);
        
        // Center image
        setPosition({
          x: (cw - image.width * newScale) / 2,
          y: (ch - image.height * newScale) / 2,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [image]);


  // 2. Interaction Handlers
  const handleMouseDown = (e: any) => {
    if (tool === 'pan') return;
    isDrawing.current = true;
    
    // Get pointer position relative to the Stage (TopLeft = 0,0)
    // We need to convert this to Image Space coordinates
    const stage = e.target.getStage();
    const ptr = stage.getPointerPosition();
    
    // Transform Screen -> Image Space
    // Formula: (ScreenCoord - ImageOffset) / Scale
    const imageX = (ptr.x - position.x) / scale;
    const imageY = (ptr.y - position.y) / scale;

    setLines([...lines, { 
        tool, 
        points: [imageX, imageY], 
        color: activeColor, 
        brushSize: brushSize / scale // Adjust brush size to visual scale
    }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || tool === 'pan') return;
    const stage = e.target.getStage();
    const ptr = stage.getPointerPosition();
    
    const imageX = (ptr.x - position.x) / scale;
    const imageY = (ptr.y - position.y) / scale;

    const lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([imageX, imageY]);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    generateMasks();
  };

  const generateMasks = () => {
    if (!image) return;

    const masks: { [color: string]: string } = {};

    COLORS.forEach((color) => {
      // Create offscreen canvas at full image resolution
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      // Fill Black
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      lines
        .filter((l) => l.color === color.hex)
        .forEach((line) => {
          ctx.beginPath();
          // We stored points in Image Space, so we can draw directly
          ctx.lineWidth = line.brushSize * scale; // Wait, brushSize stored was (ScreenBrush / scale). So stored * scale = ScreenBrush.
          // Actually we want to draw on the mask with a size relative to the image.
          // If I used a 50px brush on screen, I want the mask line to be 50px * (1/scale) wide on the image.
          // In handleMouseDown we did: brushSize: brushSize / scale.
          // So line.brushSize is already in Image Space pixels.
          ctx.lineWidth = line.brushSize;

          if (line.tool === 'eraser') {
             ctx.strokeStyle = 'black';
             ctx.globalCompositeOperation = 'source-over';
          } else {
             ctx.strokeStyle = 'white';
             ctx.globalCompositeOperation = 'source-over';
          }

          line.points.forEach((p, i) => {
            if (i % 2 === 0) {
              if (i === 0) ctx.moveTo(p, line.points[i + 1]);
              else ctx.lineTo(p, line.points[i + 1]);
            }
          });
          ctx.stroke();
        });

      masks[color.hex] = tempCanvas.toDataURL('image/png');
    });

    onMasksChange(masks);
  };

  const clearCanvas = () => {
    setLines([]);
    onMasksChange({});
  };

  const handleZoom = (delta: number) => {
      const newScale = Math.max(0.1, Math.min(scale + delta * 0.5, 3));
      setScale(newScale);
  };

  return (
    <div 
        ref={containerRef} 
        className="relative w-full h-[600px] bg-stone-900 rounded-xl overflow-hidden border border-stone-800 shadow-inner select-none"
    >
      {/* Tools */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
         <div className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-xl border border-stone-200 flex flex-col gap-1">
          <button onClick={() => handleZoom(0.2)} className="p-2 hover:bg-stone-100 rounded text-stone-700"><ZoomIn size={20} /></button>
          <button onClick={() => handleZoom(-0.2)} className="p-2 hover:bg-stone-100 rounded text-stone-700"><ZoomOut size={20} /></button>
          <div className="h-px bg-stone-200 my-1" />
          <button onClick={clearCanvas} className="p-2 hover:bg-red-50 text-red-500 rounded"><Trash2 size={20} /></button>
        </div>
      </div>

      <Stage
        width={containerSize.width}
        height={containerSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={stageRef}
        style={{ cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
      >
        <Layer>
          {/* We group image + lines and transform the group. This is easier than managing coords manually? 
              Actually, manual coords (as done above) is more robust for drawing apps. 
              But let's just transform the image/lines visually.
          */}
          {image && (
             <KonvaImage
                image={image}
                x={position.x}
                y={position.y}
                scaleX={scale}
                scaleY={scale}
             />
          )}
          
          {lines.map((line, i) => (
             <Line
                key={i}
                // Points are in Image Space. We need to transform them to Screen Space to draw on Stage?
                // OR we can put lines inside a Group that has the same x/y/scale as the image.
                // OPTION B: Use Group. This simplifies everything.
                // But let's stick to current logic: we need to draw lines where the image is.
                // Actually, transforming the Layer or Group is much better.
                points={[]} // Placeholder, see below
                stroke="transparent"
             />
          ))}
        </Layer>
        
        {/* CORRECT APPROACH: A Group that moves/scales with the image */}
        <Layer>
            <KonvaImage
                image={image}
                x={position.x}
                y={position.y}
                scaleX={scale}
                scaleY={scale}
            />
             {lines.map((line, i) => (
                <Line
                    key={i}
                    points={line.points} // Image Space Points
                    stroke={line.color}
                    strokeWidth={line.brushSize} // Image Space Width
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                    // TRANSFORM THE LINE TO MATCH IMAGE
                    x={position.x}
                    y={position.y}
                    scaleX={scale}
                    scaleY={scale}
                />
            ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default InpaintingCanvas;
