import { useEffect, useState } from 'react'
import { getTescoStatus, tescoLogin } from '../../api/tesco'

export default function TescoStatus() {
  const [status, setStatus] = useState<{ connected: boolean; logged_in: boolean } | null>(null)

  const load = async () => {
    try {
      const s = await getTescoStatus()
      setStatus(s)
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => { load() }, [])

  const handleLogin = async () => {
    await tescoLogin()
    setTimeout(load, 5000)
  }

  return (
    <div className="mt-6 p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-sm font-semibold mb-2">Tesco Connection</h2>
      {status === null ? (
        <p className="text-sm text-gray-500">Unable to check Tesco status</p>
      ) : status.logged_in ? (
        <p className="text-sm text-green-600">Connected to Tesco</p>
      ) : (
        <button onClick={handleLogin} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
          Connect to Tesco
        </button>
      )}
    </div>
  )
}
