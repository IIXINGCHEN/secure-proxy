#!/usr/bin/env node
/**
 * 清理脚本
 * 清理构建过程中产生的临时文件和备份文件
 */

const fs = require('fs');
const path = require('path');

// 需要清理的文件模式
const cleanPatterns = [
    '**/*.backup',
    '**/*.tmp',
    '**/*.temp',
    '**/node_modules/.cache',
    '**/.DS_Store',
    '**/Thumbs.db'
];

// 需要清理的目录
const cleanDirectories = [
    'dist',
    'build',
    '.cache',
    '.temp'
];

// 递归删除目录
function removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach(file => {
            const filePath = path.join(dirPath, file);
            if (fs.lstatSync(filePath).isDirectory()) {
                removeDirectory(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        });
        fs.rmdirSync(dirPath);
        console.log(`🗑️  删除目录: ${dirPath}`);
    }
}

// 递归查找并删除匹配的文件
function cleanFiles(dir, pattern) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    let cleanedCount = 0;
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);
        
        if (stat.isDirectory()) {
            cleanedCount += cleanFiles(filePath, pattern);
        } else if (file.match(pattern)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️  删除文件: ${filePath}`);
            cleanedCount++;
        }
    });
    
    return cleanedCount;
}

// 主清理函数
function clean() {
    console.log('🧹 开始清理项目...');
    
    let totalCleaned = 0;
    
    // 清理目录
    cleanDirectories.forEach(dir => {
        const dirPath = path.join(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
            removeDirectory(dirPath);
            totalCleaned++;
        }
    });
    
    // 清理文件
    const filePatterns = [
        /\.backup$/,
        /\.tmp$/,
        /\.temp$/,
        /\.DS_Store$/,
        /Thumbs\.db$/
    ];
    
    filePatterns.forEach(pattern => {
        totalCleaned += cleanFiles(process.cwd(), pattern);
    });
    
    // 恢复压缩的文件
    console.log('\n🔄 恢复压缩的文件...');
    
    // 恢复CSS文件
    const cssDir = path.join(process.cwd(), 'src/css');
    if (fs.existsSync(cssDir)) {
        const cssFiles = fs.readdirSync(cssDir);
        cssFiles.forEach(file => {
            if (file.endsWith('.css.backup')) {
                const backupPath = path.join(cssDir, file);
                const originalPath = backupPath.replace('.backup', '');
                const content = fs.readFileSync(backupPath, 'utf8');
                
                fs.writeFileSync(originalPath, content);
                fs.unlinkSync(backupPath);
                
                console.log(`✅ 恢复CSS: ${file.replace('.backup', '')}`);
                totalCleaned++;
            }
        });
    }
    
    // 恢复JS文件
    const jsDir = path.join(process.cwd(), 'src/js');
    if (fs.existsSync(jsDir)) {
        const jsFiles = fs.readdirSync(jsDir);
        jsFiles.forEach(file => {
            if (file.endsWith('.js.backup')) {
                const backupPath = path.join(jsDir, file);
                const originalPath = backupPath.replace('.backup', '');
                const content = fs.readFileSync(backupPath, 'utf8');
                
                fs.writeFileSync(originalPath, content);
                fs.unlinkSync(backupPath);
                
                console.log(`✅ 恢复JS: ${file.replace('.backup', '')}`);
                totalCleaned++;
            }
        });
    }
    
    console.log(`\n✨ 清理完成！处理了 ${totalCleaned} 个项目`);
}

// 检查是否有确认参数
const args = process.argv.slice(2);
if (args.includes('--force') || args.includes('-f')) {
    clean();
} else {
    console.log('🧹 项目清理工具');
    console.log('');
    console.log('此操作将删除以下内容:');
    console.log('- 备份文件 (*.backup)');
    console.log('- 临时文件 (*.tmp, *.temp)');
    console.log('- 系统文件 (.DS_Store, Thumbs.db)');
    console.log('- 构建目录 (dist, build, .cache)');
    console.log('- 恢复压缩前的原始文件');
    console.log('');
    console.log('使用 --force 或 -f 参数直接执行清理');
    console.log('例如: node scripts/clean.js --force');
}
