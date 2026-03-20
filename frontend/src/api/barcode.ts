import client from './client'

export interface BarcodeResult {
  barcode: string
  name: string
  brand: string
  quantity: string
  image_url: string | null
  per_100g: {
    calories: number | null
    protein: number | null
    carbs: number | null
    fat: number | null
    fibre: number | null
    sugar: number | null
    salt: number | null
  }
}

export const lookupBarcode = (barcode: string) =>
  client.get<BarcodeResult>(`/barcode/${barcode}`).then(r => r.data)

export const searchFood = (q: string) =>
  client.get<BarcodeResult[]>('/food-search', { params: { q } }).then(r => r.data)
