"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

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

  // Fade-in when active block changes
  const [visible, setVisible] = useState(true);
  const prevBlockRef = useRef(activeBlockIndex);
  useEffect(() => {
    if (prevBlockRef.current === activeBlockIndex) return;
    prevBlockRef.current = activeBlockIndex;
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, [activeBlockIndex]);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      setDimensions({
        width: containerRef.current?.offsetWidth || 0,
        height: containerRef.current?.offsetHeight || 0,
      });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#090c0a]"
    >
      {/* Subtle dot-grid background — purely decorative */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(217,170,61,0.18) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {dimensions.width > 0 && dimensions.height > 0 ? (
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)",
          }}
          className="h-full w-full"
        >
          <CanvasCore
            blockWidth={blockWidth}
            blockHeight={blockHeight}
            placedParts={placedParts}
            activeBlockIndex={activeBlockIndex}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-white/20">
          Inicializando canvas
        </div>
      )}
    </div>
  );
}
