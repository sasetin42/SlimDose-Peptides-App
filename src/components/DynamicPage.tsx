import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, Clock, MessageSquare, Shield, 
  Microscope, Snowflake, Zap, Sparkles, Package, FileText, 
  Calculator, ChevronRight, ArrowRight, CheckCircle2 
} from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { useCart } from '../hooks/useCart';
import { supabase } from '../lib/supabase';

interface DynamicPageProps {
  pageId: 'about' | 'contact' | 'shipping_policy' | 'privacy_policy' | 'terms_conditions';
}

const DEFAULT_PAGE_CONTENTS: Record<string, any> = {
  about: {
    title: "About SlimDose Peptides",
    subtitle: "Leading Scientific Innovation in Peptide Research",
    content: "SlimDose Peptides is a premier provider of research-grade peptides and biochemical solutions. We commit ourselves to sourcing the highest quality compounds for laboratory and clinical research applications. Every batch is subject to rigorous quality control processes, including third-party HPLC and Mass Spectrometry analysis to verify identity and purity levels. Our mission is to empower researchers worldwide with reliable, premium products that deliver consistent scientific results.",
    banner_url: "/assets/logo.jpeg",
    seo_title: "About Us - SlimDose Peptides Research Lab",
    seo_description: "Learn about our rigorous testing standards, high-purity guarantees, and mission to advance scientific peptide research."
  },
  contact: {
    title: "Contact Authorized Personnel",
    subtitle: "Get in Touch with our Support Team",
    content: "For inquiries regarding bulk purchases, custom peptide synthesis, or laboratory test verification, please reach out to our support team.",
    email: "support@slimdose.ph",
    phone: "+63 977 813 2630",
    whatsapp: "+63 977 813 2630",
    hours: "Monday - Friday: 9:00 AM - 6:00 PM PHT",
    telegram_group: "https://t.me/+fGtShIUkbB84YzZl",
    seo_title: "Contact Us - SlimDose Peptides",
    seo_description: "Have questions about peptide orders or laboratory results? Contact our customer support team directly."
  },
  shipping_policy: {
    title: "Shipping & Fulfillment Policy",
    content: "All orders are processed within 24-48 business hours. We package our lyophilized peptides in secure, light-protected packaging. For reconstituted solutions (available for Metro Manila J&T/Lalamove delivery only), we ship with medical-grade gel ice packs and insulated thermal bags to preserve peptide stability during transit.\n\nEstimated Delivery Times:\n- Luzon (Metro Manila): 1-2 business days\n- Luzon (Outside NCR): 2-3 business days\n- Visayas & Mindanao: 3-5 business days\n\nShipping rates are calculated automatically at checkout based on region.",
    seo_title: "Shipping Policy - Safe & Temperature-Controlled Delivery",
    seo_description: "Read about our cold-chain shipping practices, insulated packaging, and delivery time estimates for Luzon, Visayas, and Mindanao."
  },
  privacy_policy: {
    title: "Privacy Policy",
    content: "At SlimDose Peptides, we prioritize the confidentiality and security of our research clients. This Privacy Policy details how we collect, process, and safeguard your personal information when you use our website. We do not sell or lease your personal information to third parties. All transaction records, delivery data, and communications are encrypted end-to-end to ensure your administrative records remain confidential and secure.",
    seo_title: "Privacy Policy - SlimDose Peptides",
    seo_description: "Read our privacy policy to understand how we secure your client transaction data and protect your laboratory records."
  },
  terms_conditions: {
    title: "Terms and Conditions",
    content: "All chemical compounds offered by SlimDose Peptides are strictly for laboratory research and in vitro application models. These products are not intended, nor approved, for human consumption, therapeutic, or diagnostic use. By purchasing, the client agrees to take full responsibility for biological safety compliance, laboratory handling protocols, and legal use within their jurisdiction.",
    seo_title: "Terms & Conditions - Chemical Research Agreement",
    seo_description: "Understand our laboratory use agreement, research compliance guidelines, and purchase conditions."
  }
};

export const DynamicPage: React.FC<DynamicPageProps> = ({ pageId }) => {
  const navigate = useNavigate();
  const cart = useCart();
  const [pageData, setPageData] = useState<any>(DEFAULT_PAGE_CONTENTS[pageId]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('page_contents')
          .select('content')
          .eq('page_id', pageId)
          .maybeSingle();

        if (!error && data && data.content) {
          setPageData({
            ...DEFAULT_PAGE_CONTENTS[pageId],
            ...data.content
          });
        }
      } catch (err) {
        console.warn(`Failed to fetch page contents for ${pageId}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, [pageId]);

  // Handle SEO Meta Tags
  useEffect(() => {
    if (!pageData) return;
    
    // Set Document Title
    document.title = pageData.seo_title || pageData.title || "SlimDose Peptides";

    // Set Document Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', pageData.seo_description || pageData.subtitle || "");

    // Cleanup when unmounting or changing page
    return () => {
      document.title = "SlimDose Peptides";
    };
  }, [pageData]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-24 text-charcoal-500 bg-cream-50 dark:bg-[#0F1219]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-accent mr-2"></div>
        <span className="dark:text-gray-300">Loading Page...</span>
      </div>
    );
  }

  return (
    <div className="bg-cream-50 dark:bg-[#0B0D13] min-h-screen text-gray-900 dark:text-gray-100 font-inter transition-colors duration-300">
      <main className="flex-grow">
        {/* Banner Area */}
        <div className="relative bg-navy-900 dark:bg-[#080A0F] text-white overflow-hidden py-12 md:py-16 border-b border-gray-100/10">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B365D]/95 via-[#0F1219]/90 to-[#1B365D]/95 z-10" />
          {pageData.banner_url && (
            <img 
              src={pageData.banner_url} 
              alt={pageData.title}
              className="absolute inset-0 w-full h-full object-cover opacity-15 blur-[3px]" 
            />
          )}
          
          <div className="container-global relative z-10 text-center">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-white transition-colors mb-4 font-semibold px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {pageId === 'about' && (
              <div className="flex justify-center mb-3">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-200 border border-white/15 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Premium Scientific Excellence
                </span>
              </div>
            )}

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2 text-white drop-shadow-sm">
              {pageData.title}
            </h1>
            {pageData.subtitle && (
              <p className="text-sm md:text-base text-blue-100/90 font-medium max-w-2xl mx-auto">
                {pageData.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="container-global py-10 md:py-14">
          {pageId === 'about' ? (
            /* ═══ OPTION A: SCIENTIFIC PRECISION & TRUST GRID ABOUT PAGE ═══ */
            <div className="space-y-8 max-w-5xl mx-auto">
              
              {/* Mission Statement Card */}
              <div className="bg-white dark:bg-[#11151E] rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm p-6 md:p-10 relative overflow-hidden transition-all">
                <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: 'var(--theme-accent, #3C6CA8)' }} />
                <div className="pl-2 md:pl-4">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2.5">
                    <CheckCircle2 className="w-6 h-6 text-theme-accent" style={{ color: 'var(--theme-accent, #3C6CA8)' }} />
                    Our Scientific Commitment
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base md:text-lg font-normal">
                    {pageData.content}
                  </p>
                </div>
              </div>

              {/* 4-Pillar Quality & Trust Grid */}
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-5 text-center md:text-left flex items-center justify-center md:justify-start gap-2">
                  <Shield className="w-5 h-5 text-theme-accent" style={{ color: 'var(--theme-accent, #3C6CA8)' }} />
                  Scientific Standards & Quality Pillars
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  {/* Pillar 1: HPLC & Mass Spectrometry */}
                  <div className="bg-white dark:bg-[#11151E] rounded-2xl border border-gray-200/70 dark:border-gray-800/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mb-4 text-[#3C6CA8] dark:text-blue-400 group-hover:scale-110 transition-transform">
                      <Microscope className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                      Third-Party HPLC & Mass Spectrometry
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Every production batch undergoes independent HPLC and Mass Spectrometry verification to guarantee purity levels exceeding 99% and accurate molecular sequence identity.
                    </p>
                  </div>

                  {/* Pillar 2: Cold-Chain Logistics */}
                  <div className="bg-white dark:bg-[#11151E] rounded-2xl border border-gray-200/70 dark:border-gray-800/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center mb-4 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                      <Snowflake className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                      Temperature-Controlled Cold-Chain Packaging
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Reconstituted items are shipped in insulated thermal bags with medical-grade gel ice packs to ensure optimal temperature preservation throughout transit.
                    </p>
                  </div>

                  {/* Pillar 3: Laboratory Compliance */}
                  <div className="bg-white dark:bg-[#11151E] rounded-2xl border border-gray-200/70 dark:border-gray-800/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                      Strict In-Vitro Laboratory Grade
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Compounds are processed strictly for laboratory research and analytical evaluation models, operating under rigorous biological safety standards.
                    </p>
                  </div>

                  {/* Pillar 4: Rapid Dispatch & Support */}
                  <div className="bg-white dark:bg-[#11151E] rounded-2xl border border-gray-200/70 dark:border-gray-800/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                      Rapid Fulfillment & Direct Support
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      24 to 48 hour order processing with complete order tracking and direct assistance for research teams across Luzon, Visayas, and Mindanao.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Quick Link Shortcuts (Header & Footer Aligned) */}
              <div className="pt-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                  Explore Research Tools & Services
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <a
                    href="/"
                    className="p-4 bg-white dark:bg-[#11151E] rounded-2xl border border-gray-200/70 dark:border-gray-800 flex items-center gap-3.5 hover:border-theme-accent transition-all group shadow-sm"
                  >
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-[#3C6CA8] dark:text-blue-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-gray-900 dark:text-white group-hover:text-theme-accent transition-colors">Catalog</span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate">Explore Peptides</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                  </a>

                  <a
                    href="/coa"
                    className="p-4 bg-white dark:bg-[#11151E] rounded-2xl border border-gray-200/70 dark:border-gray-800 flex items-center gap-3.5 hover:border-theme-accent transition-all group shadow-sm"
                  >
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-[#3C6CA8] dark:text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-gray-900 dark:text-white group-hover:text-theme-accent transition-colors">Lab Tests</span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate">View Batch COAs</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                  </a>

                  <a
                    href="/calculator"
                    className="p-4 bg-white dark:bg-[#11151E] rounded-2xl border border-gray-200/70 dark:border-gray-800 flex items-center gap-3.5 hover:border-theme-accent transition-all group shadow-sm"
                  >
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-gray-900 dark:text-white group-hover:text-theme-accent transition-colors">Calculator</span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate">Reconstitution Math</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                  </a>

                  <a
                    href="https://t.me/+fGtShIUkbB84YzZl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-white dark:bg-[#11151E] rounded-2xl border border-gray-200/70 dark:border-gray-800 flex items-center gap-3.5 hover:border-theme-accent transition-all group shadow-sm"
                  >
                    <div className="p-2.5 bg-sky-50 dark:bg-sky-900/30 rounded-xl text-[#0088cc] dark:text-sky-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-gray-900 dark:text-white group-hover:text-theme-accent transition-colors">Community</span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate">Telegram Discussions</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>

            </div>
          ) : (
            /* Standard Contact and Policy Pages */
            <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-[#11151E] rounded-3xl border border-charcoal-100 dark:border-gray-800 shadow-soft p-6 md:p-10">
                {pageId === 'contact' ? (
                  /* Contact Page Specific Layout */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-6">
                      <p className="text-charcoal-600 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                        {pageData.content}
                      </p>
                      
                      <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-charcoal-400 dark:text-gray-400 uppercase tracking-wider">Email Support</span>
                            <a href={`mailto:${pageData.email}`} className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline">{pageData.email}</a>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Phone className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-charcoal-400 dark:text-gray-400 uppercase tracking-wider">Hotline & WhatsApp</span>
                            <a href={`https://wa.me/${pageData.whatsapp.replace(/[^0-9]/g, '')}`} className="text-sm font-semibold text-charcoal-900 dark:text-gray-200 hover:underline">{pageData.phone}</a>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-charcoal-400 dark:text-gray-400 uppercase tracking-wider">Operational Hours</span>
                            <span className="text-sm font-semibold text-charcoal-800 dark:text-gray-200">{pageData.hours}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-cream-50/50 dark:bg-gray-900/40 rounded-2xl border border-charcoal-100 dark:border-gray-800 p-6 flex flex-col justify-between h-fit">
                      <div>
                        <h3 className="text-base font-bold text-charcoal-900 dark:text-white mb-2 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          Join community discussions
                        </h3>
                        <p className="text-xs text-charcoal-500 dark:text-gray-400 leading-relaxed mb-4">
                          Connect with fellow researchers, access protocols, and get real-time batch testing announcements on our Telegram community.
                        </p>
                      </div>
                      <a
                        href={pageData.telegram_group}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-full font-bold text-sm text-center shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        Join Telegram Group
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Standard Policy Page Layout */
                  <div className="prose prose-blue max-w-none dark:prose-invert">
                    <div className="whitespace-pre-line text-charcoal-700 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                      {pageData.content}
                    </div>

                    {pageId === 'terms_conditions' && (
                      <div className="mt-8 p-4 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-2xl text-xs leading-relaxed flex gap-2">
                        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <div>
                          <span className="font-bold block mb-1">Biological Compliance Notice:</span>
                          These materials are strictly for research and laboratory evaluation. Under no circumstances should they be used for diagnostic or human applications.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

