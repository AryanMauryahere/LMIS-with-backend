from fastapi import APIRouter, Depends
from functools import lru_cache
from app.schemas import ForecastRequest, ForecastResponse, ScenarioRequest, ScenarioResponse, Token, SkillMatchRequest, SkillMatchResponse, SkillMatch
from app.security import current_user, issue_token
from app.analytics import forecast, simulate

router = APIRouter()
@lru_cache(maxsize=1)
def _skill_model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
@router.post("/auth/token", response_model=Token)
def token(): return issue_token()
@router.get("/me")
def me(user=Depends(current_user)): return user
@router.post("/forecasts", response_model=ForecastResponse)
def forecasts(body: ForecastRequest, user=Depends(current_user)): return forecast(body)
@router.post("/scenarios", response_model=ScenarioResponse)
def scenarios(body: ScenarioRequest, user=Depends(current_user)): return simulate(body)
@router.post("/skills/match", response_model=SkillMatchResponse)
def match_skills(body: SkillMatchRequest, user=Depends(current_user)):
    from sklearn.metrics.pairwise import cosine_similarity
    model = _skill_model()
    vectors = model.encode([body.query, *body.candidates], normalize_embeddings=True)
    scores = cosine_similarity(vectors[:1], vectors[1:])[0]
    matches = sorted((SkillMatch(skill=skill, similarity=round(float(score), 4)) for skill, score in zip(body.candidates, scores)), key=lambda m: m.similarity, reverse=True)
    return SkillMatchResponse(matches=matches[:10], model="all-MiniLM-L6-v2")
