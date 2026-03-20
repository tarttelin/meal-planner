import axios from 'axios'

const client = axios.create({ baseURL: '/api' })

export function setAuthToken(token: string | null) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete client.defaults.headers.common['Authorization']
  }
}

export default client
