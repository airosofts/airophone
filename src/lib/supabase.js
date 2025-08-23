// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side Supabase client (for use in client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client component client (for use in client components with auth helpers)
export const createSupabaseClient = () => createClientComponentClient()

// Helper functions for client-side operations
export const clientHelpers = {
  async getConversations() {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
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
  },

  async getConversationMessages(conversationId, limit = 50) {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
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
  },

  async createConversation(phoneNumber, name = null) {
    const supabase = createSupabaseClient()
    
    // First try to get existing conversation
    let { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    if (error && error.code === 'PGRST116') {
      // Conversation doesn't exist, create it
      const { data: newConversation, error: createError } = await supabase
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
  }
}