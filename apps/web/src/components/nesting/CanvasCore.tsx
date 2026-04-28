"use client";

import React, { useMemo } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";

interface PlacedPart {
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  label?: string | null;
  block_index: number;
}

interface CanvasCoreProps {
  blockWidth: number;
  blockHeight: number;
  placedParts: PlacedPart[];
  containerWidth: number;
  containerHeight: number;
  activeBlockIndex?: number;
}

export default function CanvasCore({
  blockWidth,
  blockHeight,
  placedParts,
  containerWidth,
  containerHeight,
  activeBlockIndex = 0,
}: CanvasCoreProps) {
  const padding = 34;

  const scale = useMemo(() => {
    const availableW = Math.max(containerWidth - padding * 2, 10);
    const availableH = Math.max(containerHeight - padding * 2, 10);
    return Math.min(availableW / blockWidth, availableH / blockHeight) || 1;
  }, [blockWidth, blockHeight, containerWidth, containerHeight]);

  const visibleParts = useMemo(
    () => placedParts.filter((part) => part.block_index === activeBlockIndex),
    [placedParts, activeBlockIndex]
  );

  const originX = containerWidth / 2 - (blockWidth * scale) / 2;
  const originY = containerHeight / 2 - (blockHeight * scale) / 2;

  return (
    <Stage width={containerWidth} height={containerHeight}>
      <Layer>
        <Group x={originX} y={originY} scaleX={scale} scaleY={scale}>
          <Rect
            x={0}
            y={0}
            width={blockWidth}
            height={blockHeight}
            fill="#efe7d1"
            stroke="#d9aa3d"
            strokeWidth={2 / scale}
            shadowColor="#000000"
            shadowBlur={24 / scale}
            shadowOpacity={0.24}
            shadowOffset={{ x: 0, y: 14 / scale }}
          />

          {visibleParts.map((part, index) => {
            const renderedWidth = part.width * scale;
            const renderedHeight = part.height * scale;
            const canShowLabel = Boolean(part.label) && renderedWidth >= 74 && renderedHeight >= 22;

            return (
              <Group key={`part-${activeBlockIndex}-${index}`} x={part.x} y={part.y}>
                <Rect
                  width={part.width}
                  height={part.height}
                  fill="#d9aa3d"
                  opacity={0.96}
                  stroke="#1b160b"
                  strokeWidth={1.5 / scale}
                  cornerRadius={Math.min(2 / scale, part.height / 5)}
                />
                <Rect
                  width={part.width}
                  height={Math.max(1 / scale, part.height * 0.18)}
                  fill="#f0cf70"
                  opacity={0.72}
                  listening={false}
                />
                {canShowLabel && (
                  <Text
                    text={part.label || ""}
                    fill="#1b160b"
                    align="center"
                    verticalAlign="middle"
                    width={part.width}
                    height={part.height}
                    fontSize={Math.min(Math.max(part.height * 0.22, 11 / scale), 16 / scale)}
                    fontStyle="bold"
                    ellipsis
                  />
                )}
              </Group>
            );
          })}
        </Group>

        <Rect x={16} y={16} width={252} height={34} fill="#10130f" opacity={0.88} cornerRadius={8} />
        <Text
          x={30}
          y={27}
          text={`B${activeBlockIndex + 1}  ${blockWidth} x ${blockHeight} mm  ${visibleParts.length} pecas`}
          fill="#e6b84a"
          fontSize={12}
          fontFamily="monospace"
        />
      </Layer>
    </Stage>
  );
}
