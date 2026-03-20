import client from './client'
import type { PantryItem } from '../types'

export const listPantry = (search?: string) =>
  client.get<PantryItem[]>('/pantry', { params: { search } }).then(r => r.data)

export const scanBarcode = (barcode: string) =>
  client.post<PantryItem>('/pantry/scan', { barcode }).then(r => r.data)

export const createPantryItem = (data: Partial<PantryItem>) =>
  client.post<PantryItem>('/pantry', data).then(r => r.data)

export const updatePantryItem = (id: string, data: Partial<PantryItem>) =>
  client.put<PantryItem>(`/pantry/${id}`, data).then(r => r.data)

export const deletePantryItem = (id: string) =>
  client.delete(`/pantry/${id}`)

export const importRecipeIngredients = (recipeId: string) =>
  client.post<PantryItem[]>(`/pantry/import-recipe/${recipeId}`).then(r => r.data)

export const scanToUpdatePantryItem = (id: string, barcode: string) =>
  client.post<PantryItem>(`/pantry/${id}/scan`, { barcode }).then(r => r.data)
