#!/usr/bin/env node
/**
 * CSS压缩脚本
 * 用于生产环境构建时压缩CSS文件
 */

const fs = require('fs');
const path = require('path');

// 简单的CSS压缩函数
function minifyCSS(css) {
    return css
        // 移除注释
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // 移除多余的空白字符
        .replace(/\s+/g, ' ')
        // 移除分号前的空格
        .replace(/\s*;\s*/g, ';')
        // 移除大括号前后的空格
        .replace(/\s*{\s*/g, '{')
        .replace(/\s*}\s*/g, '}')
        // 移除冒号后的空格
        .replace(/:\s+/g, ':')
        // 移除逗号后的空格
        .replace(/,\s+/g, ',')
        // 移除行首行尾空格
        .trim();
}

// 处理CSS文件
function processCSS() {
    const cssDir = path.join(process.cwd(), 'src/css');
    const files = fs.readdirSync(cssDir);
    
    files.forEach(file => {
        if (file.endsWith('.css')) {
            const filePath = path.join(cssDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const minified = minifyCSS(content);
            
            // 创建备份
            const backupPath = filePath + '.backup';
            if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, content);
            }
            
            // 写入压缩后的内容
            fs.writeFileSync(filePath, minified);
            
            console.log(`✅ 压缩完成: ${file}`);
            console.log(`   原始大小: ${content.length} bytes`);
            console.log(`   压缩后: ${minified.length} bytes`);
            console.log(`   压缩率: ${((1 - minified.length / content.length) * 100).toFixed(1)}%`);
        }
    });
}

// 恢复CSS文件
function restoreCSS() {
    const cssDir = path.join(process.cwd(), 'src/css');
    const files = fs.readdirSync(cssDir);
    
    files.forEach(file => {
        if (file.endsWith('.css.backup')) {
            const backupPath = path.join(cssDir, file);
            const originalPath = backupPath.replace('.backup', '');
            const content = fs.readFileSync(backupPath, 'utf8');
            
            fs.writeFileSync(originalPath, content);
            fs.unlinkSync(backupPath);
            
            console.log(`✅ 恢复完成: ${file.replace('.backup', '')}`);
        }
    });
}

// 命令行参数处理
const command = process.argv[2];

if (command === 'restore') {
    console.log('🔄 恢复CSS文件...');
    restoreCSS();
} else {
    console.log('🗜️  压缩CSS文件...');
    processCSS();
}

console.log('✨ CSS处理完成！');
