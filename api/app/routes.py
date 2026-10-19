from functools import lru_cache
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas import (ForecastRequest, ForecastResponse, ScenarioRequest, ScenarioResponse, Token, DemoLoginRequest,
                         SkillMatchRequest, SkillMatchResponse, SkillMatch)
from app.security import current_user, require_roles, issue_token, authenticate, USERS, DEMO_MODE
from app.analytics import forecast, simulate

router = APIRouter()
ANY = ("planner", "officer", "analyst")

@lru_cache(maxsize=1)
def _skill_model():
    from sentence_transformers import SentenceTransformer  # heavy import: only when first needed
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

@router.post("/auth/token", response_model=Token)
def token(form: OAuth2PasswordRequestForm = Depends()):
    u = authenticate(form.username, form.password)
    if not u:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return issue_token(form.username.strip().lower(), u["role"], u["name"])

@router.post("/auth/demo", response_model=Token)
def demo(body: DemoLoginRequest):
    if not DEMO_MODE:
        raise HTTPException(status_code=403, detail="Demo login is disabled")
    email = f"{body.role}@karyadrishti.in"
    return issue_token(email, USERS[email]["role"], USERS[email]["name"])

@router.get("/me")
def me(user=Depends(current_user)):
    return user

@router.post("/forecasts", response_model=ForecastResponse)
def forecasts(body: ForecastRequest, user=Depends(require_roles(*ANY))):
    return forecast(body)

@router.post("/scenarios", response_model=ScenarioResponse)
def scenarios(body: ScenarioRequest, user=Depends(require_roles("planner", "analyst"))):
    return simulate(body)

@router.get("/public/forecast", response_model=ForecastResponse)
def public_forecast(horizon_months: int = 6):
    """Read-only, no login. Same synthetic data, no scenario controls."""
    return forecast(ForecastRequest(horizon_months=max(1, min(12, horizon_months))))

@router.post("/skills/match", response_model=SkillMatchResponse)
def match_skills(body: SkillMatchRequest, user=Depends(require_roles("analyst", "planner"))):
    from sklearn.metrics.pairwise import cosine_similarity
    model = _skill_model()
    vectors = model.encode([body.query, *body.candidates], normalize_embeddings=True)
    scores = cosine_similarity(vectors[:1], vectors[1:])[0]
    matches = sorted((SkillMatch(skill=s, similarity=round(float(x), 4)) for s, x in zip(body.candidates, scores)),
                     key=lambda m: m.similarity, reverse=True)
    return SkillMatchResponse(matches=matches[:10], model="all-MiniLM-L6-v2")
