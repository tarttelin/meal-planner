import client from './client'
import type { MealPlan } from '../types'

export const getMealPlans = (week: string, profile_id?: string) =>
  client.get<MealPlan[]>('/meal-plans', { params: { week, profile_id } }).then(r => r.data)

export const createMealPlan = (data: { date: string; slot: string; recipe_id: string; planned_servings?: number; profile_id?: string | null }) =>
  client.post<MealPlan>('/meal-plans', data).then(r => r.data)

export const deleteMealPlan = (id: string) =>
  client.delete(`/meal-plans/${id}`)
