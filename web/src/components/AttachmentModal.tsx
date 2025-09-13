import React, { useState, useEffect } from 'react'
import { Attachment, getSignedUrl } from '../lib/supabase'

interface Props {
  attachment: Attachment
  onClose: () => void
}

const AttachmentModal: React.FC<Props> = ({ attachment, onClose }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSignedUrl()
  }, [attachment])

  const loadSignedUrl = async () => {
    try {
      setLoading(true)
      setError(null)
      const url = await getSignedUrl(attachment.storage_path, 600) // 10 minutes
      setSignedUrl(url)
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento del file')
    } finally {
      setLoading(false)
    }
  }

  const isImage = attachment.content_type.startsWith('image/')
  const isPdf = attachment.content_type.includes('pdf')

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-full w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-medium truncate">{attachment.original_name}</h3>
            <p className="text-sm text-gray-500">
              {formatFileSize(attachment.size_bytes)} • {attachment.content_type}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {signedUrl && (
              <a
                href={signedUrl}
                download={attachment.original_name}
                className="btn-secondary text-sm"
              >
                Scarica
              </a>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Caricamento...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-red-600">{error}</div>
            </div>
          ) : signedUrl ? (
            <div className="flex items-center justify-center">
              {isImage ? (
                <img
                  src={signedUrl}
                  alt={attachment.original_name}
                  className="max-w-full max-h-96 object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-96 border-0"
                  title={attachment.original_name}
                />
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-gray-600 mb-4">
                    Anteprima non disponibile per questo tipo di file
                  </p>
                  <a
                    href={signedUrl}
                    download={attachment.original_name}
                    className="btn-primary"
                  >
                    Scarica per visualizzare
                  </a>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default AttachmentModal
