'use client';

import { useState, useRef, useEffect } from 'react';
import { UltravoxSession, UltravoxSessionStatus, Transcript } from 'ultravox-client';

type CallState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing';

interface UserInfo {
  name: string;
  phone: string;
  email: string;
  organization: string;
}

const AUDIO_SOURCES = ['/shubh_tts_audio_second.mp3', '/shubh_tts_audio_second.mp3', '/shubh_tts_audio_second.mp3'];
const GAP_SECONDS = 10; // silence between tracks

export default function VoiceBot() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [statusMessage, setStatusMessage] = useState(
    "Have a conversation with a Transmonk voice agent. Ask anything about HVAC systems, and leave your info if you'd like the team to follow up."
  );
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [stats, setStats] = useState({ exchanges: 0, ragQueries: 0 });
  const [showTranscript, setShowTranscript] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    phone: '',
    email: '',
    organization: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Voice call refs ────────────────────────────────────────────────────────
  const sessionRef          = useRef<UltravoxSession | null>(null);
  const startTimeRef        = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef           = useRef<HTMLCanvasElement | null>(null);
  const animationRef        = useRef<number | null>(null);

  // ── Audio: 3 individual refs (hooks must NOT be inside arrays) ─────────────
  const audio0 = useRef<HTMLAudioElement | null>(null);
  const audio1 = useRef<HTMLAudioElement | null>(null);
  const audio2 = useRef<HTMLAudioElement | null>(null);
  const audioRefs = [audio0, audio1, audio2];

  const audioActiveRef  = useRef<boolean>(false);
  const gapTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedHandlerRef = useRef<(() => void) | null>(null);

  // ── Audio helpers ──────────────────────────────────────────────────────────

  const clearAudioTimers = () => {
    if (gapTimerRef.current)    { clearTimeout(gapTimerRef.current);    gapTimerRef.current    = null; }
    if (gapIntervalRef.current) { clearInterval(gapIntervalRef.current); gapIntervalRef.current = null; }
  };

  const stopAllTracks = () => {
    audioRefs.forEach(r => {
      const el = r.current;
      if (!el) return;
      if (endedHandlerRef.current) el.removeEventListener('ended', endedHandlerRef.current);
      el.pause();
      el.currentTime = 0;
    });
    endedHandlerRef.current = null;
  };

  const runGap = (onDone: () => void) => {
    clearAudioTimers();
    gapIntervalRef.current = setInterval(() => {}, 1000);
    gapTimerRef.current = setTimeout(() => {
      clearAudioTimers();
      onDone();
    }, GAP_SECONDS * 1000);
  };

  const playTrackAt = (idx: number) => {
    if (!audioActiveRef.current) return;
    stopAllTracks();
    const audio = audioRefs[idx].current;
    if (!audio) return;
    const handleEnded = () => {
      if (!audioActiveRef.current) return;
      const nextIdx = (idx + 1) % AUDIO_SOURCES.length;
      runGap(() => playTrackAt(nextIdx));
    };
    endedHandlerRef.current = handleEnded;
    audio.addEventListener('ended', handleEnded, { once: true });
    audio.play().catch(err => console.warn('Audio autoplay blocked:', err));
  };

  /** Start loop from track 0. Safe to call multiple times. */
  const playAudioLoop = () => {
    audioActiveRef.current = true;
    clearAudioTimers();
    playTrackAt(0);
  };

  /** Stop everything immediately. */
  const stopAudioLoop = () => {
    audioActiveRef.current = false;
    clearAudioTimers();
    stopAllTracks();
  };

  // Start audio loop on mount; stop on unmount
  useEffect(() => {
    playAudioLoop();
    return () => stopAudioLoop();
  }, []);

  // ── Canvas wave animation ──────────────────────────────────────────────────
  const isActive     = callState !== 'idle';
  const isAISpeaking = callState === 'speaking';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;

    const waves = [
      { color: '#c026d3', alpha: 0.7, speed: 0.018, amplitude: 0.38, freq: 2.2, phase: 0 },
      { color: '#e879f9', alpha: 0.5, speed: 0.022, amplitude: 0.28, freq: 3.1, phase: 1.2 },
      { color: '#67e8f9', alpha: 0.6, speed: 0.015, amplitude: 0.35, freq: 2.6, phase: 2.5 },
      { color: '#22d3ee', alpha: 0.45, speed: 0.020, amplitude: 0.22, freq: 4.0, phase: 0.8 },
      { color: '#a5f3fc', alpha: 0.35, speed: 0.012, amplitude: 0.18, freq: 1.8, phase: 3.1 },
    ];

    const draw = () => {
      const w = W();
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      const centerY = h / 2;

      waves.forEach((wave, i) => {
        if (isAISpeaking) wave.phase += wave.speed;
        ctx.beginPath();
        const amplitude = isAISpeaking
          ? centerY * wave.amplitude * (0.8 + 0.2 * Math.sin(wave.phase * 0.7 + i))
          : 0;

        for (let x = 0; x <= w; x += 2) {
          const t        = (x / w) * Math.PI * 2 * wave.freq + wave.phase;
          const envelope = Math.sin((x / w) * Math.PI);
          const y        = centerY + Math.sin(t) * amplitude * envelope;
          if (x === 0) ctx.moveTo(x, y);
          else         ctx.lineTo(x, y);
        }

        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0,    'transparent');
        gradient.addColorStop(0.15, wave.color);
        gradient.addColorStop(0.5,  wave.color);
        gradient.addColorStop(0.85, wave.color);
        gradient.addColorStop(1,    'transparent');

        ctx.strokeStyle = gradient;
        ctx.globalAlpha = isAISpeaking ? wave.alpha : 0;
        ctx.lineWidth   = 2.5;
        ctx.shadowBlur  = isAISpeaking ? 18 : 0;
        ctx.shadowColor = wave.color;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
      });

      // Baseline
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(W(), centerY);
      const baseGrad = ctx.createLinearGradient(0, 0, W(), 0);
      baseGrad.addColorStop(0,   'transparent');
      baseGrad.addColorStop(0.1, 'rgba(255,255,255,0.15)');
      baseGrad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
      baseGrad.addColorStop(0.9, 'rgba(255,255,255,0.15)');
      baseGrad.addColorStop(1,   'transparent');
      ctx.strokeStyle = baseGrad;
      ctx.globalAlpha = 1;
      ctx.lineWidth   = 1;
      ctx.shadowBlur  = 0;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAISpeaking]);

  // ── Ultravox session ───────────────────────────────────────────────────────
  useEffect(() => {
    sessionRef.current = new UltravoxSession();

    const handleStatusChange = () => {
      const status = sessionRef.current?.status;
      switch (status) {
        case UltravoxSessionStatus.DISCONNECTED:
          updateState(
            'idle',
            "Have a conversation with a Transmonk voice agent. Ask anything about HVAC systems, and leave your info if you'd like the team to follow up."
          );
          cleanup();
          // Restart audio only when form is also not open
          setShowFormModal(prev => {
            if (!prev) playAudioLoop();
            return prev;
          });
          break;
        case UltravoxSessionStatus.CONNECTING: updateState('connecting', 'Connecting...');          break;
        case UltravoxSessionStatus.IDLE:       updateState('listening',  'Ready! Start speaking...'); break;
        case UltravoxSessionStatus.LISTENING:  updateState('listening',  'Listening...');           break;
        case UltravoxSessionStatus.THINKING:   updateState('processing', 'Thinking...');            break;
        case UltravoxSessionStatus.SPEAKING:   updateState('speaking',   '');                       break;
      }
    };

    const handleTranscripts = () => {
      const current = sessionRef.current?.transcripts || [];
      setTranscripts(current);
      setStats(prev => ({ ...prev, exchanges: current.filter(t => t.speaker === 'user').length }));
      // Update subtitle (no auto-fill of form)
      const lastAgent = [...current].reverse().find(t => t.speaker === 'agent');
      if (lastAgent) setStatusMessage(lastAgent.text);
    };

    sessionRef.current.addEventListener('status',      handleStatusChange);
    sessionRef.current.addEventListener('transcripts', handleTranscripts);

    return () => {
      if (sessionRef.current) {
        sessionRef.current.removeEventListener('status',      handleStatusChange);
        sessionRef.current.removeEventListener('transcripts', handleTranscripts);
        sessionRef.current.leaveCall();
      }
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  // ── Utility functions ──────────────────────────────────────────────────────

  const updateState = (state: CallState, message: string) => {
    setCallState(state);
    setStatusMessage(message);
  };

  const startDurationTimer = () => {
    startTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null; }
  };

  const cleanup = () => {
    stopDurationTimer();
    setCallDuration(0);
    setTranscripts([]);
    setStats({ exchanges: 0, ragQueries: 0 });
  };

  // ── Call controls ──────────────────────────────────────────────────────────

  const handleToggleCall = async () => {
    if (isActive) {
      // End the running call; audio stays off
      await endCall();
    } else {
      // 1. Stop background audio immediately
      stopAudioLoop();
      // 2. Open the info-collection form
      setShowFormModal(true);
      // 3. Start the call simultaneously in the background (non-blocking)
      startCall();
    }
  };

  const startCall = async () => {
    try {
      setError(null);
      updateState('connecting', 'Connecting...');
      const response = await fetch('/api/create-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create call');
      }
      const data = await response.json();
      if (sessionRef.current) {
        await sessionRef.current.joinCall(data.joinUrl);
        startDurationTimer();
      }
    } catch (err: any) {
      setError(err.message);
      updateState('idle', "Have a conversation with a Transmonk voice agent. Ask anything about HVAC systems, and leave your info if you'd like the team to follow up.");
      // Restart audio only if form is also not showing
      setShowFormModal(prev => {
        if (!prev) playAudioLoop();
        return prev;
      });
    }
  };

  const endCall = async () => {
    if (sessionRef.current) await sessionRef.current.leaveCall();
    cleanup();
  };

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleInputChange = (field: keyof UserInfo, value: string) =>
    setUserInfo(prev => ({ ...prev, [field]: value }));

  /** Cancel: close form, restart audio only if call also ended */
  const handleFormCancel = () => {
    setShowFormModal(false);
    setUserInfo({ name: '', phone: '', email: '', organization: '' });
    setError(null);
    if (callState === 'idle') playAudioLoop();
  };

  /** Submit: POST user info, show success, then close form */
  const handleFormSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userInfo),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send confirmation');
      }
      setSubmitSuccess(true);
      setTimeout(() => {
        setShowFormModal(false);
        setSubmitSuccess(false);
        setUserInfo({ name: '', phone: '', email: '', organization: '' });
        // Restart audio only if call has ended by now
        if (callState === 'idle') playAudioLoop();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => setIsMuted(prev => !prev);

  const latestAgentMessage = [...transcripts].reverse().find(t => t.speaker === 'agent')?.text || '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden audio elements — 3-file sequential loop */}
      <audio ref={audio0} src={AUDIO_SOURCES[0]} preload="auto" />
      <audio ref={audio1} src={AUDIO_SOURCES[1]} preload="auto" />
      <audio ref={audio2} src={AUDIO_SOURCES[2]} preload="auto" />

      {/* Full-screen dark background */}
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">

        <div className='text-center'>
          <h1 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white'>
            Transmonk Voice Assistant
          </h1>
        </div>

        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(200,200,255,0.15), transparent)',
            filter: 'blur(8px)',
          }}
        />

        {/* Error banner — only shown when form is NOT open */}
        {error && !showFormModal && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 bg-red-900/80 border border-red-500/40 rounded-xl px-6 py-3 text-red-200 text-sm backdrop-blur-md">
            ⚠️ {error}
          </div>
        )}

        {/* Duration badge */}
        {isActive && (
          <div className="absolute top-6 right-8 text-xs text-white/40 font-mono tracking-widest">
            {formatDuration(callDuration)}
          </div>
        )}

        {/* Main content */}
        <div className="relative flex flex-col items-center w-full px-5 sm:px-8" style={{ maxWidth: 900 }}>

          {/* Waveform canvas */}
          <div className="w-full relative" style={{ height: 220 }}>
            <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />

            {isAISpeaking && latestAgentMessage && !showFormModal && (
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-white/80 text-base font-light w-full pointer-events-none"
                style={{
                  textShadow: '0 0 20px rgba(200,200,255,0.3)',
                  fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                  letterSpacing: '0.01em',
                }}
              >
                {latestAgentMessage}
              </div>
            )}
          </div>

          {/* Status text */}
          <div className="text-center mt-2 mb-12 px-4" style={{ maxWidth: 600, minHeight: 48 }}>
            {!isAISpeaking && !showFormModal && (
              <p
                className="text-white/50 text-sm leading-relaxed"
                style={{ fontFamily: "'SF Pro Text', -apple-system, sans-serif", letterSpacing: '0.01em' }}
              >
                {callState === 'listening'  && 'Listening...'}
                {callState === 'processing' && 'Thinking...'}
                {callState === 'connecting' && 'Connecting...'}
                {callState === 'idle'       && statusMessage}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="fixed bottom-4 flex items-end gap-12">

            {/* Transcript */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setShowTranscript(prev => !prev)}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: showTranscript ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </button>
              <span className="text-white/40 text-xs tracking-wide">Transcript</span>
            </div>

            {/* Main call button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleToggleCall}
                disabled={callState === 'connecting'}
                className="w-30 h-30 rounded-full flex items-center justify-center transition-all duration-300 relative"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: isActive
                    ? '0 0 32px rgba(239,68,68,0.4), 0 8px 24px rgba(0,0,0,0.4)'
                    : '0 0 32px rgba(34,197,94,0.4), 0 8px 24px rgba(0,0,0,0.4)',
                  opacity: callState === 'connecting' ? 0.6 : 1,
                }}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(239,68,68,0.2)', animationDuration: '2s' }}
                  />
                )}
                {callState === 'connecting' ? (
                  <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                ) : isActive ? (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.68a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L10.68 13.31z"/>
                    <line x1="23" y1="1" x2="1" y2="23"/>
                  </svg>
                ) : (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.38 2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.94-.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                )}
              </button>
              <span className="text-white/50 text-xs tracking-wide font-medium">
                {isActive ? 'End Conversation' : 'Start Conversation'}
              </span>
            </div>

            {/* Mute */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleMute}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                  border: isMuted ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {isMuted ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
              <span className="text-white/40 text-xs tracking-wide">Mute</span>
            </div>

          </div>
        </div>

        {/* Transcript panel */}
        {showTranscript && (
          <div
            className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl overflow-hidden"
            style={{
              background: 'rgba(10,10,15,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              maxHeight: '55vh',
            }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <span className="text-white/60 text-sm font-medium tracking-wide">Conversation</span>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none"
              >✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-3" style={{ maxHeight: 'calc(55vh - 60px)' }}>
              {transcripts.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-8">No conversation yet...</p>
              ) : (
                transcripts.map((transcript, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${transcript.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {transcript.speaker === 'agent' && (
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0 mt-1 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #c026d3, #22d3ee)' }}
                      >
                        <span style={{ fontSize: 10 }}>AI</span>
                      </div>
                    )}
                    <div
                      className="px-4 py-2.5 rounded-2xl text-sm max-w-xs"
                      style={{
                        background: transcript.speaker === 'user'
                          ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                        border: transcript.speaker === 'user'
                          ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.8)',
                        lineHeight: 1.5,
                      }}
                    >
                      {transcript.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Info Collection Form Modal ────────────────────────────────────────── */}
      {showFormModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-8 relative"
            style={{
              background: 'rgba(12,12,18,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
              animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {submitSuccess ? (
              <div className="text-center py-10">
                <div className="text-6xl mb-5">✅</div>
                <h3 className="text-2xl font-semibold text-white mb-2">Submitted!</h3>
                <p className="text-white/40 text-sm">Thanks! The Transmonk team will be in touch.</p>
              </div>
            ) : (
              <>
                {/* Header with optional live-call indicator */}
                <div className="mb-6">
                  {isActive && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                      <span className="text-green-400 text-xs font-medium tracking-wide">Call in progress</span>
                    </div>
                  )}
                  <h2 className="text-xl font-semibold text-white mb-1">Leave Your Details</h2>
                  <p className="text-white/40 text-sm">
                    Fill in your info and the Transmonk team will follow up with you.
                  </p>
                </div>

                {/* Error inside modal */}
                {error && (
                  <div className="mb-5 bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3">
                    <p className="text-red-300 text-sm">⚠️ {error}</p>
                  </div>
                )}

                {/* Form fields — all blank, user fills manually */}
                <div className="space-y-4">
                  {([
                    { label: 'Full Name',     field: 'name',         type: 'text',  placeholder: 'John Doe'          },
                    { label: 'Email Address', field: 'email',        type: 'email', placeholder: 'john@example.com'  },
                    { label: 'Phone Number',  field: 'phone',        type: 'tel',   placeholder: '+1 (555) 123-4567' },
                    { label: 'Organization',  field: 'organization', type: 'text',  placeholder: 'Company Name'      },
                  ] as { label: string; field: keyof UserInfo; type: string; placeholder: string }[]).map(
                    ({ label, field, type, placeholder }) => (
                      <div key={field}>
                        <label
                          className="block text-xs font-medium mb-2 tracking-wider uppercase"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          {label}
                        </label>
                        <input
                          type={type}
                          value={userInfo[field]}
                          onChange={e => handleInputChange(field, e.target.value)}
                          placeholder={placeholder}
                          className="w-full px-4 py-3 rounded-xl text-sm transition-all outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.85)',
                            fontFamily: 'inherit',
                          }}
                          onFocus={e => {
                            e.target.style.border     = '1px solid rgba(99,102,241,0.6)';
                            e.target.style.background = 'rgba(99,102,241,0.08)';
                          }}
                          onBlur={e => {
                            e.target.style.border     = '1px solid rgba(255,255,255,0.1)';
                            e.target.style.background = 'rgba(255,255,255,0.05)';
                          }}
                        />
                      </div>
                    )
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleFormCancel}
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFormSubmit}
                    disabled={isSubmitting || !userInfo.name || !userInfo.email}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all text-white"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                      opacity: isSubmitting || !userInfo.name || !userInfo.email ? 0.5 : 1,
                      cursor: isSubmitting || !userInfo.name || !userInfo.email ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: #000; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </>
  );
}
