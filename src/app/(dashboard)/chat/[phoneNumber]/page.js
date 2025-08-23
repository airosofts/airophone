// src/app/(dashboard)/chat/[phoneNumber]/page.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'
import { useRealtimeMessages } from '@/hooks/useRealtime'
import MessageBubble from '@/components/ui/message-bubble'
import Loading from '@/components/ui/loading'

export default function ChatPage({ params }) {
  const { phoneNumber } = params
  const decodedPhoneNumber = decodeURIComponent(phoneNumber)
  
  const [conversationId, setConversationId] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationLoading, setConversationLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const router = useRouter()
  const supabase = createSupabaseClient()

  const { messages, loading: messagesLoading, addOptimisticMessage, replaceOptimisticMessage, removeOptimisticMessage } = useRealtimeMessages(conversationId)

  // Get or create conversation
  useEffect(() => {
    const getConversation = async () => {
      try {
        // First try to get existing conversation
        let { data: conversation, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('phone_number', decodedPhoneNumber)
          .single()

        if (error && error.code === 'PGRST116') {
          // Conversation doesn't exist, create it
          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({
              phone_number: decodedPhoneNumber,
              name: null
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating conversation:', createError)
            return
          }

          conversation = newConversation
        } else if (error) {
          console.error('Error fetching conversation:', error)
          return
        }

        setConversationId(conversation.id)
      } catch (error) {
        console.error('Error in getConversation:', error)
      } finally {
        setConversationLoading(false)
      }
    }

    if (decodedPhoneNumber) {
      getConversation()
    }
  }, [decodedPhoneNumber, supabase])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return phone
    const digits = phone.replace(/\D/g, '')
    const withoutCountry = digits.startsWith('1') ? digits.slice(1) : digits
    
    if (withoutCountry.length === 10) {
      return `(${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`
    }
    return phone
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending || !conversationId) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    // Add optimistic message
    const optimisticId = addOptimisticMessage({
      conversation_id: conversationId,
      direction: 'outbound',
      from_number: process.env.NEXT_PUBLIC_TELNYX_FROM || '+13203158316',
      to_number: decodedPhoneNumber,
      body: messageText,
      status: 'sending'
    })

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: decodedPhoneNumber,
          message: messageText,
          conversationId: conversationId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message')
      }

      // Replace optimistic message with real one
      if (result.message) {
        replaceOptimisticMessage(optimisticId, result.message)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      
      // Remove the optimistic message on failure
      removeOptimisticMessage(optimisticId)
      
      // Show error to user
      alert('Failed to send message. Please try again.')
      
      // Restore message text
      setNewMessage(messageText)
    } finally {
      setSending(false)
    }
  }

  if (conversationLoading) {
    return <Loading />
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Back to Inbox - Mobile/Tablet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center justify-between p-4">
          <Link
            href="/inbox"
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="font-medium text-gray-900">
            {formatPhoneNumber(decodedPhoneNumber)}
          </h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block w-80 bg-white shadow-sm border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <Link
            href="/inbox"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-3"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Inbox
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {formatPhoneNumber(decodedPhoneNumber)}
          </h1>
        </div>
        
        <div className="p-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Conversation Info</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Phone: {decodedPhoneNumber}</p>
              <p>Messages: {messages.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header - Desktop */}
        <div className="hidden lg:block bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {formatPhoneNumber(decodedPhoneNumber)}
              </h2>
              <p className="text-sm text-gray-500">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
              Active
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 pt-16 lg:pt-4">
          {messagesLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loading />
            </div>
          ) : (
            <>
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-500">No messages yet</p>
                  <p className="text-sm text-gray-400 mt-1">Send your first message below</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={sendMessage} className="flex space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={sending}
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                newMessage.trim() && !sending
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}