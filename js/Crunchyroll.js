// Crunchyroll Premium Unlock
// Intercepts subscription API responses and fakes premium status
// Based on real iOS app traffic analysis

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

const subscriptionState = {
    "subscription_state": "active",
    "is_premium": true,
    "tier": "mega_fan",
    "has_active_subscription": true,
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
        return;
    }

    let obj = JSON.parse(body);

    // === SUBSCRIPTION STATE ENDPOINT (NEW from logs) ===
    // /subs/v1/accounts/{UUID}/subscriptions/state
    if (url.includes('/subscriptions/state')) {
        obj = subscriptionState;
    }

    // === SUBSCRIPTION STATUS ENDPOINTS ===
    // /subs/v3/subscriptions/{id} or /subs/v1/subscriptions/{id}
    if (url.includes('/subs/v3/subscriptions/') || url.includes('/subs/v1/subscriptions/')) {

        // Benefits endpoint: /subs/v1/subscriptions/{id}/benefits
        if (url.includes('/benefits')) {
            obj = premiumBenefits;
        }
        // Products endpoint: /subs/v1/subscriptions/{id}/products
        else if (url.includes('/products')) {
            if (obj.subscription || obj.subscriptions || obj.data) {
                if (obj.subscription) {
                    obj.subscription = premiumResponse.subscription;
                } else if (obj.subscriptions && Array.isArray(obj.subscriptions)) {
                    obj.subscriptions = [premiumResponse.subscription];
                } else if (obj.data) {
                    obj.data = premiumResponse.subscription;
                } else {
                    obj = premiumResponse;
                }
            } else {
                obj = premiumResponse;
            }
        }
        // Third party products
        else if (url.includes('/third_party_products')) {
            obj = {
                "products": [{
                    "sku": "crunchyroll_premium",
                    "name": "Crunchyroll Premium",
                    "tier": "mega_fan",
                    "is_active": true,
                    "is_premium": true
                }]
            };
        }
        // Main subscription endpoint
        else if (url.includes('/subscriptions/')) {
            if (obj.subscription || obj.subscriptions || obj.data) {
                if (obj.subscription) {
                    obj.subscription = premiumResponse.subscription;
                } else if (obj.subscriptions && Array.isArray(obj.subscriptions)) {
                    obj.subscriptions = [premiumResponse.subscription];
                } else if (obj.data) {
                    obj.data = premiumResponse.subscription;
                } else {
                    obj = premiumResponse;
                }
            } else {
                obj = premiumResponse;
            }
        }

        // Eligibility endpoint: /subs/v1/subscriptions/{id}/eligibility
        if (url.includes('/eligibility/')) {
            obj.eligible = true;
            obj.can_subscribe = true;
            obj.has_active_subscription = true;
            obj.trial_available = false;
            obj.subscription_status = "active";
        }
    }

    // === ACCOUNT ENDPOINTS ===
    // /accounts/v1/me or /accounts/v1/{UUID}/multiprofile
    if (url.includes('/accounts/v1/')) {
        if (obj.account) {
            obj.account.subscription_status = "active";
            obj.account.is_premium = true;
            obj.account.has_ads = false;
            obj.account.can_watch_premium = true;
            obj.account.tier = "mega_fan";
        } else if (obj.profile || obj.profiles) {
            // Multiprofile endpoint - add premium to profiles
            if (obj.profile) {
                obj.profile.is_premium = true;
                obj.profile.subscription_status = "active";
            }
            if (obj.profiles && Array.isArray(obj.profiles)) {
                obj.profiles.forEach(p => {
                    p.is_premium = true;
                    p.subscription_status = "active";
                });
            }
        } else {
            obj.subscription_status = "active";
            obj.is_premium = true;
            obj.has_ads = false;
            obj.can_watch_premium = true;
            obj.tier = "mega_fan";
        }
    }

    // === PRODUCT ENDPOINTS ===
    // /subs/v2/products/{sku} or /subs/v2/products?source=itunes
    if (url.includes('/subs/v2/products')) {
        if (obj.product) {
            obj.product.owned = true;
            obj.product.purchased = true;
            obj.product.subscription_status = "active";
            obj.product.tier = "mega_fan";
        } else if (obj.products && Array.isArray(obj.products)) {
            obj.products.forEach(p => {
                p.owned = true;
                p.purchased = true;
                p.subscription_status = "active";
                p.tier = "mega_fan";
            });
        } else {
            obj = {
                "products": [{
                    "sku": "crunchyroll_premium",
                    "name": "Crunchyroll Premium",
                    "tier": "mega_fan",
                    "is_active": true,
                    "is_premium": true,
                    "owned": true,
                    "purchased": true
                }]
            };
        }
    }

    body = JSON.stringify(obj);

} catch (e) {
    console.log("Crunchyroll unlock error: " + e.message + " | URL: " + url);
}

$done({body});
