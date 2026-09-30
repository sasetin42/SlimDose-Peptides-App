import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Mail,
  Send,
  Eye,
  Smartphone,
  Monitor,
  RotateCcw,
  Save,
  Copy,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Code2,
  Loader2,
  Tag,
  Settings,
  X,
} from 'lucide-react';
import { DEFAULT_EMAIL_TEMPLATES, EmailTemplateData, COMMON_VARIABLES } from '../utils/emailDefaults';
import { renderEmailTemplate, renderEmailSubject, PRESET_SAMPLE_DATASETS } from '../utils/emailRenderer';
import { fireToast } from './ToastNotification';
import { sendTransactionalEmail, getActiveSmtpConfig, SmtpConfig } from '../services/emailService';
import { LiveEmailViewerModal } from './LiveEmailViewerModal';
import { mirrorEmailTemplateUpsert, mirrorEmailTemplateRemove } from '../lib/convexMirror';
import { db } from '../lib/firebase';
import { collection, getDocs, doc as fsDoc, setDoc as fsSetDoc } from 'firebase/firestore';
import { logAdminAction } from '../lib/audit';

const STORAGE_KEY = 'slimdose_email_templates_v1';
const STORAGE_KEY_V2 = 'slimdose_email_templates_v2'; // primary key read by getStoredTemplateByKey
const FIRESTORE_COLLECTION = 'email_templates';

interface EmailTemplateManagerProps {
  onNavigateToSmtpSettings?: () => void;
}

export const EmailTemplateManager: React.FC<EmailTemplateManagerProps> = ({ onNavigateToSmtpSettings }) => {
  const [templates, setTemplates] = useState<EmailTemplateData[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: EmailTemplateData[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Keep customized templates; update uncustomized ones with the latest default designs
            return DEFAULT_EMAIL_TEMPLATES.map((def) => {
              const custom = parsed.find((p) => p.template_key === def.template_key);
              if (custom && custom.is_customized) {
                // Ensure category and variables match the official specification
                return {
                  ...custom,
                  category: def.category,
                  variables: def.variables,
                };
              }
              return def;
            }).concat(
              parsed.filter((p) => !DEFAULT_EMAIL_TEMPLATES.some((def) => def.template_key === p.template_key))
            );
          }
        }
      }
    } catch (e) {
      console.warn('Error loading email templates from storage:', e);
    }
    return DEFAULT_EMAIL_TEMPLATES;
  });

  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('order-confirmed');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [_copiedHtml, setCopiedHtml] = useState<boolean>(false);

  // Live Inspector state
  const [isLiveViewerOpen, setIsLiveViewerOpen] = useState(false);
  const [liveViewerData, setLiveViewerData] = useState({
    recipientEmail: '',
    senderEmail: '',
    senderName: '',
    subject: '',
    htmlContent: '',
    provider: '',
    host: '',
    port: 465,
    referenceId: '',
  });

  // Active Template Working Buffer
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.template_key === selectedTemplateKey) || templates[0];
  }, [templates, selectedTemplateKey]);

  const [editSubject, setEditSubject] = useState<string>(currentTemplate?.subject || '');
  const [editHtml, setEditHtml] = useState<string>(currentTemplate?.html_content || '');
  const [editName, setEditName] = useState<string>(currentTemplate?.name || '');
  const [editDescription, setEditDescription] = useState<string>(currentTemplate?.description || '');

  // Keep editor state synced when selected template switches
  useEffect(() => {
    if (currentTemplate) {
      setEditSubject(currentTemplate.subject);
      setEditHtml(currentTemplate.html_content);
      setEditName(currentTemplate.name);
      setEditDescription(currentTemplate.description);

      // Auto-select relevant sample context for OTP / customer templates
      if (currentTemplate.category === 'customer' || currentTemplate.template_key.includes('otp')) {
        setSelectedSampleIndex(2); // Customer Account / OTP (Sofia)
      } else if (currentTemplate.template_key === 'order-shipped' || currentTemplate.template_key === 'order-dispatched') {
        setSelectedSampleIndex(1); // Shipped order with tracking
      }
    }
  }, [currentTemplate?.template_key]);

  // Active SMTP Relay Configuration
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => getActiveSmtpConfig());
  useEffect(() => {
    setSmtpConfig(getActiveSmtpConfig());
  }, []);

  // Test Email Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState(smtpConfig.adminEmail || 'noreply@slimdoseph.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // New Custom Template Modal State
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateKey, setNewTemplateKey] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<'orders' | 'marketing' | 'customer' | 'system'>('marketing');

  // Textarea Ref for cursor insertion
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Filtered Templates List (archived templates stay out of the library)
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (t.archived === true) return false;
      const matchCat = activeCategory === 'all' || t.category === activeCategory;
      const matchQuery =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.template_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [templates, activeCategory, searchQuery]);

  // Live Render Context
  const activeSampleData = useMemo(() => {
    return PRESET_SAMPLE_DATASETS[selectedSampleIndex]?.data || PRESET_SAMPLE_DATASETS[0].data;
  }, [selectedSampleIndex]);

  const renderedPreviewHtml = useMemo(() => {
    return renderEmailTemplate(editHtml, activeSampleData);
  }, [editHtml, activeSampleData]);

  const renderedPreviewSubject = useMemo(() => {
    return renderEmailSubject(editSubject, activeSampleData);
  }, [editSubject, activeSampleData]);

  // Detect dirty state
  const isDirty = useMemo(() => {
    if (!currentTemplate) return false;
    return (
      editSubject !== currentTemplate.subject ||
      editHtml !== currentTemplate.html_content ||
      editName !== currentTemplate.name ||
      editDescription !== currentTemplate.description
    );
  }, [currentTemplate, editSubject, editHtml, editName, editDescription]);

  // Sender identity overrides (per-template)
  const [editSenderName, setEditSenderName] = useState<string>((currentTemplate as any)?.sender_name || '');
  const [editSenderEmail, setEditSenderEmail] = useState<string>((currentTemplate as any)?.sender_email || '');
  useEffect(() => {
    setEditSenderName((currentTemplate as any)?.sender_name || '');
    setEditSenderEmail((currentTemplate as any)?.sender_email || '');
  }, [currentTemplate?.template_key]);

  // Cloud persistence state
  const [firestoreSynced, setFirestoreSynced] = useState<boolean>(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  // Hydrate customized templates from Firestore on mount (DB is authoritative)
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, FIRESTORE_COLLECTION));
        if (snap.empty) {
          setFirestoreSynced(true);
          return;
        }
        const cloudRows: EmailTemplateData[] = snap.docs.map((d) => ({
          ...(d.data() as any),
          id: (d.data() as any).template_key || d.id,
        }));
        setTemplates((prev) => {
          const merged = prev.map((t) => {
            const cloud = cloudRows.find((c) => c.template_key === t.template_key);
            return cloud ? { ...t, ...cloud, category: t.category, variables: t.variables } : t;
          });
          // Include cloud-only custom templates
          for (const c of cloudRows) {
            if (!merged.some((m) => m.template_key === c.template_key)) merged.push(c);
          }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setFirestoreSynced(true);
      } catch (e: any) {
        console.warn('[EmailTemplateManager] Firestore hydration failed:', e);
        setCloudSyncError(e?.message || 'Cloud sync unavailable — changes save locally');
      }
    })();
  }, []);

  /** Persist one template to Firestore (upsert by template_key) */
  const persistTemplateToFirestore = async (template: EmailTemplateData) => {
    try {
      await fsSetDoc(fsDoc(db, FIRESTORE_COLLECTION, template.template_key), {
        template_key: template.template_key,
        name: template.name,
        subject: template.subject,
        description: template.description,
        category: template.category,
        html_content: template.html_content,
        variables: template.variables,
        is_customized: template.is_customized === true,
        is_active: template.is_active !== false,
        archived: template.archived === true,
        sender_name: (template as any).sender_name || '',
        sender_email: (template as any).sender_email || '',
        updated_by: template.updated_by || 'Admin',
        updated_at: new Date().toISOString(),
      }, { merge: true });
      setCloudSyncError(null);
    } catch (e: any) {
      console.warn('[EmailTemplateManager] Firestore persist failed:', e);
      setCloudSyncError(e?.message || 'Cloud save failed — retained locally');
    }
  };

  // Persist templates array to localStorage (+ cloud sync for the touched template)
  const saveTemplatesToStorage = (updatedList: EmailTemplateData[], touchedKey?: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(updatedList));
      setTemplates(updatedList);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('slimdose_email_templates_updated', { detail: updatedList }));
      }
      if (touchedKey) {
        const touched = updatedList.find((t) => t.template_key === touchedKey);
        if (touched) {
          void persistTemplateToFirestore(touched);
          try {
            mirrorEmailTemplateUpsert({
              template_key: touched.template_key,
              name: touched.name,
              subject: touched.subject,
              description: touched.description,
              category: touched.category,
              html_content: touched.html_content,
              variables: touched.variables,
              is_customized: touched.is_customized,
              is_active: touched.is_active !== false,
              updated_by: touched.updated_by || 'Admin',
            });
          } catch {}
        }
      }
    } catch (e) {
      console.error('Failed to save email templates to storage:', e);
    }
  };

  // Sync a single template to Convex DB (fire-and-forget)
  const syncTemplateToConvex = (template: EmailTemplateData) => {
    try {
      mirrorEmailTemplateUpsert({
        template_key: template.template_key,
        name: template.name,
        subject: template.subject,
        description: template.description,
        category: template.category,
        html_content: template.html_content,
        variables: template.variables,
        is_customized: template.is_customized,
        is_active: true,
        updated_by: 'Admin',
      });
    } catch (e) {
      console.warn('[EmailTemplateManager] Convex sync failed (non-blocking):', e);
    }
  };

  // 1-Click Insert Variable Chip
  const insertVariableChip = (varKey: string) => {
    const tag = `{{ ${varKey} }}`;
    const textarea = htmlTextareaRef.current;
    if (!textarea) {
      setEditHtml((prev) => prev + `\n${tag}`);
      fireToast(`Appended ${tag}`, 'info');
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + tag + text.substring(end);
    setEditHtml(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);

    fireToast(`Inserted ${tag} at cursor`, 'info');
  };

  // Save current template changes
  const handleSaveTemplate = () => {
    setIsSaving(true);
    try {
      const updatedList = templates.map((t) => {
        if (t.template_key === currentTemplate.template_key) {
          return {
            ...t,
            name: editName,
            description: editDescription,
            subject: editSubject,
            html_content: editHtml,
            sender_name: editSenderName,
            sender_email: editSenderEmail,
            is_customized: true,
            is_active: t.is_active !== false,
            updated_by: 'Admin',
            updated_at: new Date().toISOString(),
          } as EmailTemplateData;
        }
        return t;
      });

      saveTemplatesToStorage(updatedList, currentTemplate.template_key);

      logAdminAction('update_email_template', {
        module: 'email-templates',
        record_id: currentTemplate.template_key,
        details: editName,
      });
      fireToast(`Template "${editName}" saved successfully! 🎉`, 'success');
    } catch (err: any) {
      fireToast(`Error saving template: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  /** Publish / unpublish a template (inactive templates are skipped by senders) */
  const handleToggleActive = (template: EmailTemplateData) => {
    const nextActive = !(template.is_active !== false);
    const updatedList = templates.map((t) =>
      t.template_key === template.template_key ? { ...t, is_active: nextActive, updated_at: new Date().toISOString() } : t
    );
    saveTemplatesToStorage(updatedList, template.template_key);
    logAdminAction(nextActive ? 'publish_email_template' : 'unpublish_email_template', {
      module: 'email-templates',
      record_id: template.template_key,
      details: template.name,
    });
    fireToast(`Template "${template.name}" ${nextActive ? 'published' : 'unpublished (senders will fall back to defaults)'}.`, nextActive ? 'success' : 'info');
  };

  /** Archive / restore — archived templates are hidden from the library */
  const handleToggleArchived = (template: EmailTemplateData) => {
    const nextArchived = !(template.archived === true);
    const updatedList = templates.map((t) =>
      t.template_key === template.template_key ? { ...t, archived: nextArchived, updated_at: new Date().toISOString() } : t
    );
    saveTemplatesToStorage(updatedList, template.template_key);
    logAdminAction(nextArchived ? 'archive_email_template' : 'restore_email_template', {
      module: 'email-templates',
      record_id: template.template_key,
      details: template.name,
    });
    fireToast(`Template "${template.name}" ${nextArchived ? 'archived' : 'restored'}.`, 'info');
  };

  /** Duplicate the current template as a new custom template */
  const handleDuplicateTemplate = () => {
    if (!currentTemplate) return;
    const baseKey = `${currentTemplate.template_key}-copy`;
    let key = baseKey;
    let n = 2;
    while (templates.some((t) => t.template_key === key)) {
      key = `${baseKey}-${n++}`;
    }
    const copy: EmailTemplateData = {
      ...currentTemplate,
      id: `custom_${Date.now()}`,
      template_key: key,
      name: `${currentTemplate.name} (Copy)`,
      is_customized: true,
      is_active: false,
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updatedList = [...templates, copy];
    saveTemplatesToStorage(updatedList, key);
    logAdminAction('duplicate_email_template', {
      module: 'email-templates',
      record_id: key,
      details: `From ${currentTemplate.template_key}`,
    });
    setSelectedTemplateKey(key);
    fireToast(`Duplicated as "${copy.name}" — unpublish until you edit it.`, 'success');
  };

  // Restore factory default for current template
  const handleResetToDefault = () => {
    const defaultTemplate = DEFAULT_EMAIL_TEMPLATES.find(
      (t) => t.template_key === currentTemplate.template_key,
    );
    if (!defaultTemplate) {
      fireToast('This is a custom user template; no factory default exists.', 'warning');
      return;
    }

    if (window.confirm(`Reset template "${currentTemplate.name}" to official factory default?`)) {
      setEditSubject(defaultTemplate.subject);
      setEditHtml(defaultTemplate.html_content);
      setEditName(defaultTemplate.name);
      setEditDescription(defaultTemplate.description);

      const updatedList = templates.map((t) => {
        if (t.template_key === currentTemplate.template_key) {
          return { ...defaultTemplate, is_customized: false, updated_at: new Date().toISOString() };
        }
        return t;
      });

      saveTemplatesToStorage(updatedList);

      // Sync reset template to Convex
      const reset = updatedList.find((t) => t.template_key === currentTemplate.template_key);
      if (reset) syncTemplateToConvex(reset);

      fireToast(`Template reset to official factory default. 🔄`, 'info');
    }
  };

  // Reset ALL templates to official factory defaults
  const handleResetAllToDefaults = () => {
    if (window.confirm('Reset ALL email templates to factory defaults? All custom edits will be replaced.')) {
      saveTemplatesToStorage(DEFAULT_EMAIL_TEMPLATES);
      const defaultCurrent = DEFAULT_EMAIL_TEMPLATES.find((t) => t.template_key === selectedTemplateKey) || DEFAULT_EMAIL_TEMPLATES[0];
      setEditSubject(defaultCurrent.subject);
      setEditHtml(defaultCurrent.html_content);
      setEditName(defaultCurrent.name);
      setEditDescription(defaultCurrent.description);

      // Sync all defaults to cloud + Convex
      DEFAULT_EMAIL_TEMPLATES.forEach(async (t) => {
        try { await persistTemplateToFirestore(t); } catch {}
        try { syncTemplateToConvex(t); } catch {}
      });

      fireToast('All email templates reset to defaults! 📦', 'success');
    }
  };

  // Create new template
  const handleCreateNewTemplate = () => {
    if (!newTemplateName.trim()) {
      fireToast('Please enter a template name', 'warning');
      return;
    }
    const cleanKey = (newTemplateKey.trim() || newTemplateName.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (templates.some((t) => t.template_key === cleanKey)) {
      fireToast('A template with this key already exists', 'error');
      return;
    }

    const baseDefault = DEFAULT_EMAIL_TEMPLATES[0];
    const newEntry: EmailTemplateData = {
      id: `custom_${Date.now()}`,
      template_key: cleanKey,
      name: newTemplateName.trim(),
      subject: `[SlimDose] ${newTemplateName.trim()} — {{ customer_name }}`,
      description: `Custom ${newTemplateCategory} email template.`,
      category: newTemplateCategory,
      html_content: baseDefault.html_content,
      variables: COMMON_VARIABLES[newTemplateCategory] || COMMON_VARIABLES.orders,
      is_customized: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [...templates, newEntry];
    saveTemplatesToStorage(updated);
    setSelectedTemplateKey(cleanKey);
    setIsNewTemplateModalOpen(false);
    setNewTemplateName('');
    setNewTemplateKey('');

    // Sync new template to Convex
    syncTemplateToConvex(newEntry);

    fireToast(`New template "${newEntry.name}" created! ✨`, 'success');
  };

  // Delete custom template
  const handleDeleteTemplate = () => {
    const isBuiltIn = DEFAULT_EMAIL_TEMPLATES.some((t) => t.template_key === currentTemplate.template_key);
    if (isBuiltIn) {
      fireToast('Built-in system templates cannot be deleted, but you can edit or reset them.', 'warning');
      return;
    }

    if (window.confirm(`Delete custom template "${currentTemplate.name}"?`)) {
      const updated = templates.filter((t) => t.template_key !== currentTemplate.template_key);
      saveTemplatesToStorage(updated);
      setSelectedTemplateKey(updated[0]?.template_key || 'order-confirmed');

      // Remove from Convex DB
      try { mirrorEmailTemplateRemove(currentTemplate.id); } catch (e) {}

      fireToast(`Template "${currentTemplate.name}" deleted.`, 'info');
    }
  };

  // Copy HTML to clipboard
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(editHtml);
    setCopiedHtml(true);
    fireToast('Template HTML copied to clipboard! 📋', 'success');
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  // Download HTML File
  const handleDownloadHtml = () => {
    const blob = new Blob([editHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `slimdose-${currentTemplate.template_key}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    fireToast(`Downloaded slimdose-${currentTemplate.template_key}.html 💾`, 'success');
  };

  // Send Test Email via Active SMTP
  const handleSendTestEmail = async () => {
    if (!testRecipientEmail || !testRecipientEmail.includes('@')) {
      fireToast('Please enter a valid recipient email address', 'warning');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const config = getActiveSmtpConfig();
      const testSubj = `[TEST PREVIEW] ${renderedPreviewSubject}`;

      setLiveViewerData({
        recipientEmail: testRecipientEmail,
        senderEmail: config.fromEmail || 'noreply@slimdoseph.com',
        senderName: config.fromName || 'SlimDose Peptides',
        subject: testSubj,
        htmlContent: renderedPreviewHtml,
        provider: config.provider.toUpperCase(),
        host: config.host,
        port: config.port,
        referenceId: 'HD-VERIF-' + Date.now().toString(36).toUpperCase(),
      });
      setIsLiveViewerOpen(true);
      setIsTestModalOpen(false);

      const res = await sendTransactionalEmail({
        to: testRecipientEmail,
        subject: testSubj,
        html: renderedPreviewHtml,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        smtpConfig: config,
        isTest: true,
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: `Live test email physically delivered to ${testRecipientEmail} via ${res.providerUsed || config.provider.toUpperCase()}! Please check your Inbox and Spam/Promotions folder. (Ref: ${res.messageId || 'CONFIRMED'})`,
        });
        setLiveViewerData((prev) => ({ ...prev, referenceId: res.messageId || prev.referenceId }));
        fireToast(`Test email transmitted to ${testRecipientEmail}! Check your inbox & spam 📬`, 'success');
      } else {
        throw new Error(res.error || 'Failed to dispatch test email');
      }
    } catch (err: any) {
      console.error('Test email send failed:', err);
      setTestResult({
        success: false,
        message: err.message || 'Error communicating with SMTP relay service.',
      });
      fireToast(`Failed to send test: ${err.message}`, 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const availableVariables = currentTemplate?.variables || COMMON_VARIABLES.orders;

  return (
    <div className="space-y-4 text-left max-w-7xl mx-auto pb-24 font-inter">
      {/* ── Studio Header & SMTP Relay Banner ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] shrink-0 shadow-2xs">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Email Template Studio
              </h1>
              {/* SMTP Relay Status Badge */}
              <div
                onClick={() => onNavigateToSmtpSettings && onNavigateToSmtpSettings()}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border cursor-pointer transition-all ${
                  smtpConfig.enabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:border-amber-400'
                }`}
                title="Click to view/edit SMTP Relay settings in Site Settings"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    smtpConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>
                  SMTP Relay: {smtpConfig.enabled ? `${smtpConfig.provider.toUpperCase()} Active` : 'Disabled'}
                </span>
                <Settings className="w-3 h-3 text-slate-400 ml-0.5" />
              </div>

              {isDirty && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Edit, preview, and test live transactional &amp; marketing email layouts with dynamic merge tags.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          <button
            type="button"
            onClick={() => setIsTestModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-[#3C6CA8]" />
            <span>Send Test Email</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicateTemplate}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Duplicate this template as a new custom template"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleActive(currentTemplate)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTemplate?.is_active !== false
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title="Publish / unpublish — unpublished templates are skipped by senders"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{currentTemplate?.is_active !== false ? 'Published' : 'Unpublished'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleArchived(currentTemplate)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTemplate?.archived === true
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title="Archive hides this template from the library"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{currentTemplate?.archived === true ? 'Archived' : 'Archive'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#264874] text-white text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Template</span>
          </button>
        </div>
      </div>

      {!firestoreSynced && !cloudSyncError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 rounded-xl text-[11px] font-bold text-[#3C6CA8]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing templates from cloud…
        </div>
      )}
      {cloudSyncError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] font-bold text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {cloudSyncError}
        </div>
      )}

      {/* ── Category & Template Selector Strip ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {[
            { id: 'all', label: 'All Templates' },
            { id: 'orders', label: 'Order Notifications' },
            { id: 'marketing', label: 'Promotions & Retention' },
            { id: 'customer', label: 'Customer Relations' },
            { id: 'system', label: 'System Alerts' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & New Template Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-[#3C6CA8]"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsNewTemplateModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#3C6CA8]/10 hover:bg-[#315A8E]/20 text-[#3C6CA8] border border-[#3C6CA8]/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* ── Main Split View Grid (Editor Left / Live Sandbox Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN (5 Cols): Template Directory & Code Editor ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* Template Selector Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
              Active Template Selection
            </label>
            <select
              value={selectedTemplateKey}
              onChange={(e) => {
                const newKey = e.target.value;
                setSelectedTemplateKey(newKey);
                const target = templates.find((t) => t.template_key === newKey);
                if (target && activeCategory !== 'all' && target.category !== activeCategory) {
                  setActiveCategory(target.category);
                }
              }}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none cursor-pointer"
            >
              {activeCategory === 'all' && !searchQuery.trim() ? (
                <>
                  <optgroup label="📦 Order Notifications">
                    {templates.filter((t) => t.category === 'orders').map((t) => (
                      <option key={t.template_key} value={t.template_key}>
                        {t.name} ({t.template_key})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🎁 Promotions & Retention">
                    {templates.filter((t) => t.category === 'marketing').map((t) => (
                      <option key={t.template_key} value={t.template_key}>
                        {t.name} ({t.template_key})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="👤 Customer Relations & Auth">
                    {templates.filter((t) => t.category === 'customer').map((t) => (
                      <option key={t.template_key} value={t.template_key}>
                        {t.name} ({t.template_key})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="⚙️ System Alerts">
                    {templates.filter((t) => t.category === 'system').map((t) => (
                      <option key={t.template_key} value={t.template_key}>
                        {t.name} ({t.template_key})
                      </option>
                    ))}
                  </optgroup>
                </>
              ) : (
                filteredTemplates.map((t) => (
                  <option key={t.template_key} value={t.template_key}>
                    {t.name} ({t.template_key})
                  </option>
                ))
              )}
            </select>

            {/* Template Metadata Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">Template Title</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-[#3C6CA8]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">Category</label>
                <span className="block px-3 py-1.5 text-xs font-bold uppercase rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {currentTemplate?.category || 'orders'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400">Sender Name (optional override)</label>
                  <input
                    type="text"
                    value={editSenderName}
                    onChange={(e) => setEditSenderName(e.target.value)}
                    placeholder="e.g. SlimDose Orders"
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-[#3C6CA8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400">Sender Email (optional override)</label>
                  <input
                    type="email"
                    value={editSenderEmail}
                    onChange={(e) => setEditSenderEmail(e.target.value)}
                    placeholder="e.g. orders@slimdoseph.com"
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-[#3C6CA8]"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">
                  Email Subject Line (Supports Dynamic Variables)
                </label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="e.g. Order #{{ order_number }} Confirmed! — SlimDose Peptides"
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Merge Tags Palette */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#3C6CA8]" />
                <span>Available Merge Tags (Click to Insert at Cursor)</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {availableVariables.length} tags available
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 custom-scrollbar">
              {availableVariables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariableChip(v.key)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-blue-50/80 hover:bg-blue-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#3C6CA8] dark:text-blue-300 border border-blue-200/70 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                  title={`Example: "${v.example}"`}
                >
                  <span>{`{{ ${v.key} }}`}</span>
                </button>
              ))}
            </div>
          </div>

          {/* HTML Source Editor */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#3C6CA8]" />
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  HTML Body Template Source
                </span>
              </div>

              {/* Utility Tools */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                  title="Copy HTML to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                  title="Download HTML file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 transition-colors"
                  title="Reset this template to factory default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {!DEFAULT_EMAIL_TEMPLATES.some((t) => t.template_key === currentTemplate?.template_key) && (
                  <button
                    type="button"
                    onClick={handleDeleteTemplate}
                    className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition-colors"
                    title="Delete custom template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              ref={htmlTextareaRef}
              value={editHtml}
              onChange={(e) => setEditHtml(e.target.value)}
              rows={18}
              className="w-full p-3.5 text-[11px] font-mono leading-relaxed rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-950 text-emerald-400 selection:bg-[#3C6CA8] selection:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/40 resize-y custom-scrollbar"
              spellCheck={false}
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>{editHtml.length.toLocaleString()} characters</span>
              <button
                type="button"
                onClick={handleResetAllToDefaults}
                className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors font-bold underline"
              >
                Reset All Templates to Defaults
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (6 Cols): Live Interactive Preview ── */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 sticky top-4">
            {/* Preview Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#3C6CA8]" />
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Live Viewport Preview
                </span>
              </div>

              {/* Sample Dataset & Viewport Switches */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {/* Dataset Selector */}
                <select
                  value={selectedSampleIndex}
                  onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  {PRESET_SAMPLE_DATASETS.map((ds, idx) => (
                    <option key={ds.name} value={idx}>
                      Sample: {ds.name}
                    </option>
                  ))}
                </select>

                {/* Device Viewport Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setViewportMode('desktop')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewportMode === 'desktop'
                        ? 'bg-white dark:bg-slate-900 text-[#3C6CA8] shadow-2xs font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title="Desktop Preview (560px container)"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('mobile')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewportMode === 'mobile'
                        ? 'bg-white dark:bg-slate-900 text-[#3C6CA8] shadow-2xs font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title="Mobile Viewport (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Email Header Preview Simulation */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>
                  <strong>From:</strong> {smtpConfig.fromName} &lt;{smtpConfig.fromEmail}&gt;
                </span>
                <span>{new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="text-slate-700 dark:text-slate-200 text-[11px]">
                <strong>To:</strong> {activeSampleData.customer_name} &lt;{activeSampleData.customer_email}&gt;
              </div>
              <div className="font-extrabold text-slate-900 dark:text-white pt-0.5 truncate">
                <strong>Subject:</strong> {renderedPreviewSubject}
              </div>
            </div>

            {/* Rendered HTML Container */}
            <div className="flex justify-center bg-slate-100 dark:bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[580px]">
              <div
                className={`transition-all duration-300 bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-800 ${
                  viewportMode === 'desktop' ? 'w-full max-w-[560px]' : 'w-[375px] max-w-full'
                }`}
              >
                <iframe
                  title="Live Email Preview"
                  srcDoc={renderedPreviewHtml}
                  className="w-full h-[620px] border-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: Send Test Email via Active SMTP ── */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <Send className="w-4 h-4 text-[#3C6CA8]" />
                <span>Send Test Email via SMTP</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTestModalOpen(false);
                  setTestResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This will render template <strong>"{currentTemplate?.name}"</strong> using sample dataset and dispatch it through your active <strong>{smtpConfig.provider.toUpperCase()}</strong> relay.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={testRecipientEmail}
                onChange={(e) => setTestRecipientEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-700 dark:text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsTestModalOpen(false);
                  setTestResult(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
                className="px-4 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Test</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Create New Template ── */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <Plus className="w-4 h-4 text-[#3C6CA8]" />
                <span>Create New Custom Email Template</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. Member Special Offer"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Template Key (Slug)
                </label>
                <input
                  type="text"
                  value={newTemplateKey}
                  onChange={(e) => setNewTemplateKey(e.target.value)}
                  placeholder="e.g. member-offer"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="orders">Order Notifications</option>
                  <option value="marketing">Promotions &amp; Marketing</option>
                  <option value="customer">Customer Relations</option>
                  <option value="system">System Alerts</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewTemplate}
                className="px-4 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Realtime Outbound Email Delivery Inspector Modal */}
      <LiveEmailViewerModal
        isOpen={isLiveViewerOpen}
        onClose={() => setIsLiveViewerOpen(false)}
        recipientEmail={liveViewerData.recipientEmail}
        senderEmail={liveViewerData.senderEmail}
        senderName={liveViewerData.senderName}
        subject={liveViewerData.subject}
        htmlContent={liveViewerData.htmlContent}
        provider={liveViewerData.provider}
        host={liveViewerData.host}
        port={liveViewerData.port}
        referenceId={liveViewerData.referenceId}
        isSending={isSendingTest}
      />
    </div>
  );
};

export default EmailTemplateManager;
