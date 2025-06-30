#!/usr/bin/env node
/**
 * 构建脚本 - 为Vercel和Netlify创建适当的输出目录
 * Vercel需要public目录，Netlify使用根目录
 */

const fs = require('fs');
const path = require('path');

// 检测平台
function detectPlatform() {
    // 检查环境变量
    if (process.env.VERCEL) return 'vercel';
    if (process.env.NETLIFY) return 'netlify';
    
    // 检查配置文件
    if (fs.existsSync('vercel.json')) return 'vercel';
    if (fs.existsSync('netlify.toml')) return 'netlify';
    
    return 'vercel'; // 默认
}

// 复制文件
function copyFile(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
}

// 复制目录
function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        
        if (fs.lstatSync(srcPath).isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFile(srcPath, destPath);
        }
    });
}

// 主构建函数
function build() {
    const platform = detectPlatform();
    console.log(`🔍 检测到平台: ${platform}`);
    
    if (platform === 'vercel') {
        console.log('🚀 为Vercel构建...');
        
        // 创建public目录
        if (!fs.existsSync('public')) {
            fs.mkdirSync('public');
        }
        
        // 复制主要文件到public目录
        const filesToCopy = [
            'index.html',
            'vercel.json'
        ];
        
        filesToCopy.forEach(file => {
            if (fs.existsSync(file)) {
                copyFile(file, path.join('public', file));
                console.log(`✅ 复制: ${file} -> public/${file}`);
            }
        });
        
        // 复制目录
        const dirsToCopy = [
            'src',
            'docs',
            'api'
        ];
        
        dirsToCopy.forEach(dir => {
            if (fs.existsSync(dir)) {
                copyDirectory(dir, path.join('public', dir));
                console.log(`✅ 复制目录: ${dir} -> public/${dir}`);
            }
        });
        
        console.log('✨ Vercel构建完成！');
        
    } else if (platform === 'netlify') {
        console.log('🚀 为Netlify构建...');
        
        // Netlify使用根目录，不需要特殊处理
        console.log('✨ Netlify构建完成！（使用根目录）');
        
    } else {
        console.log('🚀 通用构建...');
        console.log('✨ 构建完成！');
    }
}

// 运行构建
try {
    build();
    console.log('🎉 构建成功完成！');
} catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
}
