import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStravaConnectUrl, getStravaStatus, listFitnessActivities, syncStravaActivities } from '../../api/fitness'
import type { FitnessActivity, StravaConnectionStatus } from '../../types'
import { formatDateTime, formatDistance, formatDuration, formatPace } from './format'

export default function FitnessDashboard() {
  const [status, setStatus] = useState<StravaConnectionStatus | null>(null)
  const [activities, setActivities] = useState<FitnessActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [connection, items] = await Promise.all([getStravaStatus(), listFitnessActivities()])
      setStatus(connection)
      setActivities(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load training data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const totals = useMemo(() => activities.reduce((acc, activity) => {
    acc.distance += activity.distance_m || 0
    acc.time += activity.moving_time_s || 0
    acc.elevation += activity.total_elevation_gain_m || 0
    return acc
  }, { distance: 0, time: 0, elevation: 0 }), [activities])

  const connect = async () => {
    const { authorization_url } = await getStravaConnectUrl()
    window.location.href = authorization_url
  }

  const sync = async () => {
    setSyncing(true)
    setError(null)
    try {
      await syncStravaActivities(30)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Strava sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="fitness-page">
      <div className="fitness-toolbar">
        <div>
          <h2 className="ui-page-title text-xl font-semibold">Strava Activities</h2>
          <p className="text-sm ui-muted">
            {status?.connected ? `Connected${status.athlete_name ? ` as ${status.athlete_name}` : ''}` : 'Connect Strava to sync recent activities.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!status?.connected && (
            <button onClick={connect} className="ui-btn ui-btn-primary px-3 py-2 text-sm">Connect Strava</button>
          )}
          <button onClick={sync} disabled={!status?.connected || syncing} className="ui-btn ui-btn-secondary px-3 py-2 text-sm disabled:opacity-50">
            {syncing ? 'Syncing...' : 'Sync 30 days'}
          </button>
        </div>
      </div>

      {error && <div className="ui-alert-error p-3 text-sm">{error}</div>}

      <div className="fitness-summary-grid">
        <div className="fitness-stat">
          <span>Distance</span>
          <strong>{formatDistance(totals.distance)}</strong>
        </div>
        <div className="fitness-stat">
          <span>Moving Time</span>
          <strong>{formatDuration(totals.time)}</strong>
        </div>
        <div className="fitness-stat">
          <span>Elevation</span>
          <strong>{Math.round(totals.elevation)} m</strong>
        </div>
      </div>

      <div className="fitness-activity-list">
        {loading && <p className="ui-muted text-sm">Loading activities...</p>}
        {!loading && activities.length === 0 && (
          <div className="ui-card p-4">
            <p className="text-sm ui-muted">No activities synced yet.</p>
          </div>
        )}
        {activities.map(activity => (
          <Link key={activity.id} to={`/training/${activity.id}`} className="fitness-activity-row">
            <div className="fitness-run-marker" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{activity.name}</p>
              <p className="text-xs ui-muted">{formatDateTime(activity.start_date)} · {activity.sport_type || 'Activity'}</p>
            </div>
            <div className="fitness-row-metrics">
              <span>{formatDistance(activity.distance_m)}</span>
              <span>{formatPace(activity.distance_m, activity.moving_time_s)}</span>
              <span>{activity.fit_download_status === 'uploaded' ? 'FIT attached' : 'FIT pending'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
