from typing import List

from pydantic import BaseModel


class JobRankingItem(BaseModel):
    job_id: str
    type: str
    value_yesterday: float
    value_7d_avg: float
    change_pct: float
    history_7d: List[float]  # 7 daily values, oldest → newest
