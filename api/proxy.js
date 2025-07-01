/**
 * 企业级智能代理系统 - Vercel Edge Function
 * 生产环境代理服务，支持复杂Web应用的完整代理功能
 *
 * @author Secure Proxy Team
 * @version 2.0.0
 * @license MIT
 */

// 统一的域名白名单配置（单一数据源）
const DOMAIN_WHITELIST = {
    // OpenAI相关服务
    OPENAI: [
        'api.openai.com',
        'openai.com'
    ],

    // GitHub相关服务
    GITHUB: [
        'api.github.com',
        'raw.githubusercontent.com',
        'github.com',
        'objects.githubusercontent.com',
        'github.githubassets.com',
        'githubassets.com',
        'camo.githubusercontent.com',
        'avatars.githubusercontent.com',
        'user-images.githubusercontent.com',
        'github-production-user-asset-6210df.s3.amazonaws.com',
        'github-production-repository-file-5c1aeb.s3.amazonaws.com'
    ],

    // Google服务
    GOOGLE: [
        'www.google.com',
        'translate.googleapis.com'
    ],

    // 音乐播放器相关域名
    MEDIA: [
        'player.imixc.top',
        '*.imixc.top',
        '*.ixingchen.top'
    ],

    // 测试服务（可选）
    TESTING: [
        'httpbin.org',
        'jsonplaceholder.typicode.com'
    ]
};

// 扁平化域名列表
const ALLOWED_DOMAINS = Object.values(DOMAIN_WHITELIST).flat();

// 防盗链配置 - 防止直接URL访问
const ANTI_HOTLINK_CONFIG = {
    ENABLED: true,   // 启用防盗链验证
    ALLOWED_REFERERS: [
        'secure-proxy-seven.vercel.app',
        'localhost',
        '127.0.0.1',
        'xy.ixingchen.top',
        'www.xy.ixingchen.top',
        'ixingchen.top',
        'www.ixingchen.top'
    ],
    REQUIRE_TOKEN: true,   // 启用令牌验证
    TOKEN_EXPIRY: 300000,  // 5分钟有效期，增强安全性
    MAX_REQUESTS_PER_TOKEN: 10  // 每个令牌最多10次请求
};

// 安全的令牌存储系统
class SecureTokenStore {
    constructor() {
        this.tokens = new Map();
        this.encryptionKey = this.generateEncryptionKey();
        // 定期清理过期令牌
        setInterval(() => this.cleanupExpiredTokens(), 60000); // 每分钟清理一次
    }

    generateEncryptionKey() {
        // 生成基于环境的加密密钥
        const seed = process.env.VERCEL_URL || 'default-seed';
        return this.simpleHash(seed + Date.now().toString());
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(16);
    }

    encryptToken(tokenData) {
        // 简单的加密实现（生产环境建议使用更强的加密）
        const jsonStr = JSON.stringify(tokenData);
        const encrypted = Buffer.from(jsonStr).toString('base64');
        return encrypted;
    }

    decryptToken(encryptedData) {
        try {
            const decrypted = Buffer.from(encryptedData, 'base64').toString('utf-8');
            return JSON.parse(decrypted);
        } catch (error) {
            return null;
        }
    }

    set(tokenId, tokenData) {
        const encryptedData = this.encryptToken(tokenData);
        this.tokens.set(tokenId, encryptedData);
    }

    get(tokenId) {
        const encryptedData = this.tokens.get(tokenId);
        if (!encryptedData) return null;
        return this.decryptToken(encryptedData);
    }

    delete(tokenId) {
        return this.tokens.delete(tokenId);
    }

    has(tokenId) {
        return this.tokens.has(tokenId);
    }

    cleanupExpiredTokens() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [tokenId, encryptedData] of this.tokens.entries()) {
            const tokenData = this.decryptToken(encryptedData);
            if (tokenData && now > tokenData.expiresAt) {
                this.tokens.delete(tokenId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`清理了 ${cleanedCount} 个过期令牌`);
        }
    }

    getStats() {
        return {
            totalTokens: this.tokens.size,
            timestamp: new Date().toISOString()
        };
    }
}

const TOKEN_STORE = new SecureTokenStore();

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
 * 防盗链验证器
 * @param {Request} request - 请求对象
 * @returns {boolean} 是否允许访问
 */
function validateReferer(request) {
    if (!ANTI_HOTLINK_CONFIG.ENABLED) {
        console.log('防盗链验证已禁用，允许访问');
        return true;
    }

    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');

    console.log('防盗链验证 - Referer:', referer, 'Origin:', origin);
    console.log('允许的Referer列表:', ANTI_HOTLINK_CONFIG.ALLOWED_REFERERS);

    // 如果没有referer和origin，拒绝访问（防止直接访问）
    if (!referer && !origin) {
        console.log('防盗链验证失败：缺少referer和origin');
        return false;
    }

    // 检查referer
    if (referer) {
        try {
            const refererUrl = new URL(referer);
            const refererHost = refererUrl.hostname;
            console.log('检查Referer主机名:', refererHost);

            const isAllowed = ANTI_HOTLINK_CONFIG.ALLOWED_REFERERS.some(allowedReferer => {
                const match = refererHost === allowedReferer ||
                             refererHost.endsWith('.' + allowedReferer);
                console.log(`匹配检查: ${refererHost} vs ${allowedReferer} = ${match}`);
                return match;
            });

            if (isAllowed) {
                console.log('Referer验证通过');
                return true;
            }
        } catch (e) {
            console.log('Referer URL解析失败:', e.message);
            return false;
        }
    }

    // 检查origin
    if (origin) {
        try {
            const originUrl = new URL(origin);
            const originHost = originUrl.hostname;
            console.log('检查Origin主机名:', originHost);

            const isAllowed = ANTI_HOTLINK_CONFIG.ALLOWED_REFERERS.some(allowedReferer => {
                const match = originHost === allowedReferer ||
                             originHost.endsWith('.' + allowedReferer);
                console.log(`匹配检查: ${originHost} vs ${allowedReferer} = ${match}`);
                return match;
            });

            if (isAllowed) {
                console.log('Origin验证通过');
                return true;
            }
        } catch (e) {
            console.log('Origin URL解析失败:', e.message);
            return false;
        }
    }

    console.log('防盗链验证失败：没有匹配的referer或origin');
    return false;
}

/**
 * 生成访问令牌
 * @param {string} clientId - 客户端标识
 * @returns {string} 访问令牌
 */
function generateAccessToken(clientId = 'default') {
    const tokenId = generateRequestId();
    const token = {
        id: tokenId,
        clientId: clientId,
        createdAt: Date.now(),
        expiresAt: Date.now() + ANTI_HOTLINK_CONFIG.TOKEN_EXPIRY,
        requestCount: 0,
        maxRequests: ANTI_HOTLINK_CONFIG.MAX_REQUESTS_PER_TOKEN
    };

    TOKEN_STORE.set(tokenId, token);

    // 清理过期令牌
    cleanupExpiredTokens();

    return tokenId;
}

/**
 * 验证访问令牌
 * @param {string} tokenId - 令牌ID
 * @returns {boolean} 是否有效
 */
function validateAccessToken(tokenId) {
    if (!ANTI_HOTLINK_CONFIG.REQUIRE_TOKEN) {
        return true;
    }

    if (!tokenId) {
        return false;
    }

    const token = TOKEN_STORE.get(tokenId);
    if (!token) {
        return false;
    }

    // 检查是否过期
    if (Date.now() > token.expiresAt) {
        TOKEN_STORE.delete(tokenId);
        return false;
    }

    // 检查请求次数限制
    if (token.requestCount >= token.maxRequests) {
        return false;
    }

    // 增加请求计数
    token.requestCount++;
    TOKEN_STORE.set(tokenId, token);

    return true;
}

/**
 * 清理过期令牌
 */
function cleanupExpiredTokens() {
    const now = Date.now();
    for (const [tokenId, token] of TOKEN_STORE.entries()) {
        if (now > token.expiresAt) {
            TOKEN_STORE.delete(tokenId);
        }
    }
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

    // 强化MIME类型验证和修复逻辑
    if (headerContentType && expectedMimeType) {
        const headerType = headerContentType.toLowerCase().split(';')[0].trim();
        const expectedType = expectedMimeType.toLowerCase().split(';')[0].trim();

        // 强制修复明显错误的MIME类型
        const incorrectMimeTypes = [
            // CSS文件被错误标记为JSON
            { wrong: 'application/json', correct: 'text/css', extensions: ['css'] },
            // JS文件被错误标记为JSON
            { wrong: 'application/json', correct: 'application/javascript', extensions: ['js', 'mjs'] },
            // 图片文件被错误标记
            { wrong: 'application/json', correct: 'image/png', extensions: ['png'] },
            { wrong: 'application/json', correct: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
            { wrong: 'application/json', correct: 'image/svg+xml', extensions: ['svg'] },
            // 字体文件被错误标记
            { wrong: 'application/json', correct: 'font/woff2', extensions: ['woff2'] },
            { wrong: 'application/json', correct: 'font/woff', extensions: ['woff'] },
            // WASM文件被错误标记
            { wrong: 'application/json', correct: 'application/wasm', extensions: ['wasm'] },
            // 其他常见错误
            { wrong: 'text/plain', correct: expectedType, extensions: ['css', 'js', 'json'] },
            { wrong: 'text/html', correct: expectedType, extensions: ['css', 'js', 'json', 'xml'] }
        ];

        // 检查是否需要修复MIME类型
        for (const rule of incorrectMimeTypes) {
            if (headerType === rule.wrong && rule.extensions.includes(fileExtension)) {
                if (rule.correct === expectedType || rule.correct !== 'expectedType') {
                    return rule.correct === 'expectedType' ? expectedMimeType : rule.correct;
                }
            }
        }

        // 如果响应头类型明显错误，强制使用期望类型
        if (headerType === 'application/json' && expectedType !== 'application/json') {
            return expectedMimeType;
        }

        if (headerType === 'text/plain' && expectedType !== 'text/plain') {
            return expectedMimeType;
        }

        if (headerType === 'text/html' && (expectedType === 'text/css' || expectedType === 'application/javascript')) {
            return expectedMimeType;
        }
    }

    // 强制修复关键文件类型 - 优先级最高
    if (fileExtension === 'css') {
        return 'text/css; charset=utf-8';
    }
    if (fileExtension === 'js' || fileExtension === 'mjs') {
        return 'application/javascript; charset=utf-8';
    }

    // 强制使用期望的MIME类型（如果有的话）
    if (expectedMimeType) {
        return expectedMimeType;
    }

    // 使用响应头中的Content-Type（如果看起来正确）
    if (headerContentType &&
        !headerContentType.includes('text/plain') &&
        !headerContentType.includes('application/json')) {

        // 只有当CSS/JS文件被错误标记为HTML时才排除text/html
        if (headerContentType.includes('text/html') &&
            (fileExtension === 'css' || fileExtension === 'js' || fileExtension === 'mjs')) {
            // CSS/JS文件被错误标记为HTML，使用期望的类型
            return expectedMimeType;
        }

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
                // 处理相对路径：./file.js, ../file.js, file.js
                // 使用目标网站的origin和当前页面路径作为基础URL
                const baseForRelative = origin + (pathname.endsWith('/') ? pathname : pathname + '/');
                resolvedUrl = new URL(trimmedUrl, baseForRelative).href;
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

    // 第一步：注入base标签 - 设置为目标网站的origin，确保相对路径正确解析
    if (!processedHtml.includes('<base')) {
        // 重要：base标签必须指向目标网站，不是代理URL
        // 这样相对路径会被浏览器解析为目标网站的路径，然后被我们的JavaScript拦截并重写
        const baseTag = `<base href="${origin}/">`;
        const headMatch = processedHtml.match(/<head[^>]*>/i);
        if (headMatch) {
            processedHtml = processedHtml.replace(/<head[^>]*>/i, `${headMatch[0]}\n    ${baseTag}`);
        }
    }

    // 第二步：重写HTML属性中的URL（先重写，再注入脚本）
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

        // JavaScript字符串中的URL重写已完全禁用
        // 原因：会错误地重写JavaScript代码中的变量名和函数参数，导致语法错误
        // 解决方案：通过运行时JavaScript API重写来处理动态URL，而不是静态正则表达式重写
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

            // 跳过可直接访问的CDN - 扩展列表
            const directAccessCDNs = [
                'cdnjs.cloudflare.com',
                'unpkg.com',
                'jsdelivr.net',
                'fonts.googleapis.com',
                'fonts.gstatic.com',
                'ajax.googleapis.com',
                'npm.elemecdn.com',  // 添加这个CDN
                'cdn.jsdelivr.net',
                'fastly.jsdelivr.net'
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

    // 第三步：在URL重写完成后注入代理脚本（使用字符串拼接避免被重写）
    const proxyScript =
    '<script>\n' +
    '(function() {\n' +
    '    "use strict";\n' +
    '\n' +
    '    const PROXY_CONFIG = {\n' +
    '        origin: "' + origin + '",\n' +
    '        basePath: "' + basePath + '",\n' +
    '        proxyEndpoint: "/api/proxy?url=",\n' +
    '        currentHost: location.hostname\n' +
    '    };\n' +
    '\n' +
    '    function createProxyUrl(paramUrl) {\n' +
    '        if (!paramUrl || typeof paramUrl !== "string") return paramUrl;\n' +
    '\n' +
    '        const trimmedUrl = paramUrl.trim();\n' +
    '        if (trimmedUrl.startsWith("data:") ||\n' +
    '            trimmedUrl.startsWith("blob:") ||\n' +
    '            trimmedUrl.startsWith("javascript:") ||\n' +
    '            trimmedUrl.startsWith("mailto:") ||\n' +
    '            trimmedUrl.startsWith("tel:") ||\n' +
    '            trimmedUrl.startsWith("#") ||\n' +
    '            trimmedUrl.includes("/api/proxy")) {\n' +
    '            return paramUrl;\n' +
    '        }\n' +
    '\n' +
    '        const cdnDomains = [\n' +
    '            "npm.elemecdn.com",\n' +
    '            "cdnjs.cloudflare.com",\n' +
    '            "unpkg.com",\n' +
    '            "jsdelivr.net",\n' +
    '            "fonts.googleapis.com",\n' +
    '            "fonts.gstatic.com"\n' +
    '        ];\n' +
    '\n' +
    '        if (cdnDomains.some(function(cdn) { return trimmedUrl.includes(cdn); })) {\n' +
    '            return paramUrl;\n' +
    '        }\n' +
    '\n' +
    '        try {\n' +
    '            var resolvedUrl;\n' +
    '            if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {\n' +
    '                resolvedUrl = trimmedUrl;\n' +
    '            } else if (trimmedUrl.startsWith("//")) {\n' +
    '                resolvedUrl = location.protocol + trimmedUrl;\n' +
    '            } else if (trimmedUrl.startsWith("/")) {\n' +
    '                resolvedUrl = PROXY_CONFIG.origin + trimmedUrl;\n' +
    '            } else {\n' +
    '                var currentPath = location.pathname.endsWith("/") ? location.pathname : location.pathname + "/";\n' +
    '                resolvedUrl = new URL(trimmedUrl, PROXY_CONFIG.origin + currentPath).href;\n' +
    '            }\n' +
    '\n' +
    '            var resolvedUrlObj = new URL(resolvedUrl);\n' +
    '            if (resolvedUrlObj.hostname.includes("vercel.app") ||\n' +
    '                resolvedUrlObj.hostname.includes("localhost") ||\n' +
    '                resolvedUrl.includes("/api/proxy") ||\n' +
    '                resolvedUrlObj.hostname === PROXY_CONFIG.currentHost) {\n' +
    '                return paramUrl;\n' +
    '            }\n' +
    '\n' +
    '            return PROXY_CONFIG.proxyEndpoint + encodeURIComponent(resolvedUrl);\n' +
    '        } catch (e) {\n' +
    '            return paramUrl;\n' +
    '        }\n' +
    '    }\n' +
    '\n' +
    '    var originalFetch = window.fetch;\n' +
    '    window.fetch = function(input, init) {\n' +
    '        var paramUrl = input;\n' +
    '        if (input instanceof Request) {\n' +
    '            paramUrl = input.url;\n' +
    '        }\n' +
    '\n' +
    '        var proxyUrl = createProxyUrl(paramUrl);\n' +
    '        if (proxyUrl !== paramUrl) {\n' +
    '            if (input instanceof Request) {\n' +
    '                return originalFetch.call(this, new Request(proxyUrl, input), init);\n' +
    '            } else {\n' +
    '                return originalFetch.call(this, proxyUrl, init);\n' +
    '            }\n' +
    '        }\n' +
    '\n' +
    '        return originalFetch.call(this, input, init);\n' +
    '    };\n' +
    '\n' +
    '    var originalOpen = XMLHttpRequest.prototype.open;\n' +
    '    XMLHttpRequest.prototype.open = function(method, paramUrl, async, user, password) {\n' +
    '        var proxyUrl = createProxyUrl(paramUrl);\n' +
    '        return originalOpen.call(this, method, proxyUrl, async, user, password);\n' +
    '    };\n' +
    '\n' +
    '    if (window.WebAssembly && WebAssembly.instantiateStreaming) {\n' +
    '        var originalInstantiateStreaming = WebAssembly.instantiateStreaming;\n' +
    '        WebAssembly.instantiateStreaming = function(source, importObject) {\n' +
    '            if (typeof source === "string") {\n' +
    '                var proxyUrl = createProxyUrl(source);\n' +
    '                if (proxyUrl !== source) {\n' +
    '                    source = fetch(proxyUrl);\n' +
    '                }\n' +
    '            } else if (source instanceof Promise) {\n' +
    '                source = source.then(function(response) {\n' +
    '                    if (response instanceof Response) {\n' +
    '                        var responseUrl = response.url;\n' +
    '                        var proxyUrl = createProxyUrl(responseUrl);\n' +
    '                        if (proxyUrl !== responseUrl) {\n' +
    '                            return fetch(proxyUrl);\n' +
    '                        }\n' +
    '                    }\n' +
    '                    return response;\n' +
    '                });\n' +
    '            }\n' +
    '            return originalInstantiateStreaming.call(this, source, importObject);\n' +
    '        };\n' +
    '    }\n' +
    '\n' +
    '    if ("serviceWorker" in navigator) {\n' +
    '        var originalRegister = navigator.serviceWorker.register;\n' +
    '        navigator.serviceWorker.register = function() {\n' +
    '            console.warn("ServiceWorker registration disabled in proxy mode");\n' +
    '            return Promise.reject(new Error("ServiceWorker disabled in proxy mode"));\n' +
    '        };\n' +
    '    }\n' +
    '\n' +
    '    console.log("Proxy script initialized successfully");\n' +
    '})();\n' +
    '</script>';

    // 注入脚本到head标签
    const headCloseMatch = processedHtml.match(/<\/head>/i);
    if (headCloseMatch) {
        processedHtml = processedHtml.replace(/<\/head>/i, proxyScript + '\n</head>');
    } else {
        // 如果没有head标签，在body开始前注入
        processedHtml = processedHtml.replace(/<body[^>]*>/i, function(match) {
            return proxyScript + '\n' + match;
        });
    }

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

        // 处理域名列表请求
        if (requestUrl.pathname === '/api/domains' || requestUrl.searchParams.get('action') === 'domains') {
            // 验证referer以确保请求来自授权网站
            if (!validateReferer(request)) {
                return createErrorResponse({
                    error: 'Access denied',
                    message: 'Domain list access is only allowed from authorized websites.',
                    code: 'UNAUTHORIZED_DOMAINS_REQUEST',
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                }, 403);
            }

            return new Response(JSON.stringify({
                success: true,
                domains: DOMAIN_WHITELIST,
                flatList: ALLOWED_DOMAINS,
                timestamp: new Date().toISOString()
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600' // 缓存1小时
                }
            });
        }

        // 处理令牌生成请求
        if (requestUrl.pathname === '/api/token' || requestUrl.searchParams.get('action') === 'token') {
            // 验证referer以确保请求来自授权网站
            if (!validateReferer(request)) {
                return createErrorResponse({
                    error: 'Access denied',
                    message: 'Token generation is only allowed from authorized websites.',
                    code: 'UNAUTHORIZED_TOKEN_REQUEST',
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                }, 403);
            }

            const token = generateAccessToken();
            return new Response(JSON.stringify({
                success: true,
                token: token,
                expiresIn: ANTI_HOTLINK_CONFIG.TOKEN_EXPIRY,
                maxRequests: ANTI_HOTLINK_CONFIG.MAX_REQUESTS_PER_TOKEN,
                timestamp: new Date().toISOString()
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });
        }

        // 解析目标URL
        const targetUrl = requestUrl.searchParams.get('url');

        if (!targetUrl) {
            // 检测是否是搜索查询或其他特殊情况
            const searchQuery = requestUrl.searchParams.get('q');
            const hasSearchParams = requestUrl.searchParams.has('q') ||
                                  requestUrl.searchParams.has('search') ||
                                  requestUrl.searchParams.has('query');

            if (hasSearchParams) {
                // 用户可能想要搜索，提供友好的指导
                return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>使用说明 - 代理服务</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               max-width: 800px; margin: 50px auto; padding: 20px; line-height: 1.6; }
        .container { background: #f8f9fa; padding: 30px; border-radius: 10px; border-left: 4px solid #007bff; }
        .error { color: #dc3545; font-weight: bold; }
        .info { color: #28a745; margin: 20px 0; }
        .example { background: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
        .search-hint { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 检测到搜索查询</h1>
        <p class="error">错误：缺少目标URL参数</p>

        <div class="search-hint">
            <h3>💡 您似乎想要进行搜索</h3>
            <p>如果您想要搜索"${searchQuery || '内容'}"，请使用以下方式：</p>
            <div class="example">
                ${searchQuery ?
                  `<a href="/api/proxy?url=${encodeURIComponent('https://www.google.com/search?q=' + encodeURIComponent(searchQuery))}" target="_blank">
                     🔗 在Google中搜索"${searchQuery}"
                   </a>` :
                  '请先返回主页面输入要搜索的内容'
                }
            </div>
        </div>

        <div class="info">
            <h3>📋 正确的使用方法</h3>
            <p>代理服务需要完整的目标URL，格式如下：</p>
            <div class="example">
                /api/proxy?url=https://example.com/path
            </div>

            <h4>示例：</h4>
            <div class="example">
                <a href="/api/proxy?url=${encodeURIComponent('https://httpbin.org/html')}" target="_blank">
                    /api/proxy?url=https://httpbin.org/html
                </a>
            </div>
        </div>

        <p><a href="/">← 返回主页面</a></p>
    </div>
</body>
</html>`, {
                    status: 400,
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'no-cache'
                    }
                });
            }

            // 普通的缺少URL参数错误
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

        // 防盗链验证 - 防止直接URL访问
        if (!validateReferer(request)) {
            return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>访问被拒绝 - 安全代理服务</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 28px;
        }
        .message {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .security-info {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 30px;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🛡️</div>
        <h1>访问被拒绝</h1>
        <div class="message">
            <p><strong>检测到非法的直接URL访问！</strong></p>
            <p>为了安全起见，我们禁止直接拼接代理URL进行访问。</p>
            <p>请通过正确的方式使用代理服务：</p>
            <ol style="text-align: left; display: inline-block;">
                <li>访问代理服务主页</li>
                <li>在输入框中输入要代理的网站URL</li>
                <li>点击"Reverse Proxy"按钮</li>
            </ol>
        </div>

        <a href="/" class="btn">🏠 返回代理服务主页</a>

        <div class="security-info">
            <strong>🔒 安全提示</strong><br>
            此限制是为了防止恶意使用和保护服务安全。<br>
            如果您是正常用户，请使用正确的访问方式。
        </div>
    </div>
</body>
</html>`, {
                status: 403,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });
        }

        // 访问令牌验证
        const token = requestUrl.searchParams.get('token');
        if (!validateAccessToken(token)) {
            return createErrorResponse({
                error: 'Invalid or expired access token',
                message: 'Please obtain a valid access token from the authorized website.',
                code: 'TOKEN_REQUIRED',
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            }, 403);
        }

        // 域名白名单验证
        if (!isAllowedDomain(targetUrlObj.hostname)) {
            return createErrorResponse({
                error: 'Domain not allowed',
                message: 'The requested domain is not in the allowed list. Please contact administrator for supported domains.',
                domain: targetUrlObj.hostname,
                // 移除敏感信息：不再暴露完整的域名白名单
                hint: 'Supported categories: OpenAI, GitHub, Google, Media services',
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
