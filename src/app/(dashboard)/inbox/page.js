// src/app/(dashboard)/inbox/page.js
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { useRealtimeConversations } from '@/hooks/useRealtime'
import ConversationItem from '@/components/ui/conversation-item'
import Loading from '@/components/ui/loading'

export default function InboxPage() {
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false)
  const [newRecipient, setNewRecipient] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const { conversations, loading, refetch } = useRealtimeConversations()
  const router = useRouter()
  const supabase = createSupabaseClient()

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        return
      }
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Unexpected error during signout:', error)
    } finally {
      setSigningOut(false)
    }
  }

  const startNewConversation = () => {
    if (!newRecipient.trim()) return
    
    try {
      // Clean and format phone number
      const cleanNumber = newRecipient.replace(/\D/g, '')
      
      // Handle different input formats
      let formattedNumber
      if (cleanNumber.length === 10) {
        // US number without country code
        formattedNumber = `+1${cleanNumber}`
      } else if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
        // US number with country code
        formattedNumber = `+${cleanNumber}`
      } else if (newRecipient.startsWith('+')) {
        // Already has + prefix
        formattedNumber = newRecipient
      } else {
        // Default to adding +1
        formattedNumber = `+1${cleanNumber}`
      }
      
      setShowNewMessageDialog(false)
      setNewRecipient('')
      router.push(`/chat/${encodeURIComponent(formattedNumber)}`)
    } catch (error) {
      console.error('Error starting new conversation:', error)
      alert('Invalid phone number format')
    }
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return phone
    
    try {
      // Remove +1 prefix and format as (XXX) XXX-XXXX
      const digits = phone.replace(/\D/g, '')
      const withoutCountry = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits
      
      if (withoutCountry.length === 10) {
        return `(${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`
      }
      return phone
    } catch (error) {
      console.error('Error formatting phone number:', error)
      return phone
    }
  }

  // Handle escape key to close dialog
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowNewMessageDialog(false)
    } else if (e.key === 'Enter' && newRecipient.trim()) {
      startNewConversation()
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="w-80 bg-white shadow-sm flex items-center justify-center">
          <Loading text="Loading conversations..." />
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <Loading text="Setting up dashboard..." />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-sm flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">SMS Dashboard</h1>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
              <span>From: +1 (320) 315-8316</span>
            </div>
          </div>
        </div>

        {/* New Message Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setShowNewMessageDialog(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            + New Message
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a new message to begin</p>
              <button
                onClick={() => setShowNewMessageDialog(true)}
                className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
              >
                Send your first message →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  formatPhoneNumber={formatPhoneNumber}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Welcome to SMS Dashboard
          </h3>
          <p className="text-gray-600 mb-6 max-w-md">
            Select a conversation from the sidebar to start messaging, or click New Message to begin a new conversation.
          </p>
          <button
            onClick={() => setShowNewMessageDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Start Messaging
          </button>
        </div>
      </div>

      {/* New Message Dialog */}
      {showNewMessageDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewMessageDialog(false)
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">New Message</h3>
              <button
                onClick={() => setShowNewMessageDialog(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="recipient"
                  type="tel"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="(555) 123-4567 or +15551234567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter phone number in any format. Press Enter to start chat.
                </p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowNewMessageDialog(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={startNewConversation}
                  disabled={!newRecipient.trim()}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    newRecipient.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}