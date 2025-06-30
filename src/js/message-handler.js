/**
 * 消息处理器 - ProxyHandler类的扩展方法
 * 处理消息显示、速率限制数据管理等功能
 */

// 扩展ProxyHandler类的方法
Object.assign(ProxyHandler.prototype, {
    /**
     * 获取速率限制数据
     */
    getRateLimitData(sessionId) {
        const key = `rate-limit-${sessionId}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('读取速率限制数据失败:', error);
        }

        return {
            sessionId: sessionId,
            requests: [],
            createdAt: Date.now()
        };
    },

    /**
     * 保存速率限制数据
     */
    saveRateLimitData(sessionId, data) {
        const key = `rate-limit-${sessionId}`;
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('保存速率限制数据失败:', error);
        }
    },

    /**
     * 清理过期的速率限制数据
     */
    cleanupRateLimitData(data, now) {
        const maxWindow = 24 * 60 * 60 * 1000; // 24小时
        const cutoff = now - maxWindow;

        data.requests = data.requests.filter(timestamp => timestamp > cutoff);
    },

    /**
     * 增强的消息显示系统
     */
    showMessage(message, type = 'error', options = {}) {
        const messageId = `${type}-message`;
        let messageDiv = document.getElementById(messageId);

        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = messageId;
            messageDiv.className = `message-container ${type}-message`;

            // 添加关闭按钮
            if (options.closable !== false) {
                const closeBtn = document.createElement('span');
                closeBtn.innerHTML = '×';
                closeBtn.className = 'message-close';
                closeBtn.onclick = () => this.hideMessage(type);
                messageDiv.appendChild(closeBtn);
            }

            document.querySelector('.content-container').appendChild(messageDiv);
        }

        // 设置消息内容
        this.setMessageContent(messageDiv, message, type, options);

        // 显示消息
        messageDiv.style.display = 'block';

        // 自动隐藏
        const autoHideTime = options.autoHide !== false ?
            (type === 'success' ? this.uiConfig.ERROR_HANDLING.successDisplayTime :
             this.uiConfig.STYLES.ERROR_DISPLAY_TIME) : 0;

        if (autoHideTime > 0) {
            setTimeout(() => {
                this.hideMessage(type);
            }, autoHideTime);
        }

        // 错误报告
        if (type === 'error' && this.uiConfig.ERROR_HANDLING.enableErrorReporting) {
            this.reportError(message, options.details);
        }
    },

    /**
     * 设置消息内容
     */
    setMessageContent(messageDiv, message, type, options) {
        // 清空现有内容（保留关闭按钮）
        const closeBtn = messageDiv.querySelector('.message-close');
        messageDiv.innerHTML = '';

        // 创建消息内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // 处理消息格式
        if (typeof message === 'object' && message.title) {
            // 新格式：包含标题和描述
            const titleDiv = document.createElement('div');
            titleDiv.className = 'message-title';
            titleDiv.innerHTML = message.title;

            const descDiv = document.createElement('div');
            descDiv.className = 'message-description';
            descDiv.innerHTML = message.description;

            contentDiv.appendChild(titleDiv);
            contentDiv.appendChild(descDiv);
        } else {
            // 旧格式：纯文本
            const titleDiv = document.createElement('div');
            titleDiv.className = 'message-title';
            titleDiv.innerHTML = message;
            contentDiv.appendChild(titleDiv);
        }

        messageDiv.appendChild(contentDiv);

        // 重新添加关闭按钮
        if (closeBtn) {
            messageDiv.appendChild(closeBtn);
        }
    },



    /**
     * 隐藏指定类型的消息
     */
    hideMessage(type = 'error') {
        const messageDiv = document.getElementById(`${type}-message`);
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    },

    /**
     * 隐藏所有消息
     */
    hideAllMessages() {
        ['error', 'success', 'warning', 'info'].forEach(type => {
            this.hideMessage(type);
        });
    },

    /**
     * 显示错误信息（兼容性方法）
     */
    showError(message, details = null) {
        this.showMessage(message, 'error', { details });
    },

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    },

    /**
     * 显示警告信息
     */
    showWarning(message) {
        this.showMessage(message, 'warning');
    },

    /**
     * 显示信息提示
     */
    showInfo(message) {
        this.showMessage(message, 'info');
    },

    /**
     * 隐藏错误信息（兼容性方法）
     */
    hideError() {
        this.hideMessage('error');
    },

    /**
     * 错误报告功能
     */
    reportError(message, details = null) {
        if (this.appConfig.CONSOLE_LOGGING) {
            console.error('代理错误:', message);
            if (details) {
                console.error('错误详情:', details);
            }
        }

        // 这里可以添加发送错误报告到服务器的逻辑
        // 例如发送到错误监控服务
    },

    /**
     * 获取速率限制状态
     */
    getRateLimitStatus() {
        const rateLimitConfig = this.appConfig.RATE_LIMITING;

        if (!rateLimitConfig.enabled) {
            return null;
        }

        const sessionId = this.getSessionId();
        const rateLimitData = this.getRateLimitData(sessionId);
        const now = Date.now();

        this.cleanupRateLimitData(rateLimitData, now);

        const status = {
            minute: this.getWindowStatus(rateLimitData.requests, now, 60 * 1000, rateLimitConfig.maxRequestsPerMinute),
            hour: this.getWindowStatus(rateLimitData.requests, now, 60 * 60 * 1000, rateLimitConfig.maxRequestsPerHour),
            day: this.getWindowStatus(rateLimitData.requests, now, 24 * 60 * 60 * 1000, rateLimitConfig.maxRequestsPerDay)
        };

        return status;
    },

    /**
     * 获取时间窗口状态
     */
    getWindowStatus(requests, now, window, limit) {
        const windowStart = now - window;
        const count = requests.filter(timestamp => timestamp > windowStart).length;

        return {
            count: count,
            limit: limit,
            remaining: Math.max(0, limit - count),
            percentage: Math.min(100, (count / limit) * 100)
        };
    },

    /**
     * 高级URL验证（包含可达性检查）
     */
    async performAdvancedValidation(url) {
        // 基础验证
        const basicValidation = this.securityChecker.validateUrl(url);
        if (!basicValidation.valid) {
            return basicValidation;
        }

        // 可达性检查
        if (this.appConfig.PERFORMANCE.enableConnectivityCheck) {
            try {
                await this.checkUrlConnectivity(url);
            } catch (error) {
                return {
                    valid: false,
                    error: this.uiConfig.ERROR_MESSAGES.NETWORK_ERROR,
                    details: error.message
                };
            }
        }

        return { valid: true, error: null };
    },

    /**
     * 智能重试机制
     */
    async retryOperation(operation, maxAttempts = null) {
        const attempts = maxAttempts || this.uiConfig.ERROR_HANDLING.maxRetryAttempts;
        const delay = this.uiConfig.ERROR_HANDLING.retryDelay;

        for (let i = 0; i < attempts; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === attempts - 1) {
                    throw error; // 最后一次尝试失败，抛出错误
                }

                // 显示重试信息
                if (i > 0) {
                    this.showInfo(`正在重试... (${i + 1}/${attempts})`);
                }

                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
});
