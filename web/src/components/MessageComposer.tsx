
const MessageComposer: React.FC<Props> = ({ threadId, profile, onMessageSent }) => {
  const [message, setMessage] = useState('')
  const [ccUsers, setCcUsers] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [showCcModal, setShowCcModal] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [dlpWarnings, setDlpWarnings] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleMessageChange = (text: string) => {
    setMessage(text)
    setDlpWarnings(checkDLP(text))
  }

  const loadUsers = async () => {
    if (availableUsers.length > 0) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, display_name')
        .eq('org_id', profile.org_id)
        .neq('id', profile.id)

      if (error) throw error
      setAvailableUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const toggleCcUser = (userId: string) => {
    setCcUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} troppo grande (max 10MB)`)
        return false
      }
      return true
    })
    
    setAttachments(prev => [...prev, ...validFiles])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const sendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return

    setSending(true)
    try {
      // Create message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          user_id: profile.id,
          body_md: message.trim(),
        })
        .select()
        .single()

      if (messageError) throw messageError

      // Upload attachments
      for (const file of attachments) {
        await uploadAttachment(file, messageData.id)
      }

      // Add CC recipients
      if (ccUsers.length > 0) {
        const ccInserts = ccUsers.map(userId => ({
          message_id: messageData.id,
          user_id: userId,
          added_by: profile.id,
        }))

        const { error: ccError } = await supabase
          .from('message_cc')
          .insert(ccInserts)

        if (ccError) throw ccError
      }

      // Reset form
      setMessage('')
      setCcUsers([])
      setAttachments([])
      setDlpWarnings([])
      onMessageSent()
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(error.message || 'Errore nell\'invio del messaggio')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* DLP Warnings */}
      {dlpWarnings.length > 0 && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <div className="font-medium">Attenzione:</div>
          {dlpWarnings.map((warning, i) => (
            <div key={i}>• {warning}</div>
          ))}
        </div>
      )}

      {/* CC Users */}
      {ccUsers.length > 0 && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">CC:</span>
          {ccUsers.map(userId => {
            const user = availableUsers.find(u => u.id === userId)
            return (
              <span
                key={userId}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded"
              >
                {user?.display_name || user?.handle}
                <button
                  onClick={() => toggleCcUser(userId)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <span className="text-sm truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-red-600 hover:text-red-700 ml-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message input */}
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          placeholder="Scrivi un messaggio..."
          className="flex-1 input-field resize-none"
          rows={2}
          disabled={sending}
        />
        
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              loadUsers()
              setShowCcModal(true)
            }}
            className="btn-secondary text-sm h-10"
            title="Aggiungi CC"
          >
            CC
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-sm h-10"
            title="Allega file"
          >
            📎
          </button>
          
          <button
            onClick={sendMessage}
            disabled={sending || (!message.trim() && attachments.length === 0)}
            className="btn-primary text-sm h-10"
          >
            {sending ? '...' : 'Invia'}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.jpg,.jpeg,.png,.gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* CC Modal */}
      {showCcModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Aggiungi CC</h3>
              <button
                onClick={() => setShowCcModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              {availableUsers.map(user => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={ccUsers.includes(user.id)}
                    onChange={() => toggleCcUser(user.id)}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium">{user.display_name}</div>
                    <div className="text-sm text-gray-500">@{user.handle}</div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowCcModal(false)}
                className="btn-primary flex-1"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageComposer
