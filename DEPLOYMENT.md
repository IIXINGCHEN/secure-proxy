# 双平台部署指南

本项目支持在 **Vercel** 和 **Netlify** 两个平台上部署，代码会自动检测运行环境并调用对应的API端点。

## 🚀 快速部署

### Vercel 部署

#### 一键部署
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/souying/vercel-api-proxy)

#### 手动部署
1. Fork 本项目到你的 GitHub 账户
2. 登录 [Vercel](https://vercel.com/)
3. 点击 "New Project"
4. 导入你的 GitHub 项目
5. 点击 "Deploy"

### Netlify 部署

#### 一键部署
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/souying/vercel-api-proxy)

#### 手动部署
1. Fork 本项目到你的 GitHub 账户
2. 登录 [Netlify](https://netlify.com/)
3. 点击 "New site from Git"
4. 选择你的 GitHub 项目
5. 构建设置会自动从 `netlify.toml` 读取
6. 点击 "Deploy site"

## 📦 本地开发

### 环境要求
- Node.js 18+
- pnpm 8+

### 安装依赖
```bash
pnpm install
```

### 开发服务器

#### Netlify 开发环境
```bash
pnpm run dev
# 或
pnpm run dev:netlify
```

#### Vercel 开发环境
```bash
pnpm run dev:vercel
```

### 构建和测试
```bash
# 生产构建
pnpm run build

# 验证代码
pnpm run validate

# 运行测试
pnpm run test

# 代码检查
pnpm run check
```

## 🔧 配置说明

### 平台自动检测
项目会自动检测运行环境：
- **Vercel**: 检测域名包含 `vercel.app` 或 `vercel.com`
- **Netlify**: 检测域名包含 `netlify.app` 或 `netlify.com`
- **本地**: 根据 `netlify.toml` 或 `vercel.json` 的存在判断

### API 端点
- **Vercel**: `/api/proxy`
- **Netlify**: `/.netlify/functions/proxy`

代码会自动选择正确的端点，无需手动配置。

### 环境变量
两个平台都支持以下环境变量：
- `NODE_VERSION`: Node.js 版本 (默认: 18)
- `PNPM_VERSION`: pnpm 版本 (默认: 8)

## 📁 项目结构

```
├── api/                    # Vercel Functions
│   └── proxy.js           # Vercel Edge Function
├── netlify/               # Netlify Functions
│   └── functions/
│       └── proxy.js       # Netlify Function
├── src/                   # 前端代码
│   ├── css/
│   ├── js/
│   └── pages/
├── scripts/               # 构建脚本
├── docs/                  # 文档
├── vercel.json           # Vercel 配置
├── netlify.toml          # Netlify 配置
├── package.json          # 项目配置
└── index.html            # 主页面
```

## 🛠️ 构建脚本

### 可用命令
```bash
# 开发
pnpm run dev              # Netlify 开发环境
pnpm run dev:vercel       # Vercel 开发环境

# 构建
pnpm run build            # 生产构建
pnpm run build:prod       # 生产构建（完整）
pnpm run build:preview    # 预览构建

# 优化
pnpm run optimize         # 压缩 CSS 和 JS
pnpm run minify:css       # 仅压缩 CSS
pnpm run minify:js        # 仅压缩 JS

# 验证
pnpm run validate         # 验证 HTML 和 JS
pnpm run validate:html    # 仅验证 HTML
pnpm run validate:js      # 仅验证 JS

# 测试
pnpm run test             # 运行所有测试
pnpm run test:functions   # 测试函数
pnpm run test:frontend    # 测试前端

# 部署
pnpm run deploy:vercel    # 部署到 Vercel
pnpm run deploy:netlify   # 部署到 Netlify

# 工具
pnpm run clean            # 清理临时文件
pnpm run lint             # 代码检查
pnpm run format           # 代码格式化
```

## 🔒 安全配置

两个平台都配置了相同的安全头：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## 📊 性能优化

### 缓存策略
- **HTML**: 无缓存
- **CSS/JS**: 1小时缓存
- **图片**: 24小时缓存
- **字体**: 7天缓存

### 压缩
- 生产构建自动压缩 CSS 和 JS
- 支持 gzip 和 brotli 压缩

## 🐛 故障排除

### 常见问题

1. **API 调用失败**
   - 检查域名是否在白名单中
   - 确认平台检测是否正确

2. **构建失败**
   - 检查 Node.js 版本是否正确
   - 确认 pnpm 版本兼容性

3. **函数超时**
   - Vercel: 默认 10 秒
   - Netlify: 默认 10 秒（可配置到 30 秒）

### 调试模式
在 `src/js/config.js` 中设置：
```javascript
DEBUG_MODE: true,
CONSOLE_LOGGING: true
```

## 📞 支持

- [GitHub Issues](https://github.com/souying/vercel-api-proxy/issues)
- [文档](./docs/README.md)
- [架构说明](./docs/ARCHITECTURE.md)
