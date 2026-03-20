import client from './client'
import type { FoodLogEntry } from '../types'

export const getFoodLog = (start_date: string, end_date: string, profile_id?: string) =>
  client.get<FoodLogEntry[]>('/food-log', { params: { start_date, end_date, profile_id } }).then(r => r.data)

export const createFoodLogEntry = (data: Omit<FoodLogEntry, 'id'>) =>
  client.post<FoodLogEntry>('/food-log', data).then(r => r.data)

export const deleteFoodLogEntry = (id: string) =>
  client.delete(`/food-log/${id}`)
