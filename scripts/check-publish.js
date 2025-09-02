#!/usr/bin/env node

/**
 * 发布状态检查脚本
 * 用于验证包是否成功发布到 npm
 */

const { execSync } = require('child_process');
const packageJson = require('../package.json');

const packageName = packageJson.name;
const currentVersion = packageJson.version;

console.log(`🔍 检查包: ${packageName}@${currentVersion}`);
console.log('=' .repeat(50));

try {
  // 检查包是否存在于 npm
  console.log('📦 检查 npm 上的包信息...');
  const npmInfo = execSync(`npm view ${packageName} --json`, { encoding: 'utf8' });
  const info = JSON.parse(npmInfo);
  
  console.log(`✅ 包名: ${info.name}`);
  console.log(`✅ 最新版本: ${info.version}`);
  console.log(`✅ 描述: ${info.description}`);
  console.log(`✅ 发布时间: ${info.time[info.version]}`);
  
  // 检查当前版本是否已发布
  if (info.version === currentVersion) {
    console.log(`\n🎉 当前版本 ${currentVersion} 已成功发布！`);
  } else {
    console.log(`\n⚠️  当前版本 ${currentVersion} 尚未发布`);
    console.log(`   npm 上的最新版本: ${info.version}`);
  }
  
  // 显示所有版本
  console.log('\n📋 所有已发布版本:');
  const versions = Object.keys(info.time)
    .filter(v => v !== 'created' && v !== 'modified')
    .sort((a, b) => new Date(info.time[b]) - new Date(info.time[a]))
    .slice(0, 10); // 只显示最近10个版本
    
  versions.forEach(version => {
    const publishTime = new Date(info.time[version]).toLocaleString('zh-CN');
    console.log(`   ${version} - ${publishTime}`);
  });
  
} catch (error) {
  if (error.message.includes('404')) {
    console.log(`❌ 包 ${packageName} 尚未发布到 npm`);
    console.log('\n💡 使用以下命令进行首次发布:');
    console.log(`   pnpm run publish:patch`);
  } else {
    console.error('❌ 检查失败:', error.message);
  }
}

console.log('\n🔗 有用的链接:');
console.log(`   npm 页面: https://www.npmjs.com/package/${packageName}`);
console.log(`   安装命令: npm install ${packageName}`);