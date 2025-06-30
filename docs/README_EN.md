# Vercel Reverse Proxy

[简体中文](./README.md) | [Terms of Service](./TERMS_OF_SERVICE.md) | [Privacy Policy](./PRIVACY_POLICY.md) | [Disclaimer](./DISCLAIMER.md)

## ⚠️ Important Security Notice

**This project has undergone comprehensive security hardening. Please read the relevant documents carefully before use:**
- 📋 [Terms of Service](./TERMS_OF_SERVICE.md) - Understand usage restrictions and responsibilities
- 🔒 [Privacy Policy](./PRIVACY_POLICY.md) - Learn about data processing methods
- ⚖️ [Disclaimer](./DISCLAIMER.md) - Understand risks and liability limitations

## Project Overview

This project is a secure reverse proxy service based on the Vercel platform, with comprehensive security hardening and optimization. Main features:

### ✅ Security Features
- **Domain Whitelist Control** - Only allows access to preset secure domains
- **Enhanced Input Validation** - Prevents malicious input and intranet access
- **Security Headers Configuration** - Includes XSS protection, content type protection, etc.
- **Comprehensive Error Handling** - Provides friendly error messages and exception handling

### 🎯 Supported Services
Currently supports the following security-audited domains:
- **OpenAI Related**: api.openai.com, openai.com
- **GitHub Related**: api.github.com, raw.githubusercontent.com, github.com, objects.githubusercontent.com
- **Google Services**: www.google.com, translate.googleapis.com
- **Testing Services**: httpbin.org, jsonplaceholder.typicode.com

### 🚀 Technical Features
- Serverless architecture based on Vercel
- Supports HTTP and HTTPS protocols
- Automatic security checks and validation
- Responsive user interface
- Complete error handling mechanism
## 🚀 Quick Deploy

### One-Click Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/souying/vercel-api-proxy)

### Manual Deployment Steps

1. **Fork the Project**
   - Click the Fork button in the top right corner to copy the project to your GitHub account

2. **Deploy to Vercel**
   - Log in to [Vercel](https://vercel.com/)
   - Select "New Project"
   - Import your forked project
   - Click "Deploy" to complete deployment

3. **Domain Configuration (Optional)**
   - Add a custom domain in Vercel project settings
   - Configure DNS records to point to Vercel servers
   - Wait for SSL certificate automatic configuration

## 📖 How to Use

### Basic Usage
1. Visit your deployment domain
2. Enter the complete URL to proxy in the input box
3. Click the "Reverse Proxy" button or press Enter
4. The system will open the proxy page in a new window

### URL Format
- **Input Format**: `https://api.openai.com/v1/chat/completions`
- **Proxy Format**: `https://your-domain.com/https/api.openai.com/v1/chat/completions`

### Security Restrictions
- Only supports domains in the whitelist
- Automatically blocks intranet address access
- Input validation and format checking
- Error prompts and exception handling

## 💡 Usage Examples

### Example 1: OpenAI API Proxy
```bash
# Original URL
https://api.openai.com/v1/chat/completions

# Proxy URL
https://your-domain.com/https/api.openai.com/v1/chat/completions
```

**Use in Code:**
```python
import openai

# Set proxy base URL
openai.api_base = "https://your-domain.com/https/api.openai.com/v1"
openai.api_key = "your-api-key"

# Use OpenAI API normally
response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Example 2: GitHub File Access
```bash
# Original URL
https://raw.githubusercontent.com/user/repo/main/file.txt

# Proxy URL
https://your-domain.com/https/raw.githubusercontent.com/user/repo/main/file.txt
```

### Example 3: Google Translate API
```bash
# Original URL
https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=hello

# Proxy URL
https://your-domain.com/https/translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=hello
```

## 🔧 Configuration

### Domain Whitelist
The currently supported domain list is defined in the `ALLOWED_DOMAINS` array in `index.html`:

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

### Security Configuration
The project includes multi-layer security protection:
- Input validation and sanitization
- Domain whitelist checking
- Intranet address blocking
- Security response headers setting

## ⚠️ Security Considerations

### Usage Restrictions
- **Legal Use Only**: Ensure your usage complies with local laws and regulations
- **Follow Terms of Service**: Comply with the terms of service of target websites
- **Protect Sensitive Information**: Not recommended for transmitting sensitive data or API keys
- **Commercial Use**: Carefully evaluate legal risks before commercial use

### Risk Warnings
- Proxy services may affect some website functions
- Network transmission has risks of interruption and delay
- Third-party service changes may affect proxy effectiveness
- Please regularly follow project updates and security announcements

## 📚 Related Documents

- 📋 [Terms of Service](./TERMS_OF_SERVICE.md) - Detailed usage rules and restrictions
- 🔒 [Privacy Policy](./PRIVACY_POLICY.md) - Data processing and privacy protection instructions
- ⚖️ [Disclaimer](./DISCLAIMER.md) - Risk warnings and liability limitations
- 📄 [License](./LICENSE) - Open source license information

## 🤝 Contributing

Contributions and suggestions are welcome! Please ensure:

1. **Security First**: Do not introduce new security risks
2. **Code Quality**: Maintain clean code and complete documentation
3. **Test Verification**: Thoroughly test your changes
4. **Follow Standards**: Follow the project's coding standards

### Reporting Issues
- Report security issues through private channels
- Report functional issues through GitHub Issues
- Provide detailed reproduction steps and environment information

## 📞 Contact

- **GitHub Issues**: [Project Issue Feedback](https://github.com/souying/vercel-api-proxy/issues)
- **Security Issues**: Please contact project maintainers through private channels

## 📈 Project Status

- ✅ **Security Hardening Complete**: Passed comprehensive security audit
- ✅ **Complete Documentation**: Includes complete legal and technical documentation
- ✅ **Continuous Maintenance**: Regular updates and security fixes
- ⚠️ **Use with Caution**: Recommended to read related documents carefully before use

## ⭐ Support the Project

If this project helps you, please consider:
- Give the project a Star ⭐
- Share with friends who need it
- Provide feedback and suggestions
- Participate in project contributions

---

**Last Updated**: 2025-06-30
**Version**: v2.0.0 (Security Hardened Version)
**License**: MIT License (with additional security terms)


