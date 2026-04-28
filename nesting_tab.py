import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, messagebox
import threading
import csv
import time
import logging
import math
from src.core.engine import NestingEngine
from src.core.db_manager import DBManager
from shapely.geometry import box, Polygon
from src.ui.theme import *

logger = logging.getLogger("moldurize.nesting_tab")

class NestingTab(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(master=parent, fg_color=NAVY_DEEP, corner_radius=CORNER_RADIUS)
        self.controller = controller
        
        self.pieces = []
        self.db = DBManager()
        self.engine = None
        self.canvas_data = {}  # Metadata lookup para object picking
        self.selected_item = None # Item ID do canvas selecionado
        
        # Variáveis da Trena
        self.current_scale = 1.0
        self.measure_start = None
        self.measure_line = None
        self.measure_text = None
        self.measure_rect = None

        # Crosshairs AutoCAD
        self.cross_x_line = None
        self.cross_y_line = None

        # CAD tools state
        self._cum_zoom = 1.0
        self._base_scale = 1.0
        self._block_origins = []
        self._dim = (0, 0)
        self._last_results = None
        self._last_dim = None
        self._measure_mode = False
        self._measure_start = None
        self._measure_items = []

        self._build_layout()
        
    def _build_layout(self):
        # Sidebar Options (Scrollable to ensure all tools fit)
        sidebar = ctk.CTkScrollableFrame(self, width=SIDEBAR_WIDTH, corner_radius=CORNER_RADIUS, 
                                         fg_color=NAVY_MID, scrollbar_button_color=NAVY_CARD)
        sidebar.pack(side="left", fill="y", padx=10, pady=10)
        # sidebar.pack_propagate(False) # Removido para permitir scroll interno
        
        # --- CARD 1: SETUP DA MÁQUINA ---
        card_setup = ctk.CTkFrame(sidebar, fg_color=NAVY_DEEP, corner_radius=CORNER_RADIUS)
        card_setup.pack(fill="x", padx=5, pady=(5, 10))
        
        ctk.CTkLabel(card_setup, text="SETUP MÁQUINA", font=FONT_SUBTITLE, text_color=GOLD).pack(pady=(12, 5))
        
        ctk.CTkLabel(card_setup, text="Dimensões Bloco (CxL mm)", font=FONT_SMALL, text_color=TEXT_SECONDARY).pack(anchor="w", padx=15, pady=(5,0))
        self.bloco_entry = ctk.CTkComboBox(card_setup, values=["4000x1200", "2000x1200", "1010x1200", "1010x1000", "1010x798"], 
                                           corner_radius=CORNER_RADIUS, fg_color=NAVY_CARD, border_color=NAVY_MID, text_color=TEXT_PRIMARY)
        self.bloco_entry.pack(fill="x", padx=15, pady=(0, 10))
        self.bloco_entry.set("4000x1200")
        
        ctk.CTkLabel(card_setup, text="Kerf Térmico (mm)", font=FONT_SMALL, text_color=TEXT_SECONDARY).pack(anchor="w", padx=15, pady=(0,0))
        self.kerf_entry = ctk.CTkEntry(card_setup, corner_radius=CORNER_RADIUS, fg_color=NAVY_CARD, border_color=NAVY_MID)
        self.kerf_entry.pack(fill="x", padx=15, pady=(0, 15))
        self.kerf_entry.insert(0, "2.0")
        
        # --- CARD 2: CADASTRAR PEÇAS ---
        card_add = ctk.CTkFrame(sidebar, fg_color=NAVY_DEEP, corner_radius=CORNER_RADIUS)
        card_add.pack(fill="x", padx=5, pady=10)
        
        ctk.CTkLabel(card_add, text="ADICIONAR PEÇAS", font=FONT_SUBTITLE, text_color=GOLD).pack(pady=(12, 5))
        
        ctk.CTkLabel(card_add, text="Dimensões (CxL mm)", font=FONT_SMALL, text_color=TEXT_SECONDARY).pack(anchor="w", padx=15, pady=(5,0))
        self.peca_dim = ctk.CTkEntry(card_add, corner_radius=CORNER_RADIUS, fg_color=NAVY_CARD, border_color=NAVY_MID)
        self.peca_dim.pack(fill="x", padx=15, pady=(0, 10))
        self.peca_dim.insert(0, "2000x300")
        
        ctk.CTkLabel(card_add, text="Quantidade", font=FONT_SMALL, text_color=TEXT_SECONDARY).pack(anchor="w", padx=15, pady=(0,0))
        self.peca_qtd = ctk.CTkEntry(card_add, corner_radius=CORNER_RADIUS, fg_color=NAVY_CARD, border_color=NAVY_MID)
        self.peca_qtd.pack(fill="x", padx=15, pady=(0, 10))
        self.peca_qtd.insert(0, "10")
        
        ctk.CTkButton(card_add, text="Adicionar Fila", command=self.add_peca_manual, 
                     corner_radius=CORNER_RADIUS, fg_color=GOLD, hover_color=GOLD_LIGHT, text_color=NAVY_DEEP, font=FONT_BODY_BOLD).pack(fill="x", padx=15, pady=(5, 10))
                     
        ctk.CTkFrame(card_add, height=1, fg_color=NAVY_MID).pack(fill="x", padx=15, pady=5) # Divider
        
        ctk.CTkButton(card_add, text="Importar Lista CSV", command=self.importar_csv,
                     corner_radius=CORNER_RADIUS, fg_color=NAVY_CARD, hover_color=NAVY_HOVER).pack(fill="x", padx=15, pady=5)
                     
        ctk.CTkButton(card_add, text="Importar DXF CAD", command=self.importar_dxf,
                     corner_radius=CORNER_RADIUS, fg_color=NAVY_CARD, hover_color=NAVY_HOVER).pack(fill="x", padx=15, pady=(5, 15))
                     
        # --- CARD 3: FILA DE CORTE ---
        card_fila = ctk.CTkFrame(sidebar, fg_color=NAVY_DEEP, corner_radius=CORNER_RADIUS)
        card_fila.pack(fill="x", padx=5, pady=(10, 5))
        
        ctk.CTkLabel(card_fila, text="FILA DE CORTE", font=FONT_SUBTITLE, text_color=CYAN_ACCENT).pack(pady=(12, 5))
        
        self.fila_textbox = ctk.CTkTextbox(card_fila, height=120, corner_radius=CORNER_RADIUS, fg_color=NAVY_CARD, text_color=TEXT_PRIMARY, border_width=1, border_color=NAVY_MID)
        self.fila_textbox.pack(fill="x", padx=15, pady=5)
        self.fila_textbox.insert("0.0", "Fila vazia.")
        self.fila_textbox.configure(state="disabled")
        
        ctk.CTkButton(card_fila, text="Enviar G-Code", command=self.send_to_gcode, 
                      fg_color=GREEN_ACCENT, hover_color="#00a8ff", corner_radius=CORNER_RADIUS, text_color=NAVY_DEEP, font=FONT_BODY_BOLD).pack(fill="x", padx=15, pady=(10, 5))
                      
        ctk.CTkButton(card_fila, text="Limpar Tudo", command=self.limpar_fila, 
                      fg_color="transparent", hover_color=RED_ACCENT, border_width=1, border_color=RED_ACCENT, corner_radius=CORNER_RADIUS).pack(fill="x", padx=15, pady=(5, 15))



        # Center Canvas
        # Center Canvas
        center = ctk.CTkFrame(self, corner_radius=CORNER_RADIUS, fg_color=NAVY_DEEP)
        center.pack(side="left", fill="both", expand=True, padx=10, pady=10)
        
        # HUD (Barra de status superior)
        hud = ctk.CTkFrame(center, height=80, corner_radius=CORNER_RADIUS, fg_color=NAVY_MID)
        hud.pack(fill="x", side="top", pady=(0, 10))
        
        self.lbl_efi = self._metric_card(hud, "Efic. Kerf", "0.0%")
        self.lbl_blocos = self._metric_card(hud, "Blocos Utilizados", "0")
        self.lbl_sobra = self._metric_card_textbox(hud, "Retalho Gerado (Maior)", "-")
        self.lbl_pecas_bloco = self._metric_card_textbox(hud, "Itens por Bloco", "-")

        # Canvas UI
        self.canvas = tk.Canvas(center, bg=NAVY_CARD, highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)

        # AutoCAD Status Bar (Footer / HUD Inferior)
        self.status_bar = ctk.CTkFrame(center, height=40, corner_radius=CORNER_RADIUS, fg_color=NAVY_DEEP, border_color=NAVY_MID, border_width=1)
        self.status_bar.pack(fill="x", pady=(5, 5))
        
        self.hud_id_label = ctk.CTkLabel(self.status_bar, text="ID: -", font=FONT_SMALL, text_color=TEXT_PRIMARY)
        self.hud_id_label.pack(side="left", padx=15, pady=5)
        
        self.hud_geo_label = ctk.CTkLabel(self.status_bar, text="L: - | A: - | Área: -", font=FONT_SMALL, text_color=TEXT_PRIMARY)
        self.hud_geo_label.pack(side="left", padx=15, pady=5)
        
        self.hud_coord_label = ctk.CTkLabel(self.status_bar, text="X: - | Y: -", font=FONT_SMALL, text_color=TEXT_PRIMARY)
        self.hud_coord_label.pack(side="left", padx=15, pady=5)
        
        self.btn_reset_view = ctk.CTkButton(self.status_bar, text="Centralizar", font=FONT_TINY_BOLD, fg_color=NAVY_MID, hover_color="#2c5282", width=100, height=28, corner_radius=CORNER_RADIUS, command=self.reset_view)
        self.btn_reset_view.pack(side="right", padx=15, pady=5)
        
        self.hud_trena_label = ctk.CTkLabel(self.status_bar, text="TRENA: Desligada", font=FONT_SMALL, text_color=CYAN_ACCENT)
        self.hud_trena_label.pack(side="right", padx=15, pady=5)

        self.scrollbar = ctk.CTkScrollbar(center, orientation="horizontal", command=self.canvas.xview)
        self.scrollbar.pack(fill="x", pady=(5, 10))
        self.canvas.configure(xscrollcommand=self.scrollbar.set)
        
        # Mouse Drag (Pan) with right-click
        self.canvas.bind("<ButtonPress-3>", lambda e: self.canvas.scan_mark(e.x, e.y))
        self.canvas.bind("<B3-Motion>", lambda e: self.canvas.scan_dragto(e.x, e.y, gain=1))

        # Toast HUD Animation Node (OVERDRIVE)
        self.toast_frame = ctk.CTkFrame(center, fg_color=NAVY_DEEP, border_color=GOLD, border_width=1.5, corner_radius=20)
        self.toast_label = ctk.CTkLabel(self.toast_frame, text="", text_color=GOLD, font=FONT_BODY_BOLD)
        self.toast_label.pack(padx=40, pady=12)
        self.toast_frame.place_forget()
        self.is_animating = False

        # Trena / Medição
        for btn in ["<ButtonPress-1>", "<Shift-ButtonPress-1>", "<ButtonPress-2>"]:
            self.canvas.bind(btn, self._on_measure_start)
            
        for btn in ["<B1-Motion>", "<Shift-B1-Motion>", "<B2-Motion>"]:
            self.canvas.bind(btn, self._on_measure_drag)
            
        for btn in ["<ButtonRelease-1>", "<Shift-ButtonRelease-1>", "<ButtonRelease-2>"]:
            self.canvas.bind(btn, self._on_measure_end)
            
        # CAD: True Zoom & Crosshairs
        self.canvas.bind("<MouseWheel>", self._on_zoom)
        self.canvas.bind("<Button-4>", self._on_zoom) # Linux scroll up
        self.canvas.bind("<Button-5>", self._on_zoom) # Linux scroll down
        self.canvas.bind("<Motion>", self._on_mouse_move)

        ctk.CTkButton(center, text="INICIAR PROCESSAMENTO DE NESTING", command=self.start_nesting_thread,
            corner_radius=CORNER_RADIUS, fg_color=GOLD, hover_color=GOLD_LIGHT, text_color=NAVY_DEEP,
            font=FONT_HERO, height=60).pack(fill="x", pady=(0, 10))

    def show_toast(self, message):
        """Dispara um popup Toast centralizado que desliza no estilo Vercel/Modern Web"""
        # Se uma animação já está ativa, não duplique (apenas recarrega o texto)
        self.toast_label.configure(text=message.upper())
        if self.is_animating:
            return 

        self.is_animating = True
        self.toast_y = -60
        # A meta é ficar embaixo do HUD superior
        self.toast_target_y = 100 
        self.toast_frame.place(relx=0.5, rely=0.0, y=self.toast_y, anchor="n")

        def animate_in():
            if self.toast_y < self.toast_target_y:
                self.toast_y += (self.toast_target_y - self.toast_y) * 0.15 + 2
                if self.toast_y >= self.toast_target_y:
                    self.toast_y = self.toast_target_y
                    self.toast_frame.place(relx=0.5, rely=0.0, y=self.toast_y, anchor="n")
                    self.after(5000, call_out)
                else:
                    self.toast_frame.place(relx=0.5, rely=0.0, y=self.toast_y, anchor="n")
                    self.after(16, animate_in)
            else:
                self.after(5000, call_out)

        def call_out():
            animate_out()

        def animate_out():
            if self.toast_y > -80:
                self.toast_y -= (self.toast_y - (-80)) * 0.15 + 2
                self.toast_frame.place(relx=0.5, rely=0.0, y=self.toast_y, anchor="n")
                self.after(16, animate_out)
            else:
                self.toast_frame.place_forget()
                self.is_animating = False

        animate_in()

    def _input_field(self, parent, label, default=""):
        ctk.CTkLabel(parent, text=label, text_color=TEXT_PRIMARY, font=FONT_SMALL).pack(anchor="w", padx=20)
        entry = ctk.CTkEntry(parent, width=260, height=36, corner_radius=CORNER_RADIUS, fg_color=NAVY_DEEP, border_color=NAVY_CARD)
        entry.pack(padx=20, pady=(0, 10))
        entry.insert(0, default)
        return entry

    def _metric_card(self, parent, title, val):
        card = ctk.CTkFrame(parent, fg_color=NAVY_CARD, corner_radius=CORNER_RADIUS)
        card.pack(side="left", expand=True, fill="both", padx=5, pady=5)
        ctk.CTkLabel(card, text=title, font=FONT_TINY_BOLD, text_color=TEXT_SECONDARY).pack(pady=(8,0))
        lbl = ctk.CTkLabel(card, text=val, font=FONT_METRIC, text_color=CYAN_ACCENT)
        lbl.pack(pady=(0,5))
        return lbl

    def _metric_card_textbox(self, parent, title, val):
        card = ctk.CTkFrame(parent, fg_color=NAVY_CARD, corner_radius=CORNER_RADIUS)
        card.pack(side="left", expand=True, fill="both", padx=5, pady=5)
        ctk.CTkLabel(card, text=title, font=FONT_TINY_BOLD, text_color=TEXT_SECONDARY).pack(pady=(5,0))
        
        tb = ctk.CTkTextbox(card, font=FONT_BODY_BOLD, text_color=CYAN_ACCENT, 
                            fg_color="transparent", height=40, wrap="word")
        tb.pack(fill="both", expand=True, padx=2, pady=0)
        tb.insert("0.0", val)
        tb.configure(state="disabled")
        return tb

    def add_peca_manual(self):
        try:
            raw_dim = self.peca_dim.get().lower().replace(" ", "").replace(",", ".")
            if "x" not in raw_dim: raise ValueError()
            dim = tuple(map(float, raw_dim.split("x")))
            qtd = int(self.peca_qtd.get().strip())
            
            if qtd <= 0 or dim[0] <= 0 or dim[1] <= 0:
                raise ValueError("Valores devem ser positivos.")
                
            poly = box(0, 0, dim[0], dim[1])
            for _ in range(qtd):
                self.pieces.append({"id": f"P{len(self.pieces)}", "w": dim[0], "h": dim[1], "type": "rect", "polygon": poly})
            self._update_fila()
            logger.info(f"Adicionadas {qtd} peças de {dim[0]}x{dim[1]}mm manualmente.")
        except ValueError as e:
            messagebox.showerror("Erro", f"Entrada inválida. Formato: CxL (ex: 2000x300). Detalhe: {e}")

    def importar_csv(self):
        filepath = filedialog.askopenfilename(
            title="Selecionar CSV de Peças",
            filetypes=[("CSV", "*.csv"), ("Todos", "*.*")]
        )
        if not filepath:
            return
        
        self.controller.set_status("Importando CSV...", busy=True)
        try:
            count = 0
            with open(filepath, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f, delimiter=";")
                if not reader.fieldnames:
                    f.seek(0)
                    reader = csv.DictReader(f, delimiter=",")
                for row in reader:
                    # Permite vários nomes de colunas
                    larg = float(row.get("largura", row.get("width", row.get("w", row.get("Largura", 0)))))
                    alt = float(row.get("altura", row.get("height", row.get("h", row.get("Altura", 0)))))
                    qtd = int(row.get("quantidade", row.get("qty", row.get("q", row.get("Quantidade", 1)))))
                    
                    if larg > 0 and alt > 0 and qtd > 0:
                        poly = box(0, 0, larg, alt)
                        for _ in range(qtd):
                            self.pieces.append({"id": f"P{len(self.pieces)}", "w": larg, "h": alt, "type": "rect", "polygon": poly})
                            count += 1
                            
            self._update_fila()
            logger.info(f"Importadas {count} peças via CSV.")
            messagebox.showinfo("CSV Importado", f"{count} peças importadas com sucesso.")
        except Exception as e:
            logger.error(f"Falha ao ler CSV: {e}")
            messagebox.showerror("Erro CSV", f"Falha ao ler CSV: {str(e)}")
        finally:
            self.controller.set_status("STATUS: ONLINE")

    def importar_dxf(self):
        filepath = filedialog.askopenfilename(
            title="Selecionar arquivo DXF",
            filetypes=[("DXF", "*.dxf"), ("Todos", "*.*")]
        )
        if not filepath:
            return
            
        self.controller.set_status("Lendo modelo DXF geométrico...", busy=True)
        
        def _process():
            try:
                from src.core.processor import DataProcessor
                polygons = DataProcessor.parse_dxf(filepath)
                if not polygons:
                    self.after(0, lambda: messagebox.showwarning("DXF", "Nenhuma geometria fechada encontrada no arquivo."))
                    return
                for poly in polygons:
                    minx, miny, maxx, maxy = poly.bounds
                    w, h = maxx - minx, maxy - miny
                    # Adiciona type 'dxf' para renderização adequada depois
                    self.pieces.append({"id": f"P{len(self.pieces)}", "w": round(w,1), "h": round(h,1), "type": "dxf", "polygon": poly})
                
                self.after(0, self._update_fila)
                self.after(0, lambda: messagebox.showinfo("DXF Importado", f"{len(polygons)} peças irregulares importadas."))
                logger.info(f"Importadas {len(polygons)} geometrias de DXF.")
            except Exception as e:
                logger.error(f"Falha ao processar DXF: {e}")
                self.after(0, lambda err=e: messagebox.showerror("Erro DXF", f"Falha ao processar arquivo vectorial: {str(err)}"))
            finally:
                self.after(0, lambda: self.controller.set_status("STATUS: ONLINE"))
                
        t = threading.Thread(target=_process)
        t.daemon = True
        t.start()

    def limpar_fila(self):
        self.pieces.clear()
        self._update_fila()
        self.canvas.delete("all")
        self.lbl_efi.configure(text="0.0%")
        self.lbl_blocos.configure(text="0")
        self._update_textbox_metric(self.lbl_sobra, "-")
        self._update_textbox_metric(self.lbl_pecas_bloco, "-")
        self.hud_id_label.configure(text="📦 ID: -")
        self.hud_geo_label.configure(text="📐 L: - | A: - | Área: -")
        self.hud_coord_label.configure(text="📍 X: - | Y: -")
        self.hud_trena_label.configure(text="📏 TRENA: Desligada")

    def _update_fila(self):
        self.fila_textbox.configure(state="normal")
        self.fila_textbox.delete("0.0", "end")
        
        MAX_DISPLAY = 500
        total_pieces = len(self.pieces)
        
        if total_pieces == 0:
            self.fila_textbox.insert("0.0", "Nenhuma peça na fila.")
        else:
            display_lista = [f"[{p['type'].upper()[:3]}] {p['id']}: {p['w']}x{p['h']} mm" for p in self.pieces[:MAX_DISPLAY]]
            text = "\n".join(display_lista)
            if total_pieces > MAX_DISPLAY:
                text += f"\n\n... [ E MAIS {total_pieces - MAX_DISPLAY} PEÇAS OCULTAS PARA PERFORMANCE ]"
            
            self.fila_textbox.insert("0.0", text)
            
        self.fila_textbox.configure(state="disabled")

    def _update_textbox_metric(self, textbox, val):
        textbox.configure(state="normal")
        textbox.delete("0.0", "end")
        textbox.insert("0.0", val)
        textbox.configure(state="disabled")

    def send_to_gcode(self):
        # Envia as informações da última peça retangular ou pega a mais repetida para pré-povoar o g-code tab
        if not self.pieces:
            messagebox.showwarning("Aviso", "A fila está vazia.")
            return
            
        rect_pieces = [p for p in self.pieces if p['type'] == 'rect']
        if not rect_pieces:
            messagebox.showinfo("Limitação G-Code", "Apenas as configurações de peças retangulares podem ser enviadas para serpentina atualmente.")
            return
            
        # Pega as dimensões da última peça retangular da fila
        p = rect_pieces[-1]
        qtd = len([item for item in rect_pieces if item['w'] == p['w'] and item['h'] == p['h']])
        
        # Acessar a gcode tab através do app.py
        gcode_tab = self.controller.gcode_controller
        
        gcode_tab.piece_w.delete(0, 'end')
        gcode_tab.piece_w.insert(0, str(p['w']))
        
        gcode_tab.piece_h.delete(0, 'end')
        gcode_tab.piece_h.insert(0, str(p['h']))
        
        gcode_tab.num_pieces.delete(0, 'end')
        gcode_tab.num_pieces.insert(0, str(qtd))
        
        try:
            raw_dim = self.bloco_entry.get().lower().replace(" ", "").replace(",", ".")
            dim = tuple(map(float, raw_dim.split("x")[:2]))
            gcode_tab.block_w.delete(0, 'end')
            gcode_tab.block_w.insert(0, str(dim[0]))
            gcode_tab.block_h.delete(0, 'end')
            gcode_tab.block_h.insert(0, str(dim[1]))
            
            kerf = float(self.kerf_entry.get().replace(",", "."))
            gcode_tab.kerf_offset.delete(0, 'end')
            gcode_tab.kerf_offset.insert(0, str(kerf))
        except ValueError:
            pass # Ignora
            
        self.controller.select_tab("G-Code CNC")
        logger.info("Transferidos dados para aba G-Code.")

    def start_nesting_thread(self):
        if not self.pieces:
            messagebox.showwarning("Aviso", "Adicione peças à fila antes de iniciar o corte.")
            return
            
        self.controller.set_status("Calculando encaixe ótimo (Nesting)...", color=GOLD, busy=True)
            
        t = threading.Thread(target=self._run_nesting)
        t.daemon = True
        t.start()

    def _run_nesting(self):
        start = time.time()
        
        try:
            raw_dim = self.bloco_entry.get().lower().replace(" ", "").replace(",", ".")
            dim = tuple(map(float, raw_dim.split("x")[:2]))
            kerf = float(self.kerf_entry.get().replace(",", "."))
        except ValueError:
            self.after(0, lambda: messagebox.showerror("Erro", "Bloco inválido. Use CxL ou CxLxA."))
            self.after(0, lambda: self.controller.set_status("STATUS: ONLINE"))
            return
            
        self.engine = NestingEngine(dim[0], dim[1], kerf)
        for p in self.pieces:
            self.engine.add_part(p["polygon"])
            
        # O processamento ocorre aqui    
        self.engine.generate_layout()
        results = self.engine.blocks_used
        
        end = time.time()
        logger.info(f"Nesting engine terminado em {end-start:.3f} segundos.")
        
        self.after(0, self._render_results, results, dim)
        self.after(0, lambda: self.controller.set_status("STATUS: ONLINE", color=GREEN_ACCENT))

    def _draw_technical_grid(self, x_offset, y_offset, block_w, block_h, scale):
        """Desenha grid milimétrico estilo CAD no fundo do bloco."""
        step = 100 # Grid principal a cada 100mm
        sub_step = 20 # Grid secundário opcional se quiser maior densidade
        
        # Grid Principal
        for x in range(0, int(block_w) + 1, step):
            lx = x_offset + x * scale
            self.canvas.create_line(lx, y_offset, lx, y_offset + block_h * scale, fill=GRID_COLOR, width=1, dash=(2, 4), tags="grid")
            
        for y in range(0, int(block_h) + 1, step):
            ly = y_offset + y * scale
            self.canvas.create_line(x_offset, ly, x_offset + block_w * scale, ly, fill=GRID_COLOR, width=1, dash=(2, 4), tags="grid")

    def _draw_axes(self, x_offset, y_offset, block_w, block_h, scale):
        """Desenha eixos cartesianos na origem do bloco."""
        # Eixo X (Vermelho)
        self.canvas.create_line(x_offset, y_offset + block_h * scale, x_offset + block_w * scale, y_offset + block_h * scale, fill=AXIS_X, width=2, tags="axis")
        # Eixo Y (Verde - Invertido visualmente para subir)
        self.canvas.create_line(x_offset, y_offset, x_offset, y_offset + block_h * scale, fill=AXIS_Y, width=2, tags="axis")
        
        # Labéis de Eixo
        self.canvas.create_text(x_offset + 10, y_offset + block_h * scale - 10, text="Y", fill=AXIS_Y, font=FONT_TINY_BOLD, tags="axis")
        self.canvas.create_text(x_offset + block_w * scale - 10, y_offset + block_h * scale - 10, text="X", fill=AXIS_X, font=FONT_TINY_BOLD, tags="axis")

    def _on_piece_click(self, event, item_id):
        """Interação AutoCAD: Seleciona e inspeciona peça."""
        # Limpar destaque anterior
        if self.selected_item:
            self.canvas.itemconfig(self.selected_item, outline=CYAN_ACCENT, width=1.5)
            
        self.selected_item = item_id
        data = self.canvas_data.get(item_id)
        
        if data:
            # Destacar nova peça
            self.canvas.itemconfig(item_id, outline=GOLD, width=3)
            self.canvas.tag_raise(item_id)
            
            # Atualizar Barra Inferior
            self.hud_id_label.configure(text=f"📦 ID: {data['id']}")
            self.hud_geo_label.configure(text=f"📐 L: {data['w']:.1f} | A: {data['h']:.1f} | Área: {data['area']:.0f} mm²")
            self.hud_coord_label.configure(text=f"📍 X: {data['pos_x']:.1f} | Y: {data['pos_y']:.1f}")
            logger.info(f"Peça {data['id']} selecionada via Picking.")

    def _on_measure_start(self, event):
        cx = self.canvas.canvasx(event.x)
        cy = self.canvas.canvasy(event.y)
        self.measure_start = (cx, cy)
        
        if self.measure_line: self.canvas.delete(self.measure_line)
        if self.measure_text: self.canvas.delete(self.measure_text)
        if self.measure_rect: self.canvas.delete(self.measure_rect)
            
        self.measure_line = self.canvas.create_line(cx, cy, cx, cy, fill="#ff00ff", width=2, dash=(4, 4), tags="measure")

    def _on_measure_drag(self, event):
        if not self.measure_start:
            return
            
        cx = self.canvas.canvasx(event.x)
        cy = self.canvas.canvasy(event.y)
        
        # Modo Ortho (Shift) - linha reta
        if getattr(event, 'state', 0) & 0x0001:
            if abs(cx - self.measure_start[0]) > abs(cy - self.measure_start[1]):
                cy = self.measure_start[1]
            else:
                cx = self.measure_start[0]
        
        self.canvas.coords(self.measure_line, self.measure_start[0], self.measure_start[1], cx, cy)
        
        dx_px = cx - self.measure_start[0]
        dy_px = cy - self.measure_start[1]
        
        dx_mm = abs(dx_px / self.current_scale)
        dy_mm = abs(dy_px / self.current_scale)
        d_mm = math.sqrt(dx_mm**2 + dy_mm**2)
        
        # Angulo (y invertido)
        angle_rad = math.atan2(-dy_px, dx_px)
        angle_deg = math.degrees(angle_rad)
        if angle_deg < 0: angle_deg += 360
        
        texto = f"dx: {dx_mm:.2f} | dy: {dy_mm:.2f} | d: {d_mm:.2f} | a: {angle_deg:.1f}°"
        self.hud_trena_label.configure(text=f"📏 TRENA: {texto}")
        
        if self.measure_text: self.canvas.delete(self.measure_text)
        if self.measure_rect: self.canvas.delete(self.measure_rect)
        
        # Fundo para o texto
        self.measure_text = self.canvas.create_text(
            cx + 15, cy - 15, text=texto, fill="#ff00ff", font=FONT_TINY_BOLD, anchor="sw", tags="measure"
        )
        bbox = self.canvas.bbox(self.measure_text)
        if bbox:
            self.measure_rect = self.canvas.create_rectangle(
                bbox[0]-3, bbox[1]-3, bbox[2]+3, bbox[3]+3, 
                fill=NAVY_DEEP, outline="#ff00ff", tags="measure"
            )
            self.canvas.tag_lower(self.measure_rect, self.measure_text)

    def _on_measure_end(self, event):
        if self.measure_line:
            coords = self.canvas.coords(self.measure_line)
            if coords:
                dx = abs(coords[2] - coords[0])
                dy = abs(coords[3] - coords[1])
                # Se foi só um clique (não moveu muito), limpa a medição
                if dx < 3 and dy < 3:
                    self.canvas.delete(self.measure_line)
                    if self.measure_text: self.canvas.delete(self.measure_text)
                    if self.measure_rect: self.canvas.delete(self.measure_rect)
                    self.measure_line = None
            self.hud_trena_label.configure(text="📏 TRENA: Desligada")
        self.measure_start = None

    def _on_mouse_move(self, event):
        cx = self.canvas.canvasx(event.x)
        cy = self.canvas.canvasy(event.y)
        
        ext = 100000
        # Cria ou move a mira infinita (estado "disabled" impede interferência nos cliques)
        if not self.cross_x_line:
            self.cross_x_line = self.canvas.create_line(-ext, cy, ext, cy, fill="#555555", dash=(2, 2), state="disabled", tags="crosshair")
            self.cross_y_line = self.canvas.create_line(cx, -ext, cx, ext, fill="#555555", dash=(2, 2), state="disabled", tags="crosshair")
        else:
            self.canvas.coords(self.cross_x_line, -ext, cy, ext, cy)
            self.canvas.coords(self.cross_y_line, cx, -ext, cx, ext)
            self.canvas.tag_raise("crosshair")

    def _on_zoom(self, event):
        if event.num == 4 or getattr(event, 'delta', 0) > 0:
            scale_factor = 1.1
        elif event.num == 5 or getattr(event, 'delta', 0) < 0:
            scale_factor = 1.0 / 1.1
        else:
            return

        cx = self.canvas.canvasx(event.x)
        cy = self.canvas.canvasy(event.y)
        
        self.canvas.scale("all", cx, cy, scale_factor, scale_factor)
        self.current_scale *= scale_factor
        
        # Atualiza a área de rolagem baseada no novo tamanho matemático total
        bbox = self.canvas.bbox("all")
        if bbox:
            self.canvas.configure(scrollregion=bbox)

    def reset_view(self):
        if hasattr(self, 'last_results') and self.last_results:
            self._render_results(self.last_results, self.last_dim)
            self.canvas.xview_moveto(0)
            self.canvas.yview_moveto(0)

    def _render_results(self, results, dim):
        self.last_results = results
        self.last_dim = dim
        self.canvas.delete("all")
        self.canvas_data.clear()
        self.selected_item = None
        
        self.hud_id_label.configure(text="📦 ID: -")
        self.hud_geo_label.configure(text="📐 L: - | A: - | Área: -")
        self.hud_coord_label.configure(text="📍 X: - | Y: -")
        self.hud_trena_label.configure(text="📏 TRENA: Desligada")
        
        if not results:
            self.canvas.create_text(
                self.canvas.winfo_width() / 2, self.canvas.winfo_height() / 2,
                text="Problema no encaixe: as peças podem ser maiores que o bloco disponível.",
                fill=RED_ACCENT, font=FONT_SECTION
            )
            return
        
        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        
        num_blocks = len(results)
        margin = 25
        
        # Escala baseada apenas na altura para evitar esmagamento horizontal!
        available_h = canvas_h - margin * 2
        scale = (available_h / dim[1]) * 0.85
        
        block_draw_w = dim[0] * scale
        block_draw_h = dim[1] * scale
        
        y_offset = (canvas_h - block_draw_h) / 2
        
        # Configurar scrollregion para habilitar a barra de rolagem e pan
        total_w = margin + num_blocks * (block_draw_w + margin)
        self.canvas.configure(scrollregion=(0, 0, max(canvas_w, total_w), canvas_h))
        
        y_offset = (canvas_h - block_draw_h) / 2
        
        self.current_scale = scale
        
        # Paleta brutalista
        colors = [NAVY_MID, NAVY_CARD, "#2a4365", "#2c5282", "#2b6cb0"]
        
        # OTIMIZAÇÃO ANTI-FREEZE
        total_p = sum(len(b) for b in results)
        is_massive = total_p > 2000
        
        blocks_to_draw = results
        if total_p > 5000:
            # Encontrar o ponto de corte para não ultrapassar 5000 peças desenhadas
            drawn_count = 0
            limit_idx = 0
            for i, b in enumerate(results):
                drawn_count += len(b)
                if drawn_count > 5000:
                    limit_idx = i + 1
                    break
            blocks_to_draw = results[:limit_idx]
            self.show_toast(f"⚡ MODO OVERDRIVE: Desenhando {limit_idx} blocos detalhados (Ocultando o resto na interface, G-Code intacto).")
            
        for b_idx, block in enumerate(blocks_to_draw):
            x_offset = margin + b_idx * (block_draw_w + margin)
            
            # Fundo do Bloco
            self.canvas.create_rectangle(
                x_offset, y_offset, 
                x_offset + block_draw_w, y_offset + block_draw_h,
                outline=GOLD, fill=NAVY_DEEP, width=2, dash=(4,2)
            )
            
            self.canvas.create_text(
                x_offset + block_draw_w / 2, y_offset - 10,
                text=f"BLOCO EPS {b_idx + 1}", fill=GOLD, font=FONT_TINY_BOLD,
                anchor="s"
            )
            
            # Technical Grid & Axes (AutoCAD Mode)
            self._draw_technical_grid(x_offset, y_offset, dim[0], dim[1], scale)
            self._draw_axes(x_offset, y_offset, dim[0], dim[1], scale)

            fill_color = colors[b_idx % len(colors)]
            
            # C5: Renderiza polígonos perfeitamente para True Shape
            for i, poly in enumerate(block):
                # Calcular metadados para o inspector
                minx, miny, maxx, maxy = poly.bounds
                pw, ph = maxx - minx, maxy - miny
                
                # Transforma coords Shapely -> tkinter pixels
                coords = list(poly.exterior.coords)
                tk_coords = []
                for px, py in coords:
                    cx = x_offset + px * scale
                    # Eixo Y no Tkinter é invertido (cresce para baixo). Vamos inverter para mostrar o y=0 na base:
                    cy = y_offset + block_draw_h - (py * scale)
                    tk_coords.extend([cx, cy])
                    
                p_id = self.canvas.create_polygon(tk_coords, outline=CYAN_ACCENT, fill=fill_color, width=1.0 if is_massive else 1.5, tags=f"piece_{b_idx}_{i}")
                
                # Se não for massivo, permite inspeção visual por clique.
                if not is_massive:
                    self.canvas_data[p_id] = {
                        "id": f"B{b_idx+1}-P{i+1}",
                        "w": pw, "h": ph,
                        "pos_x": minx, "pos_y": miny,
                        "area": poly.area
                    }
                    self.canvas.tag_bind(p_id, "<Button-1>", lambda e, pid=p_id: self._on_piece_click(e, pid))
        
        # Atualização HUD
        total_blocks, waste_pct, retalho_dim, pecas_por_bloco = self.engine.calculate_stats()
        eficiencia = 100.0 - waste_pct
        
        self.lbl_efi.configure(text=f"{eficiencia:.1f}%")
        self.lbl_blocos.configure(text=f"{total_blocks}")
        
        retalho_txt = f"{retalho_dim[0]:.0f}x{retalho_dim[1]:.0f} mm" if retalho_dim[0] > 0 else "Nenhum"
        pecas_txt = " | ".join([f"B{i+1}: {n}" for i, n in enumerate(pecas_por_bloco)])
        
        self._update_textbox_metric(self.lbl_sobra, retalho_txt)
        self._update_textbox_metric(self.lbl_pecas_bloco, pecas_txt)

        # Auto-save do maior retalho no banco de dados com lock safe
        if retalho_dim[0] > 100 and retalho_dim[1] > 100:
            def _save_retalho():
                self.db.inserir_retalho(round(retalho_dim[0]), round(retalho_dim[1]))
            # Executa DB operation off-main thread     
            threading.Thread(target=_save_retalho, daemon=True).start()
