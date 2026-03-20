import client from './client'
import type { Profile } from '../types'

export const listProfiles = () =>
  client.get<Profile[]>('/profiles').then(r => r.data)

export const createProfile = (data: Omit<Profile, 'id'>) =>
  client.post<Profile>('/profiles', data).then(r => r.data)

export const updateProfile = (id: string, data: Omit<Profile, 'id'>) =>
  client.put<Profile>(`/profiles/${id}`, data).then(r => r.data)

export const deleteProfile = (id: string) =>
  client.delete(`/profiles/${id}`)
