import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center max-w-sm">
          <h1 className="text-xl font-bold text-indigo-600 mb-2">Meal Planner</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in with your Google account to continue.</p>
          <button
            onClick={signIn}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm hover:bg-indigo-700 w-full"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
