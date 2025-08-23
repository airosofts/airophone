// src/components/ui/conversation-item.js
'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ConversationItem({ conversation, formatPhoneNumber }) {
  const [imageError, setImageError] = useState(false)

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      // Today - show time
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else if (diffDays === 2) {
      // Yesterday
      return 'Yesterday'
    } else if (diffDays <= 7) {
      // This week - show day
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      // Older - show date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const truncateMessage = (text, maxLength = 60) => {
    if (!text) return ''
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  }

  const getInitials = (phoneNumber) => {
    if (!phoneNumber) return '??'
    const digits = phoneNumber.replace(/\D/g, '')
    const lastFour = digits.slice(-4)
    return lastFour.slice(0, 2).toUpperCase()
  }

  const getDisplayName = (conversation) => {
    if (conversation.name) {
      return conversation.name
    }
    return formatPhoneNumber(conversation.phone_number)
  }

  const isUnread = () => {
    // You can implement unread logic here based on your requirements
    // For now, marking inbound messages as potentially unread
    return conversation.lastMessage?.direction === 'inbound'
  }

  return (
    <Link
      href={`/chat/${encodeURIComponent(conversation.phone_number)}`}
      className="block hover:bg-gray-50 transition-colors"
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {getInitials(conversation.phone_number)}
            </div>
          </div>

          {/* Conversation Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className={`text-sm font-medium ${
                  isUnread() ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {getDisplayName(conversation)}
                </h3>
                {isUnread() && (
                  <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                )}
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatTimestamp(conversation.last_message_at)}
              </span>
            </div>

            {/* Last Message Preview */}
            <div className="mt-1 flex items-center space-x-2">
              {conversation.lastMessage && (
                <>
                  {conversation.lastMessage.direction === 'outbound' && (
                    <svg className="h-3 w-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                  <p className={`text-sm ${
                    isUnread() ? 'text-gray-900 font-medium' : 'text-gray-600'
                  } truncate`}>
                    {truncateMessage(conversation.lastMessage.body)}
                  </p>
                </>
              )}
              {!conversation.lastMessage && (
                <p className="text-sm text-gray-400 italic">
                  No messages yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}