import { useRef, useState } from 'react'
import client from '../../api/client'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleManualSubmit = () => {
    const code = manualCode.trim()
    if (!code) return
    onScan(code)
  }

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setScanning(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await client.post<{ barcode: string }>('/barcode/decode', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onScan(response.data.barcode)
    } catch {
      setError('No barcode found. Make sure the barcode is clearly visible, well-lit, and fills most of the frame.')
    } finally {
      setScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-center py-4 space-y-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-base hover:bg-indigo-700 disabled:opacity-50"
        >
          {scanning ? 'Decoding...' : 'Take Photo of Barcode'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileCapture}
          className="hidden"
        />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Or type barcode number..."
          value={manualCode}
          onChange={e => setManualCode(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleManualSubmit() }}
          className="border rounded px-3 py-2 text-sm flex-1"
        />
        <button
          type="button"
          onClick={handleManualSubmit}
          disabled={!manualCode.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          Go
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded text-center">
          {error}
        </div>
      )}

      <button type="button" onClick={onClose} className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300">
        Cancel
      </button>
    </div>
  )
}
