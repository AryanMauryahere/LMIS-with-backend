import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from app.schemas import ForecastRequest, ForecastResponse, ForecastPoint, HistoryPoint, ScenarioRequest, ScenarioResponse

# SYNTHETIC demo observations (Nov 2025 - Oct 2026); replace with verified labour-market data.
DEMAND = np.array([3100,3260,3330,3480,3570,3720,3850,3970,4090,4210,4380,4490], dtype=float)
SUPPLY = np.array([2770,2820,2890,2910,3010,3100,3180,3270,3350,3470,3560,3680], dtype=float)
_MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

def _label(offset: int) -> str:
    """offset 0 = Nov 2025 (first observation). Unique 'Mon YY' labels keep chart axes unambiguous."""
    m = 10 + offset
    return f"{_MON[m % 12]} {25 + m // 12}"

def _holt(values, horizon):
    fit = ExponentialSmoothing(values, trend="add", seasonal=None, initialization_method="estimated").fit(optimized=True)
    return np.maximum(0, fit.forecast(horizon))

def _arima(values, horizon):
    return np.maximum(0, ARIMA(values, order=(1, 1, 1)).fit().forecast(horizon))

def _backtest_error(predictor, values, holdout=3):
    """Mean absolute % error when forecasting the last `holdout` known months from earlier data."""
    try:
        pred = predictor(values[:-holdout], holdout)
        return float(np.mean(np.abs(pred - values[-holdout:]) / values[-holdout:]))
    except Exception:
        return 0.08  # conservative fallback if the model cannot be fitted

def forecast(req: ForecastRequest):
    n = req.horizon_months
    predictor = _arima if req.model == "arima" else _holt
    demand, supply = predictor(DEMAND, n), predictor(SUPPLY, n)
    err = _backtest_error(predictor, DEMAND)
    band = max(0.03, err)  # forecast interval half-width as a share of the value
    start = len(DEMAND)
    points = [ForecastPoint(month=_label(start + i), demand=round(float(demand[i])), supply=round(float(supply[i])),
                            lower=round(float(demand[i]) * (1 - band)), upper=round(float(demand[i]) * (1 + band))) for i in range(n)]
    history = [HistoryPoint(month=_label(i), demand=int(DEMAND[i]), supply=int(SUPPLY[i])) for i in range(len(DEMAND))]
    return ForecastResponse(model="arima_1_1_1" if req.model == "arima" else "holt_exponential_smoothing",
                            confidence=round(max(0.0, 1 - err), 3), points=points, history=history)

def simulate(req: ScenarioRequest):
    baseline = round(float(_holt(DEMAND, req.horizon_months)[-1] - _holt(SUPPLY, req.horizon_months)[-1]))
    added = round(520 * req.training_seats_pct / 8 * req.completion_rate / .72 * req.job_entry_rate / .63)
    projected = max(0, baseline - added)
    return ScenarioResponse(baseline_gap=baseline, projected_gap=projected, workers_added=baseline - projected, confidence=.84)
