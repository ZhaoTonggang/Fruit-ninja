const CACHE_NAME = 'fruit-ninja-v1',
	ASSETS_TO_CACHE = [
		'./',
		'./index.html',
		'./404.html',
		'./manifest.json',
		'./css/index.css',
		'./scripts/all.js',
		'./favicon.ico',
		'./sgrz.png',
		'./images/background.jpg',
		'./images/logo.png',
		'./images/dojo.png',
		'./images/new-game.png',
		'./images/quit.png',
		'./images/game-over.png',
		'./images/home-desc.png',
		'./images/home-mask.png',
		'./images/ninja.png',
		'./images/score.png',
		'./images/lose.png',
		'./images/developing.png',
		'./images/flash.png',
		'./images/shadow.png',
		'./images/smoke.png',
		'./images/x.png',
		'./images/xf.png',
		'./images/xx.png',
		'./images/xxf.png',
		'./images/xxx.png',
		'./images/xxxf.png',
		'./images/fruit/apple.png',
		'./images/fruit/apple-1.png',
		'./images/fruit/apple-2.png',
		'./images/fruit/banana.png',
		'./images/fruit/banana-1.png',
		'./images/fruit/banana-2.png',
		'./images/fruit/basaha.png',
		'./images/fruit/basaha-1.png',
		'./images/fruit/basaha-2.png',
		'./images/fruit/peach.png',
		'./images/fruit/peach-1.png',
		'./images/fruit/peach-2.png',
		'./images/fruit/sandia.png',
		'./images/fruit/sandia-1.png',
		'./images/fruit/sandia-2.png',
		'./images/fruit/boom.png',
		'./sound/menu.mp3',
		'./sound/menu.ogg',
		'./sound/start.mp3',
		'./sound/start.ogg',
		'./sound/throw.mp3',
		'./sound/throw.ogg',
		'./sound/boom.mp3',
		'./sound/boom.ogg',
		'./sound/over.mp3',
		'./sound/over.ogg',
		'./sound/splatter.mp3',
		'./sound/splatter.ogg'
	];
// 安装 Service Worker
self.addEventListener('install', event => {
	console.log('🚀 安装 Service Worker (版本:', CACHE_NAME);
	event.waitUntil(
		caches.open(CACHE_NAME)
		.then(cache => {
			console.log('📦 缓存资源');
			return cache.addAll(ASSETS_TO_CACHE);
		})
		.then(() => {
			console.log('⏩ 强制接管所有客户端');
			return self.skipWaiting();
		})
	);
});
// 激活 Service Worker
self.addEventListener('activate', event => {
	console.log('✨ 激活 Service Worker');
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.filter(cacheName => {
					return cacheName !== CACHE_NAME;
				}).map(cacheName => {
					console.log('🗑️ 删除旧缓存:', cacheName);
					return caches.delete(cacheName);
				})
			);
		}).then(() => {
			console.log('🔄 激活并控制所有打开的标签页');
			return self.clients.claim();
		}).then(() => {
			// 向所有客户端发送更新通知
			self.clients.matchAll().then(clients => {
				clients.forEach(client => {
					client.postMessage({
						type: 'CACHE_UPDATED',
						version: CACHE_NAME
					});
				});
			});
		})
	);
});
// 消息处理来自客户端的消息
self.addEventListener('message', event => {
	if (event.data === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});
// 网络请求拦截 - 缓存优先策略（同时更新策略）
self.addEventListener('fetch', event => {
	const isHTML = event.request.headers.get('accept') && event.request.headers.get('accept').includes(
		'text/html');
	event.respondWith(
		caches.match(event.request)
		.then(cachedResponse => {
			// 先返回缓存，同时在后台更新资源
			const fetchPromise = fetch(event.request)
				.then(response => {
					if (!response || response.status !== 200 || response.type !== 'basic') {
						return response;
					}
					const responseToCache = response.clone();
					caches.open(CACHE_NAME)
						.then(cache => {
							cache.put(event.request, responseToCache);
						});
					return response;
				})
				.catch(error => {
					console.log('❌ 请求失败:', error);
					// 如果是HTML请求，返回首页
					if (isHTML) {
						console.log('📴 离线模式');
						self.clients.matchAll().then(clients => {
							clients.forEach(client => {
								client.postMessage({
									type: 'CACHE_STATUS',
									status: 'OFFLINE',
									version: CACHE_NAME
								});
							});
						});
						return caches.match('./');
					}
				});
			if (cachedResponse) {
				if (isHTML) {
					console.log('✅ 缓存命中:', event.request.url);
					// 延迟发送通知，确保客户端已就绪
					setTimeout(() => {
						self.clients.matchAll().then(clients => {
							clients.forEach(client => {
								client.postMessage({
									type: 'CACHE_STATUS',
									status: 'HIT',
									url: event.request.url,
									version: CACHE_NAME
								});
							});
						});
					}, 1000);
				}
				return cachedResponse;
			}
			return fetchPromise;
		})
	);
});
// 定期检查更新（每小时）
setInterval(() => {
	self.registration.update()
		.then(reg => reg.update())
		.catch(err => console.log('🔄 检查更新:', err));
}, 60 * 60 * 1000);