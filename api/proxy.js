/**
 * Vercel Edge Function for Smart Proxy
 * 处理代理请求并保持正确的MIME类型
 */

// 域名白名单配置
const ALLOWED_DOMAINS = [
    // OpenAI相关服务
    'api.openai.com',
    'openai.com',
    
    // GitHub相关服务
    'api.github.com',
    'raw.githubusercontent.com',
    'github.com',
    'objects.githubusercontent.com',
    
    // Google相关服务
    'www.google.com',
    'translate.googleapis.com',
    
    // 开发测试服务
    'httpbin.org',
    'jsonplaceholder.typicode.com',
    
    // 自定义域名
    'player.imixc.top',
    '*.ixingchen.top',
];

/**
 * 检查域名是否在白名单中
 */
function isAllowedDomain(hostname) {
    const host = hostname.toLowerCase();
    
    return ALLOWED_DOMAINS.some(domain => {
        // 处理通配符域名
        if (domain.startsWith('*.')) {
            const baseDomain = domain.substring(2).toLowerCase();
            return host === baseDomain || host.endsWith('.' + baseDomain);
        }
        
        // 处理普通域名
        domain = domain.toLowerCase();
        return host === domain || host.endsWith('.' + domain);
    });
}

/**
 * 获取正确的MIME类型
 */
function getMimeType(url) {
    const ext = url.split('.').pop()?.toLowerCase();
    
    const mimeTypes = {
        'js': 'application/javascript',
        'css': 'text/css',
        'html': 'text/html',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'ttf': 'font/ttf',
        'eot': 'application/vnd.ms-fontobject',
        'webmanifest': 'application/manifest+json',
        'xml': 'application/xml',
        'txt': 'text/plain'
    };
    
    return mimeTypes[ext] || 'text/plain';
}

export default async function handler(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // 解析代理URL
    // 格式: /api/proxy?url=https://example.com/path
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
        return new Response('Missing target URL', { status: 400 });
    }
    
    try {
        const targetUrlObj = new URL(targetUrl);
        
        // 检查域名白名单
        if (!isAllowedDomain(targetUrlObj.hostname)) {
            return new Response('Domain not allowed', { status: 403 });
        }
        
        // 发起代理请求
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': request.headers.get('Accept') || '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        // 获取响应内容
        const content = await response.arrayBuffer();
        
        // 设置正确的响应头
        const responseHeaders = new Headers();
        
        // 设置MIME类型
        const mimeType = getMimeType(targetUrl);
        responseHeaders.set('Content-Type', mimeType);
        
        // 复制一些重要的响应头
        const importantHeaders = [
            'cache-control',
            'expires',
            'last-modified',
            'etag'
        ];
        
        importantHeaders.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
                responseHeaders.set(header, value);
            }
        });
        
        // 设置CORS头
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        return new Response(content, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
        
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response('Proxy error: ' + error.message, { status: 500 });
    }
}

export const config = {
    runtime: 'edge',
};
