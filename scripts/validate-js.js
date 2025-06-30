#!/usr/bin/env node
/**
 * JavaScript验证脚本
 * 检查JS文件的基本语法和结构
 */

const fs = require('fs');
const path = require('path');

// JS验证规则
const validationRules = {
    // 检查语法错误
    checkSyntax: true,
    // 检查未声明的变量
    checkUndeclaredVars: false, // 简化版本，不做复杂检查
    // 检查函数声明
    checkFunctions: true,
    // 检查配置对象
    checkConfig: true
};

// 验证JavaScript文件
function validateJS(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    const warnings = [];
    const fileName = path.basename(filePath);
    
    // 基本语法检查
    if (validationRules.checkSyntax) {
        try {
            // 简单的语法检查
            new Function(content);
        } catch (error) {
            // 忽略一些在浏览器环境中才有效的代码
            if (!error.message.includes('document') && 
                !error.message.includes('window') && 
                !error.message.includes('console')) {
                errors.push(`语法错误: ${error.message}`);
            }
        }
    }
    
    // 检查配置文件特定内容
    if (fileName === 'config.js' && validationRules.checkConfig) {
        const requiredConfigs = [
            'SECURITY_CONFIG',
            'UI_CONFIG',
            'APP_CONFIG',
            'ALLOWED_DOMAINS'
        ];
        
        requiredConfigs.forEach(config => {
            if (!content.includes(config)) {
                errors.push(`配置文件缺少必需的配置: ${config}`);
            }
        });
        
        // 检查域名白名单是否为空
        if (content.includes('ALLOWED_DOMAINS') && content.includes('ALLOWED_DOMAINS: []')) {
            warnings.push('域名白名单为空，可能影响功能');
        }
    }
    
    // 检查函数声明
    if (validationRules.checkFunctions) {
        const functionDeclarations = content.match(/function\s+\w+\s*\(/g) || [];
        const arrowFunctions = content.match(/\w+\s*=\s*\([^)]*\)\s*=>/g) || [];
        const totalFunctions = functionDeclarations.length + arrowFunctions.length;
        
        if (totalFunctions === 0 && fileName !== 'config.js') {
            warnings.push('文件中没有发现函数声明');
        }
    }
    
    // 检查常见问题
    const commonIssues = [
        { pattern: /console\.log\(/g, message: '包含console.log语句，生产环境建议移除' },
        { pattern: /debugger;/g, message: '包含debugger语句，生产环境应移除' },
        { pattern: /alert\(/g, message: '使用alert()，建议使用更好的用户提示方式' }
    ];
    
    commonIssues.forEach(issue => {
        const matches = content.match(issue.pattern);
        if (matches) {
            warnings.push(`${issue.message} (${matches.length}处)`);
        }
    });
    
    return { errors, warnings };
}

// 处理JavaScript文件
function processJS() {
    const jsDir = path.join(process.cwd(), 'src/js');
    const apiDir = path.join(process.cwd(), 'api');
    const netlifyDir = path.join(process.cwd(), 'netlify/functions');
    
    const jsFiles = [];
    
    // 添加src/js目录中的文件
    if (fs.existsSync(jsDir)) {
        const srcFiles = fs.readdirSync(jsDir)
            .filter(file => file.endsWith('.js'))
            .map(file => path.join(jsDir, file));
        jsFiles.push(...srcFiles);
    }
    
    // 添加api目录中的文件
    if (fs.existsSync(apiDir)) {
        const apiFiles = fs.readdirSync(apiDir)
            .filter(file => file.endsWith('.js'))
            .map(file => path.join(apiDir, file));
        jsFiles.push(...apiFiles);
    }
    
    // 添加netlify functions目录中的文件
    if (fs.existsSync(netlifyDir)) {
        const netlifyFiles = fs.readdirSync(netlifyDir)
            .filter(file => file.endsWith('.js'))
            .map(file => path.join(netlifyDir, file));
        jsFiles.push(...netlifyFiles);
    }
    
    let totalErrors = 0;
    let totalWarnings = 0;
    
    jsFiles.forEach(filePath => {
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`\n🔍 验证文件: ${relativePath}`);
        
        const result = validateJS(filePath);
        
        if (result.errors.length > 0) {
            console.log('❌ 错误:');
            result.errors.forEach(error => console.log(`   - ${error}`));
            totalErrors += result.errors.length;
        }
        
        if (result.warnings.length > 0) {
            console.log('⚠️  警告:');
            result.warnings.forEach(warning => console.log(`   - ${warning}`));
            totalWarnings += result.warnings.length;
        }
        
        if (result.errors.length === 0 && result.warnings.length === 0) {
            console.log('✅ 验证通过');
        }
    });
    
    console.log(`\n📊 验证结果:`);
    console.log(`   总错误: ${totalErrors}`);
    console.log(`   总警告: ${totalWarnings}`);
    
    if (totalErrors > 0) {
        console.log('❌ JavaScript验证失败');
        process.exit(1);
    } else {
        console.log('✅ JavaScript验证通过');
    }
}

console.log('🔍 开始JavaScript验证...');
processJS();
