import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { listProfiles } from '../api/profiles'
import type { Profile } from '../types'

interface ProfileContextValue {
  profiles: Profile[]
  activeProfile: Profile | null
  setActiveProfileId: (id: string | null) => void
  refreshProfiles: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue>({
  profiles: [],
  activeProfile: null,
  setActiveProfileId: () => {},
  refreshProfiles: async () => {},
})

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem('activeProfileId'))

  const refreshProfiles = async () => {
    const data = await listProfiles()
    setProfiles(data)
    if (activeId && !data.find(p => p.id === activeId)) {
      setActiveId(data[0]?.id ?? null)
    }
  }

  useEffect(() => { refreshProfiles() }, [])

  const setActiveProfileId = (id: string | null) => {
    setActiveId(id)
    if (id) localStorage.setItem('activeProfileId', id)
    else localStorage.removeItem('activeProfileId')
  }

  const activeProfile = profiles.find(p => p.id === activeId) ?? null

  return (
    <ProfileContext.Provider value={{ profiles, activeProfile, setActiveProfileId, refreshProfiles }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
