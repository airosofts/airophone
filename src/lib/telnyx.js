// src/lib/telnyx.js
import axios from 'axios'

const TELNYX_API_BASE = 'https://api.telnyx.com/v2'

class TelnyxClient {
  constructor() {
    this.apiKey = process.env.TELNYX_API_KEY
    this.profileId = process.env.TELNYX_PROFILE_ID
    this.fromNumber = process.env.TELNYX_FROM

    if (!this.apiKey || !this.profileId || !this.fromNumber) {
      throw new Error('Missing Telnyx configuration. Check TELNYX_API_KEY, TELNYX_PROFILE_ID, and TELNYX_FROM in environment variables.')
    }

    this.client = axios.create({
      baseURL: TELNYX_API_BASE,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    })
  }

  // Format phone number to E.164 format
  toE164(phoneNumber) {
    const digits = String(phoneNumber).replace(/\D/g, '')
    if (digits.startsWith('1') && digits.length === 11) {
      return `+${digits}`
    }
    if (digits.length === 10) {
      return `+1${digits}`
    }
    return phoneNumber // Return as-is if it doesn't match expected patterns
  }

  // Send SMS message
  async sendMessage(to, text, options = {}) {
    try {
      const payload = {
        from: this.fromNumber,
        to: this.toE164(to),
        text: text,
        messaging_profile_id: this.profileId,
        ...options
      }

      console.log('Sending SMS via Telnyx:', payload)

      const response = await this.client.post('/messages', payload)
      
      if (response.data && response.data.data) {
        console.log('SMS sent successfully:', response.data.data.id)
        return {
          success: true,
          messageId: response.data.data.id,
          data: response.data.data
        }
      } else {
        throw new Error('Invalid response format from Telnyx')
      }
    } catch (error) {
      console.error('Error sending SMS:', error.response?.data || error.message)
      
      return {
        success: false,
        error: error.response?.data || error.message,
        messageId: null
      }
    }
  }

  // Send bulk messages with rate limiting
  async sendBulkMessages(recipients, text, options = {}) {
    const results = []
    const delay = options.delay || 1000 // 1 second between messages by default
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]
      
      try {
        const result = await this.sendMessage(recipient, text, options)
        results.push({
          recipient,
          ...result
        })
        
        console.log(`[${i + 1}/${recipients.length}] ${recipient}: ${result.success ? 'SUCCESS' : 'FAILED'}`)
        
        // Add delay between messages (except for the last one)
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error(`Error sending to ${recipient}:`, error)
        results.push({
          recipient,
          success: false,
          error: error.message,
          messageId: null
        })
      }
    }
    
    const successful = results.filter(r => r.success).length
    const failed = results.length - successful
    
    console.log(`Bulk SMS complete. Sent: ${successful}, Failed: ${failed}`)
    
    return {
      results,
      summary: { successful, failed, total: results.length }
    }
  }

  // Verify webhook signature (for security)
  verifyWebhookSignature(payload, signature, timestamp) {
    // Telnyx webhook signature verification
    // This is a basic implementation - refer to Telnyx docs for exact implementation
    if (!signature || !timestamp) {
      return false
    }
    
    // For now, return true - implement proper signature verification in production
    return true
  }

  // Parse webhook event
  parseWebhookEvent(body) {
    try {
      if (typeof body === 'string') {
        body = JSON.parse(body)
      }

      const event = body.data
      
      if (!event || !event.event_type) {
        throw new Error('Invalid webhook format')
      }

      return {
        eventType: event.event_type,
        messageId: event.id,
        payload: event.payload,
        occurredAt: event.occurred_at,
        recordType: event.record_type
      }
    } catch (error) {
      console.error('Error parsing webhook event:', error)
      throw new Error('Failed to parse webhook event')
    }
  }

  // Get message status
  async getMessageStatus(messageId) {
    try {
      const response = await this.client.get(`/messages/${messageId}`)
      return response.data.data
    } catch (error) {
      console.error('Error getting message status:', error.response?.data || error.message)
      throw error
    }
  }
}

// Create singleton instance
const telnyx = new TelnyxClient()

export default telnyx

// Named exports for specific functions
export const {
  sendMessage,
  sendBulkMessages,
  verifyWebhookSignature,
  parseWebhookEvent,
  getMessageStatus,
  toE164
} = telnyx