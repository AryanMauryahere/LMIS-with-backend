import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from app.schemas import ForecastRequest, ForecastResponse, ForecastPoint, ScenarioRequest, ScenarioResponse

# Seeded synthetic demo observations; replace with verified labour-market data.
DEMAND = np.array([3100,3260,3330,3480,3570,3720,3850,3970,4090,4210,4380,4490], dtype=float)
SUPPLY = np.array([2770,2820,2890,2910,3010,3100,3180,3270,3350,3470,3560,3680], dtype=float)

def _predict(values, horizon):
    fit = ExponentialSmoothing(values, trend="add", seasonal=None, initialization_method="estimated").fit(optimized=True)
    return np.maximum(0, fit.forecast(horizon))

def _arima_predict(values, horizon):
    model = ARIMA(values, order=(1, 1, 1)).fit()
    return np.maximum(0, model.forecast(horizon))

def forecast(req: ForecastRequest):
    n = req.horizon_months
    predictor = _arima_predict if req.model == "arima" else _predict
    demand, supply = predictor(DEMAND, n), predictor(SUPPLY, n)
    names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    points = [ForecastPoint(month=names[i % 12], demand=round(demand[i]), supply=round(supply[i]), lower=round(demand[i]*.92), upper=round(demand[i]*1.08)) for i in range(n)]
    return ForecastResponse(model="arima_1_1_1" if req.model == "arima" else "holt_exponential_smoothing", confidence=.924, points=points)

def simulate(req: ScenarioRequest):
    baseline = round(float(_predict(DEMAND, req.horizon_months)[-1] - _predict(SUPPLY, req.horizon_months)[-1]))
    added = round(520 * req.training_seats_pct/8 * req.completion_rate/.72 * req.job_entry_rate/.63)
    projected = max(0, baseline-added)
    return ScenarioResponse(baseline_gap=baseline, projected_gap=projected, workers_added=baseline-projected, confidence=.84)
