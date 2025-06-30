/**
 * 代理处理器类
 * 负责处理代理请求和用户交互
 */
class ProxyHandler {
    constructor(securityChecker, uiConfig, appConfig) {
        this.securityChecker = securityChecker;
        this.uiConfig = uiConfig;
        this.appConfig = appConfig;
    }

    /**
     * 处理代理请求
     */
    async handleProxyRequest(inputValue) {
        try {
            // 隐藏之前的消息
            this.hideAllMessages();

            // 检查速率限制
            const rateLimitCheck = this.checkRateLimit();
            if (!rateLimitCheck.allowed) {
                this.showError(rateLimitCheck.message);
                return;
            }

            // 显示加载状态
            this.showLoading(true);

            // 输入验证
            if (!inputValue) {
                this.showError(this.uiConfig.ERROR_MESSAGES.EMPTY_INPUT);
                this.showLoading(false);
                return;
            }

            // 完整的URL验证
            const validation = this.securityChecker.validateUrl(inputValue);
            if (!validation.valid) {
                this.showError(validation.error);
                this.showLoading(false);
                return;
            }

            // 解析URL
            let protocol, hostname;
            try {
                const urlObj = new URL(inputValue);
                protocol = urlObj.protocol.slice(0, -1); // 移除末尾的冒号
                hostname = urlObj.host + urlObj.pathname + urlObj.search + urlObj.hash;
            } catch (error) {
                this.showError(this.uiConfig.ERROR_MESSAGES.PARSE_ERROR);
                this.showLoading(false);
                return;
            }

            // 构建代理URL - 使用新的API端点
            const baseUrl = location.origin;
            const proxyUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(inputValue)}`;

            // 记录访问日志
            this.logAccess(inputValue, proxyUrl);

            // 可选：检查目标URL可达性
            if (this.appConfig.PERFORMANCE.enableConnectivityCheck) {
                try {
                    await this.checkUrlConnectivity(proxyUrl);
                } catch (error) {
                    this.showError(this.uiConfig.ERROR_MESSAGES.NETWORK_ERROR);
                    this.showLoading(false);
                    return;
                }
            }

            // 检查是否在本地环境
            const isLocalEnvironment = location.hostname === 'localhost' || 
                                      location.hostname === '127.0.0.1' || 
                                      location.hostname.startsWith('192.168.') ||
                                      location.hostname.startsWith('10.');
            
            if (isLocalEnvironment) {
                // 本地环境提示
                this.showWarning(`
                    <strong>本地测试环境检测</strong><br>
                    代理URL已生成: <code>${proxyUrl}</code><br>
                    <small>注意: 代理功能需要在Vercel平台上才能正常工作。<br>
                    本地环境仅用于界面和验证功能测试。</small>
                `);
                
                // 仍然尝试打开，但用户会看到404
                try {
                    const newWindow = window.open(proxyUrl, "_blank", "noopener,noreferrer");
                    if (!newWindow) {
                        this.showError(this.uiConfig.ERROR_MESSAGES.POPUP_BLOCKED);
                    }
                } catch (error) {
                    console.error('打开窗口失败:', error);
                    this.showError(this.uiConfig.ERROR_MESSAGES.POPUP_BLOCKED);
                }
            } else {
                // 生产环境正常处理
                try {
                    const newWindow = window.open(proxyUrl, "_blank", "noopener,noreferrer");
                    if (!newWindow) {
                        this.showError(this.uiConfig.ERROR_MESSAGES.POPUP_BLOCKED);
                        this.showLoading(false);
                        return;
                    }
                    
                    // 显示成功消息
                    this.showSuccess('代理页面已在新窗口中打开');
                    
                    if (this.appConfig.CONSOLE_LOGGING) {
                        console.log(this.uiConfig.SUCCESS_MESSAGES.PROXY_CREATED);
                    }
                    
                } catch (error) {
                    console.error('打开窗口失败:', error);
                    this.showError(this.uiConfig.ERROR_MESSAGES.POPUP_BLOCKED);
                }
            }
            
            this.showLoading(false);

        } catch (error) {
            console.error('代理处理过程中发生错误:', error);
            this.showError(this.uiConfig.ERROR_MESSAGES.GENERAL_ERROR);
            this.showLoading(false);
        }
    }

    /**
     * 显示/隐藏加载状态
     */
    showLoading(show = true) {
        const submitBtn = document.getElementById('submitBtn');
        const input = document.getElementById('input');

        if (show) {
            // 创建加载指示器
            let loadingDiv = document.getElementById('loading-indicator');
            if (!loadingDiv) {
                loadingDiv = document.createElement('div');
                loadingDiv.id = 'loading-indicator';
                loadingDiv.innerHTML = `
                    <div class="loading-spinner"></div>
                    正在处理请求...
                `;
                document.querySelector('.span10.noFloat').appendChild(loadingDiv);
            }
            loadingDiv.style.display = 'block';

            // 禁用按钮和输入框
            if (submitBtn) {
                submitBtn.style.opacity = '0.6';
                submitBtn.style.pointerEvents = 'none';
                submitBtn.textContent = '处理中...';
            }
            if (input) {
                input.disabled = true;
                input.style.opacity = '0.6';
            }

        } else {
            // 隐藏加载指示器
            const loadingDiv = document.getElementById('loading-indicator');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }

            // 恢复按钮和输入框
            if (submitBtn) {
                submitBtn.style.opacity = '1';
                submitBtn.style.pointerEvents = 'auto';
                submitBtn.textContent = this.uiConfig.BUTTON_TEXT;
            }
            if (input) {
                input.disabled = false;
                input.style.opacity = '1';
            }
        }
    }

    /**
     * 检查URL连通性（可选功能）
     */
    async checkUrlConnectivity(url) {
        return new Promise((resolve, reject) => {
            const timeout = this.appConfig.PERFORMANCE.requestTimeout || 5000;
            const timeoutId = setTimeout(() => {
                reject(new Error('连接超时'));
            }, timeout);

            // 尝试使用fetch进行预检查（可能受CORS限制）
            if (this.appConfig.PERFORMANCE.enablePreflightCheck) {
                fetch(url, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-cache'
                })
                .then(() => {
                    clearTimeout(timeoutId);
                    resolve();
                })
                .catch((error) => {
                    clearTimeout(timeoutId);
                    // 即使CORS失败，也不一定意味着URL不可达
                    // 在生产环境中，这个检查可能不太有效
                    resolve(); // 暂时总是解析成功
                });
            } else {
                // 简单的延迟模拟
                setTimeout(() => {
                    clearTimeout(timeoutId);
                    resolve();
                }, 100);
            }
        });
    }

    /**
     * 记录访问日志和统计
     */
    logAccess(originalUrl, proxyUrl) {
        if (this.appConfig.CONSOLE_LOGGING) {
            console.log(`代理请求: ${originalUrl} -> ${proxyUrl}`);
        }

        // 统计功能
        if (this.appConfig.ANALYTICS.enableUsageStats) {
            this.recordUsageStats(originalUrl, proxyUrl);
        }

        // 性能监控
        if (this.appConfig.ANALYTICS.enablePerformanceMonitoring) {
            this.recordPerformanceMetrics();
        }
    }

    /**
     * 记录使用统计
     */
    recordUsageStats(originalUrl, proxyUrl) {
        try {
            const stats = this.getStoredStats();
            const timestamp = new Date().toISOString();
            const domain = new URL(originalUrl).hostname;

            const entry = {
                id: this.generateStatsId(),
                timestamp: timestamp,
                domain: domain,
                protocol: new URL(originalUrl).protocol.slice(0, -1),
                success: true,
                userAgent: this.appConfig.ANALYTICS.anonymizeData ?
                    this.anonymizeUserAgent(navigator.userAgent) : navigator.userAgent,
                sessionId: this.getSessionId()
            };

            stats.requests.push(entry);
            stats.totalRequests++;
            stats.lastActivity = timestamp;

            // 更新域名统计
            if (!stats.domainStats[domain]) {
                stats.domainStats[domain] = 0;
            }
            stats.domainStats[domain]++;

            // 清理旧数据
            this.cleanupOldStats(stats);

            // 保存统计数据
            this.saveStats(stats);

            // 更新实时显示
            if (this.appConfig.ANALYTICS.enableRealTimeStats) {
                this.updateStatsDisplay(stats);
            }

        } catch (error) {
            console.error('统计记录失败:', error);
        }
    }

    /**
     * 获取存储的统计数据
     */
    getStoredStats() {
        if (!this.appConfig.ANALYTICS.enableLocalStorage) {
            return this.createEmptyStats();
        }

        try {
            const stored = localStorage.getItem('proxy-stats');
            if (stored) {
                const stats = JSON.parse(stored);
                // 确保数据结构完整
                return {
                    ...this.createEmptyStats(),
                    ...stats,
                    requests: stats.requests || [],
                    domainStats: stats.domainStats || {}
                };
            }
        } catch (error) {
            console.error('读取统计数据失败:', error);
        }

        return this.createEmptyStats();
    }

    /**
     * 创建空的统计数据结构
     */
    createEmptyStats() {
        return {
            version: '2.0.0',
            createdAt: new Date().toISOString(),
            lastActivity: null,
            totalRequests: 0,
            totalErrors: 0,
            requests: [],
            errors: [],
            domainStats: {},
            performanceMetrics: {
                averageResponseTime: 0,
                totalResponseTime: 0,
                requestCount: 0,
                lastRequestTime: null
            }
        };
    }

    /**
     * 保存统计数据
     */
    saveStats(stats) {
        if (!this.appConfig.ANALYTICS.enableLocalStorage) {
            return;
        }

        try {
            localStorage.setItem('proxy-stats', JSON.stringify(stats));
        } catch (error) {
            console.error('保存统计数据失败:', error);
        }
    }

    /**
     * 清理旧的统计数据
     */
    cleanupOldStats(stats) {
        const retentionDays = this.appConfig.ANALYTICS.statsRetentionDays;
        const maxEntries = this.appConfig.ANALYTICS.maxStatsEntries;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // 按时间清理
        stats.requests = stats.requests.filter(entry =>
            new Date(entry.timestamp) > cutoffDate
        );

        stats.errors = stats.errors.filter(entry =>
            new Date(entry.timestamp) > cutoffDate
        );

        // 按数量限制
        if (stats.requests.length > maxEntries) {
            stats.requests = stats.requests.slice(-maxEntries);
        }

        if (stats.errors.length > maxEntries) {
            stats.errors = stats.errors.slice(-maxEntries);
        }
    }

    /**
     * 生成统计ID
     */
    generateStatsId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    /**
     * 获取会话ID
     */
    getSessionId() {
        if (!this.appConfig.ANALYTICS.enableSessionTracking) {
            return null;
        }

        let sessionId = sessionStorage.getItem('proxy-session-id');
        if (!sessionId) {
            sessionId = this.generateStatsId();
            sessionStorage.setItem('proxy-session-id', sessionId);
        }
        return sessionId;
    }

    /**
     * 匿名化用户代理
     */
    anonymizeUserAgent(userAgent) {
        // 简单的匿名化处理，移除版本号等敏感信息
        return userAgent
            .replace(/\d+\.\d+\.\d+/g, 'x.x.x')
            .replace(/\d+\.\d+/g, 'x.x')
            .substring(0, 100);
    }

    /**
     * 更新统计显示
     */
    updateStatsDisplay(stats) {
        // 这里可以添加实时统计显示的逻辑
        // 目前只在控制台输出
        if (this.appConfig.CONSOLE_LOGGING) {
            console.log('统计更新:', {
                总请求数: stats.totalRequests,
                总错误数: stats.totalErrors,
                域名统计: stats.domainStats
            });
        }
    }

    /**
     * 记录性能指标
     */
    recordPerformanceMetrics() {
        // 记录基本的性能指标
        const now = performance.now();
        const stats = this.getStoredStats();

        if (!stats.performanceMetrics.lastRequestTime) {
            stats.performanceMetrics.lastRequestTime = now;
        } else {
            const responseTime = now - stats.performanceMetrics.lastRequestTime;
            stats.performanceMetrics.totalResponseTime += responseTime;
            stats.performanceMetrics.requestCount++;
            stats.performanceMetrics.averageResponseTime =
                stats.performanceMetrics.totalResponseTime / stats.performanceMetrics.requestCount;
        }

        stats.performanceMetrics.lastRequestTime = now;
        this.saveStats(stats);

        if (this.appConfig.CONSOLE_LOGGING) {
            console.log('性能指标:', {
                平均响应时间: stats.performanceMetrics.averageResponseTime.toFixed(2) + 'ms',
                请求计数: stats.performanceMetrics.requestCount
            });
        }
    }

    /**
     * 检查速率限制
     */
    checkRateLimit() {
        const rateLimitConfig = this.appConfig.RATE_LIMITING;

        if (!rateLimitConfig.enabled) {
            return { allowed: true };
        }

        const now = Date.now();
        const sessionId = this.getSessionId();
        const rateLimitData = this.getRateLimitData(sessionId);

        // 清理过期的请求记录
        this.cleanupRateLimitData(rateLimitData, now);

        // 检查各个时间窗口的限制
        const checks = [
            {
                window: 60 * 1000,  // 1分钟
                limit: rateLimitConfig.maxRequestsPerMinute,
                name: '分钟'
            },
            {
                window: 60 * 60 * 1000,  // 1小时
                limit: rateLimitConfig.maxRequestsPerHour,
                name: '小时'
            },
            {
                window: 24 * 60 * 60 * 1000,  // 1天
                limit: rateLimitConfig.maxRequestsPerDay,
                name: '天'
            }
        ];

        for (const check of checks) {
            const windowStart = now - check.window;
            const requestsInWindow = rateLimitData.requests.filter(
                timestamp => timestamp > windowStart
            ).length;

            // 检查是否超过限制
            if (requestsInWindow >= check.limit) {
                const resetTime = new Date(rateLimitData.requests[0] + check.window);
                return {
                    allowed: false,
                    message: `请求过于频繁，每${check.name}最多${check.limit}次请求。请在 ${resetTime.toLocaleTimeString()} 后重试。`,
                    resetTime: resetTime,
                    window: check.name
                };
            }

            // 检查警告阈值
            if (rateLimitConfig.enableWarnings) {
                const warningThreshold = check.limit * rateLimitConfig.warningThreshold;
                if (requestsInWindow >= warningThreshold) {
                    const remaining = check.limit - requestsInWindow;
                    this.showWarning(`注意：您在这个${check.name}内还可以发起 ${remaining} 次请求`);
                }
            }
        }

        // 记录本次请求
        rateLimitData.requests.push(now);
        this.saveRateLimitData(sessionId, rateLimitData);

        return { allowed: true };
    }
}
