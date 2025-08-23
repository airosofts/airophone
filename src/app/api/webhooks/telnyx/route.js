// src/app/api/webhooks/telnyx/route.js
import { NextResponse } from 'next/server'
import telnyx from '@/lib/telnyx'
import { conversationHelpers, messageHelpers } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')

    console.log('Received Telnyx webhook:', body)

    // Verify webhook signature (optional but recommended for production)
    if (!telnyx.verifyWebhookSignature(body, signature, timestamp)) {
      console.warn('Invalid webhook signature')
      // For development, you might want to comment out this return
      // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse the webhook event
    const event = telnyx.parseWebhookEvent(body)
    console.log('Parsed webhook event:', event)

    // Handle different event types
    switch (event.eventType) {
      case 'message.received':
        await handleIncomingMessage(event)
        break

      case 'message.sent':
        await handleMessageSent(event)
        break

      case 'message.delivered':
        await handleMessageDelivered(event)
        break

      case 'message.delivery_failed':
        await handleMessageFailed(event)
        break

      default:
        console.log(`Unhandled event type: ${event.eventType}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error processing Telnyx webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleIncomingMessage(event) {
  try {
    const { payload } = event
    const fromNumber = payload.from.phone_number
    const toNumber = payload.to[0].phone_number
    const messageBody = payload.text
    const telnyxMessageId = payload.id

    console.log(`Incoming message from ${fromNumber}: ${messageBody}`)

    // Get or create conversation
    const conversation = await conversationHelpers.getOrCreateConversation(fromNumber)

    // Create message record
    await messageHelpers.createMessage({
      conversation_id: conversation.id,
      telnyx_message_id: telnyxMessageId,
      direction: 'inbound',
      from_number: fromNumber,
      to_number: toNumber,
      body: messageBody,
      status: 'received'
    })

    console.log('Inbound message saved successfully')

  } catch (error) {
    console.error('Error handling incoming message:', error)
    throw error
  }
}

async function handleMessageSent(event) {
  try {
    const { payload } = event
    const telnyxMessageId = payload.id

    console.log(`Message sent: ${telnyxMessageId}`)

    // Update message status
    await messageHelpers.updateMessageStatus(telnyxMessageId, 'sent')

  } catch (error) {
    console.error('Error handling message sent:', error)
    // Don't throw - this is not critical
  }
}

async function handleMessageDelivered(event) {
  try {
    const { payload } = event
    const telnyxMessageId = payload.id
    const deliveredAt = new Date(event.occurredAt).toISOString()

    console.log(`Message delivered: ${telnyxMessageId}`)

    // Update message status
    await messageHelpers.updateMessageStatus(
      telnyxMessageId, 
      'delivered', 
      deliveredAt
    )

  } catch (error) {
    console.error('Error handling message delivered:', error)
    // Don't throw - this is not critical
  }
}

async function handleMessageFailed(event) {
  try {
    const { payload } = event
    const telnyxMessageId = payload.id

    console.log(`Message delivery failed: ${telnyxMessageId}`)

    // Update message status
    await messageHelpers.updateMessageStatus(telnyxMessageId, 'failed')

  } catch (error) {
    console.error('Error handling message failed:', error)
    // Don't throw - this is not critical
  }
}

// GET method for webhook verification (some providers require this)
export async function GET(request) {
  // Return simple success for webhook verification
  return NextResponse.json({ status: 'webhook endpoint active' })
}