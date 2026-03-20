import { useEffect, useRef, useState, useId } from 'react'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
const HAS_BARCODE_DETECTOR = 'BarcodeDetector' in window

async function decodeBarcode(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  if (HAS_BARCODE_DETECTOR) {
    const detector = new (window as any).BarcodeDetector({ formats: BARCODE_FORMATS })
    const results = await detector.detect(bitmap)
    if (results.length > 0) return results[0].rawValue
  }
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
  const [mode, setMode] = useState<'loading' | 'stream' | 'photo'>('loading')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerId = useId().replace(/:/g, '_')

  // For native BarcodeDetector streaming
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)

  // For html5-qrcode streaming
  const html5ScannerRef = useRef<any>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    if (HAS_BARCODE_DETECTOR) {
      // Use native BarcodeDetector + getUserMedia
      const detector = new (window as any).BarcodeDetector({ formats: BARCODE_FORMATS })
      let cancelled = false

      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (cancelled) { stream.getTracks().forEach((t: MediaStreamTrack) => t.stop()); return }
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play()
          }
          setMode('stream')

          const scanFrame = async () => {
            if (cancelled || !videoRef.current) return
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const results = await detector.detect(videoRef.current)
                if (results.length > 0 && !cancelled) {
                  stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
                  onScan(results[0].rawValue)
                  return
                }
              } catch {}
            }
            animFrameRef.current = requestAnimationFrame(scanFrame)
          }
          animFrameRef.current = requestAnimationFrame(scanFrame)
        })
        .catch(() => { if (!cancelled) setMode('photo') })

      return () => {
        cancelled = true
        cancelAnimationFrame(animFrameRef.current)
        streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop())
      }
    } else {
      // Use html5-qrcode for live camera scanning
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        const scanner = new Html5Qrcode(containerId)
        html5ScannerRef.current = scanner

        scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText: string) => {
            scanner.stop().then(() => scanner.clear()).catch(() => {})
            onScan(decodedText)
          },
          () => {},
        )
          .then(() => setMode('stream'))
          .catch(() => setMode('photo'))
      }).catch(() => setMode('photo'))

      return () => {
        const scanner = html5ScannerRef.current
        if (scanner?.isScanning) {
          scanner.stop().then(() => scanner.clear()).catch(() => {})
        }
      }
    }
  }, [onScan, containerId])

  const stopAll = () => {
    cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop())
    const scanner = html5ScannerRef.current
    if (scanner?.isScanning) {
      scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
  }

  const handleManualSubmit = () => {
    const code = manualCode.trim()
    if (!code) return
    stopAll()
    onScan(code)
  }

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setScanning(true)
    try {
      const result = await decodeBarcode(file)
      stopAll()
      onScan(result)
    } catch {
      setError('No barcode found. Try again with the barcode clearly visible.')
    } finally {
      setScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    stopAll()
    onClose()
  }

  return (
    <div className="space-y-3">
      {mode === 'loading' && (
        <div className="text-center py-8 text-gray-400 text-sm">Starting camera...</div>
      )}

      {/* Native BarcodeDetector video element */}
      {mode === 'stream' && HAS_BARCODE_DETECTOR && (
        <div className="relative rounded overflow-hidden bg-black">
          <video ref={videoRef} className="w-full" playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/50 rounded w-64 h-24" />
          </div>
          <p className="text-center text-xs text-gray-400 mt-1">Point at a barcode</p>
        </div>
      )}

      {/* html5-qrcode renders into this div */}
      <div id={containerId} className={mode === 'stream' && !HAS_BARCODE_DETECTOR ? 'w-full min-h-64' : 'hidden'} />

      {mode === 'photo' && (
        <div className="text-center py-4 space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-base hover:bg-indigo-700 disabled:opacity-50"
          >
            {scanning ? 'Reading...' : 'Take Photo of Barcode'}
          </button>
        </div>
      )}

      {mode === 'stream' && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          className="w-full text-indigo-600 text-xs hover:underline"
        >
          Camera not detecting? Take a photo instead
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileCapture}
        className="hidden"
      />

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

      <button type="button" onClick={handleClose} className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300">
        Cancel
      </button>
    </div>
  )
}
