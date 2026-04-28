"""MOLDURIZE — Gerenciador de Banco de Dados SQLite"""

import sqlite3
import os
import logging
from datetime import datetime
import threading

logger = logging.getLogger("moldurize.db")

class DBManager:
    """Implementa padrão Singleton com thread lock e modo WAL para evitar database locks."""
    _instance = None
    _lock = threading.Lock()
    
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__)))), "estoque_eps.db")

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._init_db()
            return cls._instance

    def _init_db(self):
        try:
            self.conn = sqlite3.connect(self.DB_PATH, check_same_thread=False)
            self.conn.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging para concorrência
            self.conn.execute("PRAGMA synchronous=NORMAL")
            self.conn.row_factory = sqlite3.Row
            self._create_tables()
            logger.info("Banco de dados SQLite inicializado com sucesso.")
        except sqlite3.Error as e:
            logger.error(f"Falha ao conectar no banco de dados: {e}")
            self.conn = None

    def _create_tables(self):
        if not self.conn: return
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS retalhos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_geracao TEXT NOT NULL,
                largura_x REAL NOT NULL,
                altura_y REAL NOT NULL,
                profundidade_z REAL NOT NULL DEFAULT 1000,
                status TEXT NOT NULL DEFAULT 'disponivel'
            )
        """)
        self.conn.commit()

    def inserir_retalho(self, largura, altura, profundidade=1000.0):
        if not self.conn: return False
        
        # S3: Validação de Segurança / Sanity Check
        MAX_DIM = 20000  # 20 metros (margem segura)
        if not (0 < largura <= MAX_DIM and 0 < altura <= MAX_DIM):
            logger.warning(f"Tentativa de inserir dimensão inválida no banco: {largura}x{altura}")
            raise ValueError(f"Dimensão fora do limite industrial (0-{MAX_DIM}mm)")

        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        try:
            with self._lock:
                self.conn.execute(
                    "INSERT INTO retalhos (data_geracao, largura_x, altura_y, profundidade_z) VALUES (?, ?, ?, ?)",
                    (now, largura, altura, profundidade)
                )
                self.conn.commit()
            logger.info(f"Retalho inserido: {largura}x{altura}x{profundidade}")
            return True
        except sqlite3.Error as e:
            logger.error(f"Erro ao inserir retalho: {e}")
            return False

    def listar_retalhos(self, status=None, sort_by="id DESC"):
        if not self.conn: return []
        
        # Filtro de segurança básico
        allowed_sorts = {"id DESC", "id ASC", "largura_x DESC", "altura_y DESC", "data_geracao DESC"}
        if sort_by not in allowed_sorts:
            sort_by = "id DESC"

        query = "SELECT * FROM retalhos"
        params = ()
        
        if status:
            query += " WHERE status = ?"
            params = (status,)
            
        query += f" ORDER BY {sort_by}"
            
        try:
            with self._lock:
                cursor = self.conn.execute(query, params)
                return cursor.fetchall()
        except sqlite3.Error as e:
            logger.error(f"Erro ao listar retalhos: {e}")
            return []

    def deletar_retalho(self, rid):
        if not self.conn: return False
        try:
            with self._lock:
                self.conn.execute("DELETE FROM retalhos WHERE id = ?", (rid,))
                self.conn.commit()
            return True
        except sqlite3.Error as e:
            logger.error(f"Erro ao deletar retalho: {e}")
            return False

    def atualizar_status(self, rid, novo_status):
        if not self.conn: return False
        try:
            with self._lock:
                self.conn.execute(
                    "UPDATE retalhos SET status = ? WHERE id = ?",
                    (novo_status, rid)
                )
                self.conn.commit()
            return True
        except sqlite3.Error as e:
            logger.error(f"Erro ao atualizar status: {e}")
            return False
            
    def close(self):
        if self.conn:
            try:
                self.conn.close()
                self.conn = None
                logger.info("Conexão SQLite encerrada.")
            except sqlite3.Error as e:
                logger.error(f"Erro ao fechar conexão: {e}")
