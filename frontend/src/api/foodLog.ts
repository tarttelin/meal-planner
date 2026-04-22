import client from './client'
import type { FoodLogEntry } from '../types'

export interface FoodLogCreatePayload {
  date: string
  slot?: string | null
  name: string
  pantry_item_id?: string | null
  recipe_id?: string | null
  meal_plan_id?: string | null
  consumed_servings?: number | null
  quantity_g?: number | null
  profile_id?: string | null
}

export interface FoodLogUpdatePayload {
  consumed_servings?: number | null
  quantity_g?: number | null
}

export const getFoodLog = (start_date: string, end_date: string, profile_id?: string) =>
  client.get<FoodLogEntry[]>('/food-log', { params: { start_date, end_date, profile_id } }).then(r => r.data)

export const createFoodLogEntry = (data: FoodLogCreatePayload) =>
  client.post<FoodLogEntry>('/food-log', data).then(r => r.data)

export const updateFoodLogEntry = (id: string, data: FoodLogUpdatePayload) =>
  client.put<FoodLogEntry>(`/food-log/${id}`, data).then(r => r.data)

export const deleteFoodLogEntry = (id: string) =>
  client.delete(`/food-log/${id}`)
