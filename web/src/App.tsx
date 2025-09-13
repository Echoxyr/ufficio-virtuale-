import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, Profile } from './lib/supabase'
import Login from './components/Login'
import ChannelList from './components/ChannelList'
import ThreadView from './components/ThreadView'
import SearchModal from './components/SearchModal'

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session) {
          loadProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Caricamento...</div>
      </div>
    )
  }

  if (!session || !profile) {
    return <Login />
  }

  return (
    <Router>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Ufficio Virtuale</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="btn-secondary text-sm"
            >
              Cerca
            </button>
            <span className="text-sm text-gray-600">{profile.display_name}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Esci
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex">
          <Routes>
            <Route path="/" element={<ChannelList profile={profile} />} />
            <Route path="/channel/:channelId" element={<ChannelList profile={profile} />} />
            <Route path="/thread/:threadId" element={<ThreadView profile={profile} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Search Modal */}
        {searchOpen && (
          <SearchModal
            profile={profile}
            onClose={() => setSearchOpen(false)}
          />
        )}
      </div>
    </Router>
  )
}

export default App
