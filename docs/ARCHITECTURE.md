# 项目架构说明

## 📁 文件结构

本项目采用严格的HTML、CSS、JavaScript分离架构，便于维护和扩展。

### 核心文件

```
├── index.html              # 主HTML文件（仅包含结构）
├── styles.css              # 样式文件（所有CSS样式）
├── config.js               # 配置文件（应用配置）
├── app.js                  # 主应用程序（初始化和UI逻辑）
├── proxy-handler.js        # 代理处理器（核心业务逻辑）
├── message-handler.js      # 消息处理器（消息和UI扩展）
└── vercel.json             # Vercel部署配置
```

### 法律文档

```
├── TERMS_OF_SERVICE.md     # 使用条款
├── PRIVACY_POLICY.md       # 隐私政策
├── DISCLAIMER.md           # 免责声明
└── LICENSE                 # 开源许可证
```

### 项目文档

```
├── README.md               # 项目说明（中文）
├── README_EN.md            # 项目说明（英文）
├── ARCHITECTURE.md         # 架构说明（本文件）
└── user.md                 # 用户文件
```

### 资源文件

```
└── assets/                 # 静态资源目录
    └── img/               # 图片资源
```

## 🏗️ 架构设计

### 1. HTML结构 (`index.html`)

- **职责**: 仅包含页面结构和语义化标记
- **特点**: 
  - 清洁的HTML5语义化结构
  - 无内联样式和脚本
  - 通过外部文件引入CSS和JS
  - 响应式meta标签配置

### 2. 样式系统 (`styles.css`)

- **职责**: 所有视觉样式和布局
- **组织结构**:
  ```css
  /* 基础重置样式 */
  /* 基础布局 */
  /* 网格系统 */
  /* 主要组件样式 */
  /* 表单和输入样式 */
  /* 安全提示样式 */
  /* 消息和通知样式 */
  /* 加载状态样式 */
  /* 响应式设计 */
  ```

### 3. 配置管理 (`config.js`)

- **职责**: 集中管理所有应用配置
- **配置模块**:
  - `SECURITY_CONFIG`: 安全相关配置
  - `UI_CONFIG`: 用户界面配置
  - `APP_CONFIG`: 应用程序配置
  - `LEGAL_CONFIG`: 法律文档配置
  - `DEVELOPER_CONFIG`: 开发者配置

### 4. 主应用程序 (`app.js`)

- **职责**: 应用初始化和基础UI逻辑
- **主要功能**:
  - 配置加载和验证
  - UI组件初始化
  - 事件绑定
  - 安全功能展示
  - 域名列表管理

### 5. 代理处理器 (`proxy-handler.js`)

- **职责**: 核心业务逻辑处理
- **主要类**: `ProxyHandler`
- **核心功能**:
  - 代理请求处理
  - URL验证和解析
  - 安全检查
  - 统计数据收集
  - 性能监控
  - 速率限制

### 6. 消息处理器 (`message-handler.js`)

- **职责**: 消息显示和UI扩展功能
- **扩展方法**:
  - 消息显示系统
  - 速率限制数据管理
  - 错误报告
  - 高级验证功能

### 7. 安全检查器 (`app.js` 中的类)

- **职责**: 安全验证逻辑
- **主要类**: `SecurityChecker`
- **功能**:
  - 域名白名单验证
  - 私有网络检测
  - URL格式验证
  - 端口范围检查

## 🔧 开发指南

### 添加新功能

1. **UI相关**: 修改 `styles.css` 和 `app.js`
2. **业务逻辑**: 修改 `proxy-handler.js`
3. **配置项**: 修改 `config.js`
4. **消息处理**: 修改 `message-handler.js`

### 修改样式

- 所有样式都在 `styles.css` 中
- 使用CSS变量和类名约定
- 遵循响应式设计原则

### 配置管理

- 所有配置都在 `config.js` 中
- 使用模块化配置结构
- 支持环境变量覆盖

### 安全考虑

- 安全配置集中在 `SECURITY_CONFIG`
- 多层验证机制
- 输入清理和验证

## 🚀 部署说明

### Vercel部署

1. 确保 `vercel.json` 配置正确
2. 所有文件都会被部署
3. 重写规则自动生效

### 本地开发

```bash
# 启动本地服务器
npx http-server -p 8080 -c-1

# 或使用Python
python -m http.server 8080
```

### 文件依赖关系

```
index.html
├── styles.css
├── config.js
├── app.js
├── proxy-handler.js
└── message-handler.js
```

**加载顺序很重要**:
1. `config.js` - 必须首先加载
2. `app.js` - 主应用程序
3. `proxy-handler.js` - 业务逻辑
4. `message-handler.js` - 扩展功能

## 📝 维护指南

### 代码组织原则

1. **单一职责**: 每个文件有明确的职责
2. **模块化**: 功能模块独立
3. **可扩展**: 易于添加新功能
4. **可维护**: 代码结构清晰

### 最佳实践

- 修改样式时只编辑 `styles.css`
- 添加配置时只编辑 `config.js`
- 业务逻辑修改在 `proxy-handler.js`
- UI逻辑修改在 `app.js`

### 版本控制

- 每个文件都有版本注释
- 重大更改需要更新版本号
- 保持向后兼容性

---

这种架构设计确保了代码的可维护性、可扩展性和团队协作的便利性。
