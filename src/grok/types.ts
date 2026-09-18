/**
 * Grok 角色引擎的对外类型。
 *
 * 引擎本体在 ./ 下的 .js 文件里（vendored，未做改写），这里只补上组件层用得到的类型，
 * 让 <GrokCharacter> 的 props / 事件 / 实例方法都有提示。
 */

/** 引擎每一帧对外播报的读数 */
export interface GrokSnapshot {
  state: string
  mode: string
  shape: string
  color: string
  scheme: string
  /** 当前眼球编号 */
  eyeFrom: number
  /** 正在形变过去的眼球编号 */
  eyeTo: number
  spin: number
  tx: number
  ty: number
  squash: number
  blink: number
  /** 当前覆盖层种类，没有则为 null */
  overlay: string | null
}

/** 39 个情绪 / 生命周期的状态名 */
export type GrokStateId =
  | 'sleeping'
  | 'waking'
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'working'
  | 'excited'
  | 'surprised'
  | 'suspicious'
  | 'angry'
  | 'drowsy'
  | 'happy'
  | 'curious'
  | 'confused'
  | 'bored'
  | 'proud'
  | 'shy'
  | 'sad'
  | 'laughing'
  | 'scared'
  | 'playful'
  | 'celebrate'
  | 'orbit'
  | 'radar'
  | 'progress'
  | 'spawning'
  | 'humming'
  | 'loading'
  | 'dictating'
  | 'writing'
  | 'sending'
  | 'receiving'
  | 'uploading'
  | 'notifying'
  | 'alerting'
  | 'dragging'
  | 'bouncing'
  | 'powering-down'

/** 18 种身形 */
export type GrokShapeId =
  | 'blob'
  | 'pebble'
  | 'bean'
  | 'egg'
  | 'squircle'
  | 'tablet'
  | 'capsule'
  | 'cylinder'
  | 'hex'
  | 'gem'
  | 'crystal'
  | 'wedge'
  | 'shield'
  | 'dome'
  | 'arch'
  | 'cloud'
  | 'teardrop'
  | 'leaf'

/** 11 色墨色 */
export type GrokColorId =
  | 'black'
  | 'brown'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'violet'
  | 'magenta'
  | 'gray'

/** 13 种覆盖层动画 */
export type GrokOverlayKind =
  | 'dots'
  | 'orbit'
  | 'radar'
  | 'progress'
  | 'gather'
  | 'wave'
  | 'send'
  | 'receive'
  | 'dock'
  | 'ball'
  | 'whirl'
  | 'pencil'
  | 'bang'
  | 'standby'

/** 状态分组（对应 GROK_META.groups，用于画选择面板） */
export interface GrokStateGroup {
  label: string
  states: GrokStateId[]
}

/** 组件的运行模式：登录页轮换 / 锁定在某个状态 */
export type GrokMode = 'onboarding' | 'hold'

/** 配色方案：决定 light-dark() 取哪一侧。inherit 表示跟随页面 */
export type GrokScheme = 'light' | 'dark' | 'inherit'
