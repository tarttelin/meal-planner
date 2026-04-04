from __future__ import annotations

from pydantic import BaseModel, Field


class Nutrition(BaseModel):
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    nutriments: dict[str, float | str] = Field(default_factory=dict)

    def add(self, other: "Nutrition") -> "Nutrition":
        merged = dict(self.nutriments)
        for k, v in other.nutriments.items():
            if isinstance(v, (int, float)) and isinstance(merged.get(k), (int, float)):
                merged[k] = float(merged[k]) + float(v)
            else:
                merged[k] = v
        return Nutrition(
            calories=self.calories + other.calories,
            protein=self.protein + other.protein,
            carbs=self.carbs + other.carbs,
            fat=self.fat + other.fat,
            nutriments=merged,
        )

    def scale(self, factor: float) -> "Nutrition":
        scaled_nutriments = {
            k: (v * factor if isinstance(v, (int, float)) else v)
            for k, v in self.nutriments.items()
        }
        return Nutrition(
            calories=self.calories * factor,
            protein=self.protein * factor,
            carbs=self.carbs * factor,
            fat=self.fat * factor,
            nutriments=scaled_nutriments,
        )

    def divide(self, divisor: float) -> "Nutrition":
        if divisor == 0:
            return Nutrition()
        return self.scale(1.0 / divisor)

    @classmethod
    def zero(cls) -> "Nutrition":
        return cls()

    @classmethod
    def sum_of(cls, items: list["Nutrition"]) -> "Nutrition":
        total = cls.zero()
        for item in items:
            total = total.add(item)
        return total
