import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCOAPageSetting } from '../hooks/useCOAPageSetting';
import { useCategories } from '../hooks/useCategories';
import { useMenuContext } from '../contexts/MenuContext';
import { useSiteSettings } from '../hooks/useSiteSettings';
import {
  ShoppingCart, Menu as MenuIcon, X, MessageCircle, Calculator, FileText,
  HelpCircle, Truck, BookOpen, Lock, Search, ChevronRight,
  Mail, Sparkles, ArrowRight, Package, User as UserIcon, Pencil
} from 'lucide-react';
import { AdminLoginModal } from './AdminLoginModal';
import { CustomerAuthModal } from './CustomerAuthModal';
import { CustomerDashboard } from './CustomerDashboard';
import { BannerEditModal, BannerData } from './BannerEditModal';
import { fireToast } from './ToastNotification';
import { supabase } from '../lib/supabase';

/* ─── Constants ─── */
const BRAND_BLUE = '#3C6CA8';

interface HeaderProps {
  cartItemsCount: number;
  onCartClick: () => void;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartItemsCount, onCartClick, onMenuClick }) => {
  const { siteSettings } = useSiteSettings();
  const communityTelegramUrl = siteSettings?.community_telegram_url || 'https://t.me/+fGtShIUkbB84YzZl';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState(() => {
    try {
      const cached = localStorage.getItem('slimdose_banner_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.announcement_text) return parsed.announcement_text;
      }
    } catch {}
    return "⚡ FREE cold-chain shipping for Metro Manila orders over ₱5,000! ❄️";
  });
  const [announcementActive, setAnnouncementActive] = useState(() => {
    try {
      const cached = localStorage.getItem('slimdose_banner_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.announcement_active !== undefined) return Boolean(parsed.announcement_active);
      }
    } catch {}
    return true;
  });
  const [bannerData, setBannerData] = useState<BannerData>(() => {
    const defaultData: BannerData = {
      announcement_text: "⚡ FREE cold-chain shipping for Metro Manila orders over ₱5,000! ❄️",
      announcement_active: true,
      background_color: '#3C6CA8',
      text_color: '#FFFFFF',
      display_style: 'marquee',
      link_url: '',
      link_open_new_tab: false
    };
    try {
      const cached = localStorage.getItem('slimdose_banner_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...defaultData, ...parsed };
      }
    } catch {}
    return defaultData;
  });

  const [customer, setCustomer] = useState<any>(() => {
    const saved = localStorage.getItem('slimdose_customer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.full_name?.includes('Demo') || parsed.email?.includes('biotech-research.org')) {
          localStorage.removeItem('slimdose_customer');
          return null;
        }
        return parsed;
      } catch {
        localStorage.removeItem('slimdose_customer');
        return null;
      }
    }
    return null;
  });
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isCustomerDashboardOpen, setIsCustomerDashboardOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('slimdose_customer');
      setCustomer(saved ? JSON.parse(saved) : null);

      try {
        const cachedBanner = localStorage.getItem('slimdose_banner_settings');
        if (cachedBanner) {
          const parsed = JSON.parse(cachedBanner);
          if (parsed.announcement_text !== undefined) setAnnouncementText(parsed.announcement_text);
          if (parsed.announcement_active !== undefined) setAnnouncementActive(Boolean(parsed.announcement_active));
          setBannerData(prev => ({ ...prev, ...parsed }));
        }
      } catch {}
    };
    const handleOpenAuth = () => {
      setIsCustomerAuthOpen(true);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('openCustomerAuth', handleOpenAuth);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('openCustomerAuth', handleOpenAuth);
    };
  }, []);

  const { coaPageEnabled } = useCOAPageSetting();
  const { categories } = useCategories();
  const { menuItems } = useMenuContext();
  const [badgeBounce, setBadgeBounce] = useState(false);
  const prevCountRef = useRef(0);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const handleCategoryChange = (e: CustomEvent) => {
      setActiveCategory(e.detail.categoryId);
    };
    window.addEventListener('categoryChange', handleCategoryChange as EventListener);
    return () => window.removeEventListener('categoryChange', handleCategoryChange as EventListener);
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    if (window.location.pathname !== '/') {
      window.location.href = `/?category=${categoryId}`;
    } else {
      const event = new CustomEvent('categoryChange', { detail: { categoryId } });
      window.dispatchEvent(event);
      onMenuClick();
      setMegaMenuOpen(false);
    }
  };

  /* ─── Current path for active state ─── */
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

  /* ─── Check Admin Session ─── */
  useEffect(() => {
    const checkAdmin = () => {
      const sessionRaw = sessionStorage.getItem('admin_session') || localStorage.getItem('admin_session');
      if (sessionRaw) {
        try {
          const parsed = JSON.parse(sessionRaw);
          if (parsed && (parsed.role === 'admin' || parsed.role === 'super_admin' || parsed.token)) {
            setIsAdmin(true);
            return;
          }
        } catch {}
      }
      setIsAdmin(false);
    };

    checkAdmin();
    window.addEventListener('storage', checkAdmin);
    return () => window.removeEventListener('storage', checkAdmin);
  }, []);

  /* ─── Fetch announcement & Live Sync Listener ─── */
  useEffect(() => {
    const fetchHeaderContent = async () => {
      try {
        // 1. Fetch from page_contents (prefer 'announcement_bar' then 'header' with banner keys)
        const { data, error } = await supabase
          .from('page_contents')
          .select('page_id, content')
          .in('page_id', ['announcement_bar', 'header']);

        let foundContent: any = null;
        if (!error && data && data.length > 0) {
          const barItem = data.find(d => d.page_id === 'announcement_bar' && d.content && (d.content.announcement_text !== undefined || d.content.background_color !== undefined));
          const headerItem = data.find(d => d.page_id === 'header' && d.content && (d.content.announcement_text !== undefined || d.content.background_color !== undefined));
          foundContent = barItem?.content || headerItem?.content || data[0]?.content;
        }

        // 2. Fetch from site_settings as fallback/overlay
        const { data: siteSettingsData } = await supabase
          .from('site_settings')
          .select('*')
          .in('id', ['announcement_text', 'announcement_active', 'announcement_bg_color', 'announcement_text_color', 'announcement_style', 'announcement_link_url']);

        if (siteSettingsData && siteSettingsData.length > 0) {
          const textSetting = siteSettingsData.find(s => s.id === 'announcement_text')?.value;
          const activeSetting = siteSettingsData.find(s => s.id === 'announcement_active')?.value;
          const bgSetting = siteSettingsData.find(s => s.id === 'announcement_bg_color')?.value;
          const textColSetting = siteSettingsData.find(s => s.id === 'announcement_text_color')?.value;
          const styleSetting = siteSettingsData.find(s => s.id === 'announcement_style')?.value;
          const linkSetting = siteSettingsData.find(s => s.id === 'announcement_link_url')?.value;

          foundContent = {
            announcement_text: foundContent?.announcement_text ?? (textSetting !== undefined && textSetting !== '' ? textSetting : undefined),
            announcement_active: foundContent?.announcement_active ?? (activeSetting !== undefined ? activeSetting === 'true' || activeSetting === true : undefined),
            background_color: foundContent?.background_color || bgSetting,
            text_color: foundContent?.text_color || textColSetting,
            display_style: foundContent?.display_style || styleSetting,
            link_url: foundContent?.link_url ?? linkSetting,
            link_open_new_tab: foundContent?.link_open_new_tab
          };
        }

        if (foundContent) {
          if (foundContent.announcement_text !== undefined && foundContent.announcement_text !== null) {
            setAnnouncementText(foundContent.announcement_text);
          }
          if (foundContent.announcement_active !== undefined && foundContent.announcement_active !== null) {
            setAnnouncementActive(foundContent.announcement_active === true || foundContent.announcement_active === 'true');
          }
          setBannerData(prev => {
            const nextData = {
              ...prev,
              announcement_text: foundContent.announcement_text ?? prev.announcement_text,
              announcement_active: foundContent.announcement_active !== undefined ? (foundContent.announcement_active === true || foundContent.announcement_active === 'true') : prev.announcement_active,
              background_color: foundContent.background_color || prev.background_color,
              text_color: foundContent.text_color || prev.text_color,
              display_style: foundContent.display_style || prev.display_style,
              link_url: foundContent.link_url !== undefined ? foundContent.link_url : prev.link_url,
              link_open_new_tab: foundContent.link_open_new_tab ?? prev.link_open_new_tab
            };
            try {
              localStorage.setItem('slimdose_banner_settings', JSON.stringify(nextData));
            } catch {}
            return nextData;
          });
        }
      } catch (err) {
        console.warn('Failed to fetch header announcement:', err);
      }
    };

    fetchHeaderContent();

    const handleBannerLiveUpdate = (e: CustomEvent) => {
      if (e.detail) {
        const d = e.detail;
        if (d.announcement_text !== undefined) setAnnouncementText(d.announcement_text);
        if (d.announcement_active !== undefined) setAnnouncementActive(Boolean(d.announcement_active));
        setBannerData(prev => {
          const next = { ...prev, ...d };
          try {
            localStorage.setItem('slimdose_banner_settings', JSON.stringify(next));
          } catch {}
          return next;
        });
        setAnnouncementDismissed(false);
      }
    };

    window.addEventListener('headerAnnouncementUpdated', handleBannerLiveUpdate as EventListener);

    // Supabase Realtime Subscription for instant cross-tab/cross-device sync
    const channel = supabase
      .channel('header_announcement_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'page_contents', filter: 'page_id=eq.announcement_bar' },
        (payload: any) => {
          if (payload.new && payload.new.content) {
            const c = payload.new.content;
            if (c.announcement_text !== undefined) setAnnouncementText(c.announcement_text);
            if (c.announcement_active !== undefined) setAnnouncementActive(Boolean(c.announcement_active));
            setBannerData(prev => {
              const updated = { ...prev, ...c };
              try {
                localStorage.setItem('slimdose_banner_settings', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            setAnnouncementDismissed(false);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('headerAnnouncementUpdated', handleBannerLiveUpdate as EventListener);
      supabase.removeChannel(channel);
    };
  }, []);

  /* ─── Scroll listener ─── */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ─── Badge bounce ─── */
  useEffect(() => {
    if (cartItemsCount > prevCountRef.current) {
      setBadgeBounce(true);
      const t = setTimeout(() => setBadgeBounce(false), 600);
      return () => clearTimeout(t);
    }
    prevCountRef.current = cartItemsCount;
  }, [cartItemsCount]);

  /* ─── Search focus ─── */
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [searchOpen]);

  /* ─── Lock body scroll when mobile menu open ─── */
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  /* ─── Mega menu hover handlers ─── */
  const handleMegaEnter = useCallback(() => {
    if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
    setMegaMenuOpen(true);
  }, []);
  const handleMegaLeave = useCallback(() => {
    megaMenuTimeoutRef.current = setTimeout(() => setMegaMenuOpen(false), 200);
  }, []);

  /* ─── Search results ─── */
  const searchResults = searchQuery.trim().length > 1
    ? menuItems.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  /* ─── Navigation helper ─── */
  const isActive = (path: string) => currentPath === path;
  const navLinkClass = (path: string) =>
    `relative px-1 py-1 text-[13px] font-medium transition-all duration-300 whitespace-nowrap group ${
      isActive(path)
        ? 'text-[#3C6CA8] dark:text-blue-400'
        : 'text-gray-600 dark:text-gray-300 hover:text-[#3C6CA8] dark:hover:text-blue-400'
    }`;

  const showAnnouncement = announcementActive && announcementText && !announcementDismissed;

  return (
    <>
      {/* ═══ ANNOUNCEMENT BAR ═══ */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          showAnnouncement ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{ backgroundColor: bannerData.background_color || 'var(--theme-accent)' }}
      >
        <div className="relative flex items-center justify-between container-global" style={{ minHeight: '36px', height: 'auto', padding: '6px 1rem' }}>
          <div className="flex-1 overflow-hidden flex items-center justify-center">
            {bannerData.display_style === 'marquee' ? (
              <div className="announcement-marquee flex items-center justify-center">
                {bannerData.link_url ? (
                  <a
                    href={bannerData.link_url}
                    target={bannerData.link_open_new_tab ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="text-[11px] sm:text-xs font-medium tracking-wide whitespace-nowrap hover:underline cursor-pointer"
                    style={{ color: bannerData.text_color || '#FFFFFF' }}
                  >
                    {announcementText}
                  </a>
                ) : (
                  <span
                    className="text-[11px] sm:text-xs font-medium tracking-wide whitespace-nowrap"
                    style={{ color: bannerData.text_color || '#FFFFFF' }}
                  >
                    {announcementText}
                  </span>
                )}
              </div>
            ) : bannerData.display_style === 'pulse' ? (
              <div className="flex items-center justify-center animate-pulse text-center">
                {bannerData.link_url ? (
                  <a
                    href={bannerData.link_url}
                    target={bannerData.link_open_new_tab ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="text-[11px] sm:text-xs font-bold tracking-wide hover:underline cursor-pointer truncate"
                    style={{ color: bannerData.text_color || '#FFFFFF' }}
                  >
                    {announcementText}
                  </a>
                ) : (
                  <span
                    className="text-[11px] sm:text-xs font-bold tracking-wide truncate"
                    style={{ color: bannerData.text_color || '#FFFFFF' }}
                  >
                    {announcementText}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center text-center">
                {bannerData.link_url ? (
                  <a
                    href={bannerData.link_url}
                    target={bannerData.link_open_new_tab ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="text-[11px] sm:text-xs font-medium tracking-wide hover:underline cursor-pointer truncate"
                    style={{ color: bannerData.text_color || '#FFFFFF' }}
                  >
                    {announcementText}
                  </a>
                ) : (
                  <span
                    className="text-[11px] sm:text-xs font-medium tracking-wide truncate"
                    style={{ color: bannerData.text_color || '#FFFFFF' }}
                  >
                    {announcementText}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {/* Admin Only Edit Button Trigger */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsBannerModalOpen(true)}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs border border-white/30 transition-all cursor-pointer shadow-xs hover:scale-105"
                title="Edit Announcement Banner (Admin Only)"
                aria-label="Edit top banner"
              >
                <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden xs:inline">Edit Banner</span>
              </button>
            )}

            <button
              onClick={() => setAnnouncementDismissed(true)}
              className="p-0.5 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/15 flex-shrink-0 cursor-pointer"
              aria-label="Dismiss announcement"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Only: Inactive Banner Indicator Strip */}
      {isAdmin && !showAnnouncement && (
        <div className="bg-slate-900 text-amber-300 text-[11px] font-bold py-1.5 px-3 border-b border-amber-500/20 shadow-xs flex items-center justify-between">
          <div className="container-global flex items-center justify-between w-full">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span className="truncate">
                Admin Notice: Top Announcement Banner is currently <strong>{announcementActive ? 'Dismissed' : 'Disabled / Hidden'}</strong>
              </span>
            </div>
            <button
              onClick={() => setIsBannerModalOpen(true)}
              className="ml-3 px-2.5 py-0.5 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Pencil className="w-2.5 h-2.5" />
              <span>Edit &amp; Enable</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN HEADER ═══ */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 dark:bg-[#0F1219]/95 backdrop-blur-md shadow-sm'
            : 'bg-white dark:bg-[#0F1219] shadow-none'
        }`}
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="container-global">
          <div className="flex items-center h-[60px] lg:h-[64px]">

            {/* ─── LEFT: Logo ─── */}
            <div className="lg:flex-1 flex lg:justify-start min-w-0">
              <button
                onClick={() => { onMenuClick(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity flex-shrink-0 group"
                aria-label="SlimDose Peptides Home"
              >
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 transition-all group-hover:ring-[#3C6CA8]/30 group-hover:shadow-[0_0_0_3px_rgba(60,108,168,0.08)]">
                  <img src="/assets/logo.jpeg" alt="SlimDose Peptides Logo" className="w-full h-full object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-[15px] lg:text-base font-bold leading-tight tracking-[-0.02em] block" style={{ color: BRAND_BLUE }}>
                    SlimDose Peptides
                  </span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">
                    Premium Peptide Solutions
                  </p>
                </div>
              </button>
            </div>

            {/* ─── CENTER: Main Navigation (Desktop) ─── */}
            <nav className="hidden lg:flex items-center gap-3.5 flex-shrink-0">
              <a href="/" className={navLinkClass('/')}>
                Products
                {isActive('/') && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: BRAND_BLUE }} />}
              </a>

              {coaPageEnabled && (
                <a href="/coa" className={navLinkClass('/coa')}>
                  Lab Tests
                  {isActive('/coa') && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: BRAND_BLUE }} />}
                </a>
              )}
              <a href="/track-order" className={navLinkClass('/track-order')}>
                Track Order
                {isActive('/track-order') && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: BRAND_BLUE }} />}
              </a>
              <a href="/calculator" className={navLinkClass('/calculator')}>
                Calculator
                {isActive('/calculator') && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: BRAND_BLUE }} />}
              </a>
              <a href="/faq" className={navLinkClass('/faq')}>
                FAQ
                {isActive('/faq') && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: BRAND_BLUE }} />}
              </a>
              <a
                href="/peptalk"
                onMouseEnter={() => { import('./SmartGuide'); }}
                onFocus={() => { import('./SmartGuide'); }}
                className={navLinkClass('/peptalk')}
              >
                Peptalk
                {isActive('/peptalk') && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: BRAND_BLUE }} />}
              </a>

              {/* Divider */}
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

              <a href="/about" className={navLinkClass('/about')}>
                About
                {isActive('/about') && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: BRAND_BLUE }} />}
              </a>
              <a href="/contact" className={navLinkClass('/contact')}>
                Contact
                {isActive('/contact') && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: BRAND_BLUE }} />}
              </a>
              <a
                href={communityTelegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass('#community')}
              >
                Community
              </a>
            </nav>

            {/* ─── RIGHT: Actions ─── */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto lg:ml-0 lg:flex-1 lg:justify-end">
              {/* Search Button (Desktop / Tablet only) */}
              <button
                onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); }}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100/80 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-[#3C6CA8] dark:hover:text-blue-400 border border-gray-200/60 dark:border-gray-700/60 transition-all shadow-2xs cursor-pointer group"
                aria-label="Toggle search bar"
                aria-expanded={searchOpen}
              >
                <Search className="w-3.5 h-3.5 text-[#3C6CA8] dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Search</span>
              </button>

              {/* Vertical Elegant Divider */}
              <div className="hidden md:block w-[1px] h-5 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-700 to-transparent mx-0.5" />

              {/* Customer Account Button */}
              {customer ? (
                <button
                  onClick={() => setIsCustomerDashboardOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-800 dark:text-gray-100 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/70 text-[#3C6CA8] dark:text-blue-300 transition-all shadow-2xs cursor-pointer group"
                  title={`My Account (${customer.full_name})`}
                  aria-label="My Account"
                >
                  {customer.avatar_url ? (
                    <img src={customer.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover ring-1 ring-[#3C6CA8]" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-[#3C6CA8] dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="max-w-[130px] truncate">
                    {(() => {
                      const parts = customer.full_name.trim().split(' ');
                      if (parts.length > 1 && (parts[0].endsWith('.') || parts[0].toLowerCase() === 'dr' || parts[0].toLowerCase() === 'mr' || parts[0].toLowerCase() === 'ms' || parts[0].toLowerCase() === 'mrs')) {
                        return `${parts[0]} ${parts[1]}`;
                      }
                      return parts[0];
                    })()}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setIsCustomerAuthOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100/80 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-[#3C6CA8] dark:hover:text-blue-400 border border-gray-200/60 dark:border-gray-700/60 transition-all shadow-2xs cursor-pointer group"
                  title="Sign In"
                  aria-label="Sign In"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#3C6CA8] dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Cart Action Button */}
              <button
                id="header-cart-btn"
                onClick={onCartClick}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-[#3C6CA8] hover:bg-[#315A8E] transition-all shadow-md hover:shadow-lg hover:shadow-blue-500/20 cursor-pointer group ml-0.5"
                aria-label={`Shopping cart, ${cartItemsCount} items`}
              >
                <ShoppingCart className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="hidden xs:inline font-medium">Cart</span>
                {cartItemsCount > 0 && (
                  <span
                    className={`text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-amber-500 ring-2 ring-white dark:ring-[#0F1219] shadow-2xs ${
                      badgeBounce ? 'animate-badge-bounce' : ''
                    }`}
                  >
                    {cartItemsCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-[#3C6CA8] dark:hover:text-blue-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800/60"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-drawer"
              >
                <div className="relative w-[18px] h-[18px]">
                  <span className={`absolute inset-0 transition-all duration-300 ${mobileMenuOpen ? 'rotate-90 opacity-0 scale-75' : 'rotate-0 opacity-100 scale-100'}`}>
                    <MenuIcon className="w-[18px] h-[18px]" />
                  </span>
                  <span className={`absolute inset-0 transition-all duration-300 ${mobileMenuOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-75'}`}>
                    <X className="w-[18px] h-[18px]" />
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ═══ SEARCH BAR (Expandable - Desktop/Tablet only) ═══ */}
        {searchOpen && (
          <div className="hidden md:block border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1219] animate-fadeIn">
            <div className="container-global py-3">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input id="header-search" name="search" ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  placeholder="Search peptides, products, categories..."
                  className="w-full pl-11 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent/40 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  aria-label="Search peptides, products, categories"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                    aria-label="Clear search query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-w-2xl mx-auto mt-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                  {searchResults.map((product) => (
                    <a
                      key={product.id}
                      href={`/${product.slug || product.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    >
                      <img
                        src={product.image_url ? product.image_url : '/assets/logo.jpeg'}
                        alt={product.name}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400">₱{product.base_price?.toLocaleString()}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}

              {searchQuery.trim().length > 1 && searchResults.length === 0 && (
                <div className="max-w-2xl mx-auto mt-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 text-center text-sm text-gray-500">
                  No products found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mega Menu Backdrop (Only rendered when active) */}
        {megaMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
            onClick={() => setMegaMenuOpen(false)}
          />
        )}
      </header>

      {/* ═══ MOBILE DRAWER ═══ */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-all duration-300 ${
          mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Drawer Panel */}
        <div
          id="mobile-drawer"
          className={`absolute top-0 right-0 bottom-0 w-[300px] sm:w-[340px] bg-white dark:bg-[#0F1219] shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                <img src="/assets/logo.jpeg" alt="SlimDose Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight" style={{ color: BRAND_BLUE }}>SlimDose</p>
                <p className="text-[9px] uppercase tracking-[0.15em] font-medium text-gray-500 dark:text-gray-400">Premium Peptides</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Search */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="header-search-products" name="search_products" type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3C6CA8]/30 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                aria-label="Search products"
              />
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            {/* Shop Section */}
            <p className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Shop</p>
            <div className="space-y-0.5 mb-4">
              <MobileNavLink icon={<Package className="w-[16px] h-[16px]" />} label="Products" onClick={() => { onMenuClick(); setMobileMenuOpen(false); }} />
              <MobileNavLink icon={<Truck className="w-[16px] h-[16px]" />} label="Track Order" href="/track-order" />
            </div>

            {/* Account Section */}
            <p className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-505">Account</p>
            <div className="space-y-0.5 mb-4">
              {customer ? (
                <>
                  <MobileNavLink 
                    icon={<UserIcon className="w-[16px] h-[16px] text-blue-600 dark:text-blue-400" />} 
                    label={`Portal (${(() => {
                      const parts = (customer.full_name || '').trim().split(' ');
                      if (parts.length > 1 && (parts[0].endsWith('.') || parts[0].toLowerCase() === 'dr' || parts[0].toLowerCase() === 'mr' || parts[0].toLowerCase() === 'ms' || parts[0].toLowerCase() === 'mrs')) {
                        return `${parts[0]} ${parts[1]}`;
                      }
                      return parts[0];
                    })()})`} 
                    onClick={() => { setIsCustomerDashboardOpen(true); setMobileMenuOpen(false); }} 
                  />
                  <MobileNavLink 
                    icon={<Lock className="w-[16px] h-[16px] text-rose-500" />} 
                    label="Logout" 
                    onClick={() => {
                      localStorage.removeItem('slimdose_customer');
                      setCustomer(null);
                      setMobileMenuOpen(false);
                      fireToast('Logged out successfully.', 'success');
                    }} 
                  />
                </>
              ) : (
                <MobileNavLink 
                  icon={<UserIcon className="w-[16px] h-[16px]" />} 
                  label="Sign In / Register" 
                  onClick={() => { setIsCustomerAuthOpen(true); setMobileMenuOpen(false); }} 
                />
              )}
            </div>

            {/* Tools Section */}
            <p className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Tools</p>
            <div className="space-y-0.5 mb-4">
              {coaPageEnabled && <MobileNavLink icon={<FileText className="w-[16px] h-[16px]" />} label="Lab Tests" href="/coa" />}
              <MobileNavLink icon={<Calculator className="w-[16px] h-[16px]" />} label="Calculator" href="/calculator" />
            </div>

            {/* Resources Section */}
            <p className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Resources</p>
            <div className="space-y-0.5 mb-4">
              <MobileNavLink icon={<HelpCircle className="w-[16px] h-[16px]" />} label="FAQ" href="/faq" />
              <MobileNavLink icon={<BookOpen className="w-[16px] h-[16px]" />} label="Peptalk" href="/peptalk" />
              <MobileNavLink icon={<FileText className="w-[16px] h-[16px]" />} label="About Us" href="/about" />
              <MobileNavLink icon={<Mail className="w-[16px] h-[16px]" />} label="Contact" href="/contact" />
            </div>
          </nav>

          {/* Drawer Footer */}
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <a
              href={communityTelegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <MessageCircle className="w-4 h-4" />
              Join Community
            </a>
            <p className="mt-3 text-center text-[10px] text-gray-400 dark:text-gray-500">
              © {new Date().getFullYear()} SlimDose Peptides
            </p>
          </div>
        </div>
      </div>

      <AdminLoginModal isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} />

      {isCustomerAuthOpen && (
        <CustomerAuthModal
          onClose={() => setIsCustomerAuthOpen(false)}
          onLoginSuccess={(cust) => {
            localStorage.setItem('slimdose_customer', JSON.stringify(cust));
            setCustomer(cust);
            setIsCustomerAuthOpen(false);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('customer_auth_success', { detail: cust }));
          }}
        />
      )}

      {isCustomerDashboardOpen && customer && (
        <CustomerDashboard
          customer={customer}
          onClose={() => setIsCustomerDashboardOpen(false)}
          onLogout={() => {
            localStorage.removeItem('slimdose_customer');
            setCustomer(null);
            setIsCustomerDashboardOpen(false);
            window.dispatchEvent(new Event('storage'));
            fireToast('Logged out successfully.', 'success');
          }}
        />
      )}

      {/* ─── Banner Edit Modal (Admin Only) ─── */}
      {isAdmin && (
        <BannerEditModal
          isOpen={isBannerModalOpen}
          onClose={() => setIsBannerModalOpen(false)}
          initialData={bannerData}
          onSaved={(updated) => {
            setBannerData(updated);
            setAnnouncementText(updated.announcement_text);
            setAnnouncementActive(updated.announcement_active);
          }}
        />
      )}

      {/* ─── Scoped styles ─── */}
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .announcement-marquee {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 640px) {
          .announcement-marquee {
            display: inline-flex;
            animation: marquee-scroll 20s linear infinite;
            white-space: nowrap;
          }
          .announcement-marquee span {
            padding-right: 80px;
          }
          .announcement-marquee::after {
            content: attr(data-text);
          }
        }

        /* Nav link underline animation */
        nav a::after,
        nav button.group::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          right: 50%;
          height: 2px;
          background-color: ${BRAND_BLUE};
          border-radius: 999px;
          transition: left 0.3s ease, right 0.3s ease;
        }
        nav a:hover::after,
        nav button.group:hover::after {
          left: 0;
          right: 0;
        }
      `}</style>
    </>
  );
};

/* ─── Mobile Nav Link Component ─── */
const MobileNavLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}> = ({ icon, label, href, onClick }) => {
  const Tag = href ? 'a' : 'button';
  const props = href ? { href } : { onClick };

  return (
    <Tag
      {...(props as any)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-[#3C6CA8] dark:hover:text-blue-400 transition-all text-left group"
    >
      <span className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[#3C6CA8] dark:text-blue-400 border border-gray-100 dark:border-gray-700 transition-all group-hover:border-[#3C6CA8]/30 group-hover:bg-[#3C6CA8]/5 flex-shrink-0">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-[#3C6CA8] dark:group-hover:text-blue-400 transition-all group-hover:translate-x-0.5" />
    </Tag>
  );
};

export default React.memo(Header);
