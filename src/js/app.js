/**
 * Vercel反向代理 - 主应用程序
 * 版本: 2.0.0 (安全加固版)
 * 
 * 功能特性:
 * - 域名白名单控制
 * - 多层安全验证
 * - 完整错误处理
 * - 使用统计监控
 * - 速率限制保护
 * - 配置驱动架构
 * 
 * 安全特性:
 * - XSS防护
 * - 内网访问阻止
 * - 输入验证和清理
 * - 安全响应头
 * - 错误跟踪记录
 */

// 等待配置加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 检查配置是否加载成功
    if (typeof window.ProxyConfig === 'undefined') {
        console.error('配置文件加载失败，请检查config.js');
        showError('系统配置加载失败，请刷新页面重试');
        return;
    }
    
    // 从配置文件获取配置
    const config = window.ProxyConfig;
    const securityConfig = config.SECURITY_CONFIG;
    const uiConfig = config.UI_CONFIG;
    const appConfig = config.APP_CONFIG;
    
    // 应用UI配置
    applyUIConfig(uiConfig);
    
    // 初始化应用
    initializeApp(securityConfig, uiConfig, appConfig);
});

/**
 * 应用UI配置到页面元素
 */
function applyUIConfig(uiConfig) {
    // 更新页面标题
    document.title = uiConfig.PAGE_TITLE;
    const pageHeader = document.getElementById('page-header');
    if (pageHeader) {
        pageHeader.innerHTML = `<strong>安全</strong> Vercel 反向代理`;
    }
    
    // 更新输入框占位符
    const input = document.getElementById('input');
    if (input) {
        input.placeholder = uiConfig.INPUT_PLACEHOLDER;
    }
    
    // 更新按钮文本
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.textContent = uiConfig.BUTTON_TEXT;
    }
    
    // 初始化域名列表显示
    initializeDomainList();
    
    // 初始化交互功能
    initializeUIInteractions();
    
    // 初始化安全功能显示
    initializeSecurityFeatures();
}

/**
 * 初始化应用程序
 */
function initializeApp(securityConfig, uiConfig, appConfig) {
    // 获取DOM元素
    const input = document.getElementById('input');
    const submit = document.getElementById('submitBtn');
    
    if (!input || !submit) {
        console.error('关键DOM元素未找到');
        return;
    }
    
    // 创建安全检查器实例
    const securityChecker = new SecurityChecker(securityConfig, uiConfig);
    
    // 创建代理处理器实例
    const proxyHandler = new ProxyHandler(securityChecker, uiConfig, appConfig);
    
    // 绑定事件监听器
    bindEventListeners(input, submit, proxyHandler);
    
    // 显示版本信息（如果启用调试模式）
    if (appConfig.DEBUG_MODE) {
        console.log(`Vercel Proxy v${appConfig.VERSION} (${appConfig.BUILD_DATE})`);
    }
}

/**
 * 初始化域名列表显示
 */
function initializeDomainList() {
    const config = window.ProxyConfig;
    const domainList = document.getElementById('domain-list');
    const toggleBtn = document.getElementById('toggle-domains');
    const supportedDomainsDiv = document.getElementById('supported-domains');
    
    if (domainList && config) {
        // 填充域名列表
        const domains = config.SECURITY_CONFIG.ALLOWED_DOMAINS;
        domainList.innerHTML = domains.map(domain => 
            `<div>• ${domain}</div>`
        ).join('');
        
        // 绑定切换事件
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isVisible = supportedDomainsDiv.style.display !== 'none';
                supportedDomainsDiv.style.display = isVisible ? 'none' : 'block';
                toggleBtn.textContent = isVisible ? '显示域名列表' : '隐藏域名列表';
            });
        }
    }
}

/**
 * 初始化UI交互功能
 */
function initializeUIInteractions() {
    // 添加输入框焦点效果
    const input = document.getElementById('input');
    if (input) {
        input.addEventListener('focus', () => {
            input.style.borderColor = window.ProxyConfig.UI_CONFIG.STYLES.THEME_COLOR;
            input.style.boxShadow = `0 0 0 2px ${window.ProxyConfig.UI_CONFIG.STYLES.THEME_COLOR}33`;
        });
        
        input.addEventListener('blur', () => {
            input.style.borderColor = '';
            input.style.boxShadow = '';
        });
        
        // 添加输入提示
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value && !value.startsWith('http')) {
                showInputHint('请输入完整的URL，包含 http:// 或 https://');
            } else {
                hideInputHint();
            }
        });
    }
    
    // 添加按钮悬停效果
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('mouseenter', () => {
            submitBtn.style.transform = 'translateY(-1px)';
            submitBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });
        
        submitBtn.addEventListener('mouseleave', () => {
            submitBtn.style.transform = '';
            submitBtn.style.boxShadow = '';
        });
    }
}

/**
 * 初始化安全功能显示
 */
function initializeSecurityFeatures() {
    const config = window.ProxyConfig;
    if (!config) return;
    
    const securityConfig = config.SECURITY_CONFIG;
    const securityFeatures = document.getElementById('security-features');
    const toggleBtn = document.getElementById('toggle-security-details');
    const securityDetails = document.getElementById('security-details');
    
    if (securityFeatures) {
        // 生成安全功能列表
        const features = [];
        
        if (securityConfig.SECURITY_OPTIONS.enforceWhitelist) {
            features.push('✓ 域名白名单控制');
        }
        
        if (securityConfig.SECURITY_OPTIONS.blockPrivateNetworks) {
            features.push('✓ 内网访问阻止');
        }
        
        if (securityConfig.SECURITY_OPTIONS.validateUrlFormat) {
            features.push('✓ URL格式验证');
        }
        
        if (securityConfig.SECURITY_OPTIONS.checkPortRange) {
            features.push('✓ 端口范围检查');
        }
        
        if (securityConfig.SECURITY_OPTIONS.preventXSS) {
            features.push('✓ XSS防护');
        }
        
        if (securityConfig.SECURITY_OPTIONS.enableCSP) {
            features.push('✓ 内容安全策略');
        }
        
        if (config.APP_CONFIG.ANALYTICS.enableUsageStats) {
            features.push('✓ 使用统计监控');
        }
        
        if (config.APP_CONFIG.ANALYTICS.enableErrorTracking) {
            features.push('✓ 错误跟踪记录');
        }
        
        securityFeatures.innerHTML = features.join('<br>');
    }
    
    // 绑定切换事件
    if (toggleBtn && securityDetails) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isVisible = securityDetails.style.display !== 'none';
            securityDetails.style.display = isVisible ? 'none' : 'block';
            toggleBtn.textContent = isVisible ? '查看安全详情' : '隐藏安全详情';
        });
    }
    
    // 检查并显示风险警告
    checkAndShowRiskWarnings(config);
}

/**
 * 检查并显示风险警告
 */
function checkAndShowRiskWarnings(config) {
    const warnings = [];
    
    // 检查调试模式
    if (config.APP_CONFIG.DEBUG_MODE) {
        warnings.push({
            level: 'warning',
            message: '调试模式已启用，生产环境请关闭',
            icon: '⚠️'
        });
    }
    
    // 检查日志记录
    if (config.APP_CONFIG.CONSOLE_LOGGING && !config.APP_CONFIG.DEBUG_MODE) {
        warnings.push({
            level: 'info',
            message: '控制台日志已启用，可能影响性能',
            icon: 'ℹ️'
        });
    }
    
    // 检查统计功能
    if (!config.APP_CONFIG.ANALYTICS.anonymizeData) {
        warnings.push({
            level: 'warning',
            message: '数据匿名化已关闭，可能影响隐私',
            icon: '🔓'
        });
    }
    
    // 检查连通性检查
    if (config.APP_CONFIG.PERFORMANCE.enableConnectivityCheck) {
        warnings.push({
            level: 'info',
            message: '连通性检查已启用，可能增加延迟',
            icon: '🌐'
        });
    }
    
    // 显示警告
    if (warnings.length > 0) {
        showRiskWarnings(warnings);
    }
}

/**
 * 显示风险警告
 */
function showRiskWarnings(warnings) {
    const riskWarningDiv = document.getElementById('risk-warning');
    if (!riskWarningDiv) return;
    
    const warningHtml = warnings.map(warning => {
        const colors = getWarningColors(warning.level);
        return `
            <div class="risk-item" style="
                background: ${colors.background};
                border: 1px solid ${colors.border};
                color: ${colors.text};
            ">
                <span class="risk-icon">${warning.icon}</span>
                <span>${warning.message}</span>
            </div>
        `;
    }).join('');
    
    riskWarningDiv.innerHTML = warningHtml;
    riskWarningDiv.style.display = 'block';
}

/**
 * 获取警告颜色
 */
function getWarningColors(level) {
    switch (level) {
        case 'error':
            return {
                background: '#f8d7da',
                border: '#f5c6cb',
                text: '#721c24'
            };
        case 'warning':
            return {
                background: '#fff3cd',
                border: '#ffeaa7',
                text: '#856404'
            };
        case 'info':
            return {
                background: '#d1ecf1',
                border: '#bee5eb',
                text: '#0c5460'
            };
        default:
            return {
                background: '#f8f9fa',
                border: '#dee2e6',
                text: '#495057'
            };
    }
}

/**
 * 显示输入提示
 */
function showInputHint(message) {
    let hintDiv = document.getElementById('input-hint');
    if (!hintDiv) {
        hintDiv = document.createElement('div');
        hintDiv.id = 'input-hint';
        hintDiv.className = 'input-hint';
        document.querySelector('.searchform').appendChild(hintDiv);
    }
    hintDiv.textContent = message;
    hintDiv.style.display = 'block';
}

/**
 * 隐藏输入提示
 */
function hideInputHint() {
    const hintDiv = document.getElementById('input-hint');
    if (hintDiv) {
        hintDiv.style.display = 'none';
    }
}

/**
 * 绑定事件监听器
 */
function bindEventListeners(input, submit, proxyHandler) {
    // 监听键盘Enter事件
    input.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            proxyHandler.handleProxyRequest(input.value.trim());
        }
    });

    // 监听按钮点击事件
    submit.addEventListener('click', (event) => {
        event.preventDefault();
        proxyHandler.handleProxyRequest(input.value.trim());
    });

    // 输入时隐藏错误信息
    input.addEventListener('input', () => {
        proxyHandler.hideError();
    });
    
    // 防止表单提交
    const form = input.closest('form');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            proxyHandler.handleProxyRequest(input.value.trim());
        });
    }
}

/**
 * 安全检查器类
 * 负责所有安全相关的验证
 */
class SecurityChecker {
    constructor(securityConfig, uiConfig) {
        this.config = securityConfig;
        this.uiConfig = uiConfig;
    }

    /**
     * 检查域名是否在白名单中
     * 支持通配符域名匹配 (*.example.com)
     */
    isAllowedDomain(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();

            return this.config.ALLOWED_DOMAINS.some(domain => {
                // 处理通配符域名 (*.example.com)
                if (domain.startsWith('*.')) {
                    const baseDomain = domain.substring(2).toLowerCase(); // 移除 '*.'
                    // 匹配基础域名或其子域名
                    return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
                }

                // 处理普通域名
                domain = domain.toLowerCase();
                return hostname === domain || hostname.endsWith('.' + domain);
            });
        } catch (error) {
            console.error('URL解析错误:', error);
            return false;
        }
    }

    /**
     * 检查是否为私有网络地址
     */
    isPrivateNetwork(url) {
        if (!this.config.SECURITY_OPTIONS.blockPrivateNetworks) {
            return false;
        }

        try {
            const hostname = new URL(url).hostname;

            // 检查本地地址
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return true;
            }

            // 检查私有IP段
            const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
            const match = hostname.match(ipv4Regex);

            if (match) {
                const [, a, b] = match.map(Number);

                // 私有IP段检查
                if (a === 10) return true; // 10.0.0.0/8
                if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
                if (a === 192 && b === 168) return true; // 192.168.0.0/16
                if (a === 169 && b === 254) return true; // 169.254.0.0/16
            }

            return false;
        } catch (error) {
            return true; // 解析失败时保守处理
        }
    }

    /**
     * 完整的URL验证
     */
    validateUrl(url) {
        const errors = this.uiConfig.ERROR_MESSAGES;

        // 基本格式检查
        if (!url || typeof url !== 'string') {
            return { valid: false, error: errors.EMPTY_INPUT };
        }

        // 去除首尾空格
        url = url.trim();

        // 正则表达式验证
        if (this.config.SECURITY_OPTIONS.validateUrlFormat && !this.config.URL_PATTERN.test(url)) {
            return { valid: false, error: errors.INVALID_FORMAT };
        }

        // 检查是否为私有网络
        if (this.isPrivateNetwork(url)) {
            return { valid: false, error: errors.PRIVATE_NETWORK };
        }

        // 检查域名白名单
        if (this.config.SECURITY_OPTIONS.enforceWhitelist && !this.isAllowedDomain(url)) {
            return { valid: false, error: errors.DOMAIN_NOT_ALLOWED };
        }

        // 检查端口号合理性
        if (this.config.SECURITY_OPTIONS.checkPortRange) {
            try {
                const urlObj = new URL(url);
                const port = urlObj.port;
                if (port) {
                    const portNum = parseInt(port);
                    const range = this.config.ALLOWED_PORT_RANGE;
                    if (portNum < range.min || portNum > range.max) {
                        return { valid: false, error: errors.INVALID_PORT };
                    }
                }
            } catch (error) {
                return { valid: false, error: errors.PARSE_ERROR };
            }
        }

        return { valid: true, error: null };
    }
}

/**
 * 全局错误处理函数
 * 用于在配置加载失败时显示错误
 */
function showError(message) {
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'message-container error-message';
        errorDiv.style.display = 'block';
        const container = document.querySelector('.span10.noFloat') || document.body;
        container.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
