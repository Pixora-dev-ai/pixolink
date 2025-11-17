/**
 * PIXOPAY WhatsApp Integration Service
 * 
 * This module provides WhatsApp Cloud API integration for automated payment proof handling.
 * Allows users to send payment screenshots directly via WhatsApp for automatic processing.
 * 
 * @module lib/whatsapp/pixopayWebhook
 * @version 1.0.0
 */

import { logger } from '../../utils/logger';

/**
 * WhatsApp webhook request structure
 */
interface WebhookRequest {
  headers: Record<string, string>;
  query: Record<string, string>;
  body: {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: WhatsAppMessage[];
        };
      }>;
    }>;
  };
}

/**
 * WhatsApp webhook response structure
 */
interface WebhookResponse {
  status: (code: number) => WebhookResponse;
  json: (data: unknown) => void;
  send: (data: unknown) => void;
}

/**
 * WhatsApp message payload structure
 */
export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
}

/**
 * Parsed payment info from WhatsApp message
 */
export interface ParsedPaymentInfo {
  userEmail?: string;
  amount?: number;
  paymentMethod?: 'instapay' | 'vf_cash';
  imageId?: string;
  phoneNumber: string;
}

/**
 * Webhook handler for WhatsApp Cloud API
 * 
 * This endpoint receives messages sent to the PixoRA WhatsApp business number
 * and automatically processes payment proof submissions.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * 
 * @example
 * ```typescript
 * // In your Express server:
 * app.post('/api/webhooks/whatsapp', handleWhatsAppWebhook);
 * ```
 */
export async function handleWhatsAppWebhook(req: WebhookRequest, res: WebhookResponse): Promise<void> {
  try {
    // Verify webhook signature
    const signature = req.headers['x-hub-signature-256'];
    if (!verifyWebhookSignature(signature, req.body)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const { entry } = req.body;

    if (!entry || !entry[0]?.changes) {
      res.status(200).json({ status: 'ok' });
      return;
    }

    const change = entry[0].changes[0];
    const message: WhatsAppMessage = change.value.messages?.[0];

    if (!message) {
      res.status(200).json({ status: 'ok' });
      return;
    }

    logger.info('Received WhatsApp message', { 
      from: message.from, 
      type: message.type 
    });

    // Handle image messages (payment proofs)
    if (message.type === 'image') {
      await handlePaymentProofImage(message);
    }

    // Handle text messages (user queries)
    if (message.type === 'text') {
      await handleTextMessage(message);
    }

    res.status(200).json({ status: 'ok' });

  } catch (error) {
    logger.error('WhatsApp webhook error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handles incoming payment proof images from WhatsApp
 */
async function handlePaymentProofImage(message: WhatsAppMessage): Promise<void> {
  try {
    if (!message.image) return;

    // TODO: Implement image download from WhatsApp API
    // 1. Get media URL using image.id
    // 2. Download image file
    // 3. Upload to Supabase storage
    // 4. Parse user info from recent text messages
    // 5. Create manual_payment record
    // 6. Send confirmation message back to user

    logger.info('Processing payment proof image', { 
      imageId: message.image.id,
      from: message.from 
    });

    // Placeholder: Send acknowledgment message
    await sendWhatsAppMessage(
      message.from,
      '✅ Payment proof received! We\'re processing your submission. You\'ll receive a notification once it\'s verified (usually 10-30 minutes).'
    );

  } catch (error) {
    logger.error('Failed to process payment proof image', { error });
  }
}

/**
 * Handles text messages from users
 */
async function handleTextMessage(message: WhatsAppMessage): Promise<void> {
  try {
    if (!message.text) return;

    const text = message.text.body.toLowerCase();

    // Check for payment-related keywords
    if (text.includes('payment') || text.includes('credit') || text.includes('egp')) {
      const parsedInfo = parsePaymentMessage(message.text.body);
      
      // Store parsed info temporarily for when image arrives
      await storeTemporaryUserInfo(message.from, parsedInfo);
      
      await sendWhatsAppMessage(
        message.from,
        'Thanks! Please send your payment screenshot now.'
      );
    } else {
      // General inquiry
      await sendWhatsAppMessage(
        message.from,
        'Hello! 👋\n\nTo submit a payment proof:\n1. Send your email and amount\n2. Send payment screenshot\n\nNeed help? Visit: pixora.app/help'
      );
    }

  } catch (error) {
    logger.error('Failed to process text message', { error });
  }
}

/**
 * Parses payment information from text message
 */
function parsePaymentMessage(text: string): ParsedPaymentInfo {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const amountRegex = /(\d+)\s*(egp|EGP|pound|جنيه)/;
  
  const emailMatch = text.match(emailRegex);
  const amountMatch = text.match(amountRegex);

  return {
    userEmail: emailMatch ? emailMatch[1] : undefined,
    amount: amountMatch ? parseInt(amountMatch[1]) : undefined,
    phoneNumber: '',
    paymentMethod: text.toLowerCase().includes('instapay') ? 'instapay' : 
                   text.toLowerCase().includes('vodafone') ? 'vf_cash' : undefined
  };
}

/**
 * Sends a message back to user via WhatsApp API
 */
async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  try {
    // TODO: Implement WhatsApp Cloud API message sending
    // const response = await fetch(
    //   `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${ACCESS_TOKEN}`,
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       messaging_product: 'whatsapp',
    //       to,
    //       type: 'text',
    //       text: { body: message }
    //     })
    //   }
    // );

    logger.info('Sent WhatsApp message', { to, message });

  } catch (error) {
    logger.error('Failed to send WhatsApp message', { error });
  }
}

/**
 * Verifies webhook signature from Meta
 */
function verifyWebhookSignature(_signature: string, _payload: unknown): boolean {
  // TODO: Implement signature verification
  // const crypto = require('crypto');
  // const hmac = crypto.createHmac('sha256', APP_SECRET);
  // hmac.update(JSON.stringify(_payload));
  // const expectedSignature = 'sha256=' + hmac.digest('hex');
  // return _signature === expectedSignature;

  logger.info('Verifying webhook signature');
  return true; // Placeholder
}

/**
 * Stores temporary user info in cache/database
 */
async function storeTemporaryUserInfo(phoneNumber: string, info: ParsedPaymentInfo): Promise<void> {
  try {
    // TODO: Store in Redis or temporary database table
    logger.info('Storing temporary user info', { phoneNumber, info });
  } catch (error) {
    logger.error('Failed to store user info', { error });
  }
}

/**
 * WhatsApp Cloud API configuration
 */
export const whatsappConfig = {
  enabled: false, // Set to true when WhatsApp Business API is configured
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  appSecret: process.env.WHATSAPP_APP_SECRET || ''
};

/**
 * Checks if WhatsApp integration is available
 */
export function isWhatsAppAvailable(): boolean {
  return (
    whatsappConfig.enabled &&
    !!whatsappConfig.phoneNumberId &&
    !!whatsappConfig.accessToken
  );
}

/**
 * Webhook verification endpoint (for Meta initial setup)
 */
export function verifyWhatsAppWebhook(req: WebhookRequest, res: WebhookResponse): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === whatsappConfig.webhookVerifyToken) {
    logger.info('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
}

export default {
  handleWhatsAppWebhook,
  verifyWhatsAppWebhook,
  sendWhatsAppMessage,
  isWhatsAppAvailable,
  whatsappConfig
};
