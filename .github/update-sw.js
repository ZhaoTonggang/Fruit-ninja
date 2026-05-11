#!/usr/bin/env node

'use strict';
const fs = require('fs'),
	path = require('path'),
	// 项目根目录
	ROOT_DIR = __dirname + '/..',
	// 需要排除的目录和文件
	EXCLUDE_PATHS = [
		'.git',
		'.github',
		'sw.js',
		'images/screenshots'
	],
	// 允许的文件扩展名
	ALLOWED_EXTENSIONS = [
		'.html',
		'.css',
		'.js',
		'.json',
		'.ico',
		'.jpg',
		'.png',
		'.gif',
		'.mp3',
		'.ogg',
		'.xml'
	],
	// 扫描目录收集文件
	scanDirectory = (dir, basePath = '') => {
		const files = [],
			items = fs.readdirSync(dir);
		for (const item of items) {
			const fullPath = path.join(dir, item),
				relativePath = path.join(basePath, item).replace(/\\/g, '/'),
				// 检查是否需要排除
				shouldExclude = EXCLUDE_PATHS.some(exclude =>
					relativePath.includes(exclude)
				);
			if (shouldExclude) continue;
			const stat = fs.statSync(fullPath);

			if (stat.isDirectory()) {
				files.push(...scanDirectory(fullPath, relativePath));
			} else {
				const ext = path.extname(item).toLowerCase();
				if (ALLOWED_EXTENSIONS.includes(ext)) {
					files.push('./' + relativePath);
				}
			}
		}
		return files;
	};
// 主函数
try {
	console.log('🔍 扫描项目文件...');
	// 扫描并收集文件
	const files = scanDirectory(ROOT_DIR);
	// 添加根路径
	if (!files.includes('./')) files.unshift('./');
	// 排序文件（保持顺序一致性）
	files.sort((a, b) => a.localeCompare(b));
	console.log(`✅ 找到 ${files.length} 个文件需要缓存`);
	// 生成新的版本号（Unix 时间戳）
	const newVersion = Math.floor(Date.now() / 1000).toString();
	console.log(`📦 新版本号: ${newVersion}`);
	// 读取现有的 sw.js
	const swPath = path.join(ROOT_DIR, 'sw.js');
	let swContent = fs.readFileSync(swPath, 'utf8');
	// 更新版本号
	swContent = swContent.replace(
		/const Ver = .*?,/,
		`const Ver = ${newVersion},`
	);
	// 更新资源列表 - 找到 addAll 数组并替换
	// 匹配 addAll([...]) 部分
	const addAllRegex = /await \(\s*await\s+caches\.open\(Ver\)\s*\)\.addAll\(\s*\[([\s\S]*?)\]\s*\);/,
		match = swContent.match(addAllRegex);
	if (match) {
		// 生成新的资源列表字符串
		const resourcesStr = files.map(file => `\t\t\t'${file}'`).join(',\n'),
			newAddAll = `await (await caches.open(Ver)).addAll([\n${resourcesStr}\n\t\t]);`;
		swContent = swContent.replace(addAllRegex, newAddAll);
	}
	// 写回 sw.js
	fs.writeFileSync(swPath, swContent, 'utf8');
	console.log('✅ sw.js 已更新');
	// 设置输出供 GitHub Actions 使用
	if (process.env.GITHUB_OUTPUT) {
		fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${newVersion}\n`);
		fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=true\n`);
	}
} catch (error) {
	console.error('❌ 更新失败:', error);
	process.exit(1);
}