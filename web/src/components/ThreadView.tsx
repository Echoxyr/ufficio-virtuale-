import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, Message, Profile, Thread, Attachment } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import MessageComposer from './MessageComposer'
import AttachmentModal from './AttachmentModal'

interface Props {
  profile: Profile
}

const ThreadView: React.FC<Props> = ({ profile }) => {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [thread, setThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)

  // Enable realtime updates
  useRealtime('messages', loadMessages)

  useEffect(() => {
    if (threadId) {
      loadThread()
      loadMessages()
      loadAttachments()
    }
  }, [threadId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadThread = async () => {
    if (!threadId) return

    try {
      const { data, error } = await supabase
        .from('threads')
        .select('*, channels(name)')
        .eq('id', threadId)
        .single()

      if (error) throw error
      setThread(data)
    } catch (error) {
      console.error('Error loading thread:', error)
      navigate('/')
    }
  }

  const loadMessages = async () => {
    if (!threadId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles(handle, display_name)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAttachments = async () => {
    if (!threadId) return

    try {
      const { data, error } = await supabase
        .from('attachments')
        .select(`
          *,
          messages!inner(thread_id)
        `)
        .eq('messages.thread_id', threadId)

      if (error) throw error

      const attachmentsByMessage = (data || []).reduce((acc, attachment) => {
        if (!acc[attachment.message_id]) {
          acc[attachment.message_id] = []
        }
        acc[attachment.message_id].push(attachment)
        return acc
      }, {} as Record<string, Attachment[]>)

      setAttachments(attachmentsByMessage)
    } catch (error) {
      console.error('Error loading attachments:', error)
    }
  }

  const formatMessage = (text: string) => {
    // Simple mention highlighting
    return text.replace(/@(\w+)/g, '<span class="text-blue-600 font-medium">@$1</span>')
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return '🖼️'
    if (contentType.includes('pdf')) return '📄'
    if (contentType.includes('word')) return '📝'
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊'
    return '📎'
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Caricamento...</div>
  }

  if (!thread) {
    return <div className="flex-1 flex items-center justify-center">Thread non trovato</div>
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 text-xl"
          >
            ←
          </button>
          <div>
            <h2 className="text-lg font-medium">{thread.title || 'Thread'}</h2>
            <p className="text-sm text-gray-500">
              {(thread as any).channels?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.user_id === profile.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`message-bubble p-3 rounded-lg ${
                message.user_id === profile.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {message.user_id !== profile.id && (
                <div className="text-sm font-medium mb-1 text-gray-600">
                  {message.profiles?.display_name || message.profiles?.handle}
                </div>
              )}
              
              <div
                dangerouslySetInnerHTML={{
                  __html: formatMessage(message.body_md)
                }}
              />

              {/* Attachments */}
              {attachments[message.id] && (
                <div className="mt-2 space-y-1">
                  {attachments[message.id].map((attachment) => (
                    <button
                      key={attachment.id}
                      onClick={() => setSelectedAttachment(attachment)}
                      className={`block text-left text-sm p-2 rounded border ${
                        message.user_id === profile.id
                          ? 'border-blue-400 hover:border-blue-300'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{getFileIcon(attachment.content_type)}</span>
                        <span className="truncate">{attachment.original_name}</span>
                      </div>
                      <div className={`text-xs ${
                        message.user_id === profile.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {(attachment.size_bytes / 1024).toFixed(1)} KB
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div
                className={`text-xs mt-2 ${
                  message.user_id === profile.id ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {new Date(message.created_at).toLocaleTimeString('it-IT')}
                {message.edited_at && ' (modificato)'}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message composer */}
      <MessageComposer
        threadId={threadId!}
        profile={profile}
        onMessageSent={() => {
          loadMessages()
          loadAttachments()
        }}
      />

      {/* Attachment modal */}
      {selectedAttachment && (
        <AttachmentModal
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </div>
  )
}

export default ThreadView
