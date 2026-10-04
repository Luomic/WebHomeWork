// 让 TypeScript 认识 Vite 提供的特殊类型（比如 import.meta.env、静态资源导入的类型）
/// <reference types="vite/client" />

// 自定义 import.meta.env 的类型声明：告诉 TS 环境变量里有哪些键、是什么类型
interface ImportMetaEnv {
  /** 高德 Web JS API 的浏览器端 Key；请在控制台限制可用域名。 */
  // readonly：只读，防止代码里不小心改它；?：表示这个变量可能没配置（undefined）
  readonly VITE_AMAP_KEY?: string
  /** Vaptcha V4 注册验证单元配置。 */
  readonly VITE_VAPTCHA_VID?: string
  readonly VITE_VAPTCHA_VKEY?: string
}

// 给 import.meta 这个对象本身声明类型，把上面的环境变量表挂上去
interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  vaptcha?: unknown
}
