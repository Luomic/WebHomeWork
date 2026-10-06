
export interface GrokSnapshot {
  state: string
  mode: string
  shape: string
  color: string
  scheme: string
  eyeFrom: number
  eyeTo: number
  spin: number
  tx: number
  ty: number
  squash: number
  blink: number
  overlay: string | null
}

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

export interface GrokStateGroup {
  label: string
  states: GrokStateId[]
}

export type GrokMode = 'onboarding' | 'hold'

export type GrokScheme = 'light' | 'dark' | 'inherit'
