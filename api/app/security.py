import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

SECRET = os.getenv("JWT_SECRET", "dev-only-change-me-before-deployment")
ALGORITHM = "HS256"
oauth = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

def issue_token():
    claims = {"sub": "demo-analyst", "role": "policy_analyst", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    return {"access_token": jwt.encode(claims, SECRET, algorithm=ALGORITHM), "token_type": "bearer", "role": "policy_analyst"}

def current_user(token: str = Depends(oauth)):
    try:
        data = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return {"id": data["sub"], "role": data["role"]}
    except (JWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
