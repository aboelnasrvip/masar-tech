import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { cx } from '@/lib/cx'
import { loadYoutubeApi, type YoutubePlayerInstance } from '@/lib/youtube-api'
import type { SecurityEventType } from '@/lib/lesson-security'
import type { WatermarkPosition } from '@/types/models'

type Props = {
  videoId: string
  title?: string
  watermarkText?: string | null
  watermarkPosition?: WatermarkPosition
  startAt?: number
  onProgress?: (seconds: number, duration: number) => void
  onAction?: (eventType: SecurityEventType, detail: string) => void
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function YouTubePlayer({
  videoId,
  title,
  watermarkText,
  watermarkPosition = 'moving',
  startAt = 0,
  onProgress,
  onAction,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YoutubePlayerInstance | null>(null)
  const seekingRef = useRef(false)
  const onActionRef = useRef(onAction)
  const onProgressRef = useRef(onProgress)
  const startAtRef = useRef(startAt)
  onActionRef.current = onAction
  onProgressRef.current = onProgress
  startAtRef.current = startAt
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [failed, setFailed] = useState(false)

  const sync = useCallback(() => {
    const player = playerRef.current
    if (!player || seekingRef.current) return
    try {
      setCurrent(player.getCurrentTime() || 0)
      setDuration(player.getDuration() || 0)
      setMuted(player.isMuted())
      setVolume(player.getVolume())
    } catch {
      /* player not ready */
    }
  }, [])

  useEffect(() => {
    const wrapper = hostRef.current
    if (!wrapper || !videoId) return
    let cancelled = false
    let player: YoutubePlayerInstance | null = null
    const mount = document.createElement('div')
    mount.style.width = '100%'
    mount.style.height = '100%'
    wrapper.replaceChildren(mount)
    setFailed(false)
    setPlaying(false)
    setCurrent(0)

    void loadYoutubeApi()
      .then((YT) => {
        if (cancelled || !mount.isConnected) return
        player = new YT.Player(mount, {
          videoId,
          width: '100%',
          height: '100%',
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            controls: '0',
            disablekb: '1',
            fs: '0',
            modestbranding: '1',
            rel: '0',
            iv_load_policy: '3',
            cc_load_policy: '0',
            playsinline: '1',
            showinfo: '0',
            enablejsapi: '1',
            origin: window.location.origin,
            widget_referrer: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return
              playerRef.current = event.target
              event.target.setVolume(80)
              const resumeAt = startAtRef.current
              if (resumeAt > 1) {
                event.target.seekTo(resumeAt, true)
                setCurrent(resumeAt)
              }
              setDuration(event.target.getDuration() || 0)
              setReady(true)
            },
            onStateChange: (event) => {
              const playingNow = event.data === YT.PlayerState.PLAYING
              setPlaying(playingNow)
              if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) sync()
              try {
                const seconds = event.target.getCurrentTime() || 0
                const durationNow = event.target.getDuration() || 0
                const at = formatTime(seconds)
                if (event.data === YT.PlayerState.PLAYING) onActionRef.current?.('video_play', `شغّل الفيديو عند ${at}`)
                if (event.data === YT.PlayerState.PAUSED) {
                  onActionRef.current?.('video_pause', `وقّف الفيديو عند ${at}`)
                  onProgressRef.current?.(seconds, durationNow)
                }
              } catch {
                /* ignore */
              }
            },
            onError: () => setFailed(true),
          },
        })
        playerRef.current = player
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      playerRef.current = null
      setReady(false)
      try {
        player?.destroy()
      } catch {
        /* already gone */
      }
      wrapper.replaceChildren()
    }
  }, [sync, videoId])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(sync, 250)
    return () => window.clearInterval(timer)
  }, [playing, sync])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const player = playerRef.current
      if (!player) return
      try {
        onProgressRef.current?.(player.getCurrentTime() || 0, player.getDuration() || 0)
      } catch {
        /* player gone */
      }
    }, 8000)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => {
    return () => {
      const player = playerRef.current
      if (!player) return
      try {
        onProgressRef.current?.(player.getCurrentTime() || 0, player.getDuration() || 0)
      } catch {
        /* already destroyed */
      }
    }
  }, [videoId])

  useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => document.removeEventListener('fullscreenchange', onFullscreen)
  }, [])

  function togglePlay() {
    const player = playerRef.current
    if (!player) return
    if (playing) player.pauseVideo()
    else player.playVideo()
  }

  function onSeek(value: number) {
    const player = playerRef.current
    if (!player) return
    player.seekTo(value, true)
    setCurrent(value)
    onActionRef.current?.('video_seek', `حرّك الفيديو إلى ${formatTime(value)}`)
  }

  function toggleMute() {
    const player = playerRef.current
    if (!player) return
    if (player.isMuted()) {
      player.unMute()
      setMuted(false)
      onActionRef.current?.('video_mute', 'شغّل الصوت')
    } else {
      player.mute()
      setMuted(true)
      onActionRef.current?.('video_mute', 'كتم الصوت')
    }
  }

  async function toggleFullscreen() {
    const root = rootRef.current
    if (!root) return
    if (document.fullscreenElement === root) {
      await document.exitFullscreen()
      onActionRef.current?.('video_fullscreen', 'خرج من ملء الشاشة')
    } else {
      await root.requestFullscreen()
      onActionRef.current?.('video_fullscreen', 'دخل ملء الشاشة')
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === ' ' || event.key === 'k') {
      event.preventDefault()
      togglePlay()
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onSeek(Math.min(duration, current + 5))
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onSeek(Math.max(0, current - 5))
    }
    if (event.key === 'm') {
      event.preventDefault()
      toggleMute()
    }
    if (event.key === 'f') {
      event.preventDefault()
      void toggleFullscreen()
    }
  }

  return (
    <div
      ref={rootRef}
      className="yt-lesson-player neuro-pressed relative overflow-hidden rounded-3xl"
      dir="ltr"
      tabIndex={0}
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onKeyDown={onKeyDown}
    >
      <div className="relative aspect-video bg-black">
        <div ref={hostRef} className="yt-crop absolute inset-0 h-full w-full overflow-hidden" />

        <button
          type="button"
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label={playing ? 'إيقاف الدرس' : 'تشغيل الدرس'}
          onClick={togglePlay}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-14 bg-black" />
        <div className="pointer-events-none absolute top-3 right-3 z-20 rounded-xl bg-black px-3 py-1 text-xs font-bold text-white">
          Go Tech
        </div>

        {!playing ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/55">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--neuro-accent)] text-[var(--neuro-on-accent)]">
              <Play className="-mr-0.5 h-7 w-7" />
            </span>
            {title ? <p className="max-w-[80%] text-center text-sm font-bold text-white">{title}</p> : null}
          </div>
        ) : null}

        {watermarkText ? (
          <div
            className={cx(
              'pointer-events-none z-21 max-w-[58%] rounded-md bg-black/20 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/45',
              watermarkPosition === 'moving' ? 'yt-watermark-moving absolute' : 'absolute',
              watermarkPosition === 'top-left' && 'top-16 left-4',
              watermarkPosition === 'top-right' && 'top-16 right-4',
              watermarkPosition === 'bottom-left' && 'bottom-24 left-4',
              watermarkPosition === 'bottom-right' && 'bottom-24 right-4',
            )}
            style={
              watermarkPosition === 'moving'
                ? { animationDelay: `-${Math.abs(watermarkText.length * 3) % 18}s` }
                : undefined
            }
          >
            {watermarkText}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-30 space-y-2 bg-black px-4 pt-3 pb-3">
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.1}
            value={Math.min(current, duration || 0)}
            className="h-1 w-full cursor-pointer accent-teal-400"
            aria-label="تقدم الدرس"
            onPointerDown={() => {
              seekingRef.current = true
            }}
            onPointerUp={() => {
              seekingRef.current = false
            }}
            onChange={(event) => onSeek(Number(event.target.value))}
          />
          <div className="flex items-center gap-2 text-white">
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl" onClick={togglePlay} aria-label={playing ? 'إيقاف' : 'تشغيل'}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <p className="min-w-24 text-xs font-semibold tabular-nums">
              {formatTime(current)} / {formatTime(duration)}
            </p>
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl" onClick={toggleMute} aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}>
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              className="h-1 w-24 cursor-pointer accent-teal-400"
              aria-label="الصوت"
              onChange={(event) => {
                const next = Number(event.target.value)
                setVolume(next)
                setMuted(next === 0)
                playerRef.current?.setVolume(next)
                if (next === 0) playerRef.current?.mute()
                else playerRef.current?.unMute()
              }}
            />
            <span className="flex-1" />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
            >
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {!ready && !failed ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 text-sm text-white">جاري تحميل الدرس...</div>
        ) : null}
        {failed ? (
          <div className={cx('absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6 text-center text-sm text-white')}>
            الفيديو مش متاح للتشغيل دلوقتي.
          </div>
        ) : null}
      </div>
    </div>
  )
}
