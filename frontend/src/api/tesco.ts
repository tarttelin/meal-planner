import client from './client'

export const getTescoStatus = () =>
  client.get<{ connected: boolean; logged_in: boolean }>('/tesco/status').then(r => r.data)

export const tescoLogin = () =>
  client.post('/tesco/login').then(r => r.data)

export const tescoSearch = (query: string) =>
  client.post('/tesco/search', { query }).then(r => r.data)

export const tescoAddToBasket = (item_ids?: string[]) =>
  client.post('/tesco/add-to-basket', { item_ids }).then(r => r.data)

export const getTescoBasket = () =>
  client.get('/tesco/basket').then(r => r.data)
