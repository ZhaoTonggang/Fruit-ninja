'use strict';
// 版本
const Ver = 1778841419,
	cName = 'PWA-',
	postMess = (type, status) => {
		setTimeout(async () => {
			const clients = await self.clients.matchAll({
				includeUncontrolled: true,
				type: 'window'
			});
			clients.forEach(c => c.postMessage({
				type,
				status,
				version: Ver
			}));
		}, 1000);
	};
// 安装：缓存资源 + 立即激活
self.addEventListener('install', e => {
	e.waitUntil((async () => {
		try {
			// 打开缓存并缓存所有资源
			await (await caches.open(cName + Ver)).addAll([
				'./',
				'./404.html',
				'./css/index.css',
				'./favicon.ico',
				'./images/background.jpg',
				'./images/blank.gif',
				'./images/cursor.png',
				'./images/developing.png',
				'./images/dojo.png',
				'./images/flash.png',
				'./images/fruit/apple-1.png',
				'./images/fruit/apple-2.png',
				'./images/fruit/apple.png',
				'./images/fruit/banana-1.png',
				'./images/fruit/banana-2.png',
				'./images/fruit/banana.png',
				'./images/fruit/basaha-1.png',
				'./images/fruit/basaha-2.png',
				'./images/fruit/basaha.png',
				'./images/fruit/boom.png',
				'./images/fruit/peach-1.png',
				'./images/fruit/peach-2.png',
				'./images/fruit/peach.png',
				'./images/fruit/sandia-1.png',
				'./images/fruit/sandia-2.png',
				'./images/fruit/sandia.png',
				'./images/game-over.png',
				'./images/home-desc.png',
				'./images/home-mask.png',
				'./images/icons/144.png',
				'./images/icons/192.png',
				'./images/icons/48.png',
				'./images/icons/512.png',
				'./images/icons/72.png',
				'./images/icons/96.png',
				'./images/icons/apple-1024.png',
				'./images/icons/apple-144.png',
				'./images/icons/apple-180.png',
				'./images/icons/apple-192.png',
				'./images/icons/apple-512.png',
				'./images/icons/apple-72.png',
				'./images/logo.png',
				'./images/lose.png',
				'./images/new-game.png',
				'./images/new.png',
				'./images/ninja.png',
				'./images/quit.png',
				'./images/score.png',
				'./images/sgrz.png',
				'./images/shadow.png',
				'./images/smoke.png',
				'./images/x.png',
				'./images/xf.png',
				'./images/xx.png',
				'./images/xxf.png',
				'./images/xxx.png',
				'./images/xxxf.png',
				'./index.html',
				'./manifest.json',
				'./scripts/all.js',
				'./sound/boom.mp3',
				'./sound/boom.ogg',
				'./sound/menu.mp3',
				'./sound/menu.ogg',
				'./sound/over.mp3',
				'./sound/over.ogg',
				'./sound/splatter.mp3',
				'./sound/splatter.ogg',
				'./sound/start.mp3',
				'./sound/start.ogg',
				'./sound/throw.mp3',
				'./sound/throw.ogg'
			]);
			// 跳过等待，直接激活新SW
			await self.skipWaiting();
		} catch (error) {
			console.error('❌ SW安装失败:', error);
			// 安装失败时重新抛出错误
			throw error;
		}
	})());
});
// 激活：删除旧缓存 + 控制页面 + 发送更新消息
self.addEventListener('activate', e => {
	e.waitUntil((async () => {
		try {
			// 删除非当前版本的缓存
			await Promise.all((await caches.keys()).filter(n => n.startsWith(cName) && n !==
				cName + Ver).map(n => caches.delete(n)));
			// 立即控制所有页面
			await self.clients.claim();
			// 向页面发送缓存更新消息
			(await self.clients.matchAll({
				includeUncontrolled: 1,
				type: 'window'
			}))
			.forEach(c => c.postMessage({
				type: 'CACHE_UPDATED',
				version: Ver
			}));
		} catch (error) {
			console.error('❌ SW激活失败:', error);
			throw error;
		}
	})());
});
// 接收页面消息：触发SKIP_WAITING更新
self.addEventListener('message', e => e.data === 'SKIP_WAITING' && e.waitUntil(self.skipWaiting()));
// 拦截请求：缓存优先 + 离线支持 + 状态通知
self.addEventListener('fetch', e => {
	const req = e.request;
	// 只处理 GET 请求且只处理 HTTP/HTTPS 协议
	if (req.headers.has('Range') || req.method !== 'GET' || !req.url.startsWith('http')) return;
	// 判断是否为HTML页面请求
	const accept = req.headers.get('accept'),
		isHTML = req.destination === 'document' || (accept && accept.includes('text/html')),
		resData = {
			status: 503,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8'
			}
		};
	e.respondWith((async () => {
		try {
			// 读取缓存
			const cacheRes = await caches.match(req, {
				ignoreSearch: true
			});
			if (cacheRes) {
				// HTML请求：延迟发送缓存命中消息
				if (isHTML) await postMess('CACHE_STATUS', 'HIT');
				return cacheRes;
			}
			// HTML请求：延迟发送缓存未命中消息
			if (isHTML) await postMess('CACHE_STATUS', 'MISS');
			// 缓存未命中，请求网络
			const networkRes = await fetch(req);
			// 提前克隆响应，避免body重复使用
			const cloneRes = networkRes.clone();
			// 异步缓存资源，只缓存 HTTP/HTTPS 请求且有效响应
			if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') caches
				.open(cName + Ver).then(cache => cache.put(req, cloneRes));
			return networkRes;
		} catch (err) {
			// 网络异常：离线模式处理
			if (isHTML) {
				// 发送离线状态消息
				await postMess('CACHE_STATUS', 'OFFLINE');
				// 返回离线页面
				return await caches.match('./index.html') ?? new Response(
					'离线模式：无法加载页面', resData);
			}
			// 非HTML请求返回网络错误
			return new Response('Network error', resData);
		}
	})());
});