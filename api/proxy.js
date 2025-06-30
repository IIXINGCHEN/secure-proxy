/**
 * 企业级智能代理系统 - Vercel Edge Function
 * 完整支持复杂Web应用的代理功能
 *
 * 功能特性：
 * - 智能内容类型检测和MIME设置
 * - 完整的HTML路径重写系统
 * - CSS和JavaScript资源代理
 * - Cookie和Session转发
 * - CORS和安全头处理
 * - 缓存策略优化
 * - 错误处理和回退机制
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

// 代理配置
const PROXY_CONFIG = {
    // 用户代理字符串
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // 请求超时时间（毫秒）
    TIMEOUT: 30000,

    // 最大重定向次数
    MAX_REDIRECTS: 5,

    // 缓存控制
    CACHE_CONTROL: {
        HTML: 'no-cache, no-store, must-revalidate',
        CSS: 'public, max-age=3600',
        JS: 'public, max-age=3600',
        IMAGES: 'public, max-age=86400',
        FONTS: 'public, max-age=604800',
        DEFAULT: 'public, max-age=300'
    }
};

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
 * 智能内容类型检测
 */
function detectContentType(url, responseHeaders) {
    // 优先使用响应头中的Content-Type
    const headerContentType = responseHeaders.get('content-type');
    if (headerContentType) {
        return headerContentType;
    }

    // 根据URL扩展名推断
    const ext = url.split('.').pop()?.toLowerCase();
    const mimeTypes = {
        // 文档类型
        'html': 'text/html; charset=utf-8',
        'htm': 'text/html; charset=utf-8',
        'xml': 'application/xml; charset=utf-8',
        'json': 'application/json; charset=utf-8',
        'txt': 'text/plain; charset=utf-8',

        // 样式和脚本
        'css': 'text/css; charset=utf-8',
        'js': 'application/javascript; charset=utf-8',
        'mjs': 'application/javascript; charset=utf-8',
        'ts': 'application/typescript; charset=utf-8',

        // 图片
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',
        'bmp': 'image/bmp',

        // 字体
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'ttf': 'font/ttf',
        'otf': 'font/otf',
        'eot': 'application/vnd.ms-fontobject',

        // 音视频
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'audio/ogg',

        // 应用文件
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'webmanifest': 'application/manifest+json',
        'manifest': 'application/manifest+json',

        // WebAssembly
        'wasm': 'application/wasm',

        // 数据文件
        'bin': 'application/octet-stream',
        'data': 'application/octet-stream'
    };

    return mimeTypes[ext] || 'application/octet-stream';
}



/**
 * 企业级HTML内容处理器
 * 完整重写HTML中的所有路径引用
 */
function processHtmlContent(html, baseUrl) {
    const urlObj = new URL(baseUrl);
    const origin = urlObj.origin;
    const currentPath = urlObj.pathname;
    const basePath = currentPath.endsWith('/') ? currentPath : currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

    // 创建代理URL的辅助函数
    const createProxyUrl = (targetUrl) => {
        try {
            // 处理完整URL
            if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
                return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
            }

            // 处理绝对路径
            if (targetUrl.startsWith('/')) {
                return `/api/proxy?url=${encodeURIComponent(origin + targetUrl)}`;
            }

            // 处理相对路径
            const fullUrl = new URL(targetUrl, origin + basePath).href;
            return `/api/proxy?url=${encodeURIComponent(fullUrl)}`;
        } catch (error) {
            console.error('URL处理错误:', error, 'targetUrl:', targetUrl);
            return targetUrl; // 返回原始URL作为回退
        }
    };

    // 第一步：添加base标签和代理脚本
    let processedHtml = html;

    // 添加base标签（如果不存在）
    if (!processedHtml.includes('<base')) {
        const baseTag = `<base href="${origin}${basePath}">`;
        processedHtml = processedHtml.replace(/<head[^>]*>/i, `$&\n    ${baseTag}`);
    }

    // 注入代理脚本来处理动态加载
    const proxyScript = `
    <script>
    (function() {
        // 重写fetch函数
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string' && !url.startsWith('/api/proxy')) {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    url = '/api/proxy?url=' + encodeURIComponent(url);
                } else if (url.startsWith('/')) {
                    url = '/api/proxy?url=' + encodeURIComponent('${origin}' + url);
                } else {
                    url = '/api/proxy?url=' + encodeURIComponent('${origin}${basePath}' + url);
                }
            }
            return originalFetch.call(this, url, options);
        };

        // 重写XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            if (typeof url === 'string' && !url.startsWith('/api/proxy')) {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    url = '/api/proxy?url=' + encodeURIComponent(url);
                } else if (url.startsWith('/')) {
                    url = '/api/proxy?url=' + encodeURIComponent('${origin}' + url);
                } else {
                    url = '/api/proxy?url=' + encodeURIComponent('${origin}${basePath}' + url);
                }
            }
            return originalOpen.call(this, method, url, ...args);
        };

        // 重写WebAssembly.instantiateStreaming
        if (window.WebAssembly && WebAssembly.instantiateStreaming) {
            const originalInstantiateStreaming = WebAssembly.instantiateStreaming;
            WebAssembly.instantiateStreaming = function(source, importObject) {
                if (typeof source === 'string' && !source.startsWith('/api/proxy')) {
                    if (source.startsWith('http://') || source.startsWith('https://')) {
                        source = '/api/proxy?url=' + encodeURIComponent(source);
                    } else if (source.startsWith('/')) {
                        source = '/api/proxy?url=' + encodeURIComponent('${origin}' + source);
                    } else {
                        source = '/api/proxy?url=' + encodeURIComponent('${origin}${basePath}' + source);
                    }
                    source = fetch(source);
                }
                return originalInstantiateStreaming.call(this, source, importObject);
            };
        }

        // 禁用ServiceWorker注册（避免路径问题）
        if ('serviceWorker' in navigator) {
            const originalRegister = navigator.serviceWorker.register;
            navigator.serviceWorker.register = function() {
                console.log('ServiceWorker registration disabled in proxy mode');
                return Promise.reject(new Error('ServiceWorker disabled in proxy mode'));
            };
        }
    })();
    </script>`;

    processedHtml = processedHtml.replace(/<\/head>/i, `${proxyScript}\n$&`);

    // 第二步：重写所有静态资源路径
    const patterns = [
        // HTML属性
        { regex: /href=["']([^"']+)["']/g, attr: 'href' },
        { regex: /src=["']([^"']+)["']/g, attr: 'src' },
        { regex: /action=["']([^"']+)["']/g, attr: 'action' },
        { regex: /data-src=["']([^"']+)["']/g, attr: 'data-src' },
        { regex: /srcset=["']([^"']+)["']/g, attr: 'srcset' },

        // CSS中的url()
        { regex: /url\(["']?([^"')]+)["']?\)/g, attr: 'url' },

        // JavaScript中的字符串URL（包含更多文件类型）
        { regex: /"([^"]*\.(css|js|mjs|ts|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|webp|mp3|mp4|webm|ogg|pdf|zip|wasm|json|webmanifest))"/g, attr: 'js-string' },

        // 特殊处理：manifest文件
        { regex: /manifest=["']([^"']+)["']/g, attr: 'manifest' }
    ];

    patterns.forEach(pattern => {
        processedHtml = processedHtml.replace(pattern.regex, (match, url) => {
            // 跳过已经是代理URL的链接
            if (url.includes('/api/proxy') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
                return match;
            }

            // 跳过外部CDN（但保留某些需要代理的CDN）
            if (url.includes('cdnjs.cloudflare.com') || url.includes('unpkg.com') || url.includes('jsdelivr.net')) {
                return match; // 这些CDN通常可以直接访问
            }

            // 特殊处理：某些CDN需要代理
            if (url.includes('npm.elemecdn.com')) {
                // 保持原样，让其通过代理
            }

            const proxyUrl = createProxyUrl(url);

            if (pattern.attr === 'url') {
                return `url("${proxyUrl}")`;
            } else if (pattern.attr === 'js-string') {
                return `"${proxyUrl}"`;
            } else if (pattern.attr === 'srcset') {
                // 处理srcset的多个URL
                const urls = url.split(',').map(item => {
                    const parts = item.trim().split(' ');
                    if (parts.length > 0) {
                        parts[0] = createProxyUrl(parts[0]);
                    }
                    return parts.join(' ');
                });
                return `${pattern.attr}="${urls.join(', ')}"`;
            } else {
                return `${pattern.attr}="${proxyUrl}"`;
            }
        });
    });

    return processedHtml;
}

/**
 * 主代理处理函数
 */
export default async function handler(request) {
    const url = new URL(request.url);

    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    // 解析目标URL
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response(JSON.stringify({
            error: 'Missing target URL',
            usage: 'Use: /api/proxy?url=https://example.com/path'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const targetUrlObj = new URL(targetUrl);

        // 安全检查：域名白名单验证
        if (!isAllowedDomain(targetUrlObj.hostname)) {
            return new Response(JSON.stringify({
                error: 'Domain not allowed',
                domain: targetUrlObj.hostname,
                allowedDomains: ALLOWED_DOMAINS
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 构建请求头
        const requestHeaders = new Headers();
        requestHeaders.set('User-Agent', PROXY_CONFIG.USER_AGENT);
        requestHeaders.set('Accept', request.headers.get('Accept') || '*/*');
        requestHeaders.set('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');
        requestHeaders.set('Accept-Encoding', 'gzip, deflate, br');

        // 转发重要的请求头
        const forwardHeaders = [
            'authorization',
            'cookie',
            'referer',
            'x-requested-with',
            'content-type'
        ];

        forwardHeaders.forEach(header => {
            const value = request.headers.get(header);
            if (value) {
                requestHeaders.set(header, value);
            }
        });

        // 发起代理请求
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.TIMEOUT);

        let requestBody = null;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            requestBody = await request.arrayBuffer();
        }

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: requestHeaders,
            body: requestBody,
            signal: controller.signal,
            redirect: 'follow'
        });

        clearTimeout(timeoutId);

        // 获取响应内容
        const responseBuffer = await response.arrayBuffer();
        let processedContent = responseBuffer;

        // 智能内容类型检测
        const contentType = detectContentType(targetUrl, response.headers);

        // HTML内容特殊处理
        if (contentType.includes('text/html')) {
            const htmlContent = new TextDecoder('utf-8').decode(responseBuffer);
            const processedHtml = processHtmlContent(htmlContent, targetUrl);
            processedContent = new TextEncoder().encode(processedHtml);
        }

        // 构建响应头
        const responseHeaders = new Headers();

        // 设置内容类型
        responseHeaders.set('Content-Type', contentType);

        // 设置缓存策略
        if (contentType.includes('text/html')) {
            responseHeaders.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.HTML);
        } else if (contentType.includes('text/css')) {
            responseHeaders.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.CSS);
        } else if (contentType.includes('javascript')) {
            responseHeaders.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.JS);
        } else if (contentType.includes('image/')) {
            responseHeaders.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.IMAGES);
        } else if (contentType.includes('font/')) {
            responseHeaders.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.FONTS);
        } else {
            responseHeaders.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.DEFAULT);
        }

        // 转发重要的响应头
        const forwardResponseHeaders = [
            'last-modified',
            'etag',
            'expires',
            'set-cookie'
        ];

        forwardResponseHeaders.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
                responseHeaders.set(header, value);
            }
        });

        // 设置CORS头
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

        // 安全头
        responseHeaders.set('X-Content-Type-Options', 'nosniff');
        responseHeaders.set('X-Frame-Options', 'SAMEORIGIN');

        return new Response(processedContent, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });

    } catch (error) {
        console.error('代理错误:', error);

        // 详细的错误信息
        let errorMessage = '代理请求失败';
        let errorDetails = error.message;

        if (error.name === 'AbortError') {
            errorMessage = '请求超时';
            errorDetails = `请求超过 ${PROXY_CONFIG.TIMEOUT}ms 超时限制`;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = '网络连接失败';
            errorDetails = '无法连接到目标服务器';
        }

        return new Response(JSON.stringify({
            error: errorMessage,
            details: errorDetails,
            targetUrl: targetUrl,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

export const config = {
    runtime: 'edge',
};
