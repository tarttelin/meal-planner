import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getFitnessActivity, uploadFitFile } from '../../api/fitness'
import type { FitnessActivityDetail as FitnessActivityDetailType } from '../../types'
import { formatDateTime, formatDistance, formatDuration, formatPace } from './format'

export default function FitnessActivityDetail() {
  const { id } = useParams()
  const [activity, setActivity] = useState<FitnessActivityDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setActivity(await getFitnessActivity(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activity')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  const onFileChange = async (file: File | undefined) => {
    if (!id || !file) return
    setUploading(true)
    setError(null)
    try {
      await uploadFitFile(id, file)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FIT upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <p className="ui-muted text-sm">Loading activity...</p>
  if (!activity) return <p className="ui-error-text text-sm">{error || 'Activity not found'}</p>

  const streamKeys = activity.streams ? Object.keys(activity.streams) : []

  return (
    <div className="fitness-page">
      <Link to="/training" className="ui-link-action text-sm">Back to training</Link>
      {error && <div className="ui-alert-error p-3 text-sm">{error}</div>}

      <section className="fitness-detail-header">
        <div>
          <p className="text-xs ui-muted uppercase font-semibold">{activity.sport_type || 'Activity'} · {formatDateTime(activity.start_date)}</p>
          <h2 className="ui-page-title text-2xl font-semibold">{activity.name}</h2>
        </div>
        {activity.strava_url && (
          <a href={activity.strava_url} target="_blank" rel="noreferrer" className="ui-btn ui-btn-primary px-3 py-2 text-sm">
            Open in Strava
          </a>
        )}
      </section>

      <div className="fitness-summary-grid">
        <div className="fitness-stat"><span>Distance</span><strong>{formatDistance(activity.distance_m)}</strong></div>
        <div className="fitness-stat"><span>Time</span><strong>{formatDuration(activity.moving_time_s)}</strong></div>
        <div className="fitness-stat"><span>Pace</span><strong>{formatPace(activity.distance_m, activity.moving_time_s)}</strong></div>
        <div className="fitness-stat"><span>Elevation</span><strong>{Math.round(activity.total_elevation_gain_m || 0)} m</strong></div>
        <div className="fitness-stat"><span>Heart Rate</span><strong>{activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '-'}</strong></div>
        <div className="fitness-stat"><span>Calories</span><strong>{activity.calories ? Math.round(activity.calories) : '-'}</strong></div>
      </div>

      <section className="ui-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="ui-page-title text-base font-semibold">FIT File</h3>
            <p className="text-sm ui-muted">
              {activity.fit_download_status === 'uploaded'
                ? 'A local FIT file is attached to this activity.'
                : 'Automatic FIT download is not available in Strava OAuth; attach the exported file here.'}
            </p>
          </div>
          <label className="ui-btn ui-btn-secondary px-3 py-2 text-sm text-center cursor-pointer">
            {uploading ? 'Uploading...' : 'Upload .fit'}
            <input
              type="file"
              accept=".fit"
              className="hidden"
              disabled={uploading}
              onChange={e => void onFileChange(e.target.files?.[0])}
            />
          </label>
        </div>
      </section>

      <section className="ui-card p-4">
        <h3 className="ui-page-title text-base font-semibold mb-2">Detail Data</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <p><span className="ui-muted">Max speed:</span> {activity.max_speed_mps ? `${(activity.max_speed_mps * 3.6).toFixed(1)} km/h` : '-'}</p>
          <p><span className="ui-muted">Max HR:</span> {activity.max_heartrate ? `${Math.round(activity.max_heartrate)} bpm` : '-'}</p>
          <p><span className="ui-muted">Elapsed:</span> {formatDuration(activity.elapsed_time_s)}</p>
          <p><span className="ui-muted">Streams:</span> {streamKeys.length ? streamKeys.join(', ') : 'Not loaded'}</p>
        </div>
      </section>
    </div>
  )
}
