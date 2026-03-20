import { useRef, useState } from 'react'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

async function decodeBarcode(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)

  // Try native BarcodeDetector first (Safari, Chrome)
  if ('BarcodeDetector' in window) {
    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
    })
    const results = await detector.detect(bitmap)
    if (results.length > 0) {
      return results[0].rawValue
    }
  }

  // Fallback to html5-qrcode for browsers without BarcodeDetector
  const { Html5Qrcode } = await import('html5-qrcode')
  const container = document.createElement('div')
  container.id = 'barcode-decode-temp'
  container.style.display = 'none'
  document.body.appendChild(container)
  try {
    const scanner = new Html5Qrcode('barcode-decode-temp')
    const result = await scanner.scanFile(file, true)
    scanner.clear()
    return result
  } finally {
    document.body.removeChild(container)
  }
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
      const result = await decodeBarcode(file)
      onScan(result)
    } catch {
      setError('No barcode found. Try holding the camera closer so the barcode fills most of the frame.')
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
          {scanning ? 'Reading...' : 'Take Photo of Barcode'}
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
