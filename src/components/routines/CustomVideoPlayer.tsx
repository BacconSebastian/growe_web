"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";

interface CustomVideoPlayerProps {
  /**
   * URLs candidatas reproducibles con <video>, en orden de preferencia.
   * Si una falla (error de media), prueba la siguiente; si todas fallan, llama onAllFailed.
   */
  sources: string[];
  poster?: string | null;
  /** Se llama cuando ninguna fuente pudo reproducirse. */
  onAllFailed?: () => void;
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, "0")}`;
}

// ─── Botón de control ──────────────────────────────────────────────────────────

const CtrlBtn: React.FC<{
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}> = ({ onClick, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-opacity hover:opacity-80"
    style={{ background: "var(--overlay-play-bg)" }}
  >
    {children}
  </button>
);

/**
 * CustomVideoPlayer — reproductor con controles propios (como mobile):
 * play/pausa central, ±5s, barra de progreso, tiempo, mute y fullscreen.
 * Los controles se auto-ocultan a los 3s mientras reproduce.
 *
 * Solo para videos subidos (cdnUrl). Los videos externos (YouTube/Drive/TikTok)
 * usan el player del proveedor vía iframe (igual que mobile).
 */
export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  sources,
  poster,
  onAllFailed,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [srcIndex, setSrcIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Reiniciar al cambiar el set de fuentes
  useEffect(() => {
    setSrcIndex(0);
  }, [sources]);

  const handleError = useCallback(() => {
    setSrcIndex((idx) => {
      if (idx < sources.length - 1) return idx + 1;
      onAllFailed?.();
      return idx;
    });
  }, [sources.length, onAllFailed]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setControlsVisible(false);
    }, 3000);
  }, []);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
    showControls();
  }, [showControls]);

  const seekBy = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      const dur = isFinite(v.duration) ? v.duration : v.currentTime + delta;
      v.currentTime = Math.max(0, Math.min(dur, v.currentTime + delta));
      showControls();
    },
    [showControls]
  );

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.currentTime = val;
    setCurrent(val);
    showControls();
  };

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    showControls();
  }, [showControls]);

  const goFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen?.();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ background: "var(--video-bg)" }}
      onMouseMove={showControls}
      onMouseLeave={() => {
        const v = videoRef.current;
        if (v && !v.paused) setControlsVisible(false);
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        key={srcIndex}
        ref={videoRef}
        src={sources[srcIndex]}
        poster={poster ?? undefined}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onError={handleError}
        onPlay={() => {
          setPlaying(true);
          showControls();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
          if (hideTimer.current) clearTimeout(hideTimer.current);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
      />

      {/* Play central (cuando está pausado) */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproducir"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "var(--overlay-play-bg)" }}
          >
            <Play size={26} className="text-white" fill="white" style={{ marginLeft: 3 }} />
          </span>
        </button>
      )}

      {/* Barra de controles inferior */}
      <div
        className="absolute left-0 right-0 bottom-0 px-md pt-xxl pb-sm flex flex-col gap-xs transition-opacity duration-200"
        style={{
          background:
            "linear-gradient(to top, var(--overlay-label-bg), transparent)",
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? "auto" : "none",
        }}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={onScrub}
          aria-label="Progreso del video"
          className="w-full h-1 cursor-pointer"
          style={{ accentColor: "var(--primary)" }}
        />
        <div className="flex items-center gap-sm">
          <CtrlBtn onClick={() => seekBy(-5)} label="Retroceder 5 segundos">
            <RotateCcw size={16} />
          </CtrlBtn>
          <CtrlBtn onClick={togglePlay} label={playing ? "Pausar" : "Reproducir"}>
            {playing ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
          </CtrlBtn>
          <CtrlBtn onClick={() => seekBy(5)} label="Adelantar 5 segundos">
            <RotateCw size={16} />
          </CtrlBtn>
          <span
            className="text-xs tabular-nums ml-xs"
            style={{ color: "var(--overlay-label-fg)" }}
          >
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <div className="flex-1" />
          <CtrlBtn onClick={toggleMute} label={muted ? "Activar sonido" : "Silenciar"}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </CtrlBtn>
          <CtrlBtn onClick={goFullscreen} label="Pantalla completa">
            <Maximize size={16} />
          </CtrlBtn>
        </div>
      </div>
    </div>
  );
};
