import client from './client'
import type { ShoppingListItem } from '../types'

export const getShoppingList = () =>
  client.get<ShoppingListItem[]>('/shopping-list').then(r => r.data)

export const generateShoppingList = (start_date: string, end_date: string) =>
  client.post<ShoppingListItem[]>('/shopping-list/generate', { start_date, end_date }).then(r => r.data)

export const addShoppingItem = (data: { ingredient_name: string; quantity?: number; unit?: string }) =>
  client.post<ShoppingListItem>('/shopping-list/items', data).then(r => r.data)

export const updateShoppingItem = (id: string, data: Partial<ShoppingListItem>) =>
  client.put<ShoppingListItem>(`/shopping-list/items/${id}`, data).then(r => r.data)

export const deleteShoppingItem = (id: string) =>
  client.delete(`/shopping-list/items/${id}`)
