type YoutubePlayerInstance = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  getVolume: () => number
  setVolume: (volume: number) => void
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  destroy: () => void
  loadVideoById: (videoId: string) => void
}

type YoutubeApi = {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId?: string
      width?: string | number
      height?: string | number
      host?: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (event: { target: YoutubePlayerInstance }) => void
        onStateChange?: (event: { data: number; target: YoutubePlayerInstance }) => void
        onError?: () => void
      }
    },
  ) => YoutubePlayerInstance
  PlayerState: {
    UNSTARTED: number
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

declare global {
  interface Window {
    YT?: YoutubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YoutubeApi> | null = null

export function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('YouTube API missing'))
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-yt-iframe-api]')
    if (existing) return
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.dataset.ytIframeApi = 'true'
    script.onerror = () => reject(new Error('YouTube API failed'))
    document.head.appendChild(script)
  })

  return apiPromise
}

export type { YoutubePlayerInstance }
