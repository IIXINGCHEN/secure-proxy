/**
 * 企业级智能代理系统 - Vercel Edge Function
 * 生产环境代理服务，支持复杂Web应用的完整代理功能
 *
 * @author Secure Proxy Team
 * @version 2.0.0
 * @license MIT
 */

// 严格的域名白名单配置
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
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Resource-Policy': 'cross-origin'
    }
};

/**
 * 域名白名单验证器
 * 支持精确匹配和通配符匹配
 * @param {string} hostname - 要验证的主机名
 * @returns {boolean} 是否允许访问
 */
function isAllowedDomain(hostname) {
    if (!hostname || typeof hostname !== 'string') {
        return false;
    }

    const normalizedHost = hostname.toLowerCase().trim();

    // 防止空字符串和无效域名
    if (!normalizedHost || normalizedHost.length === 0) {
        return false;
    }

    // 防止本地地址和内网地址
    const forbiddenPatterns = [
        /^localhost$/i,
        /^127\./,
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^0\./,
        /^169\.254\./,
        /^::1$/,
        /^fe80:/i
    ];

    if (forbiddenPatterns.some(pattern => pattern.test(normalizedHost))) {
        return false;
    }

    return ALLOWED_DOMAINS.some(domain => {
        const normalizedDomain = domain.toLowerCase().trim();

        if (normalizedDomain.startsWith('*.')) {
            const baseDomain = normalizedDomain.substring(2);
            return normalizedHost === baseDomain || normalizedHost.endsWith('.' + baseDomain);
        }

        return normalizedHost === normalizedDomain || normalizedHost.endsWith('.' + normalizedDomain);
    });
}

/**
 * 高级内容类型检测器
 * 智能检测和修复MIME类型，防止错误的Content-Type导致资源加载失败
 * @param {string} url - 资源URL
 * @param {Headers} responseHeaders - 响应头
 * @param {ArrayBuffer} content - 响应内容（用于二进制检测）
 * @returns {string} 正确的MIME类型
 */
function detectContentType(url, responseHeaders, content = null) {
    const headerContentType = responseHeaders.get('content-type');
    const urlPath = new URL(url).pathname.toLowerCase();
    const fileExtension = urlPath.split('.').pop();

    // 完整的MIME类型映射表
    const mimeTypeMap = {
        // 文档类型
        'html': 'text/html; charset=utf-8',
        'htm': 'text/html; charset=utf-8',
        'xhtml': 'application/xhtml+xml; charset=utf-8',
        'xml': 'application/xml; charset=utf-8',
        'json': 'application/json; charset=utf-8',
        'txt': 'text/plain; charset=utf-8',
        'md': 'text/markdown; charset=utf-8',
        'csv': 'text/csv; charset=utf-8',

        // 样式和脚本
        'css': 'text/css; charset=utf-8',
        'js': 'application/javascript; charset=utf-8',
        'mjs': 'application/javascript; charset=utf-8',
        'jsx': 'application/javascript; charset=utf-8',
        'ts': 'application/typescript; charset=utf-8',
        'tsx': 'application/typescript; charset=utf-8',
        'vue': 'application/javascript; charset=utf-8',

        // 图片格式
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',
        'bmp': 'image/bmp',
        'tiff': 'image/tiff',
        'avif': 'image/avif',

        // 字体文件
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'ttf': 'font/ttf',
        'otf': 'font/otf',
        'eot': 'application/vnd.ms-fontobject',

        // 音视频
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        'aac': 'audio/aac',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',

        // 应用程序文件
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'rar': 'application/vnd.rar',
        '7z': 'application/x-7z-compressed',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',

        // Web应用
        'webmanifest': 'application/manifest+json',
        'manifest': 'application/manifest+json',
        'appcache': 'text/cache-manifest',

        // 特殊格式
        'wasm': 'application/wasm',
        'bin': 'application/octet-stream',
        'data': 'application/octet-stream',
        'map': 'application/json; charset=utf-8'
    };

    const expectedMimeType = mimeTypeMap[fileExtension];

    // 二进制内容检测（魔数检测）
    if (content && content.byteLength > 0) {
        const bytes = new Uint8Array(content.slice(0, 16));

        // PNG魔数: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            return 'image/png';
        }

        // JPEG魔数: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return 'image/jpeg';
        }

        // GIF魔数: 47 49 46 38
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
            return 'image/gif';
        }

        // WebP魔数: 52 49 46 46 ... 57 45 42 50
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
            return 'image/webp';
        }

        // WASM魔数: 00 61 73 6D
        if (bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6D) {
            return 'application/wasm';
        }

        // PDF魔数: 25 50 44 46
        if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
            return 'application/pdf';
        }
    }

    // 验证响应头的正确性 - 特别处理WASM文件
    if (headerContentType && expectedMimeType) {
        const headerType = headerContentType.toLowerCase().split(';')[0].trim();
        const expectedType = expectedMimeType.toLowerCase().split(';')[0].trim();

        // 如果响应头类型明显错误，使用期望类型
        if (headerType === 'application/json' && expectedType !== 'application/json') {
            return expectedMimeType;
        }

        if (headerType === 'text/plain' && expectedType !== 'text/plain') {
            return expectedMimeType;
        }

        if (headerType === 'text/html' && (expectedType === 'text/css' || expectedType === 'application/javascript')) {
            return expectedMimeType;
        }

        // 特别处理WASM文件 - 如果期望是WASM但返回JSON，强制使用WASM类型
        if (expectedType === 'application/wasm' && headerType === 'application/json') {
            return expectedMimeType;
        }
    }

    // 使用响应头中的Content-Type（如果看起来正确）
    if (headerContentType && !headerContentType.includes('text/plain')) {
        return headerContentType;
    }

    // 回退到基于扩展名的检测
    return expectedMimeType || 'application/octet-stream';
}



/**
 * 企业级HTML内容处理器
 * 完整的HTML路径重写系统，支持所有类型的资源引用
 * @param {string} html - 原始HTML内容
 * @param {string} baseUrl - 基础URL
 * @param {string} proxyHost - 当前代理服务器的主机名
 * @returns {string} 处理后的HTML内容
 */
function processHtmlContent(html, baseUrl, proxyHost = '') {
    if (!html || typeof html !== 'string') {
        return html;
    }

    const urlObj = new URL(baseUrl);
    const origin = urlObj.origin;
    const pathname = urlObj.pathname;
    const basePath = pathname.endsWith('/') ? pathname : pathname.substring(0, pathname.lastIndexOf('/') + 1);

    /**
     * 创建代理URL
     * @param {string} targetUrl - 目标URL
     * @returns {string} 代理URL
     */
    const createProxyUrl = (targetUrl) => {
        if (!targetUrl || typeof targetUrl !== 'string') {
            return targetUrl;
        }

        const trimmedUrl = targetUrl.trim();

        // 跳过特殊协议和已处理的URL
        if (trimmedUrl.startsWith('data:') ||
            trimmedUrl.startsWith('blob:') ||
            trimmedUrl.startsWith('javascript:') ||
            trimmedUrl.startsWith('mailto:') ||
            trimmedUrl.startsWith('tel:') ||
            trimmedUrl.startsWith('#') ||
            trimmedUrl.includes('/api/proxy')) {
            return targetUrl;
        }

        try {
            let resolvedUrl;

            if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
                resolvedUrl = trimmedUrl;
            } else if (trimmedUrl.startsWith('//')) {
                resolvedUrl = urlObj.protocol + trimmedUrl;
            } else if (trimmedUrl.startsWith('/')) {
                resolvedUrl = origin + trimmedUrl;
            } else {
                resolvedUrl = new URL(trimmedUrl, origin + basePath).href;
            }

            // 防止递归代理 - 使用传入的代理主机名
            const resolvedUrlObj = new URL(resolvedUrl);

            if (resolvedUrlObj.hostname.includes('vercel.app') ||
                resolvedUrlObj.hostname.includes('localhost') ||
                resolvedUrlObj.hostname.includes('127.0.0.1') ||
                resolvedUrlObj.href.includes('/api/proxy') ||
                (proxyHost && resolvedUrlObj.hostname === proxyHost)) {
                return targetUrl;
            }

            return `/api/proxy?url=${encodeURIComponent(resolvedUrl)}`;
        } catch (error) {
            console.error('URL解析错误:', error, 'URL:', targetUrl);
            return targetUrl;
        }
    };

    let processedHtml = html;

    // 第一步：注入base标签
    if (!processedHtml.includes('<base')) {
        const baseTag = `<base href="${origin}${basePath}">`;
        const headMatch = processedHtml.match(/<head[^>]*>/i);
        if (headMatch) {
            processedHtml = processedHtml.replace(/<head[^>]*>/i, `${headMatch[0]}\n    ${baseTag}`);
        }
    }

    // 第二步：注入高级代理脚本
    const proxyScript = `
    <script>
    (function() {
        'use strict';

        const PROXY_CONFIG = {
            origin: '${origin}',
            basePath: '${basePath}',
            proxyEndpoint: '/api/proxy?url=',
            currentHost: location.hostname
        };

        function createProxyUrl(url) {
            if (!url || typeof url !== 'string') return url;

            const trimmedUrl = url.trim();
            if (trimmedUrl.startsWith('data:') ||
                trimmedUrl.startsWith('blob:') ||
                trimmedUrl.startsWith('javascript:') ||
                trimmedUrl.startsWith('mailto:') ||
                trimmedUrl.startsWith('tel:') ||
                trimmedUrl.startsWith('#') ||
                trimmedUrl.includes('/api/proxy')) {
                return url;
            }

            try {
                let resolvedUrl;
                if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
                    resolvedUrl = trimmedUrl;
                } else if (trimmedUrl.startsWith('//')) {
                    resolvedUrl = location.protocol + trimmedUrl;
                } else if (trimmedUrl.startsWith('/')) {
                    resolvedUrl = PROXY_CONFIG.origin + trimmedUrl;
                } else {
                    resolvedUrl = new URL(trimmedUrl, PROXY_CONFIG.origin + PROXY_CONFIG.basePath).href;
                }

                const resolvedUrlObj = new URL(resolvedUrl);
                if (resolvedUrlObj.hostname.includes('vercel.app') ||
                    resolvedUrlObj.hostname.includes('localhost') ||
                    resolvedUrl.includes('/api/proxy') ||
                    resolvedUrlObj.hostname === PROXY_CONFIG.currentHost) {
                    return url;
                }

                return PROXY_CONFIG.proxyEndpoint + encodeURIComponent(resolvedUrl);
            } catch (e) {
                return url;
            }
        }

        // 重写fetch API
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
            let url = input;
            if (input instanceof Request) {
                url = input.url;
            }

            const proxyUrl = createProxyUrl(url);
            if (proxyUrl !== url) {
                if (input instanceof Request) {
                    return originalFetch.call(this, new Request(proxyUrl, input), init);
                } else {
                    return originalFetch.call(this, proxyUrl, init);
                }
            }

            return originalFetch.call(this, input, init);
        };

        // 重写XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            const proxyUrl = createProxyUrl(url);
            return originalOpen.call(this, method, proxyUrl, async, user, password);
        };

        // 重写WebAssembly.instantiateStreaming
        if (window.WebAssembly && WebAssembly.instantiateStreaming) {
            const originalInstantiateStreaming = WebAssembly.instantiateStreaming;
            WebAssembly.instantiateStreaming = function(source, importObject) {
                if (typeof source === 'string') {
                    const proxyUrl = createProxyUrl(source);
                    if (proxyUrl !== source) {
                        source = fetch(proxyUrl);
                    }
                } else if (source instanceof Promise) {
                    source = source.then(response => {
                        if (response instanceof Response) {
                            const url = response.url;
                            const proxyUrl = createProxyUrl(url);
                            if (proxyUrl !== url) {
                                return fetch(proxyUrl);
                            }
                        }
                        return response;
                    });
                }
                return originalInstantiateStreaming.call(this, source, importObject);
            };
        }

        // 重写动态import
        if (window.import) {
            const originalImport = window.import;
            window.import = function(specifier) {
                const proxyUrl = createProxyUrl(specifier);
                return originalImport.call(this, proxyUrl);
            };
        }

        // 禁用ServiceWorker（避免路径冲突）
        if ('serviceWorker' in navigator) {
            const originalRegister = navigator.serviceWorker.register;
            navigator.serviceWorker.register = function() {
                console.warn('ServiceWorker registration disabled in proxy mode');
                return Promise.reject(new Error('ServiceWorker disabled in proxy mode'));
            };
        }

        // 重写Image构造函数
        const OriginalImage = window.Image;
        window.Image = function(width, height) {
            const img = new OriginalImage(width, height);
            const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
            Object.defineProperty(img, 'src', {
                set: function(value) {
                    const proxyUrl = createProxyUrl(value);
                    originalSrcSetter.call(this, proxyUrl);
                },
                get: function() {
                    return this.getAttribute('src');
                }
            });
            return img;
        };

        // 重写Audio构造函数
        if (window.Audio) {
            const OriginalAudio = window.Audio;
            window.Audio = function(src) {
                const audio = new OriginalAudio();
                if (src) {
                    audio.src = createProxyUrl(src);
                }
                return audio;
            };
        }

        console.log('Proxy script initialized successfully');
    })();
    </script>`;

    // 注入脚本到head标签
    const headCloseMatch = processedHtml.match(/<\/head>/i);
    if (headCloseMatch) {
        processedHtml = processedHtml.replace(/<\/head>/i, `${proxyScript}\n$&`);
    } else {
        // 如果没有head标签，在body开始前注入
        processedHtml = processedHtml.replace(/<body[^>]*>/i, `${proxyScript}\n$&`);
    }

    // 第三步：重写HTML属性中的URL
    const urlPatterns = [
        // 基础HTML属性
        { regex: /\bhref\s*=\s*["']([^"']+)["']/gi, attr: 'href' },
        { regex: /\bsrc\s*=\s*["']([^"']+)["']/gi, attr: 'src' },
        { regex: /\baction\s*=\s*["']([^"']+)["']/gi, attr: 'action' },
        { regex: /\bdata-src\s*=\s*["']([^"']+)["']/gi, attr: 'data-src' },
        { regex: /\bdata-url\s*=\s*["']([^"']+)["']/gi, attr: 'data-url' },
        { regex: /\bdata-href\s*=\s*["']([^"']+)["']/gi, attr: 'data-href' },
        { regex: /\bposter\s*=\s*["']([^"']+)["']/gi, attr: 'poster' },
        { regex: /\bmanifest\s*=\s*["']([^"']+)["']/gi, attr: 'manifest' },

        // srcset属性（特殊处理）
        { regex: /\bsrcset\s*=\s*["']([^"']+)["']/gi, attr: 'srcset', special: true },

        // CSS中的url()
        { regex: /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi, attr: 'css-url' },

        // 内联样式中的background-image等
        { regex: /background-image\s*:\s*url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi, attr: 'css-bg' },
        { regex: /background\s*:\s*url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi, attr: 'css-bg-short' },

        // JavaScript字符串中的URL（更精确的匹配）
        { regex: /"((?:https?:\/\/|\/\/|\/)[^"]*\.(css|js|mjs|ts|json|wasm|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|otf|mp3|mp4|webm|ogg|avi|mov|pdf|zip|rar|7z|tar|gz|webmanifest|xml|txt))"/gi, attr: 'js-url' },
        { regex: /'((?:https?:\/\/|\/\/|\/)[^']*\.(css|js|mjs|ts|json|wasm|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|otf|mp3|mp4|webm|ogg|avi|mov|pdf|zip|rar|7z|tar|gz|webmanifest|xml|txt))'/gi, attr: 'js-url-single' },

        // 模板字符串中的URL
        { regex: /\`([^`]*\.(css|js|mjs|ts|json|wasm|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|otf|mp3|mp4|webm|ogg|avi|mov|pdf|zip|rar|7z|tar|gz|webmanifest|xml|txt))\`/gi, attr: 'template-url' }
    ];

    // 处理每个URL模式
    urlPatterns.forEach(pattern => {
        processedHtml = processedHtml.replace(pattern.regex, (match, url) => {
            if (!url || typeof url !== 'string') {
                return match;
            }

            const trimmedUrl = url.trim();

            // 跳过特殊URL和已处理的URL
            if (trimmedUrl.startsWith('data:') ||
                trimmedUrl.startsWith('blob:') ||
                trimmedUrl.startsWith('javascript:') ||
                trimmedUrl.startsWith('mailto:') ||
                trimmedUrl.startsWith('tel:') ||
                trimmedUrl.startsWith('#') ||
                trimmedUrl.includes('/api/proxy')) {
                return match;
            }

            // 跳过递归引用 - 使用传入的代理主机名
            if (trimmedUrl.includes('vercel.app') ||
                trimmedUrl.includes('localhost') ||
                trimmedUrl.includes('127.0.0.1') ||
                trimmedUrl.includes('/api/proxy') ||
                (proxyHost && trimmedUrl.includes(proxyHost))) {
                return match;
            }

            // 跳过可直接访问的CDN
            const directAccessCDNs = [
                'cdnjs.cloudflare.com',
                'unpkg.com',
                'jsdelivr.net',
                'fonts.googleapis.com',
                'fonts.gstatic.com',
                'ajax.googleapis.com'
            ];

            if (directAccessCDNs.some(cdn => trimmedUrl.includes(cdn))) {
                return match;
            }

            const proxyUrl = createProxyUrl(trimmedUrl);

            // 如果URL没有改变，返回原始匹配
            if (proxyUrl === trimmedUrl) {
                return match;
            }

            // 根据属性类型返回正确的格式
            switch (pattern.attr) {
                case 'srcset':
                    // 处理srcset的多个URL
                    const srcsetUrls = trimmedUrl.split(',').map(item => {
                        const parts = item.trim().split(/\s+/);
                        if (parts.length > 0 && parts[0]) {
                            const itemProxyUrl = createProxyUrl(parts[0]);
                            if (itemProxyUrl !== parts[0]) {
                                parts[0] = itemProxyUrl;
                            }
                        }
                        return parts.join(' ');
                    });
                    return match.replace(trimmedUrl, srcsetUrls.join(', '));

                case 'css-url':
                case 'css-bg':
                case 'css-bg-short':
                    return match.replace(trimmedUrl, proxyUrl);

                case 'js-url':
                    return `"${proxyUrl}"`;

                case 'js-url-single':
                    return `'${proxyUrl}'`;

                case 'template-url':
                    return `\`${proxyUrl}\``;

                default:
                    return match.replace(trimmedUrl, proxyUrl);
            }
        });
    });

    return processedHtml;
}

/**
 * 创建错误响应
 * @param {Object} errorData - 错误数据
 * @param {number} status - HTTP状态码
 * @returns {Response} 错误响应
 */
function createErrorResponse(errorData, status = 500) {
    return new Response(JSON.stringify(errorData, null, 2), {
        status: status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
    });
}

/**
 * 生成请求ID
 * @returns {string} 唯一请求ID
 */
function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * 企业级代理处理函数
 * 主入口点，处理所有代理请求
 * @param {Request} request - 传入的请求
 * @returns {Response} 代理响应
 */
export default async function handler(request) {
    const startTime = Date.now();
    const requestUrl = new URL(request.url);
    const clientIP = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    try {
        // 处理CORS预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, Cache-Control, Pragma',
                    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Date, Server, Transfer-Encoding',
                    'Access-Control-Max-Age': '86400',
                    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
                }
            });
        }

        // 解析目标URL
        const targetUrl = requestUrl.searchParams.get('url');

        if (!targetUrl) {
            return createErrorResponse({
                error: 'Missing target URL parameter',
                message: 'Please provide a valid URL in the "url" parameter',
                usage: 'GET /api/proxy?url=https://example.com/path',
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            }, 400);
        }

        // 验证目标URL格式
        let targetUrlObj;
        try {
            targetUrlObj = new URL(targetUrl);
        } catch (urlError) {
            return createErrorResponse({
                error: 'Invalid target URL format',
                message: 'The provided URL is not valid',
                targetUrl: targetUrl,
                details: urlError.message,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            }, 400);
        }

        // 域名白名单验证
        if (!isAllowedDomain(targetUrlObj.hostname)) {
            return createErrorResponse({
                error: 'Domain not allowed',
                message: 'The requested domain is not in the allowed list',
                domain: targetUrlObj.hostname,
                allowedDomains: ALLOWED_DOMAINS,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            }, 403);
        }

        // 执行代理请求
        const proxyResponse = await executeProxyRequest(request, targetUrl, targetUrlObj);

        // 记录请求信息（生产环境可选）
        if (PROXY_CONFIG.ENABLE_LOGGING) {
            console.log(`[${new Date().toISOString()}] Proxy: ${request.method} ${targetUrl} -> ${proxyResponse.status}`);
        }

        return proxyResponse;

    } catch (error) {
        console.error('Proxy handler error:', error);

        return createErrorResponse({
            error: 'Internal proxy error',
            message: 'An unexpected error occurred while processing the request',
            details: error.message,
            timestamp: new Date().toISOString(),
            requestId: generateRequestId()
        }, 500);
    }
}

/**
 * 执行代理请求的核心逻辑
 * @param {Request} originalRequest - 原始请求
 * @param {string} targetUrl - 目标URL
 * @param {URL} targetUrlObj - 目标URL对象
 * @returns {Response} 代理响应
 */
async function executeProxyRequest(originalRequest, targetUrl, targetUrlObj) {
    // 构建请求头
    const requestHeaders = new Headers();

    // 设置基础头
    requestHeaders.set('User-Agent', PROXY_CONFIG.USER_AGENT);
    requestHeaders.set('Accept', originalRequest.headers.get('Accept') || '*/*');
    requestHeaders.set('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');
    requestHeaders.set('Accept-Encoding', 'gzip, deflate, br');
    requestHeaders.set('Cache-Control', 'no-cache');
    requestHeaders.set('Pragma', 'no-cache');

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
        const value = originalRequest.headers.get(header);
        if (value) {
            requestHeaders.set(header, value);
        }
    });

    // 设置正确的Referer
    requestHeaders.set('Referer', targetUrlObj.origin);

    // 准备请求体
    let requestBody = null;
    if (originalRequest.method !== 'GET' && originalRequest.method !== 'HEAD') {
        try {
            requestBody = await originalRequest.arrayBuffer();
        } catch (error) {
            console.warn('Failed to read request body:', error);
        }
    }

    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.TIMEOUT);

    try {
        // 发起代理请求
        const response = await fetch(targetUrl, {
            method: originalRequest.method,
            headers: requestHeaders,
            body: requestBody,
            signal: controller.signal,
            redirect: 'follow'
        });

        clearTimeout(timeoutId);

        // 检查响应大小
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > PROXY_CONFIG.MAX_RESPONSE_SIZE) {
            throw new Error(`Response too large: ${contentLength} bytes`);
        }

        // 获取响应内容
        const responseBuffer = await response.arrayBuffer();

        // 智能内容类型检测
        const contentType = detectContentType(targetUrl, response.headers, responseBuffer);

        // 处理内容
        let processedContent = responseBuffer;
        if (contentType.includes('text/html')) {
            try {
                const htmlContent = new TextDecoder('utf-8').decode(responseBuffer);
                // 从原始请求中获取当前代理主机名
                const proxyHost = new URL(originalRequest.url).hostname;
                const processedHtml = processHtmlContent(htmlContent, targetUrl, proxyHost);
                processedContent = new TextEncoder().encode(processedHtml);
            } catch (htmlError) {
                console.warn('HTML processing failed:', htmlError);
                // 如果HTML处理失败，返回原始内容
            }
        }

        // 构建响应头
        const responseHeaders = new Headers();

        // 设置内容类型
        responseHeaders.set('Content-Type', contentType);

        // 设置缓存策略
        setCacheHeaders(responseHeaders, contentType);

        // 设置安全头
        setSecurityHeaders(responseHeaders);

        // 转发重要的响应头
        const forwardResponseHeaders = [
            'last-modified',
            'etag',
            'expires',
            'content-encoding',
            'content-range',
            'accept-ranges'
        ];

        forwardResponseHeaders.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
                responseHeaders.set(header, value);
            }
        });

        // 设置CORS头
        setCorsHeaders(responseHeaders);

        return new Response(processedContent, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${PROXY_CONFIG.TIMEOUT}ms`);
        }

        throw error;
    }
}

/**
 * 设置缓存头
 * @param {Headers} headers - 响应头对象
 * @param {string} contentType - 内容类型
 */
function setCacheHeaders(headers, contentType) {
    if (contentType.includes('text/html')) {
        headers.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.HTML);
    } else if (contentType.includes('text/css')) {
        headers.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.CSS);
    } else if (contentType.includes('javascript')) {
        headers.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.JS);
    } else if (contentType.includes('image/')) {
        headers.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.IMAGES);
    } else if (contentType.includes('font/')) {
        headers.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.FONTS);
    } else if (contentType.includes('application/wasm')) {
        headers.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.WASM);
    } else if (contentType.includes('application/json')) {
        headers.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.JSON);
    } else {
        headers.set('Cache-Control', PROXY_CONFIG.CACHE_CONTROL.DEFAULT);
    }
}

/**
 * 设置安全头
 * @param {Headers} headers - 响应头对象
 */
function setSecurityHeaders(headers) {
    Object.entries(PROXY_CONFIG.SECURITY_HEADERS).forEach(([key, value]) => {
        headers.set(key, value);
    });
}

/**
 * 设置CORS头
 * @param {Headers} headers - 响应头对象
 */
function setCorsHeaders(headers) {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, Cache-Control, Pragma');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Date, Server, Transfer-Encoding, ETag, Last-Modified');
    headers.set('Access-Control-Max-Age', '86400');
    headers.set('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
}

// Vercel Edge Runtime配置
export const config = {
    runtime: 'edge',
    regions: ['iad1', 'hnd1', 'sin1'], // 多区域部署
};
