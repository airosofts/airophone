// src/hooks/useRealtime.js
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export function useRealtimeMessages(conversationId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      setMessages(data || [])
    } catch (error) {
      console.error('Error in loadMessages:', error)
    } finally {
      setLoading(false)
    }
  }, [conversationId, supabase])

  // Add optimistic message (for outbound messages before they're confirmed)
  const addOptimisticMessage = useCallback((message) => {
    const optimisticMessage = {
      ...message,
      id: `optimistic-${Date.now()}`,
      status: 'sending',
      created_at: new Date().toISOString(),
      isOptimistic: true
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    return optimisticMessage.id
  }, [])

  // Update optimistic message when real message comes in
  const replaceOptimisticMessage = useCallback((optimisticId, realMessage) => {
    setMessages(prev => prev.map(msg => 
      msg.id === optimisticId ? { ...realMessage, isOptimistic: false } : msg
    ))
  }, [])

  // Remove failed optimistic message
  const removeOptimisticMessage = useCallback((optimisticId) => {
    setMessages(prev => prev.filter(msg => msg.id !== optimisticId))
  }, [])

  useEffect(() => {
    if (!conversationId) return

    loadMessages()

    // Set up real-time subscription for new messages
    const messagesChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new
          
          // Don't add if it's already in our optimistic updates
          setMessages(prev => {
            const existsOptimistic = prev.some(msg => 
              msg.telnyx_message_id === newMessage.telnyx_message_id && msg.isOptimistic
            )
            
            if (existsOptimistic) {
              // Replace optimistic message with real one
              return prev.map(msg => 
                msg.telnyx_message_id === newMessage.telnyx_message_id && msg.isOptimistic
                  ? { ...newMessage, isOptimistic: false }
                  : msg
              )
            } else {
              // Add new message if not already present
              const exists = prev.some(msg => msg.id === newMessage.id)
              return exists ? prev : [...prev, newMessage]
            }
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedMessage = payload.new
          
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id 
              ? { ...updatedMessage, isOptimistic: false }
              : msg
          ))
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      messagesChannel.unsubscribe()
    }
  }, [conversationId, supabase, loadMessages])

  return {
    messages,
    loading,
    addOptimisticMessage,
    replaceOptimisticMessage,
    removeOptimisticMessage,
    refetch: loadMessages
  }
}

export function useRealtimeConversations() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  // Load initial conversations
  const loadConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages!inner (
            body,
            created_at,
            direction
          )
        `)
        .order('last_message_at', { ascending: false })

      if (error) {
        console.error('Error loading conversations:', error)
        return
      }

      // Transform data to include last message
      const transformedData = data?.map(conv => ({
        ...conv,
        lastMessage: conv.messages?.[0] || null,
        messages: undefined
      })) || []

      setConversations(transformedData)
    } catch (error) {
      console.error('Error in loadConversations:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadConversations()

    // Set up real-time subscription for conversation updates
    const conversationsChannel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newConversation = {
              ...payload.new,
              lastMessage: null
            }
            setConversations(prev => [newConversation, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev => prev.map(conv => 
              conv.id === payload.new.id 
                ? { ...conv, ...payload.new }
                : conv
            ))
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev => prev.filter(conv => conv.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Also listen for new messages to update last message
    const messagesChannel = supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new
          
          setConversations(prev => prev.map(conv => {
            if (conv.id === newMessage.conversation_id) {
              return {
                ...conv,
                lastMessage: {
                  body: newMessage.body,
                  created_at: newMessage.created_at,
                  direction: newMessage.direction
                },
                last_message_at: newMessage.created_at
              }
            }
            return conv
          }))
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      conversationsChannel.unsubscribe()
      messagesChannel.unsubscribe()
    }
  }, [supabase, loadConversations])

  return {
    conversations,
    loading,
    refetch: loadConversations
  }
}