import { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { subscribeToGameThread, postMessage } from '../firebase/firestore'
import { useAuth } from '../hooks/useAuth'

function MessageBubble({ message, isOwn }) {
  const timeAgo = message.createdAt?.toDate
    ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true })
    : 'just now'

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {message.photoURL ? (
        <img
          src={message.photoURL}
          alt={message.displayName}
          className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 border border-gray-600"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-gray-300 text-xs font-bold flex-shrink-0 mt-0.5">
          {(message.displayName || 'U')[0].toUpperCase()}
        </div>
      )}
      {/* Bubble */}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        <div className="flex items-center gap-1.5">
          {!isOwn && (
            <span className="text-xs font-semibold text-gray-400">{message.displayName || 'Anonymous'}</span>
          )}
          <span className="text-xs text-gray-600">{timeAgo}</span>
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${
            isOwn
              ? 'bg-orange-500 text-white rounded-tr-sm'
              : 'bg-gray-700 text-gray-100 rounded-tl-sm'
          }`}
        >
          {message.text}
        </div>
      </div>
    </div>
  )
}

/**
 * GameThread — real-time chat thread for a specific game.
 * @param {string} gameId
 */
export default function GameThread({ gameId }) {
  const { user, isAuthenticated } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Subscribe to real-time messages
  useEffect(() => {
    if (!gameId) return
    const unsubscribe = subscribeToGameThread(gameId, (msgs) => {
      setMessages(msgs)
    })
    return unsubscribe
  }, [gameId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || !isAuthenticated || !user || sending) return

    setSending(true)
    setError(null)
    setInput('')

    try {
      await postMessage(
        gameId,
        user.uid,
        text,
        user.displayName || 'Anonymous',
        user.photoURL || null
      )
    } catch (err) {
      setError('Failed to send message. Please try again.')
      setInput(text) // Restore on failure
      console.error(err)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col" style={{ minHeight: '400px', maxHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <MessageSquare size={16} className="text-orange-400" />
        <h3 className="text-sm font-bold text-white">Game Thread</h3>
        <span className="text-xs text-gray-500">({messages.length} messages)</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <MessageSquare size={32} className="text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No messages yet.</p>
            <p className="text-xs text-gray-600 mt-1">
              {isAuthenticated ? 'Be the first to say something!' : 'Sign in to join the conversation.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={user?.uid === msg.userId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-xs text-red-400 bg-red-400/10 border-t border-red-400/20">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-700 p-3">
        {isAuthenticated ? (
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              onKeyDown={handleKeyDown}
              placeholder="Say something... (Enter to send)"
              rows={1}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 transition-colors resize-none min-h-[38px] max-h-[100px]"
              style={{ fieldSizing: 'content' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={15} className="text-white" />
              )}
            </button>
          </form>
        ) : (
          <p className="text-center text-xs text-gray-500 py-1">
            Sign in to join the conversation
          </p>
        )}
      </div>
    </div>
  )
}
