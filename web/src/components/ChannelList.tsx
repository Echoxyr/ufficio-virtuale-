import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, Channel, Thread, Profile } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'

interface Props {
  profile: Profile
}

const ChannelList: React.FC<Props> = ({ profile }) => {
  const navigate = useNavigate()
  const { channelId } = useParams()
  const [channels, setChannels] = useState<Channel[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [newChannelName, setNewChannelName] = useState('')
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [showNewThread, setShowNewThread] = useState(false)

  // Enable realtime updates
  useRealtime('channels', () => loadChannels())
  useRealtime('threads', () => selectedChannel && loadThreads(selectedChannel.id))

  useEffect(() => {
    loadChannels()
  }, [])

  useEffect(() => {
    if (channelId && channels.length > 0) {
      const channel = channels.find(c => c.id === channelId)
      if (channel) {
        setSelectedChannel(channel)
        loadThreads(channel.id)
      }
    }
  }, [channelId, channels])

  const loadChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('name')

      if (error) throw error
      setChannels(data || [])
    } catch (error) {
      console.error('Error loading channels:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadThreads = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('channel_id', channelId)
        .order('last_message_at', { ascending: false })

      if (error) throw error
      setThreads(data || [])
    } catch (error) {
      console.error('Error loading threads:', error)
    }
  }

  const createChannel = async () => {
    if (!newChannelName.trim()) return

    try {
      const { data, error } = await supabase
        .from('channels')
        .insert({
          org_id: profile.org_id,
          name: newChannelName.trim(),
          type: 'private',
          created_by: profile.id,
        })
        .select()
        .single()

      if (error) throw error

      // Add creator as member
      await supabase
        .from('channel_members')
        .insert({
          channel_id: data.id,
          user_id: profile.id,
          role: 'admin',
        })

      setNewChannelName('')
      setShowNewChannel(false)
      loadChannels()
    } catch (error) {
      console.error('Error creating channel:', error)
    }
  }

  const createThread = async () => {
    if (!newThreadTitle.trim() || !selectedChannel) return

    try {
      const { data, error } = await supabase
        .from('threads')
        .insert({
          channel_id: selectedChannel.id,
          title: newThreadTitle.trim(),
          created_by: profile.id,
        })
        .select()
        .single()

      if (error) throw error

      setNewThreadTitle('')
      setShowNewThread(false)
      navigate(`/thread/${data.id}`)
    } catch (error) {
      console.error('Error creating thread:', error)
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="flex-1 flex">
      {/* Channels sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Canali</h2>
            <button
              onClick={() => setShowNewChannel(true)}
              className="text-blue-600 hover:text-blue-700 text-xl font-medium"
            >
              +
            </button>
          </div>

          {showNewChannel && (
            <div className="space-y-3">
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Nome canale"
                className="input-field text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={createChannel} className="btn-primary text-sm flex-1">
                  Crea
                </button>
                <button
                  onClick={() => {
                    setShowNewChannel(false)
                    setNewChannelName('')
                  }}
                  className="btn-secondary text-sm flex-1"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => {
                setSelectedChannel(channel)
                navigate(`/channel/${channel.id}`)
                loadThreads(channel.id)
              }}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                selectedChannel?.id === channel.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="font-medium">{channel.name}</div>
              <div className="text-sm text-gray-500">
                {channel.type === 'private' ? '🔒 Privato' : '📢 Pubblico'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Threads list */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">{selectedChannel.name}</h2>
                  <p className="text-sm text-gray-500">{selectedChannel.description}</p>
                </div>
                <button
                  onClick={() => setShowNewThread(true)}
                  className="btn-primary text-sm"
                >
                  Nuovo Thread
                </button>
              </div>

              {showNewThread && (
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                    placeholder="Titolo del thread"
                    className="input-field"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={createThread} className="btn-primary flex-1">
                      Crea Thread
                    </button>
                    <button
                      onClick={() => {
                        setShowNewThread(false)
                        setNewThreadTitle('')
                      }}
                      className="btn-secondary flex-1"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50">
              {threads.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  Nessun thread ancora. Creane uno!
                </div>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => navigate(`/thread/${thread.id}`)}
                    className="w-full text-left p-4 border-b border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <div className="font-medium">{thread.title || 'Thread senza titolo'}</div>
                    <div className="text-sm text-gray-500">
                      Ultimo messaggio: {new Date(thread.last_message_at).toLocaleString('it-IT')}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Seleziona un canale per vedere i thread
          </div>
        )}
      </div>
    </div>
  )
}

export default ChannelList
