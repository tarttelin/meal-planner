import client from './client'
import type { Recipe, RecipeCreate } from '../types'

export const listRecipes = (search?: string, tag?: string) =>
  client.get<Recipe[]>('/recipes', { params: { search, tag } }).then(r => r.data)

export const getRecipe = (id: string) =>
  client.get<Recipe>(`/recipes/${id}`).then(r => r.data)

export const createRecipe = (data: RecipeCreate) =>
  client.post<Recipe>('/recipes', data).then(r => r.data)

export const updateRecipe = (id: string, data: RecipeCreate) =>
  client.put<Recipe>(`/recipes/${id}`, data).then(r => r.data)

export const deleteRecipe = (id: string) =>
  client.delete(`/recipes/${id}`)
