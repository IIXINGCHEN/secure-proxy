#!/usr/bin/env node
/**
 * HTML验证脚本
 * 检查HTML文件的基本语法和结构
 */

const fs = require('fs');
const path = require('path');

// HTML验证规则
const validationRules = {
    // 必须包含的标签
    requiredTags: ['<!DOCTYPE html>', '<html', '<head>', '<body>', '</html>'],
    // 必须包含的meta标签
    requiredMeta: ['charset', 'viewport'],
    // 检查标签是否正确闭合
    checkClosingTags: true,
    // 检查属性引号
    checkQuotes: true
};

// 验证HTML文件
function validateHTML(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    const warnings = [];
    
    // 检查必需的标签
    validationRules.requiredTags.forEach(tag => {
        if (!content.includes(tag)) {
            errors.push(`缺少必需的标签: ${tag}`);
        }
    });
    
    // 检查必需的meta标签
    validationRules.requiredMeta.forEach(meta => {
        if (!content.includes(`name="${meta}"`) && !content.includes(`charset=`)) {
            warnings.push(`建议添加meta标签: ${meta}`);
        }
    });
    
    // 检查基本的标签闭合
    if (validationRules.checkClosingTags) {
        const openTags = content.match(/<[^\/][^>]*>/g) || [];
        const closeTags = content.match(/<\/[^>]*>/g) || [];
        
        // 简单检查（不完全准确，但足够基本验证）
        const selfClosingTags = ['meta', 'link', 'img', 'br', 'hr', 'input'];
        const filteredOpenTags = openTags.filter(tag => {
            const tagName = tag.match(/<(\w+)/);
            return tagName && !selfClosingTags.includes(tagName[1].toLowerCase());
        });
        
        if (filteredOpenTags.length !== closeTags.length) {
            warnings.push(`标签数量不匹配: ${filteredOpenTags.length} 个开始标签, ${closeTags.length} 个结束标签`);
        }
    }
    
    // 检查属性引号
    if (validationRules.checkQuotes) {
        const unquotedAttrs = content.match(/\w+=[^"'\s>]+/g);
        if (unquotedAttrs) {
            warnings.push(`发现未加引号的属性: ${unquotedAttrs.length} 个`);
        }
    }
    
    return { errors, warnings };
}

// 处理HTML文件
function processHTML() {
    const htmlFiles = ['index.html'];
    const pagesDir = path.join(process.cwd(), 'src/pages');
    
    // 添加pages目录中的HTML文件
    if (fs.existsSync(pagesDir)) {
        const pageFiles = fs.readdirSync(pagesDir)
            .filter(file => file.endsWith('.html'))
            .map(file => path.join('src/pages', file));
        htmlFiles.push(...pageFiles);
    }
    
    let totalErrors = 0;
    let totalWarnings = 0;
    
    htmlFiles.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        
        if (fs.existsSync(filePath)) {
            console.log(`\n🔍 验证文件: ${file}`);
            
            const result = validateHTML(filePath);
            
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
        } else {
            console.log(`❌ 文件不存在: ${file}`);
            totalErrors++;
        }
    });
    
    console.log(`\n📊 验证结果:`);
    console.log(`   总错误: ${totalErrors}`);
    console.log(`   总警告: ${totalWarnings}`);
    
    if (totalErrors > 0) {
        console.log('❌ HTML验证失败');
        process.exit(1);
    } else {
        console.log('✅ HTML验证通过');
    }
}

console.log('🔍 开始HTML验证...');
processHTML();
