/**
 * Vercel反向代理配置文件
 * 将所有配置项集中管理，便于维护和部署
 */

// 安全配置
const SECURITY_CONFIG = {
    // 域名白名单 - 只允许代理这些域名
    ALLOWED_DOMAINS: [
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
        

        
        // 可以根据需要添加更多域名
         'player.imixc.top',
         '*.ixingchen.top',
    ],
    
    // 禁止访问的内网IP段
    BLOCKED_IP_RANGES: [
        '127.0.0.0/8',      // 本地回环
        '10.0.0.0/8',       // 私有网络A类
        '172.16.0.0/12',    // 私有网络B类
        '192.168.0.0/16',   // 私有网络C类
        '169.254.0.0/16',   // 链路本地地址
        '224.0.0.0/4',      // 多播地址
        '240.0.0.0/4',      // 保留地址
    ],
    
    // URL验证正则表达式
    URL_PATTERN: /^https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:\/.*)?$/,
    
    // 端口范围限制
    ALLOWED_PORT_RANGE: {
        min: 1,
        max: 65535
    },
    
    // 安全检查选项
    SECURITY_OPTIONS: {
        blockPrivateNetworks: true,     // 阻止私有网络访问
        enforceWhitelist: true,         // 强制域名白名单
        validateUrlFormat: true,        // 验证URL格式
        checkPortRange: true,           // 检查端口范围
        preventXSS: true,              // XSS防护
        enableCSP: true,               // 内容安全策略
    }
};

// 用户界面配置
const UI_CONFIG = {
    // 页面标题和描述
    PAGE_TITLE: '【安全】Vercel反向代理',
    PAGE_DESCRIPTION: '安全的反向代理服务，支持白名单域名访问',
    
    // 输入框配置
    INPUT_PLACEHOLDER: '请输入要代理的URL (仅支持白名单域名)',
    BUTTON_TEXT: 'Reverse Proxy',
    
    // 错误消息配置
    ERROR_MESSAGES: {
        EMPTY_INPUT: {
            title: '🔗 请输入URL地址',
            description: '请在输入框中输入您要代理访问的完整URL地址'
        },
        INVALID_FORMAT: {
            title: '❌ URL格式错误',
            description: '请输入完整的URL地址，必须包含 http:// 或 https:// 前缀'
        },
        DOMAIN_NOT_ALLOWED: {
            title: '🚫 域名未授权',
            description: '该域名不在安全白名单中，请联系管理员添加或使用已授权的域名'
        },
        PRIVATE_NETWORK: {
            title: '🔒 安全限制',
            description: '出于安全考虑，不允许访问内网地址和私有网络'
        },
        INVALID_PORT: {
            title: '⚠️ 端口限制',
            description: '端口号超出允许范围，请使用标准的HTTP(80)或HTTPS(443)端口'
        },
        PARSE_ERROR: {
            title: '🔧 URL解析失败',
            description: 'URL格式有误，请检查地址是否正确并重新输入'
        },
        POPUP_BLOCKED: {
            title: '🚪 弹窗被阻止',
            description: '浏览器阻止了新窗口打开，请允许弹窗或手动复制链接在新标签页中打开'
        },
        GENERAL_ERROR: {
            title: '⚡ 处理失败',
            description: '请求处理时发生错误，请稍后重试或联系技术支持'
        },
        NETWORK_ERROR: {
            title: '🌐 网络连接失败',
            description: '无法连接到目标服务器，请检查网络连接或稍后重试'
        },
        TIMEOUT_ERROR: {
            title: '⏱️ 请求超时',
            description: '服务器响应超时，请检查网络状况或稍后重试'
        },
        CONFIG_LOAD_ERROR: {
            title: '⚙️ 配置加载失败',
            description: '系统配置加载失败，请刷新页面重试'
        },
        VALIDATION_ERROR: {
            title: '✅ 验证失败',
            description: '输入内容未通过安全验证，请检查并重新输入'
        },
        SECURITY_ERROR: {
            title: '🛡️ 安全检查失败',
            description: '请求未通过安全检查，已被系统拒绝'
        },
        RATE_LIMIT_ERROR: {
            title: '🚦 请求过于频繁',
            description: '您的请求过于频繁，请稍等片刻后再试'
        },
        SERVICE_UNAVAILABLE: {
            title: '🔧 服务暂时不可用',
            description: '代理服务正在维护中，请稍后重试'
        }
    },

    // 成功消息
    SUCCESS_MESSAGES: {
        PROXY_CREATED: {
            title: '🎉 代理成功创建',
            description: '代理页面已在新窗口中打开，您现在可以安全地访问目标网站'
        },
        VALIDATION_PASSED: {
            title: '✅ 验证通过',
            description: 'URL地址验证成功，正在为您创建安全代理连接'
        }
    },
    
    // UI样式配置
    STYLES: {
        ERROR_DISPLAY_TIME: 5000,      // 错误信息显示时间(毫秒)
        ANIMATION_DURATION: 300,       // 动画持续时间(毫秒)
        THEME_COLOR: '#9dca68',        // 主题色
        ERROR_COLOR: '#dc3545',        // 错误色
        SUCCESS_COLOR: '#28a745',      // 成功色
        WARNING_COLOR: '#ffc107',      // 警告色
        INFO_COLOR: '#17a2b8'          // 信息色
    },

    // 错误处理配置
    ERROR_HANDLING: {
        enableRetry: true,             // 启用重试功能
        maxRetryAttempts: 3,           // 最大重试次数
        retryDelay: 1000,              // 重试延迟(毫秒)
        showErrorDetails: false,       // 是否显示详细错误信息(生产环境建议false)
        enableErrorReporting: true,    // 启用错误报告
        autoHideSuccess: true,         // 自动隐藏成功消息
        successDisplayTime: 3000       // 成功消息显示时间
    }
};

// 应用程序配置
const APP_CONFIG = {
    // 版本信息
    VERSION: '2.0.0',
    BUILD_DATE: '2025-06-30',
    

    
    // 性能配置
    PERFORMANCE: {
        enableCaching: true,           // 启用缓存
        cacheTimeout: 300000,          // 缓存超时时间(5分钟)
        requestTimeout: 10000,         // 请求超时时间(10秒)

    },

    // 速率限制配置
    RATE_LIMITING: {
        enabled: true,                 // 启用速率限制
        maxRequestsPerMinute: 30,      // 每分钟最大请求数
        maxRequestsPerHour: 200,       // 每小时最大请求数
        maxRequestsPerDay: 1000,       // 每天最大请求数
        blockDuration: 300000,         // 阻止持续时间(5分钟)
        warningThreshold: 0.8,         // 警告阈值(80%)
        enableWarnings: true,          // 启用警告提示
        enableGracePeriod: true,       // 启用宽限期
        gracePeriodDuration: 60000,    // 宽限期持续时间(1分钟)
        trackBySession: true,          // 按会话跟踪
        trackByIP: false,              // 按IP跟踪（客户端无法获取真实IP）
        enableWhitelist: false,        // 启用白名单（跳过限制）
        whitelist: []                  // 白名单列表
    },
    
    // 统计配置
    ANALYTICS: {
        enableUsageStats: true,        // 启用使用统计
        enableErrorTracking: true,     // 启用错误跟踪
        enablePerformanceMonitoring: true, // 启用性能监控
        enableSessionTracking: true,   // 启用会话跟踪
        statsRetentionDays: 7,         // 统计数据保留天数
        maxStatsEntries: 1000,         // 最大统计条目数
        enableLocalStorage: true,      // 启用本地存储统计
        enableRealTimeStats: true,     // 启用实时统计显示
        anonymizeData: true,           // 匿名化数据
        enableExport: true             // 启用统计导出
    }
};

// 法律和合规配置
const LEGAL_CONFIG = {
    // 法律文档链接
    LEGAL_DOCUMENTS: {
        TERMS_OF_SERVICE: './TERMS_OF_SERVICE.md',
        PRIVACY_POLICY: './PRIVACY_POLICY.md',
        DISCLAIMER: './DISCLAIMER.md',
        LICENSE: './LICENSE'
    },
    
    // 警告信息
    WARNINGS: {
        SECURITY_NOTICE: '⚠️ 请仔细阅读使用条款和免责声明',
        LEGAL_COMPLIANCE: '使用本服务即表示您同意遵守相关法律法规',
        RISK_WARNING: '代理服务存在一定风险，请谨慎使用'
    },
    
    // 联系信息
    CONTACT: {
        GITHUB_REPO: 'https://github.com/souying/vercel-api-proxy',
        ISSUES_URL: 'https://github.com/souying/vercel-api-proxy/issues',
        EMAIL: null // 如需要可以添加邮箱
    }
};





// 导出配置对象
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        SECURITY_CONFIG,
        UI_CONFIG,
        APP_CONFIG,
        LEGAL_CONFIG
    };
} else {
    // 浏览器环境
    window.ProxyConfig = {
        SECURITY_CONFIG,
        UI_CONFIG,
        APP_CONFIG,
        LEGAL_CONFIG
    };
}

/**
 * 配置验证函数
 * 确保配置的完整性和正确性
 */
function validateConfig() {
    const errors = [];
    
    // 验证域名白名单
    if (!SECURITY_CONFIG.ALLOWED_DOMAINS || SECURITY_CONFIG.ALLOWED_DOMAINS.length === 0) {
        errors.push('域名白名单不能为空');
    }
    
    // 验证URL正则表达式
    if (!SECURITY_CONFIG.URL_PATTERN || !(SECURITY_CONFIG.URL_PATTERN instanceof RegExp)) {
        errors.push('URL验证正则表达式无效');
    }
    
    // 验证端口范围
    const portRange = SECURITY_CONFIG.ALLOWED_PORT_RANGE;
    if (!portRange || portRange.min < 1 || portRange.max > 65535 || portRange.min > portRange.max) {
        errors.push('端口范围配置无效');
    }
    
    if (errors.length > 0) {
        console.error('配置验证失败:', errors);
        return false;
    }
    
    return true;
}

// 自动验证配置
if (typeof window !== 'undefined') {
    // 浏览器环境下自动验证
    document.addEventListener('DOMContentLoaded', function() {
        if (!validateConfig()) {
            console.error('配置文件存在错误，请检查config.js');
        }
    });
}
