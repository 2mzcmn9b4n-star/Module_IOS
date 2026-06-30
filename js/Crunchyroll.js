// Crunchyroll Premium Unlock
// Intercepts subscription API responses and fakes premium status

const premiumResponse = {
    "subscription": {
        "status": "active",
        "tier": "mega_fan",
        "plan": "monthly",
        "is_active": true,
        "is_premium": true,
        "has_ads": false,
        "can_watch_new_episodes": true,
        "can_watch_simulcast": true,
        "can_download": true,
        "can_watch_offline": true,
        "max_quality": "1080p",
        "expires_at": "2099-12-31T23:59:59Z",
        "next_renewal_date": "2099-12-31T23:59:59Z",
        "payment_provider": "apple",
        "auto_renew": true,
        "free_trial": false,
        "trial_end_date": null,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    "benefits": {
        "ad_free": true,
        "unlimited_access": true,
        "new_episodes": true,
        "simulcast": true,
        "offline_viewing": true,
        "stream_quality": "1080p",
        "num_devices": 4,
        "manga_access": true,
        "store_discount": 0.10
    }
};

const premiumBenefits = {
    "benefits": [
        {"type": "ad_free", "enabled": true},
        {"type": "unlimited_access", "enabled": true},
        {"type": "new_episodes", "enabled": true},
        {"type": "simulcast", "enabled": true},
        {"type": "offline_viewing", "enabled": true},
        {"type": "stream_quality", "value": "1080p"},
        {"type": "num_devices", "value": 4},
        {"type": "manga_access", "enabled": true}
    ],
    "tier": "mega_fan",
    "is_premium": true,
    "is_active": true,
    "expires_at": "2099-12-31T23:59:59Z"
};

let body = $response.body;
let url = $request.url;

// Helper: check if string is valid JSON
function isJSON(str) {
    if (typeof str !== 'string') return false;
    str = str.trim();
    if (str.length === 0) return false;
    if (str[0] !== '{' && str[0] !== '[') return false;
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

try {
    // If body is not JSON, just pass through (could be HTML, binary, etc.)
    if (!isJSON(body)) {
        console.log("Crunchyroll: Non-JSON response, passing through. URL: " + url);
        $done({body});
    }

    let obj = JSON.parse(body);

    // Check if this is a subscription status endpoint
    if (url.includes('/subs/v3/subscriptions/') || url.includes('/subs/v1/subscriptions/')) {

        // If it's the benefits endpoint
        if (url.includes('/benefits')) {
            obj = premiumBenefits;
        }
        // If it's the main subscription endpoint
        else if (url.includes('/subscriptions/')) {
            if (obj.subscription) {
                obj.subscription = premiumResponse.subscription;
            } else if (obj.subscriptions && Array.isArray(obj.subscriptions)) {
                obj.subscriptions = [premiumResponse.subscription];
            } else if (obj.data) {
                obj.data = premiumResponse.subscription;
            } else {
                obj = premiumResponse;
            }
        }

        // Also handle eligibility endpoint
        if (url.includes('/eligibility/')) {
            obj.eligible = true;
            obj.can_subscribe = true;
            obj.has_active_subscription = true;
            obj.trial_available = false;
            obj.subscription_status = "active";
        }
    }

    // Handle account endpoint to show premium
    if (url.includes('/accounts/v1/me') && !url.includes('/profile')) {
        if (obj.account) {
            obj.account.subscription_status = "active";
            obj.account.is_premium = true;
            obj.account.has_ads = false;
            obj.account.can_watch_premium = true;
        } else {
            obj.subscription_status = "active";
            obj.is_premium = true;
            obj.has_ads = false;
            obj.can_watch_premium = true;
        }
    }

    // Handle product endpoint to show premium products as purchased
    if (url.includes('/subs/v2/products/')) {
        if (obj.product) {
            obj.product.owned = true;
            obj.product.purchased = true;
            obj.product.subscription_status = "active";
        }
    }

    body = JSON.stringify(obj);

} catch (e) {
    console.log("Crunchyroll unlock error: " + e.message + " | URL: " + url);
}

$done({body});
