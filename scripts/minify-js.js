#!/usr/bin/env node
/**
 * JavaScript压缩脚本
 * 用于生产环境构建时压缩JS文件
 */

const fs = require('fs');
const path = require('path');

// 简单的JS压缩函数
function minifyJS(js) {
    return js
        // 移除单行注释（保留URL中的//）
        .replace(/\/\/(?![^\r\n]*['"`]).*$/gm, '')
        // 移除多行注释
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // 移除多余的空白字符（保留字符串中的空格）
        .replace(/\s+/g, ' ')
        // 移除分号前的空格
        .replace(/\s*;\s*/g, ';')
        // 移除大括号前后的空格
        .replace(/\s*{\s*/g, '{')
        .replace(/\s*}\s*/g, '}')
        // 移除括号前后的空格
        .replace(/\s*\(\s*/g, '(')
        .replace(/\s*\)\s*/g, ')')
        // 移除逗号后的空格
        .replace(/,\s+/g, ',')
        // 移除操作符前后的空格
        .replace(/\s*=\s*/g, '=')
        .replace(/\s*\+\s*/g, '+')
        .replace(/\s*-\s*/g, '-')
        // 移除行首行尾空格
        .trim();
}

// 处理JS文件
function processJS() {
    const jsDir = path.join(process.cwd(), 'src/js');
    const files = fs.readdirSync(jsDir);
    
    files.forEach(file => {
        if (file.endsWith('.js')) {
            const filePath = path.join(jsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const minified = minifyJS(content);
            
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

// 恢复JS文件
function restoreJS() {
    const jsDir = path.join(process.cwd(), 'src/js');
    const files = fs.readdirSync(jsDir);
    
    files.forEach(file => {
        if (file.endsWith('.js.backup')) {
            const backupPath = path.join(jsDir, file);
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
    console.log('🔄 恢复JS文件...');
    restoreJS();
} else {
    console.log('🗜️  压缩JS文件...');
    processJS();
}

console.log('✨ JS处理完成！');
