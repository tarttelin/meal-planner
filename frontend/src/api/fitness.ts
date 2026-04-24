import client from './client'
import type { FitnessActivity, FitnessActivityDetail, StravaConnectionStatus } from '../types'

export const getStravaStatus = () =>
  client.get<StravaConnectionStatus>('/fitness/strava/status').then(r => r.data)

export const getStravaConnectUrl = () =>
  client.get<{ authorization_url: string }>('/fitness/strava/connect-url').then(r => r.data)

export const syncStravaActivities = (days = 30) =>
  client.post<{ synced: number; activities: FitnessActivity[] }>('/fitness/strava/sync', null, { params: { days } }).then(r => r.data)

export const listFitnessActivities = (limit = 50) =>
  client.get<FitnessActivity[]>('/fitness/activities', { params: { limit } }).then(r => r.data)

export const getFitnessActivity = (id: string) =>
  client.get<FitnessActivityDetail>(`/fitness/activities/${id}`).then(r => r.data)

export const uploadFitFile = (id: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return client.post<FitnessActivity>(`/fitness/activities/${id}/fit-file`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
