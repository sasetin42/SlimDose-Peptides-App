import { useState, useEffect, useRef, type FC, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'slimdose_researcher_verified';
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/* ═══════════════════════════════════════════════════════════════
   LocalStorage helpers
   ═══════════════════════════════════════════════════════════════ */
function isAlreadyVerified(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < EXPIRY_MS;
  } catch {
    return false;
  }
}

function saveVerificationState(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now() }));
}

/* ═══════════════════════════════════════════════════════════════
   Canvas Particle System — molecular nodes + connections
   ═══════════════════════════════════════════════════════════════ */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  hue: number;
}

function generateParticles(w: number, h: number, count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.8 + 0.8,
    alpha: Math.random() * 0.45 + 0.15,
    hue: Math.random() > 0.55 ? 213 : 220,
  }));
}

/* ═══════════════════════════════════════════════════════════════
   Checkbox Sub-Component
   ═══════════════════════════════════════════════════════════════ */
interface CheckboxRowProps {
  checked: boolean;
  onChange: () => void;
  delay: number;
  children: ReactNode;
}

const CheckboxRow: FC<CheckboxRowProps> = ({
  checked,
  onChange,
  delay,
  children,
}) => (
  <motion.button
    onClick={onChange}
    type="button"
    className="flex items-start gap-3.5 w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all duration-300 group"
    style={{
      borderColor: checked
        ? 'rgba(60, 108, 168, 0.35)'
        : 'rgba(0,0,0,0.08)',
      background: checked
        ? 'rgba(60, 108, 168, 0.05)'
        : 'rgba(0,0,0,0.02)',
    }}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileTap={{ scale: 0.985 }}
  >
    <div
      className={`mt-[2px] w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
        checked
          ? 'border-brand-500'
          : 'border-gray-300 group-hover:border-brand-400/50'
      }`}
      style={
        checked
          ? { background: 'linear-gradient(135deg, #3C6CA8, #264874)' }
          : {}
      }
    >
      <AnimatePresence mode="wait">
        {checked && (
          <motion.svg
            key="tick"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="w-3.5 h-3.5 text-white"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M3 7L6 10L11 4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
    <span className="text-[13px] sm:text-sm text-gray-600 leading-snug">
      {children}
    </span>
  </motion.button>
);

/* ═══════════════════════════════════════════════════════════════
   Trust Indicator Data
   ═══════════════════════════════════════════════════════════════ */
const TRUST_ITEMS = [
  {
    emoji: '🔒',
    title: 'Secure & Private',
    desc: 'Your data is protected',
  },
  {
    emoji: '🧪',
    title: 'Research Use Only',
    desc: 'For in vitro and laboratory use',
  },
  {
    emoji: '✅',
    title: 'Verified Standards',
    desc: 'Trusted by qualified researchers',
  },
];

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
interface VerificationGatewayProps {
  children: ReactNode;
}

const VerificationGateway: FC<VerificationGatewayProps> = ({
  children,
}) => {
  const [phase, setPhase] = useState<
    'loading' | 'gate' | 'entering' | 'reveal'
  >('loading');
  const [ageChecked, setAgeChecked] = useState(false);
  const [researchChecked, setResearchChecked] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const canProceed = ageChecked && researchChecked;

  /* ── Check prior verification on mount ── */
  useEffect(() => {
    if (isAlreadyVerified()) {
      setPhase('reveal');
    } else {
      setPhase('gate');
    }
  }, []);

  /* ── Particle canvas animation loop ── */
  useEffect(() => {
    if (phase !== 'gate' && phase !== 'entering') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = generateParticles(canvas.width, canvas.height, 50);
    };
    resize();
    window.addEventListener('resize', resize);

    const LINK_DIST = 130;

    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      // Draw molecular connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const lineAlpha = (1 - dist / LINK_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(213, 47%, 45%, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles with glow halos
      for (const p of particles) {
        // Outer glow
        const grd = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.r * 5
        );
        grd.addColorStop(
          0,
          `hsla(${p.hue}, 70%, 65%, ${p.alpha * 0.2})`
        );
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 75%, 70%, ${p.alpha})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  /* ── Enter handler ── */
  const handleEnter = () => {
    if (!canProceed || phase === 'entering') return;
    setPhase('entering');
    saveVerificationState();
    setTimeout(() => setPhase('reveal'), 2200);
  };

  /* ═══════════════════════════════════════════════════════════
     Render: Loading check
     ═══════════════════════════════════════════════════════════ */
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 bg-[#FFFFFF] flex items-center justify-center z-[9999]">
        <div className="w-10 h-10 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     Render: Reveal main app
     ═══════════════════════════════════════════════════════════ */
  if (phase === 'reveal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     Render: GATE / ENTERING
     ═══════════════════════════════════════════════════════════ */
  const isLeaving = phase === 'entering';

  return (
    <motion.div
      className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden"
      style={{ background: '#FFFFFF' }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: isLeaving ? 0 : 1,
        scale: isLeaving ? 1.06 : 1,
      }}
      transition={{
        duration: isLeaving ? 1.4 : 0.5,
        delay: isLeaving ? 0.8 : 0,
        ease: 'easeInOut',
      }}
    >
      {/* ─────────────────────────────────────────────────────
          BACKGROUND LAYERS
          ───────────────────────────────────────────────────── */}

      {/* Video Background */}
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          onCanPlayThrough={() => setVideoReady(true)}
          className={`w-full h-full object-cover transition-opacity duration-[2500ms] ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source
            src="https://videos.pexels.com/video-files/3191572/3191572-hd_1920_1080_25fps.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* ─────────────────────────────────────────────────────
          MAIN CARD
          ───────────────────────────────────────────────────── */}
      <div className="relative z-[10] min-h-screen flex items-center justify-center px-4 py-10">
        <motion.div
          className="w-full max-w-lg md:max-w-4xl"
          initial={{ opacity: 0, y: 50, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 1,
            delay: 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {/* Outer animated glow border */}
          <div className="relative">
            <motion.div
              className="absolute -inset-[1.5px] rounded-[20px]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(60, 108, 168, 0.35), rgba(38, 72, 116, 0.20), rgba(60, 108, 168, 0.35))',
                filter: 'blur(4px)',
              }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Glassmorphism Card — lets DNA video show through softly */}
            <div
              className="relative rounded-[20px] border border-brand-200/60 overflow-hidden"
              style={{
                background: 'rgba(248, 251, 255, 0.88)',
                backdropFilter: 'blur(32px) saturate(1.5) brightness(1.02)',
                WebkitBackdropFilter: 'blur(32px) saturate(1.5) brightness(1.02)',
                boxShadow: [
                  '0 32px 80px rgba(38, 72, 116, 0.12)',
                  '0 0 0 1px rgba(60, 108, 168, 0.12)',
                  '0 0 80px rgba(60, 108, 168, 0.08)',
                  '0 2px 4px rgba(0,0,0,0.04)',
                ].join(', '),
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {/* Left Column: Branding & Trust Indicators */}
                <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-between">
                  <div>
                    {/* Logo + Shield Badge */}
                    <motion.div
                      className="flex flex-col items-center md:items-start mb-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.7 }}
                    >
                      <div className="relative mb-4">
                        <motion.div
                          className="w-[72px] h-[72px] rounded-2xl overflow-hidden"
                          style={{
                            boxShadow:
                              '0 0 0 2px rgba(59,130,246,0.2), 0 0 0 6px rgba(255,255,255,0.9), 0 0 40px rgba(59,130,246,0.1)',
                          }}
                        >
                          <img
                            src="/assets/logo.jpeg"
                            alt="SlimDose Peptides"
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                        <motion.div
                          className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            background:
                              'linear-gradient(135deg, #3C6CA8, #264874)',
                            boxShadow:
                              '0 4px 15px rgba(60, 108, 168, 0.4), 0 0 0 3px rgba(255,255,255,0.95)',
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            delay: 0.9,
                            type: 'spring',
                            stiffness: 350,
                            damping: 20,
                          }}
                        >
                          <Shield className="w-4 h-4 text-white" />
                        </motion.div>
                      </div>

                      <h1 className="text-[22px] sm:text-[26px] font-bold text-gray-900 tracking-tight text-center md:text-left leading-tight">
                        Researcher Verification
                      </h1>
                      <motion.div
                        className="h-[2px] rounded-full mt-3"
                        style={{
                          background:
                            'linear-gradient(90deg, #3C6CA8, #264874)',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: 48 }}
                        transition={{
                          delay: 0.7,
                          duration: 0.6,
                          ease: 'easeOut',
                        }}
                      />
                    </motion.div>

                    {/* Body Text */}
                    <motion.p
                      className="text-[13px] sm:text-sm text-gray-500 text-center md:text-left leading-relaxed mb-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                    >
                      Slimdose Peptides sells research peptides exclusively to
                      qualified researchers and laboratories for{' '}
                      <span className="text-gray-800 font-medium">in vitro</span>{' '}
                      and{' '}
                      <span className="text-gray-800 font-medium">
                        laboratory use
                      </span>
                      . Please confirm before continuing.
                    </motion.p>
                  </div>

                  {/* Trust Indicators stacked vertically */}
                  <div className="space-y-3.5 mt-6 border-t border-gray-150 pt-6">
                    {TRUST_ITEMS.map((item, i) => (
                      <motion.div
                        key={item.title}
                        className="flex items-center gap-3.5 p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors duration-300"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.8 + i * 0.1,
                          duration: 0.5,
                        }}
                      >
                        <span className="text-xl flex-shrink-0">{item.emoji}</span>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-gray-700 leading-tight">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                            {item.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Checkboxes, Enter Button, Disclaimer */}
                <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-gray-50/50">
                  {/* Verification Checkboxes */}
                  <div className="space-y-3.5 mb-6">
                    <CheckboxRow
                      checked={ageChecked}
                      onChange={() => setAgeChecked(!ageChecked)}
                      delay={0.55}
                    >
                      I am at least{' '}
                      <span className="text-gray-900 font-semibold">
                        21 years of age
                      </span>
                      .
                    </CheckboxRow>

                    <CheckboxRow
                      checked={researchChecked}
                      onChange={() =>
                        setResearchChecked(!researchChecked)
                      }
                      delay={0.65}
                    >
                      I confirm I am a{' '}
                      <span className="text-gray-900 font-semibold">
                        qualified researcher
                      </span>{' '}
                      purchasing for in vitro / laboratory research only —
                      not for human or veterinary use.
                    </CheckboxRow>
                  </div>

                  {/* Enter Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                  >
                    <motion.button
                      onClick={handleEnter}
                      disabled={!canProceed || isLeaving}
                      className={`relative w-full py-4 rounded-xl font-semibold text-[15px] text-white overflow-hidden transition-all duration-500 ${
                        canProceed && !isLeaving
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed opacity-40'
                      }`}
                      style={{
                        background:
                          canProceed && !isLeaving
                            ? 'linear-gradient(135deg, #3C6CA8 0%, #315A8E 30%, #264874 100%)'
                            : 'rgba(156, 163, 175, 0.4)',
                        boxShadow:
                          canProceed && !isLeaving
                            ? '0 0 30px rgba(60, 108, 168, 0.35), 0 8px 25px rgba(60, 108, 168, 0.25)'
                            : 'none',
                      }}
                      whileHover={
                        canProceed && !isLeaving
                          ? {
                              scale: 1.02,
                              boxShadow:
                                '0 0 50px rgba(60, 108, 168, 0.5), 0 10px 35px rgba(60, 108, 168, 0.35)',
                            }
                          : {}
                      }
                      whileTap={
                        canProceed && !isLeaving
                          ? { scale: 0.98 }
                          : {}
                      }
                    >
                      {isLeaving ? (
                        <span className="flex items-center justify-center gap-2.5">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Enter Slimdose Peptides
                          <ArrowRight className="w-5 h-5" />
                        </span>
                      )}

                      {/* Animated shimmer sweep */}
                      {canProceed && !isLeaving && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                          }}
                          animate={{ x: ['-100%', '250%'] }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            repeatDelay: 4,
                            ease: 'easeInOut',
                          }}
                        />
                      )}
                    </motion.button>
                  </motion.div>

                  {/* Legal Disclaimer */}
                  <motion.p
                    className="text-[11px] text-gray-400 text-center leading-relaxed mt-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.85 }}
                  >
                    By proceeding you affirm the statements above are true.
                    Products are not for human or veterinary use, not for use in
                    diagnostic procedures, and have not been evaluated by the
                    FDA.{' '}
                    <button className="text-brand-500 hover:text-brand-600 underline underline-offset-2 transition-colors">
                      Full disclaimer
                    </button>
                  </motion.p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default VerificationGateway;
