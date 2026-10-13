
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase';

import weddingPhoto from './assets/94FB7AFC-A469-4E0C-A302-88D6363B9C9E.png';
type Wish = {
  id: number;
  name: string;
  message: string;
  created_at: string;
};

const WEDDING_DATE = new Date('2027-03-15T12:00:00+06:00');

const VENUE = 'Tarafder Nibash, Abdur Rahim Tarafder Road, Fathepur, Jashore Sadar, Bangladesh';

const MAPS_URL = 'https://maps.app.goo.gl/Yn9UdPL1xGmKLXJt8';

const GALLERY = [
  {
    image:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
    title: 'A beautiful beginning',
  },
  {
    image:
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85',
    title: 'A day to remember',
  },
  {
    image:
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=85',
    title: 'Forever starts here',
  },
  {
    image:
      'https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?auto=format&fit=crop&w=1000&q=85',
    title: 'Love in every detail',
  },
];

function getCountdown() {
  const difference = Math.max(0, WEDDING_DATE.getTime() - Date.now());

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

function App() {
  const [invitationOpened, setInvitationOpened] = useState(false);
  const [coverVisible, setCoverVisible] = useState(true);
  const [countdown, setCountdown] = useState(getCountdown);
  const [menuOpen, setMenuOpen] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [wishName, setWishName] = useState('');
  const [wishMessage, setWishMessage] = useState('');
  const [wishLoading, setWishLoading] = useState(true);
  const [wishSubmitting, setWishSubmitting] = useState(false);
  const [wishError, setWishError] = useState('');
  const [wishStatus, setWishStatus] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const curtainTimerRef = useRef<number | null>(null);

  // Keep the wedding countdown up to date.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Load guestbook wishes and listen for realtime updates.
 
useEffect(() => {
  if (!supabaseConfigured || supabase === null) {
    setWishLoading(false);
    return;
  }

  // TypeScript now knows this client is not null.
  const client = supabase;

  let isMounted = true;

  async function loadWishes() {
    const { data, error } = await client
      .from('wedding_wishes')
      .select('id, name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!isMounted) return;

    if (error) {
      setWishError('We could not load wishes right now. Please try again later.');
    } else {
      setWishes((data ?? []) as Wish[]);
      setWishError('');
    }

    setWishLoading(false);
  }

  void loadWishes();

  const channel = client
    .channel('wedding-wishes-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wedding_wishes',
      },
      () => {
        void loadWishes();
      },
    )
    .subscribe();

  return () => {
    isMounted = false;
    void client.removeChannel(channel);
  };
}, []);

  // Clean up the curtain animation timer.
  useEffect(() => {
    return () => {
      if (curtainTimerRef.current !== null) {
        window.clearTimeout(curtainTimerRef.current);
      }
    };
  }, []);

  function openInvitation() {
    if (invitationOpened) return;

    setInvitationOpened(true);

    curtainTimerRef.current = window.setTimeout(() => {
      setCoverVisible(false);
    }, 1900);
  }

  function scrollToSection(id: string) {
    setMenuOpen(false);

    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }

  async function toggleMusic() {
    const audio = audioRef.current;

    if (!audio) return;

    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
      return;
    }

    try {
      await audio.play();
      setMusicPlaying(true);
    } catch {
      setMusicPlaying(false);
      window.alert(
        'Music could not be played. Please make sure wedding-music.mp3 exists in your public folder.',
      );
    }
  }

  async function shareInvitation() {
    const text = `You're invited to the wedding celebration of Rafith & Nishat!\n\nDate: March 15, 2027\nTime: 12:00 PM\nVenue: ${VENUE}\n\nLocation: ${MAPS_URL}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rafith & Nishat — Wedding Invitation',
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // Continue to the copy fallback if sharing is cancelled or unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(
        `${text}\n\nInvitation: ${window.location.href}`,
      );
      window.alert('Invitation details copied. You can now share them with your loved ones.');
    } catch {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          `${text}\n\nInvitation: ${window.location.href}`,
        )}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  }

  async function submitWish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = wishName.trim();
    const message = wishMessage.trim();

    if (!name || !message) {
      setWishError('Please enter your name and a message.');
      return;
    }

    if (name.length > 80 || message.length > 500) {
      setWishError('Your name must be under 80 characters and your message under 500 characters.');
      return;
    }

    const client = supabase;

    if (!client || !supabaseConfigured) {
      setWishError(
        'The guestbook is not configured yet. Please try again later.',
      );
      return;
    }

    setWishSubmitting(true);
    setWishError('');
    setWishStatus('');

    const { data, error } = await client
      .from('wedding_wishes')
      .insert({
        name,
        message,
      })
      .select('id, name, message, created_at')
      .single();

    setWishSubmitting(false);

    if (error) {
      setWishError(
        'Your wish could not be submitted. Please try again in a moment.',
      );
      return;
    }

    if (data) {
      const newWish = data as Wish;

      setWishes((current) => [
        newWish,
        ...current.filter((wish) => wish.id !== newWish.id),
      ]);
    }

    setWishName('');
    setWishMessage('');
    setWishStatus('Your heartfelt wish has been added. Thank you!');
  }

  const navItems = [
    { label: 'Our Story', id: 'story' },
    { label: 'The Celebration', id: 'celebration' },
    { label: 'Gallery', id: 'gallery' },
    { label: 'Wishes', id: 'wishes' },
    { label: 'Location', id: 'location' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Great+Vibes&family=Montserrat:wght@300;400;500;600;700&display=swap');

        :root {
          --wine: #541827;
          --wine-dark: #2c0b16;
          --wine-light: #783647;
          --gold: #c8a66a;
          --gold-light: #ead7a8;
          --cream: #faf5ec;
          --cream-dark: #f0e5d4;
          --ink: #30232a;
          --muted: #786b6c;
          --white: #fffdf9;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
          scroll-padding-top: 90px;
        }

        body {
          margin: 0;
          background: var(--cream);
          color: var(--ink);
          font-family: 'Montserrat', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        body, button, input, textarea {
          font-family: 'Montserrat', sans-serif;
        }

        button, a {
          -webkit-tap-highlight-color: transparent;
        }

        button {
          cursor: pointer;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        img {
          display: block;
          max-width: 100%;
        }

        .script-font {
          font-family: 'Great Vibes', cursive;
        }

        .serif-font {
          font-family: 'Cormorant Garamond', serif;
        }

        .eyebrow {
          color: var(--gold);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 4px;
          line-height: 1.8;
          text-transform: uppercase;
        }

        .section-heading {
          margin: 12px 0 15px;
          color: var(--wine);
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(42px, 6vw, 66px);
          font-weight: 500;
          line-height: 1.05;
        }

        .section-intro {
          max-width: 560px;
          margin: 0 auto;
          color: var(--muted);
          font-size: 12px;
          line-height: 2.1;
        }

        .section-top {
          margin-bottom: 48px;
          text-align: center;
        }

        .ornament {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          margin: 20px auto;
          color: var(--gold);
        }

        .ornament::before,
        .ornament::after {
          width: 48px;
          height: 1px;
          background: var(--gold);
          content: '';
        }

        .primary-button,
        .outline-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 48px;
          padding: 13px 24px;
          border: 1px solid var(--gold);
          border-radius: 0;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2px;
          text-align: center;
          text-transform: uppercase;
          transition: background .25s ease, color .25s ease, transform .25s ease;
        }

        .primary-button {
          background: var(--wine);
          color: var(--white);
        }

        .primary-button:hover {
          background: var(--wine-light);
          transform: translateY(-2px);
        }

        .outline-button {
          background: transparent;
          color: var(--wine);
        }

        .outline-button:hover {
          background: var(--wine);
          color: white;
        }

        .primary-button:disabled {
          cursor: not-allowed;
          opacity: .6;
        }

        /* Opening cover and two-sided curtains */

       .invitation-cover {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  overflow: hidden;
  isolation: isolate;
  background: #350d19;
}
  .invitation-cover .cover-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(
      ellipse at center,
      rgba(119, 48, 65, 0.35),
      transparent 65%
    ),
    #350d19;
  pointer-events: none;
}
  .invitation-cover .cover-frame {
  position: absolute;
  inset: 18px;
  z-index: 2;
  border: 1px solid rgba(220, 185, 112, 0.65);
  pointer-events: none;
}
          .invitation-cover .curtain {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  min-width: 50%;
  height: 100%;
  z-index: 4;
  display: block;
  visibility: visible;
  opacity: 1;
  pointer-events: none;
  background-color: #501626;
  background-image:
    linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.28) 0%,
      transparent 12%,
      rgba(255, 220, 220, 0.08) 24%,
      rgba(0, 0, 0, 0.12) 38%,
      rgba(255, 220, 220, 0.06) 52%,
      rgba(0, 0, 0, 0.2) 70%,
      transparent 86%,
      rgba(0, 0, 0, 0.22) 100%
    ),
    repeating-linear-gradient(
      90deg,
      #350d19 0px,
      #682336 12px,
      #501626 25px,
      #3b101c 38px,
      #70283a 48px,
      #491320 60px
    );
  box-shadow:
    inset 0 0 45px rgba(0, 0, 0, 0.3),
    0 0 18px rgba(0, 0, 0, 0.12);
  transition:
    transform 1.7s cubic-bezier(0.76, 0, 0.24, 1);
  will-change: transform;
}

        .cover-background {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(44, 11, 22, .28), rgba(44, 11, 22, .62)),
            url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85') center/cover;
          transform: scale(1.04);
        }

        .cover-frame {
          position: absolute;
          z-index: 1;
          inset: 18px;
          border: 1px solid rgba(234, 215, 168, .55);
          pointer-events: none;
        }

        .cover-card {
          position: relative;
          z-index: 8;
          display: flex;
          width: min(400px, calc(100% - 36px));
          max-height: calc(100vh - 48px);
          min-height: 0;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          overflow: auto;
          padding: clamp(24px, 4vh, 38px) 24px;
          border: 1px solid rgba(234, 215, 168, .8);
          background: rgba(250, 245, 236, .98);
          text-align: center;
          box-shadow: 0 25px 90px rgba(0, 0, 0, .3);
        }

        .cover-card::before {
          position: absolute;
          inset: 9px;
          border: 1px solid rgba(200, 166, 106, .5);
          content: '';
          pointer-events: none;
        }

        .cover-monogram {
          display: flex;
          width: 72px;
          height: 72px;
          flex: 0 0 72px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          margin: 0 0 4px;
          border: 1px solid var(--gold);
          border-radius: 50%;
          color: var(--wine);
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          line-height: .9;
        }

        .cover-monogram span {
          display: block;
          font-size: 17px;
          line-height: 1;
        }
          .invitation-cover .curtain-left {
  left: 0;
  right: auto;
  transform: translateX(0);
  border-right: 1px solid rgba(234, 215, 168, 0.45);
  transform-origin: left center;
}

/* Right curtain covers the right half */
.invitation-cover .curtain-right {
  right: 0;
  left: auto;
  transform: translateX(0);
  border-left: 1px solid rgba(234, 215, 168, 0.45);
  transform-origin: right center;
}
.invitation-cover .curtain::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(220, 185, 112, 0.6) 20%,
    rgba(220, 185, 112, 0.18) 50%,
    rgba(220, 185, 112, 0.6) 80%,
    transparent
  );
  pointer-events: none;
}
  .invitation-cover .curtain-left::after {
  right: 0;
}

.invitation-cover .curtain-right::after {
  left: 0;
}
  .invitation-cover .cover-card {
  position: relative;
  z-index: 8;
  pointer-events: auto;
}
  .invitation-cover .cover-open-button {
  position: relative;
  z-index: 9;
  pointer-events: auto;
  cursor: pointer;
}
  .invitation-cover .cover-open-button:disabled {
  cursor: default;
}

        .cover-card h1 {
          max-width: 100%;
          margin: 2px 0 8px;
          color: var(--wine);
          font-family: 'Great Vibes', cursive;
          font-size: clamp(40px, 6vw, 58px);
          font-weight: 400;
          line-height: 1.08;
          overflow-wrap: anywhere;
        }

        .cover-card p {
          max-width: 280px;
          margin: 4px 0;
          color: var(--muted);
          font-size: 9px;
          letter-spacing: 1.6px;
          line-height: 1.8;
          text-transform: uppercase;
        }

        .cover-date {
          margin: 4px 0 8px;
          color: var(--wine);
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px;
          letter-spacing: 2px;
        }

        .cover-open-button {
          position: relative;
          z-index: 11;
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 8px;
          padding: 12px 20px;
          border: 1px solid var(--gold);
          background: var(--wine);
          color: var(--cream);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          cursor: pointer;
          pointer-events: auto;
          transition: background .25s ease, transform .25s ease;
        }

        .cover-open-button:hover {
          background: var(--wine-dark);
          transform: translateY(-2px);
        }

        .cover-open-button:disabled {
          cursor: default;
          opacity: .8;
        }

        .curtain {
          position: absolute;
          z-index: 4;
          top: 0;
          bottom: 0;
          width: 50%;
          background:
            linear-gradient(90deg, rgba(0, 0, 0, .22), transparent 15%, rgba(255, 255, 255, .035) 42%, rgba(0, 0, 0, .13) 60%, transparent),
            repeating-linear-gradient(90deg, #491320 0px, #682336 18px, #4e1625 35px, #36101b 52px);
          box-shadow: inset 0 0 55px rgba(0, 0, 0, .22);
          transition: transform 1.7s cubic-bezier(.76, 0, .24, 1);
          will-change: transform;
          pointer-events: none;
        }

        .curtain-left {
          left: 0;
          border-right: 1px solid rgba(234, 215, 168, .35);
        }

        .curtain-right {
          right: 0;
          border-left: 1px solid rgba(234, 215, 168, .35);
        }

        .curtain::after {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(90deg, transparent 0 30px, rgba(0, 0, 0, .1) 31px, transparent 38px);
          content: '';
        }

        .invitation-cover.opened .curtain-left {
          transform: translateX(-101%);
        }

        .invitation-cover.opened .curtain-right {
          transform: translateX(101%);
        }

        .invitation-cover.opened .cover-card {
          animation: cardReveal 1.2s ease forwards;
        }

        @keyframes cardReveal {
          from { transform: scale(.98); opacity: .8; }
          to { transform: scale(1); opacity: 1; }
        }

        /* Main site */

        .site-shell {
          min-height: 100vh;
          overflow: clip;
        }

        .site-header {
          position: sticky;
          z-index: 50;
          top: 0;
          border-bottom: 1px solid rgba(200, 166, 106, .25);
          background: rgba(250, 245, 236, .96);
          backdrop-filter: blur(14px);
        }

        .header-inner {
          display: flex;
          width: min(1180px, calc(100% - 48px));
          min-height: 82px;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin: auto;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          color: var(--wine);
        }

        .brand-monogram {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 1px solid var(--gold);
          border-radius: 50%;
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
        }

        .brand-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          line-height: 1;
        }

        .brand-caption {
          display: block;
          margin-top: 5px;
          color: var(--muted);
          font-size: 8px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: clamp(12px, 2.1vw, 28px);
        }

        .desktop-nav button,
        .header-actions button {
          padding: 8px 0;
          border: 0;
          background: transparent;
          color: var(--ink);
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .desktop-nav button:hover {
          color: var(--gold);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .header-actions .share-button {
          padding: 11px 15px;
          border: 1px solid var(--gold);
          color: var(--wine);
        }

        .menu-toggle {
          display: none;
          border: 1px solid var(--gold) !important;
          padding: 10px !important;
          font-size: 18px !important;
        }

        .hero {
          position: relative;
          display: grid;
          min-height: min(790px, calc(100svh - 82px));
          place-items: center;
          padding: 95px 24px;
          background:
            linear-gradient(90deg, rgba(39, 10, 19, .74), rgba(39, 10, 19, .27)),
            url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2200&q=90') center 55%/cover;
          color: white;
          text-align: center;
        }

        .hero::before {
          position: absolute;
          inset: 16px;
          border: 1px solid rgba(234, 215, 168, .45);
          content: '';
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 800px;
        }

        .hero .eyebrow {
          color: var(--gold-light);
        }

        .hero h1 {
          margin: 20px 0 12px;
          font-family: 'Great Vibes', cursive;
          font-size: clamp(66px, 11vw, 125px);
          font-weight: 400;
          line-height: 1.12;
        }

        .hero-ampersand {
          color: var(--gold-light);
        }

        .hero-subtitle {
          margin: 0 auto;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(20px, 3vw, 29px);
          letter-spacing: 2px;
        }

        .hero-divider {
          width: 100px;
          height: 1px;
          margin: 28px auto;
          background: var(--gold-light);
        }

        .hero-date {
          color: var(--gold-light);
          font-size: 11px;
          letter-spacing: 4px;
          text-transform: uppercase;
        }

        .hero-location {
          margin-top: 13px;
          color: rgba(255, 255, 255, .85);
          font-size: 10px;
          letter-spacing: 1px;
          line-height: 1.8;
        }

        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 32px;
        }

        .hero .primary-button {
          border-color: var(--gold-light);
          background: var(--gold-light);
          color: var(--wine-dark);
        }

        .hero .outline-button {
          border-color: var(--gold-light);
          color: white;
        }

        .hero .outline-button:hover {
          background: var(--gold-light);
          color: var(--wine-dark);
        }

        .section {
          padding: 105px 24px;
        }

        .section-inner {
          width: min(1100px, 100%);
          margin: 0 auto;
        }

        .story-grid {
          display: grid;
          align-items: center;
          grid-template-columns: 1fr 1fr;
          gap: clamp(38px, 7vw, 90px);
        }

        .story-image-wrap {
          position: relative;
          padding: 0 18px 18px 0;
        }

        .story-image-wrap::after {
          position: absolute;
          z-index: 0;
          right: 0;
          bottom: 0;
          width: 76%;
          height: 72%;
          border: 1px solid var(--gold);
          content: '';
        }

        .story-image {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 500px;
          object-fit: cover;
          object-position: center;
        }

        .story-copy .section-heading {
          font-size: clamp(46px, 6vw, 70px);
        }

        .story-copy p {
          color: var(--muted);
          font-size: 12px;
          line-height: 2.2;
        }

        .story-signature {
          margin-top: 25px;
          color: var(--wine);
          font-family: 'Great Vibes', cursive;
          font-size: 38px;
        }

        .countdown-section {
          position: relative;
          padding: 88px 24px;
          background: var(--wine);
          color: white;
          text-align: center;
        }

        .countdown-section .eyebrow {
          color: var(--gold-light);
        }

        .countdown-section h2 {
          margin: 12px 0 8px;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(38px, 5vw, 55px);
          font-weight: 400;
        }

        .countdown-section > p {
          color: rgba(255, 255, 255, .7);
          font-size: 11px;
          line-height: 1.9;
        }

        .countdown-grid {
          display: grid;
          width: min(650px, 100%);
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin: 40px auto 0;
        }

        .countdown-item {
          padding: 20px 8px;
          border: 1px solid rgba(234, 215, 168, .4);
        }

        .countdown-number {
          display: block;
          color: var(--gold-light);
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(34px, 6vw, 54px);
          line-height: 1.2;
        }

        .countdown-label {
          display: block;
          margin-top: 8px;
          color: rgba(255, 255, 255, .75);
          font-size: 8px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .celebration-section {
          background: var(--white);
        }

        .event-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }

        .event-card {
          position: relative;
          padding: 40px 30px;
          border: 1px solid var(--cream-dark);
          background: var(--cream);
          text-align: center;
          transition: transform .25s ease, box-shadow .25s ease;
        }

        .event-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 35px rgba(44, 11, 22, .07);
        }

        .event-icon {
          display: grid;
          width: 55px;
          height: 55px;
          place-items: center;
          margin: 0 auto 22px;
          border: 1px solid var(--gold);
          border-radius: 50%;
          color: var(--wine);
          font-size: 22px;
        }

        .event-card h3 {
          margin: 0 0 12px;
          color: var(--wine);
          font-family: 'Cormorant Garamond', serif;
          font-size: 30px;
          font-weight: 500;
        }

        .event-card p {
          color: var(--muted);
          font-size: 11px;
          line-height: 2;
        }

        .event-date {
          margin: 20px 0 5px;
          color: var(--wine) !important;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .gallery-item {
          position: relative;
          min-height: 270px;
          overflow: hidden;
          background: var(--cream-dark);
        }

        .gallery-item img {
          width: 100%;
          height: 100%;
          min-height: 270px;
          object-fit: cover;
          transition: transform .5s ease;
        }

        .gallery-item:hover img {
          transform: scale(1.06);
        }

        .gallery-caption {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          padding: 28px 12px 16px;
          background: linear-gradient(transparent, rgba(44, 11, 22, .8));
          color: white;
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          text-align: center;
        }

        .location-section {
          background: var(--cream-dark);
        }

        .location-grid {
          display: grid;
          align-items: stretch;
          grid-template-columns: 1fr 1fr;
          gap: 26px;
        }

        .location-card {
          padding: clamp(26px, 5vw, 45px);
          border: 1px solid rgba(200, 166, 106, .6);
          background: var(--white);
        }

        .location-card h3 {
          margin: 14px 0;
          color: var(--wine);
          font-family: 'Cormorant Garamond', serif;
          font-size: 35px;
          font-weight: 500;
        }

        .location-card p {
          color: var(--muted);
          font-size: 11px;
          line-height: 2.2;
        }

        .location-detail {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin: 20px 0;
        }

        .location-detail-icon {
          color: var(--gold);
          font-size: 18px;
        }

        .location-detail strong {
          display: block;
          margin-bottom: 6px;
          color: var(--wine);
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .location-detail span {
          display: block;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.9;
        }

        .location-art {
          position: relative;
          display: grid;
          min-height: 390px;
          overflow: hidden;
          place-items: center;
          background:
            linear-gradient(rgba(44, 11, 22, .45), rgba(44, 11, 22, .7)),
            url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85') center/cover;
          color: white;
          text-align: center;
        }

        .location-art::before {
          position: absolute;
          inset: 14px;
          border: 1px solid rgba(234, 215, 168, .65);
          content: '';
        }

        .location-art-content {
          position: relative;
          z-index: 1;
          padding: 25px;
        }

        .location-art h3 {
          margin: 10px 0;
          font-family: 'Great Vibes', cursive;
          font-size: 54px;
          font-weight: 400;
        }

        .location-art p {
          color: var(--gold-light);
          font-size: 10px;
          letter-spacing: 2px;
          line-height: 2;
          text-transform: uppercase;
        }

        .wishes-section {
          background: var(--white);
        }

        .wishes-grid {
          display: grid;
          align-items: start;
          grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
          gap: 42px;
        }

        .wish-form-card {
          padding: clamp(24px, 4vw, 38px);
          border: 1px solid var(--cream-dark);
          background: var(--cream);
        }

        .wish-form-card h3,
        .wishes-list-heading {
          margin: 0 0 10px;
          color: var(--wine);
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 500;
        }

        .wish-form-card > p {
          margin: 0 0 25px;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.9;
        }

        .form-field {
          margin-bottom: 17px;
        }

        .form-field label {
          display: block;
          margin-bottom: 8px;
          color: var(--wine);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .form-field input,
        .form-field textarea {
          display: block;
          width: 100%;
          padding: 14px;
          border: 1px solid #e1d5c5;
          border-radius: 0;
          outline: none;
          background: white;
          color: var(--ink);
          font-size: 12px;
          transition: border-color .2s ease;
        }

        .form-field input:focus,
        .form-field textarea:focus {
          border-color: var(--gold);
        }

        .form-field textarea {
          min-height: 125px;
          resize: vertical;
        }

        .form-message {
          margin: 14px 0;
          font-size: 11px;
          line-height: 1.8;
        }

        .form-message.error {
          color: #a12635;
        }

        .form-message.success {
          color: #286b49;
        }

        .wishes-list-heading {
          margin-bottom: 24px;
        }

        .wish-list {
          display: grid;
          gap: 14px;
        }

        .wish-card {
          padding: 23px;
          border: 1px solid var(--cream-dark);
          background: var(--white);
        }

        .wish-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 13px;
        }

        .wish-avatar {
          display: grid;
          width: 39px;
          height: 39px;
          flex: 0 0 39px;
          place-items: center;
          border: 1px solid var(--gold);
          border-radius: 50%;
          color: var(--wine);
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px;
        }

        .wish-name {
          color: var(--wine);
          font-size: 11px;
          font-weight: 600;
        }

        .wish-date {
          margin-top: 4px;
          color: var(--muted);
          font-size: 9px;
        }

        .wish-card-message {
          margin: 0;
          color: var(--muted);
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          line-height: 1.65;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .empty-wishes {
          padding: 30px 22px;
          border: 1px dashed #d8c8b0;
          color: var(--muted);
          font-size: 11px;
          line-height: 2;
          text-align: center;
        }

        .rsvp-section {
          position: relative;
          padding: 100px 24px;
          background:
            linear-gradient(rgba(44, 11, 22, .88), rgba(44, 11, 22, .88)),
            url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1800&q=85') center/cover;
          color: white;
          text-align: center;
        }

        .rsvp-section .eyebrow {
          color: var(--gold-light);
        }

        .rsvp-section h2 {
          margin: 15px 0;
          font-family: 'Great Vibes', cursive;
          font-size: clamp(54px, 8vw, 82px);
          font-weight: 400;
        }

        .rsvp-section p {
          max-width: 530px;
          margin: 0 auto;
          color: rgba(255, 255, 255, .78);
          font-size: 11px;
          line-height: 2.1;
        }

        .rsvp-section .primary-button {
          margin-top: 30px;
          border-color: var(--gold-light);
          background: var(--gold-light);
          color: var(--wine);
        }

        .site-footer {
          padding: 45px 24px;
          background: #210911;
          color: white;
          text-align: center;
        }

        .footer-names {
          margin: 0;
          color: var(--gold-light);
          font-family: 'Great Vibes', cursive;
          font-size: 45px;
        }

        .site-footer p {
          color: rgba(255, 255, 255, .65);
          font-size: 9px;
          letter-spacing: 1.5px;
          line-height: 2;
        }

        .footer-share {
          margin-top: 10px;
          border: 0;
          background: transparent;
          color: var(--gold-light);
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .music-button {
          position: fixed;
          z-index: 60;
          right: 22px;
          bottom: 22px;
          display: flex;
          width: 48px;
          height: 48px;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--gold-light);
          border-radius: 50%;
          background: var(--wine);
          color: var(--gold-light);
          font-size: 19px;
          box-shadow: 0 5px 20px rgba(44, 11, 22, .2);
        }

        .music-button.playing {
          animation: musicPulse 2s infinite;
        }

        @keyframes musicPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200, 166, 106, .4); }
          50% { box-shadow: 0 0 0 9px rgba(200, 166, 106, 0); }
        }

        @media (max-width: 960px) {
          .desktop-nav {
            gap: 13px;
          }

          .desktop-nav button {
            font-size: 8px;
            letter-spacing: .5px;
          }

          .header-actions {
            gap: 12px;
          }

          .header-actions .share-button {
            padding: 10px;
            font-size: 8px;
          }

          .brand-name {
            font-size: 21px;
          }

          .brand-caption {
            font-size: 7px;
            letter-spacing: 1.3px;
          }

          .gallery-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .gallery-item,
          .gallery-item img {
            min-height: 300px;
          }
        }

        @media (max-width: 720px) {
          html {
            scroll-padding-top: 70px;
          }

          .header-inner {
            width: calc(100% - 32px);
            min-height: 72px;
          }

          .desktop-nav {
            position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  display: none;
  align-items: stretch;
  flex-direction: column;
  gap: 0;
  max-height: calc(100dvh - 72px);
  overflow-y: auto;
  padding: 8px 22px 20px;
  border-bottom: 1px solid rgba(200, 166, 106, .35);
  background: var(--cream);
  box-shadow: 0 12px 24px rgba(44, 11, 22, .12);
          }

          .desktop-nav.menu-open {
            display: flex;
          }

          .desktop-nav button {
            padding: 16px 0;
            border-bottom: 1px solid var(--cream-dark);
            font-size: 10px;
            text-align: left;
          }

         
.menu-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

          .header-actions .share-button {
            display: none;
          }

          .hero {
            min-height: 680px;
            padding: 80px 25px;
          }

          .hero::before {
            inset: 10px;
          }

          .hero h1 {
            font-size: clamp(65px, 14vw, 95px);
          }

          .section {
            padding: 78px 22px;
          }

          .story-grid,
          .location-grid,
          .wishes-grid {
            grid-template-columns: 1fr;
            gap: 34px;
          }

          .story-image {
            height: 420px;
          }

          .story-copy {
            text-align: center;
          }

          .story-copy .section-heading {
            font-size: 53px;
          }

          .story-copy .ornament {
            margin-left: auto;
            margin-right: auto;
          }

          .countdown-section {
            padding: 70px 18px;
          }

          .countdown-grid {
            gap: 8px;
          }

          .countdown-item {
            padding: 17px 4px;
          }

          .countdown-label {
            font-size: 7px;
            letter-spacing: 1px;
          }

          .event-grid {
            grid-template-columns: 1fr;
          }

          .event-card {
            padding: 32px 24px;
          }

          .gallery-grid {
            gap: 10px;
          }

          .gallery-item,
          .gallery-item img {
            min-height: 230px;
          }

          .gallery-caption {
            font-size: 17px;
          }

          .location-art {
            min-height: 320px;
          }

          .cover-frame {
            inset: 10px;
          }

          .cover-card {
            width: min(400px, calc(100% - 28px));
            max-height: calc(100vh - 28px);
            padding: 26px 20px;
          }
        }

        @media (max-width: 420px) {
          .brand-monogram {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .brand-name {
            font-size: 19px;
          }

          .hero {
            min-height: 620px;
          }

          .hero-date {
            font-size: 9px;
            letter-spacing: 2px;
          }

          .hero-location {
            font-size: 9px;
          }

          .hero-buttons {
            flex-direction: column;
            align-items: center;
          }

          .hero-buttons a,
          .hero-buttons button {
            width: min(270px, 100%);
          }

          .countdown-number {
            font-size: 31px;
          }

          .countdown-grid {
            gap: 5px;
          }

          .gallery-item,
          .gallery-item img {
            min-height: 185px;
          }

          .gallery-caption {
            padding: 22px 7px 10px;
            font-size: 15px;
          }

          .cover-card {
            max-height: calc(100vh - 24px);
            padding: 22px 18px;
          }

          .cover-card h1 {
            font-size: clamp(38px, 12vw, 48px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
        .invitation-cover .curtain {
    transition-duration: 0.3s;
  }
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {coverVisible && (
  <div
    className={`invitation-cover ${invitationOpened ? "opened" : ""}`}
    aria-label="Wedding invitation opening"
  >
    <div className="cover-background" aria-hidden="true" />
    <div className="cover-frame" aria-hidden="true" />

    {/* Left and right burgundy curtains */}
    <div className="curtain curtain-left" aria-hidden="true" />
    <div className="curtain curtain-right" aria-hidden="true" />

    {/* Invitation card stays above the curtains */}
    <div className="cover-card">
      <div className="cover-monogram">
        R <span>&amp;</span> N
      </div>

      <div className="eyebrow">Together with our families</div>

      <h1>Rafith &amp; Nishat</h1>

      <div className="ornament">✦</div>

      <p>
        Request the pleasure of your company as we begin our forever
      </p>

      <div className="cover-date">15 · 03 · 2027</div>

      <span className="eyebrow">With love and gratitude</span>

      <button
        className="cover-open-button"
        type="button"
        onClick={openInvitation}
        disabled={invitationOpened}
      >
        <span aria-hidden="true">✦</span>
        Open Invitation
        <span aria-hidden="true">✦</span>
      </button>
    </div>
  </div>
)}

      <div className="site-shell">
        <header className="site-header">
          <div className="header-inner">
            <button
              type="button"
              className="brand"
              onClick={() => scrollToSection('home')}
              aria-label="Go to home"
              style={{ border: 0, padding: 0, background: 'transparent', textAlign: 'left' }}
            >
              <span className="brand-monogram">R &amp; N</span>
              <span>
                <span className="brand-name">Rafith &amp; Nishat</span>
                <span className="brand-caption">Our Wedding Celebration</span>
              </span>
            </button>

            ?

            <div className="header-actions">
              <button
                type="button"
                className="share-button"
                onClick={() => void shareInvitation()}
              >
                Share Invitation ↗
              </button>

              <button
                type="button"
                className="menu-toggle"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? '×' : '☰'}
              </button>
            </div>
          </div>
        </header>

        <main>
          <section
  className="hero"
  id="home"
  style={{
    backgroundImage: `linear-gradient(rgba(44, 11, 22, 0.40), rgba(44, 11, 22, 0.55)), url("${weddingPhoto}")`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  }}
>
            <div className="hero-content">
              <div className="eyebrow">Two hearts, one beautiful journey</div>

              <h1>
                Rafith <span className="hero-ampersand">&amp;</span> Nishat
              </h1>

              <p className="hero-subtitle">A celebration of love and togetherness</p>

              <div className="hero-divider" />

              <div className="hero-date">Monday · March 15, 2027 · 12:00 PM</div>

              <div className="hero-location">
                Tarafder Nibash · Fathepur, Jashore
              </div>

              <div className="hero-buttons">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => scrollToSection('celebration')}
                >
                  Explore the Celebration
                </button>

                <button
                  type="button"
                  className="outline-button"
                  onClick={() => void shareInvitation()}
                >
                  Share Our Invitation ↗
                </button>
              </div>
            </div>
          </section>

          <section className="section" id="story">
            <div className="section-inner story-grid">
              <div className="story-image-wrap">
                <img
                  className="story-image"
                  src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1100&q=85"
                  alt="Romantic wedding celebration details"
                  loading="lazy"
                />
              </div>

              <div className="story-copy">
                <div className="eyebrow">A new chapter begins</div>

                <h2 className="section-heading">
                  Two Souls,
                  <br />
                  One Journey
                </h2>

                <div className="ornament">✦</div>

                <p>
                  Some moments become memories, and some memories become the
                  beginning of a lifetime. With grateful hearts and the
                  blessings of our families, we are delighted to invite you
                  to share in one of the most meaningful days of our lives.
                </p>

                <p>
                  Your presence, prayers, and warm wishes will make our
                  celebration even more special as we take our next step
                  together.
                </p>

                <div className="story-signature">With love, Rafith &amp; Nishat</div>
              </div>
            </div>
          </section>

          <section className="countdown-section" aria-label="Wedding countdown">
            <div className="eyebrow">The countdown begins</div>

            <h2>Until Our Forever</h2>

            <p>We cannot wait to celebrate this beautiful day with you.</p>

            <div className="countdown-grid">
              {[
                { label: 'Days', value: countdown.days },
                { label: 'Hours', value: countdown.hours },
                { label: 'Minutes', value: countdown.minutes },
                { label: 'Seconds', value: countdown.seconds },
              ].map((item) => (
                <div className="countdown-item" key={item.label}>
                  <span className="countdown-number">
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <span className="countdown-label">{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="section celebration-section" id="celebration">
            <div className="section-inner">
              <div className="section-top">
                <div className="eyebrow">Save the date</div>
                <h2 className="section-heading">The Celebration</h2>
                <div className="ornament">✦</div>
                <p className="section-intro">
                  A special day shared with family, friends, laughter, and
                  beautiful memories. We would be honoured to celebrate it
                  with you.
                </p>
              </div>

              <div className="event-grid">
                <article className="event-card">
                  <div className="event-icon">♡</div>
                  <h3>The Wedding Celebration</h3>
                  <p>
                    Join us as we celebrate the beginning of our life
                    together, surrounded by the people we love.
                  </p>
                  <p className="event-date">Monday, March 15, 2027</p>
                  <p>12:00 PM Bangladesh Time</p>
                </article>

                <article className="event-card">
                  <div className="event-icon">✧</div>
                  <h3>Come Celebrate With Us</h3>
                  <p>
                    Your presence and blessings would mean the world to us.
                    We look forward to sharing this memorable occasion with
                    our loved ones.
                  </p>
                  <p className="event-date">Tarafder Nibash</p>
                  <p>Fathepur, Jashore Sadar, Bangladesh</p>
                </article>
              </div>
            </div>
          </section>

          <section className="section" id="gallery">
            <div className="section-inner">
              <div className="section-top">
                <div className="eyebrow">Love in every detail</div>
                <h2 className="section-heading">Moments of Romance</h2>
                <div className="ornament">✦</div>
                <p className="section-intro">
                  A little inspiration for the beautiful memories waiting to
                  be made.
                </p>
              </div>

              <div className="gallery-grid">
                {GALLERY.map((item) => (
                  <div className="gallery-item" key={item.title}>
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                    />
                    <div className="gallery-caption">{item.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="section location-section" id="location">
            <div className="section-inner">
              <div className="section-top">
                <div className="eyebrow">We saved you a place</div>
                <h2 className="section-heading">Find Your Way</h2>
                <div className="ornament">✦</div>
                <p className="section-intro">
                  We look forward to welcoming you. Here are the details to
                  help you find our celebration.
                </p>
              </div>

              <div className="location-grid">
                <div className="location-card">
                  <div className="eyebrow">The wedding venue</div>

                  <h3>Tarafder Nibash</h3>

                  <div className="location-detail">
                    <span className="location-detail-icon">⌖</span>
                    <div>
                      <strong>Venue Address</strong>
                      <span>{VENUE}</span>
                    </div>
                  </div>

                  <div className="location-detail">
                    <span className="location-detail-icon">◷</span>
                    <div>
                      <strong>Date &amp; Time</strong>
                      <span>March 15, 2027</span>
                      <span>12:00 PM Bangladesh Time</span>
                    </div>
                  </div>

                  <div className="location-detail">
                    <span className="location-detail-icon">◷</span>
                    <div>
                      <strong>Contact No</strong>
                      <span>+880 1788-151272</span>
                      <span>For any kind of guidance regarding the Wedding or the destinations kindly contact to this number</span>
                    </div>
                  </div>

                  <p>
                    Please plan your journey in advance. Tap the button below
                    to open the shared venue location in Google Maps.
                  </p>

                  <a
                    className="primary-button"
                    href={MAPS_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Google Maps ↗
                  </a>
                </div>

                <div className="location-art">
                  <div className="location-art-content">
                    <div className="eyebrow">A day filled with love</div>
                    <h3>See You There</h3>
                    <p>
                      March 15, 2027
                      <br />
                      Tarafder Nibash · Jashore
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="section wishes-section" id="wishes">
            <div className="section-inner">
              <div className="section-top">
                <div className="eyebrow">A little love goes a long way</div>
                <h2 className="section-heading">Leave Us a Wish</h2>
                <div className="ornament">✦</div>
                <p className="section-intro">
                  Send us your blessings, prayers, and heartfelt messages.
                  We will treasure your kind words as we begin this new
                  chapter.
                </p>
              </div>

              <div className="wishes-grid">
                <div className="wish-form-card">
                  <h3>Share Your Blessings</h3>
                  <p>
                    Leave a little note for the couple. Your kind words will
                    become part of our wedding memories.
                  </p>

                  <form onSubmit={submitWish}>
                    <div className="form-field">
                      <label htmlFor="wish-name">Your Name</label>
                      <input
                        id="wish-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Enter your name"
                        value={wishName}
                        onChange={(event) => setWishName(event.target.value)}
                        maxLength={80}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="wish-message">Your Message</label>
                      <textarea
                        id="wish-message"
                        name="message"
                        placeholder="Write your wishes for the couple..."
                        value={wishMessage}
                        onChange={(event) => setWishMessage(event.target.value)}
                        maxLength={500}
                        required
                      />
                    </div>

                    {wishError && (
                      <p className="form-message error" role="alert">
                        {wishError}
                      </p>
                    )}

                    {wishStatus && (
                      <p className="form-message success" role="status">
                        {wishStatus}
                      </p>
                    )}

                    <button
                      className="primary-button"
                      type="submit"
                      disabled={wishSubmitting}
                    >
                      {wishSubmitting ? 'Sending Your Wish...' : 'Send Your Wishes ♡'}
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="wishes-list-heading">Words from Our Loved Ones</h3>

                  {wishLoading ? (
                    <div className="empty-wishes">Loading your loved ones' wishes...</div>
                  ) : wishes.length === 0 ? (
                    <div className="empty-wishes">
                      {wishError
                        ? wishError
                        : 'Be the first to leave a heartfelt wish for Rafith and Nishat.'}
                    </div>
                  ) : (
                    <div className="wish-list">
                      {wishes.map((wish) => (
                        <article className="wish-card" key={wish.id}>
                          <div className="wish-card-top">
                            <div className="wish-avatar">
                              {wish.name.trim().charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <div className="wish-name">{wish.name}</div>
                              <div className="wish-date">
                                {new Date(wish.created_at).toLocaleDateString(
                                  'en-GB',
                                  {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  },
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="wish-card-message">{wish.message}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rsvp-section" id="rsvp">
            <div className="eyebrow">It would mean the world to us</div>

            <h2>Celebrate With Us</h2>

            <p>
              We look forward to sharing this unforgettable day with our
              family and friends. Please save the date and keep us in your
              prayers as we begin our forever together.
            </p>

            <p style={{ marginTop: 16 }}>
              March 15, 2027 · 12:00 PM
              <br />
              Tarafder Nibash, Fathepur, Jashore
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                window.alert(
                  'Thank you for your love and support! Please contact the hosts directly to confirm your attendance.',
                );
              }}
            >
              Celebrate With Us ♡
            </button>
          </section>
        </main>

        <footer className="site-footer">
          <p className="footer-names">Rafith &amp; Nishat</p>
          <p>15 MARCH 2027 · A DAY TO REMEMBER</p>
          <p>Made with love, for a lifetime of memories.</p>

          <button
            type="button"
            className="footer-share"
            onClick={() => void shareInvitation()}
          >
            Share This Invitation ↗
          </button>
        </footer>

        <audio
          ref={audioRef}
          src="/wedding-music.mp3"
          loop
          preload="none"
          onPlay={() => setMusicPlaying(true)}
          onPause={() => setMusicPlaying(false)}
        />

        <button
          type="button"
          className={`music-button ${musicPlaying ? 'playing' : ''}`}
          onClick={() => void toggleMusic()}
          aria-label={musicPlaying ? 'Pause wedding music' : 'Play wedding music'}
          title={musicPlaying ? 'Pause music' : 'Play music'}
        >
          {musicPlaying ? '♫' : '♪'}
        </button>
      </div>
    </>
  );
}

export default App;