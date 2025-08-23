// src/components/ui/message-bubble.js
'use client'

export default function MessageBubble({ message }) {
  const isOutbound = message.direction === 'outbound'
  const isOptimistic = message.isOptimistic

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getStatusIcon = (status, isOptimistic) => {
    if (isOptimistic || status === 'sending') {
      return (
        <svg className="h-3 w-3 text-gray-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      )
    }

    switch (status) {
      case 'sent':
        return (
          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'delivered':
        return (
          <svg className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="h-3 w-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  const getStatusColor = (status, isOptimistic) => {
    if (isOptimistic || status === 'sending') return 'text-gray-400'
    
    switch (status) {
      case 'sent': return 'text-gray-400'
      case 'delivered': return 'text-blue-500'
      case 'failed': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOutbound ? 'order-1' : 'order-2'}`}>
        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOutbound
              ? `bg-blue-600 text-white ${isOptimistic ? 'opacity-70' : ''}`
              : 'bg-gray-200 text-gray-900'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.body}
          </p>
        </div>

        {/* Timestamp and status */}
        <div className={`flex items-center mt-1 space-x-1 text-xs ${
          isOutbound ? 'justify-end' : 'justify-start'
        }`}>
          <span className={getStatusColor(message.status, isOptimistic)}>
            {formatTimestamp(message.created_at)}
          </span>
          {isOutbound && (
            <div className="flex items-center">
              {getStatusIcon(message.status, isOptimistic)}
            </div>
          )}
        </div>

        {/* Failed message retry option */}
        {message.status === 'failed' && isOutbound && (
          <div className="mt-1 text-right">
            <button
              onClick={() => {
                // You can implement retry logic here
                console.log('Retry sending message:', message.id)
              }}
              className="text-xs text-red-600 hover:text-red-700 underline"
            >
              Tap to retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}