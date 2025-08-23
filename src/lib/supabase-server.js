// src/lib/supabase-server.js
import { createClient } from '@supabase/supabase-js'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Server component client (for use in server components)
export const createSupabaseServerClient = () => createServerComponentClient({ cookies })

// Service role client (for API routes that need elevated privileges)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper functions for server-side operations (API routes)
export const conversationHelpers = {
  async getOrCreateConversation(phoneNumber, name = null) {
    // First try to get existing conversation
    let { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    if (error && error.code === 'PGRST116') {
      // Conversation doesn't exist, create it
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from('conversations')
        .insert({
          phone_number: phoneNumber,
          name: name
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating conversation:', createError)
        throw createError
      }

      conversation = newConversation
    } else if (error) {
      console.error('Error fetching conversation:', error)
      throw error
    }

    return conversation
  },

  async getAllConversations() {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        messages (
          body,
          created_at,
          direction
        )
      `)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }

    return data.map(conv => ({
      ...conv,
      lastMessage: conv.messages[0] || null,
      messages: undefined // Remove messages array to keep response clean
    }))
  }
}

// Helper functions for messages (API routes)
export const messageHelpers = {
  async createMessage(data) {
    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Error creating message:', error)
      throw error
    }

    return message
  },

  async updateMessageStatus(telnyxMessageId, status, deliveredAt = null) {
    const updateData = { status, updated_at: new Date().toISOString() }
    if (deliveredAt) {
      updateData.delivered_at = deliveredAt
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .update(updateData)
      .eq('telnyx_message_id', telnyxMessageId)
      .select()
      .single()

    if (error) {
      console.error('Error updating message status:', error)
      throw error
    }

    return data
  },

  async getConversationMessages(conversationId, limit = 50) {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching messages:', error)
      throw error
    }

    return data
  }
}