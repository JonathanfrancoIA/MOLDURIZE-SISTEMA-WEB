"use client";

import React, { useMemo } from "react";
import { Stage, Layer, Rect, Text, Group, Line } from "react-konva";

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

// Paleta terrosa/industrial -- 8 tons com contraste validado
const PART_PALETTE = [
  { fill: "#c9952f", highlight: "#e0b85c", text: "#1b160b" }, // dourado (default)
  { fill: "#b87333", highlight: "#d49157", text: "#1b160b" }, // cobre
  { fill: "#7a9a6e", highlight: "#96b388", text: "#1b1e17" }, // sage
  { fill: "#c4956a", highlight: "#d9b08c", text: "#1b160b" }, // terracota
  { fill: "#5e8585", highlight: "#7da3a3", text: "#f0ede6" }, // teal cinza
  { fill: "#c4a882", highlight: "#d9c4a6", text: "#1b160b" }, // areia
  { fill: "#8a6b3f", highlight: "#a88a5c", text: "#f0ede6" }, // marrom quente
  { fill: "#a0522d", highlight: "#bf7040", text: "#f0ede6" }, // sienna
];

function hashLabel(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % PART_PALETTE.length;
}

function getPartColor(label?: string | null) {
  if (!label) return PART_PALETTE[0];
  return PART_PALETTE[hashLabel(label)];
}

// Ruler tick generation
function generateRulerTicks(length: number, majorInterval: number, minorInterval: number) {
  const ticks: { pos: number; major: boolean; label: string }[] = [];
  for (let i = 0; i <= length; i += minorInterval) {
    const isMajor = i % majorInterval === 0;
    if (isMajor) {
      ticks.push({ pos: i, major: true, label: i === 0 ? "0" : `${i}` });
    } else {
      ticks.push({ pos: i, major: false, label: "" });
    }
  }
  return ticks;
}

export default function CanvasCore({
  blockWidth,
  blockHeight,
  placedParts,
  containerWidth,
  containerHeight,
  activeBlockIndex = 0,
}: CanvasCoreProps) {
  const rulerSize = 32;
  const padding = 16;

  const scale = useMemo(() => {
    const availableW = Math.max(containerWidth - rulerSize - padding * 2, 10);
    const availableH = Math.max(containerHeight - rulerSize - padding * 2, 10);
    return Math.min(availableW / blockWidth, availableH / blockHeight) || 1;
  }, [blockWidth, blockHeight, containerWidth, containerHeight]);

  const visibleParts = useMemo(
    () => placedParts.filter((part) => part.block_index === activeBlockIndex),
    [placedParts, activeBlockIndex]
  );

  // Unique labels for legend
  const uniqueLabels = useMemo(() => {
    const seen = new Set<string>();
    const result: { label: string; color: typeof PART_PALETTE[0] }[] = [];
    for (const part of visibleParts) {
      const lbl = part.label || "Peca";
      if (!seen.has(lbl)) {
        seen.add(lbl);
        result.push({ label: lbl, color: getPartColor(part.label) });
      }
    }
    return result;
  }, [visibleParts]);

  const blockPixelW = blockWidth * scale;
  const blockPixelH = blockHeight * scale;
  const originX = rulerSize + (containerWidth - rulerSize - blockPixelW) / 2;
  const originY = (containerHeight - rulerSize - blockPixelH) / 2;

  // Ruler intervals based on block size
  const majorX = blockWidth >= 2000 ? 500 : blockWidth >= 1000 ? 200 : 100;
  const minorX = majorX / 5;
  const majorY = blockHeight >= 2000 ? 500 : blockHeight >= 1000 ? 200 : 100;
  const minorY = majorY / 5;

  const hTicks = useMemo(() => generateRulerTicks(blockWidth, majorX, minorX), [blockWidth, majorX, minorX]);
  const vTicks = useMemo(() => generateRulerTicks(blockHeight, majorY, minorY), [blockHeight, majorY, minorY]);

  const tickColor = "rgba(230,184,74,0.35)";
  const tickMajorColor = "rgba(230,184,74,0.55)";
  const gridColor = "rgba(230,184,74,0.06)";
  const gridMajorColor = "rgba(230,184,74,0.12)";

  return (
    <Stage width={containerWidth} height={containerHeight}>
      <Layer>
        {/* Block background with shadow */}
        <Group x={originX} y={originY} scaleX={scale} scaleY={scale}>
          <Rect
            x={0}
            y={0}
            width={blockWidth}
            height={blockHeight}
            fill="#efe7d1"
            stroke="#b8973a"
            strokeWidth={1.5 / scale}
            shadowColor="#000000"
            shadowBlur={20 / scale}
            shadowOpacity={0.2}
            shadowOffset={{ x: 0, y: 10 / scale }}
          />

          {/* Grid lines inside block */}
          {hTicks.map((tick) =>
            tick.pos > 0 && tick.pos < blockWidth ? (
              <Line
                key={`gv-${tick.pos}`}
                points={[tick.pos, 0, tick.pos, blockHeight]}
                stroke={tick.major ? gridMajorColor : gridColor}
                strokeWidth={0.5 / scale}
                listening={false}
              />
            ) : null
          )}
          {vTicks.map((tick) =>
            tick.pos > 0 && tick.pos < blockHeight ? (
              <Line
                key={`gh-${tick.pos}`}
                points={[0, blockHeight - tick.pos, blockWidth, blockHeight - tick.pos]}
                stroke={tick.major ? gridMajorColor : gridColor}
                strokeWidth={0.5 / scale}
                listening={false}
              />
            ) : null
          )}

          {/* Placed parts */}
          {visibleParts.map((part, index) => {
            const renderedWidth = part.width * scale;
            const renderedHeight = part.height * scale;
            const canShowLabel = Boolean(part.label) && renderedWidth >= 58 && renderedHeight >= 18;
            const canvasY = blockHeight - part.y - part.height;
            const palette = getPartColor(part.label);

            return (
              <Group key={`part-${activeBlockIndex}-${index}`} x={part.x} y={canvasY}>
                <Rect
                  width={part.width}
                  height={part.height}
                  fill={palette.fill}
                  opacity={0.92}
                  stroke="#1b160b"
                  strokeWidth={1 / scale}
                  cornerRadius={0}
                />
                {/* Top edge highlight */}
                <Rect
                  width={part.width}
                  height={Math.max(0.5 / scale, part.height * 0.08)}
                  fill={palette.highlight}
                  opacity={0.6}
                  listening={false}
                />
                {canShowLabel && (
                  <Text
                    text={part.label || ""}
                    fill={palette.text}
                    align="center"
                    verticalAlign="middle"
                    width={part.width}
                    height={part.height}
                    fontSize={Math.min(Math.max(part.height * 0.2, 10 / scale), 14 / scale)}
                    fontStyle="600"
                    fontFamily="var(--font-sans), sans-serif"
                    ellipsis
                  />
                )}
              </Group>
            );
          })}
        </Group>

        {/* Horizontal ruler (bottom) */}
        <Group x={originX} y={originY + blockPixelH + 2}>
          {hTicks.map((tick) => {
            const px = tick.pos * scale;
            const tickLen = tick.major ? 10 : 5;
            return (
              <Group key={`ht-${tick.pos}`}>
                <Line
                  points={[px, 0, px, tickLen]}
                  stroke={tick.major ? tickMajorColor : tickColor}
                  strokeWidth={1}
                  listening={false}
                />
                {tick.major && (
                  <Text
                    x={px - 20}
                    y={tickLen + 2}
                    width={40}
                    align="center"
                    text={tick.label}
                    fill="rgba(230,184,74,0.5)"
                    fontSize={9}
                    fontFamily="monospace"
                    listening={false}
                  />
                )}
              </Group>
            );
          })}
        </Group>

        {/* Vertical ruler (left) */}
        <Group x={originX - 2} y={originY}>
          {vTicks.map((tick) => {
            const py = blockPixelH - tick.pos * scale;
            const tickLen = tick.major ? 10 : 5;
            return (
              <Group key={`vt-${tick.pos}`}>
                <Line
                  points={[-tickLen, py, 0, py]}
                  stroke={tick.major ? tickMajorColor : tickColor}
                  strokeWidth={1}
                  listening={false}
                />
                {tick.major && (
                  <Text
                    x={-tickLen - 28}
                    y={py - 5}
                    width={26}
                    align="right"
                    text={tick.label}
                    fill="rgba(230,184,74,0.5)"
                    fontSize={9}
                    fontFamily="monospace"
                    listening={false}
                  />
                )}
              </Group>
            );
          })}
        </Group>

        {/* Block info badge */}
        <Rect x={16} y={16} width={280} height={30} fill="#10130f" opacity={0.85} cornerRadius={6} />
        <Text
          x={28}
          y={24}
          text={`B${activeBlockIndex + 1}  ${blockWidth} x ${blockHeight} mm  ${visibleParts.length} pecas`}
          fill="#e6b84a"
          fontSize={11}
          fontFamily="monospace"
        />

        {/* Legend */}
        {uniqueLabels.length > 1 && (
          <Group x={containerWidth - 16} y={16}>
            <Rect
              x={-(uniqueLabels.length * 90 + 16)}
              y={0}
              width={uniqueLabels.length * 90 + 16}
              height={28}
              fill="#10130f"
              opacity={0.85}
              cornerRadius={6}
            />
            {uniqueLabels.map((item, i) => {
              const xOff = -(uniqueLabels.length - i) * 90;
              return (
                <Group key={item.label} x={xOff} y={6}>
                  <Rect x={0} y={0} width={12} height={12} fill={item.color.fill} cornerRadius={2} />
                  <Text
                    x={16}
                    y={0}
                    text={item.label}
                    fill="rgba(230,184,74,0.7)"
                    fontSize={10}
                    fontFamily="monospace"
                    width={70}
                    ellipsis
                  />
                </Group>
              );
            })}
          </Group>
        )}
      </Layer>
    </Stage>
  );
}
