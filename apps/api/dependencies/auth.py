import os
import jwt
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# O token é passado via Authorization: Bearer <token>
security = HTTPBearer(auto_error=False)

_jwks_client = None

def get_jwks_client():
    global _jwks_client
    if not _jwks_client:
        issuer_url = os.getenv("CLERK_ISSUER_URL")
        if not issuer_url:
            raise ValueError("CLERK_ISSUER_URL não configurado no backend.")
        jwks_url = f"{issuer_url}/.well-known/jwks.json"
        _jwks_client = jwt.PyJWKClient(jwks_url)
    return _jwks_client

def _dev_auth_enabled() -> bool:
    """Dev bypass: active when MVP_DEV_MODE=true OR when CLERK_ISSUER_URL is not configured."""
    # Explicit dev mode override — always beats everything (never enabled in production)
    if os.getenv("MVP_DEV_MODE", "").lower() == "true":
        return os.getenv("ENVIRONMENT", "development").lower() != "production"
    environment = os.getenv("ENVIRONMENT", "development").lower()
    issuer_url = os.getenv("CLERK_ISSUER_URL", "")
    return environment != "production" and (
        not issuer_url or "SUBSTITUA" in issuer_url or issuer_url.startswith("http://localhost")
    )


async def get_current_user_clerk_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Decodifica o token JWT do Clerk e retorna o 'clerk_id' (campo 'sub').
    Esta dependência bloqueia com 401 quem não mandar um token válido.
    """
    if credentials is None:
        if _dev_auth_enabled():
            return os.getenv("MVP_USER_ID", "dev_user")
        raise HTTPException(status_code=401, detail="Token ausente.")

    token = credentials.credentials
    issuer_url = os.getenv("CLERK_ISSUER_URL")

    if not issuer_url and _dev_auth_enabled():
        return os.getenv("MVP_USER_ID", "dev_user")

    try:
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer_url
        )
        
        clerk_id = payload.get("sub")
        if not clerk_id:
            raise HTTPException(status_code=401, detail="Token JWT inválido (sub missing).")
            
        return clerk_id
        
    except jwt.PyJWKClientError as e:
         raise HTTPException(status_code=401, detail=f"Erro ao obter Chaves Públicas do Clerk: {str(e)}")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token JWT expirado.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Token JWT inválido: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno de autenticação: {str(e)}")
