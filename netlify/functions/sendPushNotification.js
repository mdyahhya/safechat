const webpush = require('web-push');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { chatId, senderId, senderName, messageText, recipients } = JSON.parse(event.body);

    if (!recipients || recipients.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No recipients' })
      };
    }

    // Get VAPID keys from Netlify environment variables
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'VAPID keys not configured' })
      };
    }

    // Set VAPID details
    webpush.setVapidDetails(
      'mailto:mundewadiyahya@gmail.com',  // ← Change to your email
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    // Create timestamp
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create notification payload
    const payload = JSON.stringify({
      title: `New message from ${senderName || 'Someone'}`,
      body: `SafeChat • ${timestamp}`,
      data: {
        chatId,
        senderId
      }
    });

    // Send push to all recipients
    const promises = recipients.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        console.log('✅ Push sent successfully');
      } catch (error) {
        console.error('❌ Push error:', error);
      }
    });

    await Promise.all(promises);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sent: recipients.length })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
