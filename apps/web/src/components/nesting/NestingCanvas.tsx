"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

// Next.js dynamic import ensures Konva runs only on the client
const CanvasCore = dynamic(() => import("./CanvasCore"), { ssr: false });

export interface PlacedPart {
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  label?: string | null;
  block_index: number;
}

interface NestingCanvasProps {
  blockWidth: number;
  blockHeight: number;
  placedParts: PlacedPart[];
  activeBlockIndex?: number;
}

export default function NestingCanvas({
  blockWidth,
  blockHeight,
  placedParts,
  activeBlockIndex = 0,
}: NestingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      setDimensions({
        width: containerRef.current?.offsetWidth || 0,
        height: containerRef.current?.offsetHeight || 0,
      });
    };
    
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative h-full w-full overflow-hidden bg-[#090c0a]"
    >
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.16]" 
        style={{
          backgroundImage:
            "linear-gradient(rgba(217,170,61,0.44) 1px, transparent 1px), linear-gradient(90deg, rgba(217,170,61,0.44) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <CanvasCore
          blockWidth={blockWidth}
          blockHeight={blockHeight}
          placedParts={placedParts}
          activeBlockIndex={activeBlockIndex}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/20">
          Carregando canvas
        </div>
      )}
    </div>
  );
}
