import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Profile, Message, Attachment } from '../lib/supabase'

interface Props {
  profile: Profile
  onClose: () => void
}

interface SearchResult {
  type: 'message' | 'attachment'
  data: (Message & { thread_title?: string; channel_name?: string }) | Attachment
}

const SearchModal: React.FC<Props> = ({ profile, onClose }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    messages: true,
    attachments: true,
    fileType: '',
  })

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const searchResults: SearchResult[] = []

      // Search messages
      if (filters.messages) {
        const { data: messages, error: messageError } = await supabase
          .from('messages')
          .select(`
            *,
            threads(title, channels(name)),
            profiles(display_name, handle)
          `)
          .or(`body_md.ilike.%${query}%,body_tsv.fts.${query}`)
          .limit(20)

        if (messageError) throw messageError

        searchResults.push(
          ...(messages || []).map(msg => ({
            type: 'message' as const,
            data: {
              ...msg,
              thread_title: (msg as any).threads?.title,
              channel_name: (msg as any).threads?.channels?.name,
            }
          }))
        )
      }

      // Search attachments
      if (filters.attachments) {
        let attachmentQuery = supabase
          .from('attachments')
          .select(`
            *,
            messages(thread_id, threads(title, channels(name)))
          `)
          .ilike('original_name', `%${query}%`)

        if (filters.fileType) {
          attachmentQuery = attachmentQuery.ilike('content_type', `%${filters.fileType}%`)
        }

        const { data: attachments, error: attachmentError } = await attachmentQuery.limit(20)

        if (attachmentError) throw attachmentError

        searchResults.push(
          ...(attachments || []).map(att => ({
            type: 'attachment' as const,
            data: att
          }))
        )
      }

      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'message') {
      const message = result.data as Message & { thread_title?: string }
      navigate(`/thread/${(message as any).thread_id}`)
      onClose()
    } else {
      const attachment = result.data as Attachment
      const threadId = (attachment as any).messages?.thread_id
      if (threadId) {
        navigate(`/thread/${threadId}`)
        onClose()
      }
    }
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Cerca</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          {/* Search input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Cerca messaggi, file..."
              className="input-field flex-1"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="btn-primary"
            >
              {loading ? '...' : 'Cerca'}
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.messages}
                onChange={(e) => setFilters(prev => ({ ...prev, messages: e.target.checked }))}
              />
              Messaggi
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.attachments}
                onChange={(e) => setFilters(prev => ({ ...prev, attachments: e.target.checked }))}
              />
              Allegati
            </label>
            <select
              value={filters.fileType}
              onChange={(e) => setFilters(prev => ({ ...prev, fileType: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Tutti i file</option>
              <option value="pdf">PDF</option>
              <option value="image">Immagini</option>
              <option value="word">Word</option>
              <option value="excel">Excel</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {results.length === 0 && query && !loading ? (
            <div className="p-4 text-center text-gray-500">
              Nessun risultato trovato
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleResultClick(result)}
                className="w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50"
              >
                {result.type === 'message' ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Messaggio
                      </span>
                      <span className="text-sm text-gray-500">
                        {(result.data as any).channel_name} • {(result.data as any).thread_title}
                      </span>
                    </div>
                    <div
                      className="text-sm text-gray-800"
                      dangerouslySetInnerHTML={{
                        __html: highlightText((result.data as Message).body_md, query)
                      }}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date((result.data as Message).created_at).toLocaleString('it-IT')}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                        Allegato
                      </span>
                      <span className="text-sm text-gray-500">
                        {(result.data as any).content_type}
                      </span>
                    </div>
                    <div
                      className="font-medium"
                      dangerouslySetInnerHTML={{
                        __html: highlightText((result.data as Attachment).original_name, query)
                      }}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {((result.data as Attachment).size_bytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchModal
