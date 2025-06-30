/**
 * Netlify Functions版本的代理服务
 * 与Vercel Edge Function保持功能一致
 * 
 * @author Secure Proxy Team
 * @version 2.0.0
 * @license MIT
 */

// 严格的域名白名单配置 - 与Vercel版本保持一致
const ALLOWED_DOMAINS = [
    'api.openai.com',
    'openai.com',
    'api.github.com',
    'raw.githubusercontent.com',
    'github.com',
    'objects.githubusercontent.com',
    'www.google.com',
    'translate.googleapis.com',
    'httpbin.org',
    'jsonplaceholder.typicode.com',
    // 音乐播放器相关域名
    'player.imixc.top',
    '*.imixc.top',
    '*.ixingchen.top'
];

// 生产环境配置
const PROXY_CONFIG = {
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    TIMEOUT: 30000,
    MAX_REDIRECTS: 10,
    MAX_RESPONSE_SIZE: 50 * 1024 * 1024, // 50MB
    COMPRESSION_THRESHOLD: 1024, // 1KB
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    ENABLE_LOGGING: false,
    CACHE_CONTROL: {
        HTML: 'no-cache, no-store, must-revalidate, proxy-revalidate',
        CSS: 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400',
        JS: 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400',
        IMAGES: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
        FONTS: 'public, max-age=604800, s-maxage=2592000, immutable',
        WASM: 'public, max-age=3600, s-maxage=7200',
        JSON: 'public, max-age=300, s-maxage=600',
        DEFAULT: 'public, max-age=300, s-maxage=600'
    },
    SECURITY_HEADERS: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
};

/**
 * 验证域名是否在白名单中
 */
function isDomainAllowed(hostname) {
    return ALLOWED_DOMAINS.some(domain => {
        if (domain.startsWith('*.')) {
            const baseDomain = domain.slice(2);
            return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
        }
        return hostname === domain;
    });
}

/**
 * 创建错误响应
 */
function createErrorResponse(error, statusCode = 400) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            ...PROXY_CONFIG.SECURITY_HEADERS
        },
        body: JSON.stringify({
            error: error.error || 'Request failed',
            message: error.message || 'An error occurred',
            timestamp: new Date().toISOString(),
            platform: 'netlify'
        })
    };
}

/**
 * 生成请求ID
 */
function generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

/**
 * 获取内容类型对应的缓存控制
 */
function getCacheControl(contentType) {
    if (!contentType) return PROXY_CONFIG.CACHE_CONTROL.DEFAULT;
    
    const type = contentType.toLowerCase();
    if (type.includes('text/html')) return PROXY_CONFIG.CACHE_CONTROL.HTML;
    if (type.includes('text/css')) return PROXY_CONFIG.CACHE_CONTROL.CSS;
    if (type.includes('javascript')) return PROXY_CONFIG.CACHE_CONTROL.JS;
    if (type.includes('image/')) return PROXY_CONFIG.CACHE_CONTROL.IMAGES;
    if (type.includes('font/') || type.includes('woff')) return PROXY_CONFIG.CACHE_CONTROL.FONTS;
    if (type.includes('application/wasm')) return PROXY_CONFIG.CACHE_CONTROL.WASM;
    if (type.includes('application/json')) return PROXY_CONFIG.CACHE_CONTROL.JSON;
    
    return PROXY_CONFIG.CACHE_CONTROL.DEFAULT;
}

/**
 * Netlify Functions处理器
 */
exports.handler = async (event, context) => {
    try {
        // 处理CORS预检请求
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                    ...PROXY_CONFIG.SECURITY_HEADERS
                },
                body: ''
            };
        }

        // 获取目标URL
        const targetUrl = event.queryStringParameters?.url;
        if (!targetUrl) {
            return createErrorResponse({
                error: 'Missing URL parameter',
                message: 'Please provide a valid URL parameter'
            });
        }

        // 验证URL格式
        let targetUrlObj;
        try {
            targetUrlObj = new URL(targetUrl);
        } catch (error) {
            return createErrorResponse({
                error: 'Invalid URL format',
                message: 'The provided URL is not valid'
            });
        }

        // 验证域名白名单
        if (!isDomainAllowed(targetUrlObj.hostname)) {
            return createErrorResponse({
                error: 'Domain not allowed',
                message: `Domain ${targetUrlObj.hostname} is not in the allowed list`
            }, 403);
        }

        // 准备请求头
        const requestHeaders = {
            'User-Agent': PROXY_CONFIG.USER_AGENT,
            'Accept': event.headers.accept || '*/*',
            'Accept-Language': event.headers['accept-language'] || 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };

        // 转发重要的请求头
        const forwardHeaders = [
            'authorization',
            'cookie',
            'referer',
            'x-requested-with',
            'content-type',
            'content-length',
            'range',
            'if-modified-since',
            'if-none-match'
        ];

        forwardHeaders.forEach(header => {
            const value = event.headers[header.toLowerCase()];
            if (value) {
                requestHeaders[header] = value;
            }
        });

        // 设置正确的Referer
        requestHeaders['Referer'] = targetUrlObj.origin;

        // 准备请求选项
        const fetchOptions = {
            method: event.httpMethod,
            headers: requestHeaders,
            redirect: 'follow'
        };

        // 添加请求体（如果不是GET或HEAD请求）
        if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
            fetchOptions.body = event.isBase64Encoded ? 
                Buffer.from(event.body, 'base64') : 
                event.body;
        }

        // 执行代理请求
        const response = await fetch(targetUrl, fetchOptions);

        // 获取响应内容
        const responseBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        // 准备响应头
        const responseHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': contentType,
            'Cache-Control': getCacheControl(contentType),
            'X-Proxy-Platform': 'netlify',
            'X-Request-ID': generateRequestId(),
            ...PROXY_CONFIG.SECURITY_HEADERS
        };

        // 转发重要的响应头
        const forwardResponseHeaders = [
            'content-length',
            'content-encoding',
            'content-disposition',
            'etag',
            'last-modified',
            'expires',
            'vary'
        ];

        forwardResponseHeaders.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
                responseHeaders[header] = value;
            }
        });

        // 记录请求信息（生产环境可选）
        if (PROXY_CONFIG.ENABLE_LOGGING) {
            console.log(`[${new Date().toISOString()}] Netlify Proxy: ${event.httpMethod} ${targetUrl} -> ${response.status}`);
        }

        // 返回响应
        return {
            statusCode: response.status,
            headers: responseHeaders,
            body: Buffer.from(responseBuffer).toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('Netlify proxy handler error:', error);

        return createErrorResponse({
            error: 'Internal proxy error',
            message: 'An unexpected error occurred while processing the request',
            details: error.message,
            timestamp: new Date().toISOString(),
            requestId: generateRequestId()
        }, 500);
    }
};
