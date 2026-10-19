"""Authentication: password login + demo-role login, JWT with role checks (enforced server-side)."""
import hashlib, hmac, os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

SECRET = os.getenv("JWT_SECRET", "dev-only-change-me-before-deployment")
ALGORITHM = "HS256"
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "karya2026")
DEMO_MODE = os.getenv("DEMO_MODE", "1") == "1"   # set DEMO_MODE=0 to disable one-click demo logins
oauth = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

ROLES = {"planner": "Policy Planner", "officer": "Data Officer", "analyst": "Skill Analyst"}
_SALT = b"karyadrishti-demo-salt"

def _hash(pw: str) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), _SALT, 120_000)

USERS = {  # DEMO users only. Replace with a database table before real use.
    f"{role}@karyadrishti.in": {"role": role, "name": label, "hash": _hash(DEMO_PASSWORD)}
    for role, label in ROLES.items()
}

def authenticate(email: str, password: str):
    u = USERS.get(email.strip().lower())
    # compare even when the user is unknown so timing does not reveal valid emails
    ok = hmac.compare_digest(_hash(password), u["hash"] if u else _hash("x"))
    return u if (u and ok) else None

def issue_token(email: str, role: str, name: str):
    claims = {"sub": email, "role": role, "name": name, "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    return {"access_token": jwt.encode(claims, SECRET, algorithm=ALGORITHM), "token_type": "bearer", "role": role, "name": name}

def current_user(token: str = Depends(oauth)):
    try:
        d = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return {"id": d["sub"], "role": d["role"], "name": d.get("name", "")}
    except (JWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_roles(*roles: str):
    def dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Your role cannot access this resource")
        return user
    return dep
