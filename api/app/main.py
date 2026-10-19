import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router

ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8080").split(",")
app = FastAPI(title="KaryaDrishti API", version="1.1.0", description="Labour market intelligence and scenario forecasting API")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in ORIGINS], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "service": "karyadrishti-api"}
