"use client";
import { useCallback, useRef, useState } from "react";
import { FileCode2, Loader2, Upload, X, Check, AlertCircle } from "lucide-react";
import type { DXFUploadResponse } from "@moldurize/shared";

interface ImportPart {
  label: string;
  width: number;
  height: number;
  quantity: number;
  selected: boolean;
  area: number;
}

interface DxfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parts: Array<{ label: string; width: number; height: number; quantity: number }>) => void;
  api: { uploadDxf: (file: File) => Promise<DXFUploadResponse> };
}

type ModalState = "idle" | "uploading" | "review" | "error";

export function DxfImportModal({ isOpen, onClose, onImport, api }: DxfImportModalProps) {
  const [state, setState] = useState<ModalState>("idle");
  const [parts, setParts] = useState<ImportPart[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<string>("mm");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setState("idle");
    setParts([]);
    setError(null);
    setUnit("mm");
    setIsDragging(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".dxf")) {
      setState("error");
      setError("Selecione um arquivo com extensão .dxf");
      return;
    }

    setState("uploading");
    setError(null);

    try {
      const response = await api.uploadDxf(file);
      setUnit(response.unit || "mm");

      if (!response.success || response.parts.length === 0) {
        setState("error");
        setError(response.message || "Nenhuma geometria fechada encontrada no arquivo DXF.");
        return;
      }

      const importParts: ImportPart[] = response.parts.map((p, i) => ({
        label: p.label || p.description || `Peça ${i + 1}`,
        width: Math.round(p.width * 10) / 10,
        height: Math.round(p.height * 10) / 10,
        quantity: 1,
        selected: true,
        area: p.area,
      }));

      setParts(importParts);
      setState("review");
    } catch (err: unknown) {
      setState("error");
      const message = err instanceof Error ? err.message : "Erro ao processar arquivo DXF.";
      setError(message);
    }
  }, [api]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const updatePart = (index: number, field: keyof ImportPart, value: unknown) => {
    setParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const toggleAll = (selected: boolean) => {
    setParts(prev => prev.map(p => ({ ...p, selected })));
  };

  const selectedCount = parts.filter(p => p.selected).length;

  const handleImport = () => {
    const toImport = parts
      .filter(p => p.selected)
      .map(p => ({ label: p.label.trim() || "Peça DXF", width: p.width, height: p.height, quantity: Math.max(1, p.quantity) }));
    if (toImport.length === 0) return;
    onImport(toImport);
    handleClose();
  };

  if (!isOpen) return null;

  // Color palette for part previews
  const COLORS = ["#c9952f", "#b87333", "#7a9a6e", "#c4956a", "#5e8585", "#c4a882", "#8a6b3f", "#a0522d"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl rounded-xl border border-black/10 bg-[#f4f3ee] shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-white/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="h-5 w-5 text-[#c9952f]" strokeWidth={1.8} />
            <h2 className="text-sm font-bold text-[#171713]">Importar DXF</h2>
            {unit !== "unknown" && (
              <span className="rounded border border-[#c9952f]/25 bg-[#fff8e6] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8b651f]">
                {unit}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-black/10 text-[#625f55] transition-all hover:border-black/20 hover:text-[#171713]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="p-5">
          {/* IDLE — Drop zone */}
          {(state === "idle" || state === "error") && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-[#c9952f] bg-[#fffcf5]"
                    : "border-black/15 bg-white/60 hover:border-[#c9952f]/50 hover:bg-[#fffcf5]"
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors ${isDragging ? "border-[#c9952f] bg-[#fff8e6]" : "border-black/10 bg-[#f7f4ec]"}`}>
                  <Upload className={`h-5 w-5 transition-colors ${isDragging ? "text-[#c9952f]" : "text-[#928b7c]"}`} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#171713]">Arraste o arquivo DXF aqui</p>
                  <p className="mt-0.5 text-xs text-[#928b7c]">ou clique para selecionar</p>
                  <p className="mt-1 text-[10px] text-[#aaa493]">Suporta LWPOLYLINE, CIRCLE, POLYLINE fechados</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".dxf" className="hidden" onChange={handleFileInput} />

              {state === "error" && error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={1.8} />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Erro ao processar</p>
                    <p className="mt-0.5 text-xs text-red-600">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPLOADING */}
          {state === "uploading" && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#c9952f]" strokeWidth={1.8} />
              <div className="text-center">
                <p className="text-sm font-semibold text-[#171713]">Processando arquivo DXF</p>
                <p className="mt-0.5 text-xs text-[#928b7c]">Extraindo geometrias fechadas...</p>
              </div>
            </div>
          )}

          {/* REVIEW — Parts list */}
          {state === "review" && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex items-center justify-between rounded-md bg-[#e8f5e9] px-3 py-2 border border-green-200">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" strokeWidth={2} />
                  <span className="text-xs font-semibold text-green-800">{parts.length} geometria{parts.length !== 1 ? "s" : ""} encontrada{parts.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex gap-2 text-[10px] font-bold text-[#928b7c]">
                  <button onClick={() => toggleAll(true)} className="hover:text-[#171713] transition-colors">Tudo</button>
                  <span className="text-black/20">|</span>
                  <button onClick={() => toggleAll(false)} className="hover:text-[#171713] transition-colors">Nada</button>
                </div>
              </div>

              {/* Parts list */}
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {parts.map((part, index) => {
                  const color = COLORS[index % COLORS.length];
                  const ratio = part.width / Math.max(part.height, 1);
                  const previewW = Math.min(48, Math.max(20, ratio * 24));
                  const previewH = Math.min(32, Math.max(12, 24 / ratio));

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all duration-150 ${
                        part.selected
                          ? "border-[#c9952f]/30 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                          : "border-black/8 bg-black/[0.02] opacity-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => updatePart(index, "selected", !part.selected)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                          part.selected ? "border-[#c9952f] bg-[#c9952f]" : "border-black/20 bg-white"
                        }`}
                      >
                        {part.selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                      </button>

                      {/* Shape preview */}
                      <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md border border-black/10 bg-[#efe7d1]">
                        <svg width={previewW} height={previewH} viewBox={`0 0 ${part.width} ${part.height}`} preserveAspectRatio="xMidYMid meet">
                          <rect width={part.width} height={part.height} fill={color} rx={part.width * 0.02} />
                          <rect width={part.width} height={part.height * 0.15} fill="rgba(255,255,255,0.3)" rx={part.width * 0.02} />
                        </svg>
                      </div>

                      {/* Label input */}
                      <input
                        value={part.label}
                        onChange={e => updatePart(index, "label", e.target.value)}
                        disabled={!part.selected}
                        className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-[#171713] outline-none transition-colors focus:border-[#c9952f]/70 disabled:bg-transparent disabled:border-transparent"
                      />

                      {/* Dimensions */}
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[10px] font-bold text-[#625f55]">
                          {part.width} × {part.height}
                        </div>
                        <div className="text-[9px] text-[#928b7c]">{unit}</div>
                      </div>

                      {/* Quantity */}
                      <div className="shrink-0">
                        <div className="text-[9px] font-bold uppercase text-[#928b7c] mb-0.5 text-center">Qtd</div>
                        <input
                          type="number"
                          min={1}
                          value={part.quantity}
                          onChange={e => updatePart(index, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                          disabled={!part.selected}
                          className="h-7 w-12 rounded-md border border-black/10 bg-white px-1.5 text-center font-mono text-xs font-bold text-[#171713] outline-none focus:border-[#c9952f]/70 disabled:opacity-40"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Retry link */}
              <button
                onClick={() => { reset(); }}
                className="text-xs text-[#928b7c] hover:text-[#c9952f] transition-colors underline underline-offset-2"
              >
                Selecionar outro arquivo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {state === "review" && (
          <div className="flex items-center justify-between border-t border-black/10 bg-white/50 px-5 py-4">
            <button
              onClick={handleClose}
              className="h-9 rounded-md border border-black/10 px-4 text-xs font-semibold text-[#625f55] transition-all hover:border-black/20 hover:text-[#171713]"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#171713] px-5 text-xs font-semibold text-[#f2c767] transition-all hover:bg-[#2a281f] disabled:cursor-not-allowed disabled:opacity-50 active:-translate-y-[1px]"
            >
              <FileCode2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              Importar {selectedCount > 0 ? `${selectedCount} peça${selectedCount !== 1 ? "s" : ""}` : "selecionadas"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
