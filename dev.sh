#!/bin/bash
# MOLDURIZE WEB — Script de desenvolvimento local
# Inicia o backend FastAPI e o frontend Next.js

set -e

echo "====================================="
echo "  MOLDURIZE WEB — Dev Server"
echo "====================================="

# Verificar se .env.local existe no frontend
if [ ! -f "apps/web/.env.local" ]; then
  echo ""
  echo "AVISO: apps/web/.env.local não encontrado."
  echo "Copie .env.example e preencha as variáveis:"
  echo "  cp .env.example apps/web/.env.local"
  echo ""
fi

# Iniciar backend em background
echo ""
echo "[1/2] Iniciando Backend FastAPI (porta 8001)..."
cd apps/api
uvicorn main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!
cd ../..

sleep 2
echo "  ✓ Backend rodando em http://localhost:8001"
echo "  ✓ Docs disponíveis em http://localhost:8001/docs"

# Iniciar frontend
echo ""
echo "[2/2] Iniciando Frontend Next.js (porta 3000)..."
cd apps/web
pnpm dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "====================================="
echo "  Serviços ativos:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8001"
echo "  API Docs: http://localhost:8001/docs"
echo "====================================="
echo ""
echo "Pressione Ctrl+C para parar todos os serviços."
echo ""

# Aguardar e limpar ao encerrar
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Serviços encerrados.'" EXIT
wait
