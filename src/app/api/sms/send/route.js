// src/app/api/sms/send/route.js
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import telnyx from '@/lib/telnyx'
import { conversationHelpers, messageHelpers } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    // Verify user is authenticated
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, message, conversationId } = body

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      )
    }

    console.log(`Sending SMS to ${to}: ${message}`)

    // Get or create conversation if conversationId not provided
    let conversation
    if (conversationId) {
      // Fetch existing conversation
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (error) {
        console.error('Error fetching conversation:', error)
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
      conversation = data
    } else {
      // Create new conversation
      conversation = await conversationHelpers.getOrCreateConversation(to)
    }

    // Send SMS via Telnyx
    const result = await telnyx.sendMessage(to, message)

    if (!result.success) {
      console.error('Failed to send SMS:', result.error)
      
      // Create message record with failed status
      await messageHelpers.createMessage({
        conversation_id: conversation.id,
        telnyx_message_id: null,
        direction: 'outbound',
        from_number: process.env.TELNYX_FROM,
        to_number: telnyx.toE164(to),
        body: message,
        status: 'failed'
      })

      return NextResponse.json(
        { 
          error: 'Failed to send message',
          details: result.error 
        },
        { status: 500 }
      )
    }

    // Create message record with pending status
    const messageRecord = await messageHelpers.createMessage({
      conversation_id: conversation.id,
      telnyx_message_id: result.messageId,
      direction: 'outbound',
      from_number: process.env.TELNYX_FROM,
      to_number: telnyx.toE164(to),
      body: message,
      status: 'pending'
    })

    console.log('SMS sent successfully:', result.messageId)

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: messageRecord,
      conversation: conversation
    })

  } catch (error) {
    console.error('Error in SMS send API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Bulk SMS endpoint
export async function PUT(request) {
  try {
    // Verify user is authenticated
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipients, message, delay = 1000 } = body

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: recipients (array), message' },
        { status: 400 }
      )
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients array cannot be empty' },
        { status: 400 }
      )
    }

    // Limit bulk messages for safety
    if (recipients.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 recipients allowed per bulk send' },
        { status: 400 }
      )
    }

    console.log(`Sending bulk SMS to ${recipients.length} recipients`)

    // Send bulk messages
    const result = await telnyx.sendBulkMessages(recipients, message, { delay })

    // Create conversation and message records for each recipient
    const promises = result.results.map(async (res) => {
      try {
        const conversation = await conversationHelpers.getOrCreateConversation(res.recipient)
        
        await messageHelpers.createMessage({
          conversation_id: conversation.id,
          telnyx_message_id: res.messageId,
          direction: 'outbound',
          from_number: process.env.TELNYX_FROM,
          to_number: telnyx.toE164(res.recipient),
          body: message,
          status: res.success ? 'pending' : 'failed'
        })
      } catch (error) {
        console.error(`Error creating record for ${res.recipient}:`, error)
      }
    })

    await Promise.all(promises)

    return NextResponse.json({
      success: true,
      summary: result.summary,
      results: result.results
    })

  } catch (error) {
    console.error('Error in bulk SMS send API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}