import fetch from 'node-fetch';

async function sendMockMessage() {
    try {
        console.log("Mocking WhatsApp incoming webhook...");
        // This won't work easily because the webhook is disabled or requires secret token.
        // Instead, let's write a simple JS script to call the service directly if we can't hit the webhook.
    } catch (e) {
        console.error(e);
    }
}

sendMockMessage();
