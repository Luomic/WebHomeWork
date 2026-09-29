# 欢迎拷打喵

上云链接：[孤独市集](http://jhfair.shop/)

# 欢迎来到 孤独市集

和所有的烦恼说拜拜，
在孤独市集，获得专属于你的体验。

## 本地环境配置

首次配置、且还没有 `.env.local` 时，复制 `.env.example` 为 `.env.local`，再填入高德 Web JS API 的浏览器 Key。已有 `.env.local` 时直接修改，不要用空白示例覆盖：

```powershell
Copy-Item .env.example .env.local
```

配置说明：

- `VITE_AMAP_KEY`：高德 JS API 的 Key，开发和生产构建都需要填写。未填写时地图区域显示配置提示。
- `AMAP_SECURITY_CODE`：推荐用于本地开发，填写与上述 Key 配套的安全密钥。Vite 的 Node 代理向高德请求时添加 `jscode`，不将它暴露给浏览器或编译进 `dist`。配置后优先直连高德，不再经 `AMAP_PROXY_TARGET` 转发。修改后重启本地服务。
- `AMAP_PROXY_TARGET`：供 `npm run dev` 和 `npm run preview` 使用，填写已配置高德代理的网站源地址，不要附加 `/_AMapService`。当前项目网站在本页登记为 `http://jhfair.shop`；网站更换域名或启用 HTTPS 后，同步更新本地配置。本地 Vite 会保留请求路径，将 `/_AMapService/` 请求转交网站的 Nginx。修改后需要重启本地服务。
- 不使用 `VITE_AMAP_SECURITY_CODE`，请从原有环境配置中移除。安全密钥仅放在本地忽略提交的 `AMAP_SECURITY_CODE` 或生产服务器 Nginx 中；`VITE_*` 变量会被编译进浏览器。

本地开发和预览需要 `VITE_AMAP_KEY`，并在 `AMAP_SECURITY_CODE` 与 `AMAP_PROXY_TARGET` 两个方案中选择一个。备选转发方案要求目标网站代理可访问。示例文件使用空值，实际配置保存在不提交的 `.env.local` 中。之前出现在前端或示例文件里的安全密钥建议更换。

本地浏览器使用 `http://localhost:5173`（以 Vite 输出端口为准），点击定位时允许位置权限。局域网 HTTP 地址不具备安全上下文，不能用于精确定位。地点搜索与地图点选不需要浏览器定位权限。

排查请求失败：在浏览器网络面板筛选 `/_AMapService/`，检查响应内容，而不只看 HTTP 状态。地址服务应返回高德数据；若为 `text/html` 或网站首页，说明请求落入页面回退或其他中间页面。2026-09-28 排查时，当前 `http://jhfair.shop` 的逆地理编码代理返回 HTTP 200、`text/html`，不能作为正常地址服务使用。本地可先用 `AMAP_SECURITY_CODE` 方案；上传 `dist` 后仍需由主机修正代理，Vite 配置不会随静态文件在主机上执行。

本地运行使用 `npm run dev`；检查生产构建使用 `npm run build` 后再执行 `npm run preview`。生产构建会自动读取 `.env.local` 中的浏览器 Key，上传静态文件时不需要上传 `.env.local`。

## 高德代理配置（虚拟主机）

地图页面会在加载高德 JS API 前设置 `serviceHost` 为当前网站源地址加 `/_AMapService`。生产环境将 `npm run build` 生成的 `dist` 部署到网站，由网站同一 `server` 内的 Nginx 配置处理代理：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

# 样式服务使用单独的上游，支持地图样式请求。
location ^~ /_AMapService/v4/map/styles {
    set $args "$args&jscode=你的安全密钥";
    proxy_set_header Host webapi.amap.com;
    proxy_ssl_server_name on;
    proxy_pass https://webapi.amap.com/v4/map/styles;
}

location ^~ /_AMapService/ {
    set $args "$args&jscode=你的安全密钥";
    proxy_set_header Host restapi.amap.com;
    proxy_ssl_server_name on;
    proxy_pass https://restapi.amap.com/;
}
```

两个 `jscode` 占位值填写与 JS API Key 配套的安全密钥。在虚拟主机面板的网站 Nginx/伪静态配置中保存，并按面板要求使配置生效。若已有相同的 `location`，修改原有配置，不要重复添加。只修改本地项目不会自动修改主机配置。

前端只向同源的 `/_AMapService/` 发请求，主机负责添加 `jscode`；无需在浏览器中配置安全密钥。高德控制台的 Key 必须是 Web 端（JS API）类型，域名限制应覆盖实际访问的生产域名及需要的本地开发来源。定位还依赖浏览器权限和安全上下文，线上请使用 HTTPS，本地可通过 localhost 调试。

# 项目初衷

开发者是一个纯I人喵，只喜欢最纯粹的交易（我也要砍价吗...）。

虽然但是...本次开发交易是走的线下，线上邀约？（我要验牌）。

最初网站风格本来走`Material Design 3`，由于被拷打了也是放弃辣。

第二关其实是`玻璃`风格，但是本人css能力约等于一只成年香蕉，玻璃生态也不算完善（其实是没钱蹬辣），

这次的简约黑白风格也不差？？

一些组件其实是开发者从Github薅过来的，但是Vue移植比较麻烦就交给AI了（补药拷打窝）。

这次我希望会有一个非常丝滑的转场（router路由）

也希望这个项目能真正发光发热。。。

## 大概率放弃的功能>_<

- 私聊（维护成本比较高）
- 高校认证（希望后续补上）
- 关注/粉丝 （交易网站不需要这种hyw功能，喜欢就收藏！）

~~开发中~~ 已头秃...

# 待办事项

- ~~欢迎页面的流动式卡片~~
- ~~欢迎页面的 `Agent` 组件~~
- ~~欢迎页面的响应式布局~~
- 正式页面 `sliderDrawer`,`MainLayout`
- 登录/注册 页面
- `Hcaptcha`
- 首页布局
- dark/light mode
- `Search Bar`
- 邮箱验证码
- 地图接口（线下真实）
- 优化UI（敲重点）

# 已知问题

- ~~移动端可以左右滚动~~
- ~~主题无法在全屏显示~~

# 感谢以下开源项目
- [Vue 3](https://github.com/vuejs/)
- [犬仓丸丘 - Apache许可](https://mp.weixin.qq.com/s/WSUVkeDJXu5bYnNTltvpzA)
- [Grok-icon-study](https://github.com/blessonism/grok-icon-study)
- [Primevue](https://primevue.dev/)
- Tailwind CSS
