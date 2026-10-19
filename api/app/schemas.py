from pydantic import BaseModel, Field
from typing import Literal

class ForecastRequest(BaseModel):
    state: str = "Maharashtra"
    district: str | None = None
    sector: str = "All sectors"
    horizon_months: int = Field(6, ge=1, le=24)
    model: Literal["holt", "arima"] = "holt"

class ForecastPoint(BaseModel):
    month: str
    demand: int
    supply: int
    lower: int
    upper: int

class HistoryPoint(BaseModel):
    month: str
    demand: int
    supply: int

class ForecastResponse(BaseModel):
    model: str
    confidence: float
    points: list[ForecastPoint]
    history: list[HistoryPoint]
    synthetic: bool = True

class ScenarioRequest(BaseModel):
    training_seats_pct: float = Field(8, ge=0, le=100)
    completion_rate: float = Field(.72, ge=0, le=1)
    job_entry_rate: float = Field(.63, ge=0, le=1)
    horizon_months: int = Field(6, ge=1, le=24)

class ScenarioResponse(BaseModel):
    baseline_gap: int
    projected_gap: int
    workers_added: int
    confidence: float

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str = ""

class DemoLoginRequest(BaseModel):
    role: Literal["planner", "officer", "analyst"]

class SkillMatchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=240)
    candidates: list[str] = Field(default_factory=lambda: ["Welding", "Solar installation", "Retail operations", "Python programming", "Construction safety"], max_length=30)

class SkillMatch(BaseModel):
    skill: str
    similarity: float

class SkillMatchResponse(BaseModel):
    matches: list[SkillMatch]
    model: str
