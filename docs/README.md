# Vercel反向代理 (Vercel Reverse Proxy)

[English README](./README_EN.md) | [使用条款](./TERMS_OF_SERVICE.md) | [隐私政策](./PRIVACY_POLICY.md) | [免责声明](./DISCLAIMER.md)

## ⚠️ 重要安全提醒

**本项目已进行全面安全加固，请在使用前仔细阅读相关文档：**
- 📋 [使用条款](./TERMS_OF_SERVICE.md) - 了解使用限制和责任
- 🔒 [隐私政策](./PRIVACY_POLICY.md) - 了解数据处理方式
- ⚖️ [免责声明](./DISCLAIMER.md) - 了解风险和责任限制

## 项目简介

本项目是一个基于Vercel平台的安全反向代理服务，经过全面的安全加固和优化。主要特性：

### ✅ 安全特性
- **域名白名单控制** - 仅允许访问预设的安全域名
- **输入验证加强** - 防止恶意输入和内网访问
- **安全头配置** - 包含XSS防护、内容类型保护等
- **错误处理完善** - 提供友好的错误提示和异常处理

### 🎯 支持的服务
目前支持以下经过安全审核的域名：
- **OpenAI相关**: api.openai.com, openai.com
- **GitHub相关**: api.github.com, raw.githubusercontent.com, github.com, objects.githubusercontent.com
- **Google服务**: www.google.com, translate.googleapis.com
- **测试服务**: httpbin.org, jsonplaceholder.typicode.com

### 🚀 技术特点
- 基于Vercel的无服务器架构
- 支持HTTP和HTTPS协议
- 自动安全检查和验证
- 响应式用户界面
- 完整的错误处理机制

## 🚀 快速部署

### 一键部署到Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/souying/vercel-api-proxy)

### 手动部署步骤

1. **Fork项目**
   - 点击右上角Fork按钮复制项目到您的GitHub账户

2. **部署到Vercel**
   - 登录 [Vercel](https://vercel.com/)
   - 选择"New Project"
   - 导入您fork的项目
   - 点击"Deploy"完成部署

3. **域名配置（可选）**
   - 在Vercel项目设置中添加自定义域名
   - 配置DNS记录指向Vercel服务器
   - 等待SSL证书自动配置完成

## 📖 使用方法

### 基本用法
1. 访问您的部署域名
2. 在输入框中输入要代理的完整URL
3. 点击"Reverse Proxy"按钮或按Enter键
4. 系统会在新窗口中打开代理页面

### URL格式
- **输入格式**: `https://api.openai.com/v1/chat/completions`
- **代理格式**: `https://your-domain.com/https/api.openai.com/v1/chat/completions`

### 安全限制
- 仅支持白名单中的域名
- 自动阻止内网地址访问
- 输入验证和格式检查
- 错误提示和异常处理

## 💡 使用示例

### 示例1: OpenAI API代理
```bash
# 原始URL
https://api.openai.com/v1/chat/completions

# 代理URL
https://your-domain.com/https/api.openai.com/v1/chat/completions
```

**在代码中使用:**
```python
import openai

# 设置代理基础URL
openai.api_base = "https://your-domain.com/https/api.openai.com/v1"
openai.api_key = "your-api-key"

# 正常使用OpenAI API
response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 示例2: GitHub文件访问
```bash
# 原始URL
https://raw.githubusercontent.com/user/repo/main/file.txt

# 代理URL
https://your-domain.com/https/raw.githubusercontent.com/user/repo/main/file.txt
```

### 示例3: Google翻译API
```bash
# 原始URL
https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=hello

# 代理URL
https://your-domain.com/https/translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=hello
```

## 🔧 配置说明

### 域名白名单
当前支持的域名列表在 `index.html` 中的 `ALLOWED_DOMAINS` 数组中定义：

```javascript
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
    'jsonplaceholder.typicode.com'
];
```

### 安全配置
项目包含多层安全防护：
- 输入验证和清理
- 域名白名单检查
- 内网地址阻止
- 安全响应头设置

## ⚠️ 安全注意事项

### 使用限制
- **仅限合法用途**: 请确保您的使用符合当地法律法规
- **遵守服务条款**: 使用时请遵守目标网站的服务条款
- **保护敏感信息**: 不建议传输敏感数据或API密钥
- **商业使用**: 商业用途前请仔细评估法律风险

### 风险提醒
- 代理服务可能影响某些网站功能
- 网络传输存在中断和延迟风险
- 第三方服务变更可能影响代理效果
- 请定期关注项目更新和安全公告

## 📚 相关文档

- 📋 [使用条款](./TERMS_OF_SERVICE.md) - 详细的使用规则和限制
- 🔒 [隐私政策](./PRIVACY_POLICY.md) - 数据处理和隐私保护说明
- ⚖️ [免责声明](./DISCLAIMER.md) - 风险提醒和责任限制
- 📄 [许可证](./LICENSE) - 开源许可证信息

## 🤝 贡献指南

欢迎贡献代码和建议！请确保：

1. **安全第一**: 不引入新的安全风险
2. **代码质量**: 保持代码清洁和文档完整
3. **测试验证**: 充分测试您的更改
4. **遵循规范**: 遵循项目的编码规范

### 报告问题
- 安全问题请通过私有渠道报告
- 功能问题可通过GitHub Issues报告
- 提供详细的复现步骤和环境信息

## 📞 联系方式

- **GitHub Issues**: [项目问题反馈](https://github.com/souying/vercel-api-proxy/issues)
- **安全问题**: 请通过私有渠道联系项目维护者

## 📈 项目状态

- ✅ **安全加固完成**: 已通过全面安全审计
- ✅ **文档完善**: 包含完整的法律和技术文档
- ✅ **持续维护**: 定期更新和安全修复
- ⚠️ **谨慎使用**: 建议仔细阅读相关文档后使用

## ⭐ 支持项目

如果这个项目对您有帮助，请考虑：
- 给项目点个Star ⭐
- 分享给需要的朋友
- 提供反馈和建议
- 参与项目贡献

---

**最后更新**: 2025-06-30
**版本**: v2.0.0 (安全加固版)
**许可证**: MIT License (附加安全条款)
