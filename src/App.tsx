import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Smartphone,
  CheckCheck,
  Store,
  Users,
  ShoppingBag,
  Radio,
  FileCode,
  Settings,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Globe,
  RefreshCw,
  Play,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Save,
  Search,
  UserX,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  Sliders,
  DollarSign,
  Upload,
  Download,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  Info,
  X,
  FileSpreadsheet,
  Activity,
  CheckCircle
} from 'lucide-react';
import { businessConfig as defaultBusinessConfig, envConfig, MenuItem } from './config';

interface ChatMessage {
  id: string;
  sender: 'customer' | 'bot';
  type: 'text' | 'interactive_list' | 'interactive_button' | 'template';
  text?: string;
  payload?: any;
  timestamp: string;
}

interface TemplateOption {
  name: string;
  title: string;
  category: string;
  variables: string[];
  sampleValues: string[];
  previewText: (vars: string[]) => string;
}

const APPROVED_TEMPLATES: TemplateOption[] = [
  {
    name: 'hello_world',
    title: 'Hello World (General Greeting)',
    category: 'Welcome',
    variables: [],
    sampleValues: [],
    previewText: () => '👋 Hello! Welcome to our official WhatsApp Business account. How can we help you today?'
  },
  {
    name: 'seasonal_offer',
    title: 'Seasonal Offer & Discount',
    category: 'Marketing',
    variables: ['Customer Name', 'Discount %', 'Business Name'],
    sampleValues: ['Valued Customer', '20%', 'Spice Garden Bistro'],
    previewText: (v) =>
      `🎉 Special Offer for ${v[0] || 'Valued Customer'}!\nGet ${v[1] || '20%'} off your next order at *${v[2] || 'Spice Garden Bistro'}*. Valid this week only!`
  },
  {
    name: 'order_update_placed',
    title: 'Order Confirmed (Order Placed)',
    category: 'Order Updates',
    variables: ['Customer Name', 'Order ID', 'Total Amount'],
    sampleValues: ['Customer', 'ORD-1001', '₹540'],
    previewText: (v) =>
      `✅ Hello ${v[0] || 'Customer'}, your order *#${v[1] || 'ORD-1001'}* (Total: ${v[2] || '₹540'}) has been confirmed and is being prepared with fresh ingredients!`
  },
  {
    name: 'order_update_ready',
    title: 'Order Ready (Pickup / Delivery)',
    category: 'Order Updates',
    variables: ['Customer Name', 'Order ID', 'Pickup/Delivery Info'],
    sampleValues: ['Customer', 'ORD-1001', 'Counter 1 / Rider assigned'],
    previewText: (v) =>
      `🍲 Good news ${v[0] || 'Customer'}! Your order *#${v[1] || 'ORD-1001'}* is hot and READY! Pickup / Delivery: ${v[2] || 'Counter 1'}. Enjoy!`
  },
  {
    name: 'order_delivery_out',
    title: 'Out for Delivery',
    category: 'Order Updates',
    variables: ['Customer Name', 'Order ID', 'Rider Details'],
    sampleValues: ['Customer', 'ORD-1001', 'Rajesh (+91 98765 00000)'],
    previewText: (v) =>
      `🛵 Hello ${v[0] || 'Customer'}, order *#${v[1] || 'ORD-1001'}* is OUT FOR DELIVERY with rider ${v[2] || 'Rajesh'}. ETA: 15-20 mins.`
  },
  {
    name: 'reservation_reminder',
    title: 'Booking / Reservation Reminder',
    category: 'Customer Service',
    variables: ['Customer Name', 'Date & Time', 'Party Size'],
    sampleValues: ['Customer', 'Today at 7:30 PM', '4 Guests'],
    previewText: (v) =>
      `📅 Reminder for ${v[0] || 'Customer'}: Your reservation for ${v[2] || '4 Guests'} is booked for *${v[1] || 'Today at 7:30 PM'}*. See you soon!`
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'simulator' | 'orders' | 'customers' | 'broadcast' | 'settings' | 'webhook' | 'samples' | 'guide'
  >('simulator');

  // Real vs Simulator Dispatch Mode
  const [dispatchMode, setDispatchMode] = useState<'simulator' | 'live'>('simulator');
  const [showLiveModeConfirm, setShowLiveModeConfirm] = useState(false);

  // Meta Connection Status state
  const [metaStatus, setMetaStatus] = useState<{
    tested: boolean;
    loading: boolean;
    connected: boolean;
    configured: boolean;
    isExpired?: boolean;
    phoneNumberId?: string;
    displayPhoneNumber?: string;
    verifiedName?: string;
    errorCode?: number;
    error?: string;
  }>({
    tested: false,
    loading: false,
    connected: false,
    configured: false
  });
  const [showMetaFixModal, setShowMetaFixModal] = useState(false);

  // Customer simulator state
  const [phone, setPhone] = useState('919876543210');
  const [customerName, setCustomerName] = useState('Tushar');
  const [inputMessage, setInputMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedListSection, setSelectedListSection] = useState<any | null>(null);

  // Admin and Data state
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [adminCustomers, setAdminCustomers] = useState<any[]>([]);
  const [adminConversations, setAdminConversations] = useState<any[]>([]);
  const [adminApiKey, setAdminApiKey] = useState(envConfig.adminApiKey || 'wh_admin_secret_key_prod_2026');

  // Settings & Config state
  const [businessSettings, setBusinessSettings] = useState({
    name: defaultBusinessConfig.name,
    category: defaultBusinessConfig.category,
    tagline: defaultBusinessConfig.tagline,
    currency: defaultBusinessConfig.currency,
    hours: defaultBusinessConfig.hours,
    address: defaultBusinessConfig.address,
    supportPhone: defaultBusinessConfig.supportPhone,
    website: defaultBusinessConfig.website,
    welcomeMessageEn: defaultBusinessConfig.welcomeMessageEn || '',
    welcomeMessageHi: defaultBusinessConfig.welcomeMessageHi || '',
    menuItems: [...defaultBusinessConfig.menuItems]
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);
  const [metaCredentials, setMetaCredentials] = useState({
    whatsappToken: '',
    phoneNumberId: envConfig.phoneNumberId || '',
    hasLiveToken: false
  });

  // Menu editor modal/form state
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [newItemForm, setNewItemForm] = useState<Partial<MenuItem>>({
    id: '',
    title: '',
    description: '',
    price: 150,
    category: 'Main Course'
  });

  // Customer page filter and direct messaging state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'subscribed' | 'unsubscribed' | 'paused'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [directMessageText, setDirectMessageText] = useState('');
  const [isSendingDirectMessage, setIsSendingDirectMessage] = useState(false);

  // Modals state
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showImportCsvModal, setShowImportCsvModal] = useState(false);

  // New Message Form state
  const [newMessageForm, setNewMessageForm] = useState({
    phone: '',
    name: '',
    type: 'template' as 'template' | 'text',
    text: '',
    templateName: 'hello_world',
    languageCode: 'en_US',
    variables: ['', '', ''],
    warnLiveSend: false
  });
  const [newMessageResult, setNewMessageResult] = useState<{
    loading: boolean;
    success?: boolean;
    mode?: string;
    status?: string;
    messageId?: string;
    error?: string;
  } | null>(null);

  // Add Customer Form state
  const [addCustomerForm, setAddCustomerForm] = useState({
    name: '',
    phone: '',
    language: 'en' as 'en' | 'hi',
    consentAgreed: false,
    consentText: 'Agreed to receive WhatsApp orders and updates from business'
  });
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);

  // Import CSV Form state
  const [csvRawText, setCsvRawText] = useState(
    'phone,name,language,consent_date\n919876543210,Tushar K,en,2026-10-10\n919811122233,Aarav Sharma,hi,2026-10-11\n919922334455,Priya Patel,en,2026-10-12\n919933445566,Rohan Mehta,en,'
  );
  const [csvImportResult, setCsvImportResult] = useState<{
    summary?: string;
    importedCount?: number;
    skippedNoConsent?: number;
    skippedInvalidPhone?: number;
  } | null>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  // Upgraded Broadcast state
  const [broadcastTemplate, setBroadcastTemplate] = useState('seasonal_offer');
  const [broadcastLang, setBroadcastLang] = useState('en_US');
  const [broadcastDelay, setBroadcastDelay] = useState(500);
  const [broadcastFilterSource, setBroadcastFilterSource] = useState<'all' | 'csv' | 'consent_after'>('all');
  const [broadcastConsentDate, setBroadcastConsentDate] = useState(new Date().toISOString().slice(0, 10));
  const [broadcastLangFilter, setBroadcastLangFilter] = useState<'all' | 'en' | 'hi'>('all');
  const [broadcastTemplateVars, setBroadcastTemplateVars] = useState<string[]>(['Valued Customer', '20%', 'Spice Garden Bistro']);
  const [broadcastConsentConfirmed, setBroadcastConsentConfirmed] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{
    current: number;
    total: number;
    sent: number;
    failed: number;
  }>({ current: 0, total: 0, sent: 0, failed: 0 });
  const [lastBroadcastResult, setLastBroadcastResult] = useState<any | null>(null);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);

  // Webhook Test state
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(envConfig.verifyToken);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [customWebhookPayload, setCustomWebhookPayload] = useState('');
  const [postWebhookResult, setPostWebhookResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Connect to SSE stream for live updates
  useEffect(() => {
    const sse = new EventSource('/api/stream/events');

    sse.addEventListener('whatsapp_outgoing', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.to === phone) {
          let summary = '';
          if (data.payload.text?.body) {
            summary = data.payload.text.body;
          } else if (data.payload.interactive) {
            summary = data.payload.interactive.body?.text || 'Interactive Option';
          } else if (data.payload.template) {
            summary = `[Template: ${data.payload.template.name}]`;
          }

          setChatMessages((prev) => [
            ...prev,
            {
              id: data.id || `msg-${Date.now()}`,
              sender: 'bot',
              type: data.type || 'text',
              text: summary,
              payload: data.payload,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to parse SSE payload', err);
      }
    });

    return () => {
      sse.close();
    };
  }, [phone]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Fetch admin, customers, config, mode, and Meta connection status
  const fetchAllData = async () => {
    try {
      const headers = { 'X-Admin-Api-Key': adminApiKey };
      const [ordRes, custRes, convRes, cfgRes, bcRes, modeRes] = await Promise.all([
        fetch('/api/admin/orders', { headers }).then((r) => r.json()),
        fetch('/api/admin/customers', { headers }).then((r) => r.json()),
        fetch('/api/admin/conversations', { headers }).then((r) => r.json()),
        fetch('/api/admin/config', { headers }).then((r) => r.json()),
        fetch('/api/admin/broadcast/history', { headers }).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/admin/mode', { headers }).then((r) => r.json()).catch(() => ({ mode: 'simulator' }))
      ]);

      if (ordRes.data) setAdminOrders(ordRes.data);
      if (custRes.data) setAdminCustomers(custRes.data);
      if (convRes.data) setAdminConversations(convRes.data);
      if (modeRes.mode) setDispatchMode(modeRes.mode);
      if (cfgRes.data) {
        setBusinessSettings(cfgRes.data);
        setMetaCredentials((prev) => ({
          ...prev,
          phoneNumberId: cfgRes.data.phoneNumberId || prev.phoneNumberId,
          hasLiveToken: Boolean(cfgRes.data.hasLiveToken)
        }));
      }
      if (bcRes.data) setBroadcastHistory(bcRes.data);
    } catch (e) {
      console.warn('Could not fetch data', e);
    }
  };

  useEffect(() => {
    fetchAllData();
    checkMetaStatus();
  }, [activeTab]);

  // Check Meta WhatsApp Cloud API connection status
  const checkMetaStatus = async () => {
    setMetaStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/admin/whatsapp/status', {
        headers: { 'X-Admin-Api-Key': adminApiKey }
      });
      const data = await res.json();
      setMetaStatus({
        tested: true,
        loading: false,
        connected: Boolean(data.connected),
        configured: Boolean(data.configured),
        isExpired: Boolean(data.isExpired),
        phoneNumberId: data.phoneNumberId,
        displayPhoneNumber: data.displayPhoneNumber,
        verifiedName: data.verifiedName,
        errorCode: data.errorCode,
        error: data.error
      });
    } catch (err: any) {
      setMetaStatus({
        tested: true,
        loading: false,
        connected: false,
        configured: false,
        error: err.message
      });
    }
  };

  // Toggle Simulator vs Live Mode
  const handleToggleMode = async (newMode: 'simulator' | 'live') => {
    if (newMode === 'live' && dispatchMode !== 'live') {
      setShowLiveModeConfirm(true);
      return;
    }
    applyModeSwitch(newMode);
  };

  const applyModeSwitch = async (newMode: 'simulator' | 'live') => {
    try {
      await fetch('/api/admin/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({ mode: newMode })
      });
      setDispatchMode(newMode);
      setShowLiveModeConfirm(false);
    } catch (e) {
      console.error('Failed to switch mode', e);
    }
  };

  // Initial welcome greeting in simulator
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: 'init-1',
          sender: 'bot',
          type: 'text',
          text: `👋 Welcome to *${businessSettings.name}*!\n${businessSettings.tagline}\n\nType *hi* or *menu* to explore our options!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [businessSettings.name]);

  // Send message through simulator into webhook receiver
  const sendSimulatorMessage = async (text: string, interactivePayload?: any) => {
    if (!text.trim() && !interactivePayload) return;

    const currentMsgText = text;
    setInputMessage('');
    setIsLoading(true);

    const newMsg: ChatMessage = {
      id: `cust-${Date.now()}`,
      sender: 'customer',
      type: interactivePayload ? 'interactive_button' : 'text',
      text: currentMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages((prev) => [...prev, newMsg]);

    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550293421',
                  phone_number_id: envConfig.phoneNumberId || '109876543210987'
                },
                contacts: [
                  {
                    profile: { name: customerName },
                    wa_id: phone
                  }
                ],
                messages: [
                  {
                    from: phone,
                    id: `wamid.SIM_${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    ...(interactivePayload
                      ? {
                          type: 'interactive',
                          interactive: interactivePayload
                        }
                      : {
                          type: 'text',
                          text: { body: currentMsgText }
                        })
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };

    try {
      await fetch('/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });
      // Refresh customer list to update 24h window
      setTimeout(() => fetchAllData(), 500);
    } catch (err) {
      console.error('Failed to dispatch simulated webhook message', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeBot = async (customerId: string) => {
    try {
      await fetch('/api/admin/resume-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({ customerId })
      });
      fetchAllData();
    } catch (err) {
      console.error('Failed to resume bot', err);
    }
  };

  const handlePauseBot = async (customerId: string) => {
    try {
      await fetch('/api/admin/pause-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({ customerId })
      });
      fetchAllData();
    } catch (err) {
      console.error('Failed to pause bot', err);
    }
  };

  const handleToggleOptIn = async (customerId: string, currentOptedIn: boolean) => {
    try {
      await fetch(`/api/admin/customers/${customerId}/opt-in`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({ optedIn: !currentOptedIn })
      });
      fetchAllData();
    } catch (err) {
      console.error('Failed to toggle opt-in', err);
    }
  };

  const handleChangeLanguage = async (customerId: string, language: 'en' | 'hi') => {
    try {
      await fetch(`/api/admin/customers/${customerId}/language`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({ language })
      });
      fetchAllData();
    } catch (err) {
      console.error('Failed to update customer language', err);
    }
  };

  const handleSimulateInbound = async (customerId: string) => {
    try {
      await fetch(`/api/admin/customers/${customerId}/simulate-inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        }
      });
      fetchAllData();
    } catch (err) {
      console.error('Failed to simulate inbound message', err);
    }
  };

  // Open "New Message" modal pre-filled with customer details
  const openNewMessageForCustomer = (cust: any) => {
    setNewMessageForm({
      phone: cust.phone,
      name: cust.name || '',
      type: cust.windowStatus?.isOpen ? 'text' : 'template',
      text: '',
      templateName: 'hello_world',
      languageCode: cust.language === 'hi' ? 'hi' : 'en_US',
      variables: [cust.name || 'Valued Customer', '20%', businessSettings.name],
      warnLiveSend: dispatchMode === 'live'
    });
    setNewMessageResult(null);
    setShowNewMessageModal(true);
  };

  // Submit New Message (Direct Message)
  const handleSendNewMessage = async () => {
    if (!newMessageForm.phone.trim()) return;
    setNewMessageResult({ loading: true });

    try {
      const res = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({
          phone: newMessageForm.phone.trim(),
          name: newMessageForm.name.trim() || undefined,
          type: newMessageForm.type,
          text: newMessageForm.text,
          templateName: newMessageForm.templateName,
          languageCode: newMessageForm.languageCode,
          variables: newMessageForm.variables,
          mode: dispatchMode
        })
      });

      const data = await res.json();
      if (data.success) {
        setNewMessageResult({
          loading: false,
          success: true,
          mode: data.mode,
          status: data.status,
          messageId: data.messageId
        });
        fetchAllData();
      } else {
        setNewMessageResult({
          loading: false,
          success: false,
          mode: data.mode || dispatchMode,
          status: 'failed',
          error: data.error
        });
      }
    } catch (err: any) {
      setNewMessageResult({
        loading: false,
        success: false,
        mode: dispatchMode,
        status: 'failed',
        error: err.message
      });
    }
  };

  // Submit Add Customer Modal
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCustomerForm.phone.trim()) return;
    if (!addCustomerForm.consentAgreed) {
      setAddCustomerError('Explicit consent checkbox is REQUIRED before messaging customers.');
      return;
    }

    setIsAddingCustomer(true);
    setAddCustomerError(null);

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({
          phone: addCustomerForm.phone.trim(),
          name: addCustomerForm.name.trim() || undefined,
          language: addCustomerForm.language,
          consentAgreed: addCustomerForm.consentAgreed,
          consentText: addCustomerForm.consentText,
          source: 'added by owner'
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowAddCustomerModal(false);
        setAddCustomerForm({
          name: '',
          phone: '',
          language: 'en',
          consentAgreed: false,
          consentText: 'Agreed to receive WhatsApp orders and updates from business'
        });
        fetchAllData();
      } else {
        setAddCustomerError(data.error);
      }
    } catch (err: any) {
      setAddCustomerError(err.message);
    } finally {
      setIsAddingCustomer(false);
    }
  };

  // Submit CSV Import
  const handleImportCsvSubmit = async () => {
    if (!csvRawText.trim()) return;
    setIsImportingCsv(true);
    setCsvImportResult(null);

    try {
      // Parse CSV text into array of objects
      const lines = csvRawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length <= 1) {
        setCsvImportResult({ summary: 'Error: CSV file must contain a header and at least one data row.' });
        setIsImportingCsv(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const phoneIdx = headers.indexOf('phone');
      const nameIdx = headers.indexOf('name');
      const langIdx = headers.indexOf('language');
      const consentIdx = headers.findIndex((h) => h.includes('consent'));

      if (phoneIdx === -1) {
        setCsvImportResult({ summary: 'Error: CSV must include a "phone" column.' });
        setIsImportingCsv(false);
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        rows.push({
          phone: parts[phoneIdx] || '',
          name: nameIdx !== -1 ? parts[nameIdx] : '',
          language: langIdx !== -1 ? parts[langIdx] : 'en',
          consent_date: consentIdx !== -1 ? parts[consentIdx] : ''
        });
      }

      const res = await fetch('/api/admin/customers/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({ rows })
      });

      const data = await res.json();
      if (data.success) {
        setCsvImportResult({
          summary: data.message,
          importedCount: data.stats.importedCount,
          skippedNoConsent: data.stats.skippedNoConsent,
          skippedInvalidPhone: data.stats.skippedInvalidPhone
        });
        fetchAllData();
      } else {
        setCsvImportResult({ summary: `Error: ${data.error}` });
      }
    } catch (err: any) {
      setCsvImportResult({ summary: `Error: ${err.message}` });
    } finally {
      setIsImportingCsv(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,phone,name,language,consent_date\n919876543210,Tushar K,en,2026-10-10\n919811122233,Aarav Sharma,hi,2026-10-11\n919922334455,Priya Patel,en,2026-10-12\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'whatsapp_customers_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveBusinessSettings = async () => {
    setIsSavingConfig(true);
    setConfigSaveSuccess(false);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({
          ...businessSettings,
          whatsappToken: metaCredentials.whatsappToken ? metaCredentials.whatsappToken.trim() : undefined,
          phoneNumberId: metaCredentials.phoneNumberId ? metaCredentials.phoneNumberId.trim() : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setConfigSaveSuccess(true);
        fetchAllData();
        checkMetaStatus();
        setTimeout(() => setConfigSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save business settings', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAddMenuItem = () => {
    if (!newItemForm.title || !newItemForm.price) return;
    const newItem: MenuItem = {
      id: newItemForm.id || `item_${Date.now().toString(36)}`,
      title: newItemForm.title,
      description: newItemForm.description || '',
      price: Number(newItemForm.price),
      category: newItemForm.category || 'General'
    };
    setBusinessSettings((prev) => ({
      ...prev,
      menuItems: [...prev.menuItems, newItem]
    }));
    setIsAddingNewItem(false);
    setNewItemForm({
      id: '',
      title: '',
      description: '',
      price: 150,
      category: 'Main Course'
    });
  };

  const handleDeleteMenuItem = (itemId: string) => {
    setBusinessSettings((prev) => ({
      ...prev,
      menuItems: prev.menuItems.filter((i) => i.id !== itemId)
    }));
  };

  const handleUpdateMenuItem = () => {
    if (!editingMenuItem) return;
    setBusinessSettings((prev) => ({
      ...prev,
      menuItems: prev.menuItems.map((i) => (i.id === editingMenuItem.id ? editingMenuItem : i))
    }));
    setEditingMenuItem(null);
  };

  // Launch Broadcast with filter options
  const handleTriggerBroadcast = async () => {
    if (!broadcastConsentConfirmed) return;
    setIsBroadcasting(true);
    setLastBroadcastResult(null);

    // Initial progress estimate
    const targetCount = targetedBroadcastRecipients.length;
    setBroadcastProgress({ current: 0, total: targetCount, sent: 0, failed: 0 });

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({
          templateName: broadcastTemplate,
          language: broadcastLang,
          delayMs: broadcastDelay,
          filterSource: broadcastFilterSource,
          consentAfterDate: broadcastFilterSource === 'consent_after' ? broadcastConsentDate : undefined,
          languageFilter: broadcastLangFilter,
          variables: broadcastTemplateVars,
          mode: dispatchMode
        })
      });

      const data = await res.json();
      if (data.success) {
        setLastBroadcastResult(data.data);
        fetchAllData();
      } else {
        setLastBroadcastResult({ error: data.error, recipients: [] });
      }
    } catch (e: any) {
      setLastBroadcastResult({ error: e.message, recipients: [] });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Export Broadcast Send Report as CSV
  const handleExportBroadcastReport = (report: any) => {
    if (!report?.recipients || report.recipients.length === 0) return;
    let csv = 'phone,name,status,error,timestamp\n';
    report.recipients.forEach((r: any) => {
      csv += `${r.phone},"${(r.name || '').replace(/"/g, '""')}",${r.status},"${(r.error || '').replace(/"/g, '""')}",${r.timestamp}\n`;
    });
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `broadcast_report_${report.id || Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const testGetWebhookVerification = async () => {
    try {
      const challenge = 'challenge_test_' + Math.floor(Math.random() * 10000);
      const url = `/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
        webhookVerifyToken
      )}&hub.challenge=${challenge}`;
      const res = await fetch(url);
      const text = await res.text();
      setVerifyResult({
        status: res.status,
        passed: res.status === 200 && text === challenge,
        response: text,
        expectedChallenge: challenge
      });
    } catch (err: any) {
      setVerifyResult({ status: 'Error', passed: false, response: err.message });
    }
  };

  const testPostWebhookPayload = async () => {
    try {
      const bodyToPost = customWebhookPayload || sampleIncomingText;
      const res = await fetch('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: bodyToPost
      });
      const text = await res.text();
      setPostWebhookResult({
        status: res.status,
        body: text,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      setPostWebhookResult({ status: 'Error', body: err.message });
    }
  };

  // Filtered customer list
  const filteredCustomers = adminCustomers.filter((cust) => {
    const matchesSearch =
      cust.phone.includes(customerSearch) || (cust.name && cust.name.toLowerCase().includes(customerSearch.toLowerCase()));
    if (!matchesSearch) return false;

    const conv = adminConversations.find((c) => c.customerId === cust.id);
    if (customerFilter === 'subscribed') return cust.optedIn;
    if (customerFilter === 'unsubscribed') return !cust.optedIn;
    if (customerFilter === 'paused') return conv?.isBotPaused;
    return true;
  });

  const optedInCount = adminCustomers.filter((c) => c.optedIn).length;
  const optedOutCount = adminCustomers.filter((c) => !c.optedIn).length;

  // Filtered audience for Broadcast Campaign
  const targetedBroadcastRecipients = adminCustomers.filter((cust) => {
    if (!cust.optedIn) return false;
    if (broadcastFilterSource === 'csv' && cust.source !== 'CSV') return false;
    if (broadcastFilterSource === 'consent_after' && broadcastConsentDate) {
      const custTime = cust.consentAt ? new Date(cust.consentAt).getTime() : 0;
      const cutTime = new Date(broadcastConsentDate).getTime();
      if (custTime < cutTime) return false;
    }
    if (broadcastLangFilter !== 'all' && cust.language !== broadcastLangFilter) return false;
    return true;
  });

  // Calculate estimated broadcast send duration
  const estimatedSendSeconds = Math.ceil((targetedBroadcastRecipients.length * broadcastDelay) / 1000);

  // Check 24-hour window status for selected customer in "New Message" modal
  const enteredCustomerMatch = adminCustomers.find((c) => c.phone === newMessageForm.phone.replace(/\D/g, '').replace(/^0+/, ''));
  const windowStatusForNewMessage = enteredCustomerMatch?.windowStatus || {
    isOpen: false,
    timeLeftFormatted: 'Closed (no inbound message yet)'
  };

  const selectedTemplateObj = APPROVED_TEMPLATES.find((t) => t.name === newMessageForm.templateName) || APPROVED_TEMPLATES[0];

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/90 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-semibold text-sm text-slate-100 tracking-tight truncate">{businessSettings.name}</h1>
              <p className="text-xs text-emerald-400 font-mono">WhatsApp Cloud Assistant</p>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Chat Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders</span>
              </div>
              {adminOrders.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono">
                  {adminOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'customers'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {adminCustomers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('broadcast')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'broadcast'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Broadcast Campaign</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Auto-Reply & Settings</span>
            </button>

            <div className="pt-2 pb-1 border-t border-slate-800/60 my-1">
              <span className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Developer Tools</span>
            </div>

            <button
              onClick={() => setActiveTab('webhook')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'webhook'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Webhook Inspector</span>
            </button>

            <button
              onClick={() => setActiveTab('samples')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'samples'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Payload JSONs</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Setup & Test Plan</span>
            </button>
          </nav>
        </div>

        {/* Free Stack Badge & Quick Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">100% Free Stack</div>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>PostgreSQL:</span>
              <span className="font-mono text-emerald-400">Neon Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Redis State:</span>
              <span className="font-mono text-emerald-400">Upstash Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Meta WhatsApp:</span>
              <span className="font-mono text-emerald-400">Cloud API Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Hosting:</span>
              <span className="font-mono text-emerald-400">Render Free</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-100">{businessSettings.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono capitalize">
                {businessSettings.category}
              </span>
            </div>

            {/* REAL VS SIMULATOR TOGGLE */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => handleToggleMode('simulator')}
                className={`px-3 py-1 rounded-md font-medium flex items-center space-x-1.5 transition-all ${
                  dispatchMode === 'simulator'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sandbox Simulator: No real WhatsApp messages sent"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Simulator</span>
              </button>
              <button
                onClick={() => handleToggleMode('live')}
                className={`px-3 py-1 rounded-md font-medium flex items-center space-x-1.5 transition-all ${
                  dispatchMode === 'live'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Live Mode: Dispatches directly to Meta WhatsApp Cloud API"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Live WhatsApp</span>
              </button>
            </div>

            {/* Current Mode Badge */}
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono flex items-center space-x-1.5 ${
                dispatchMode === 'live'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700/80'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-700/80'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dispatchMode === 'live' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span>{dispatchMode === 'live' ? 'LIVE MODE (Meta Cloud API)' : 'SIMULATOR MODE (Sandbox)'}</span>
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {/* Meta Connection Status Indicator */}
            <div className="flex items-center space-x-2">
              {metaStatus.isExpired ? (
                <button
                  onClick={() => setShowMetaFixModal(true)}
                  className="px-2.5 py-1 bg-rose-950 border border-rose-600 text-rose-300 rounded-lg flex items-center space-x-1 hover:bg-rose-900 transition-colors"
                  title="Click to view token expiration instructions"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold">Token Expired (Code 190) — Fix Now</span>
                </button>
              ) : metaStatus.connected ? (
                <div className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-lg flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Meta Connected: +{metaStatus.displayPhoneNumber || metaStatus.phoneNumberId}</span>
                </div>
              ) : (
                <button
                  onClick={checkMetaStatus}
                  disabled={metaStatus.loading}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center space-x-1"
                  title="Test Meta Graph API credentials"
                >
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>{metaStatus.loading ? 'Checking Meta...' : 'Test Meta Connection'}</span>
                </button>
              )}
            </div>

            {/* TOP BAR: NEW MESSAGE BUTTON */}
            <button
              onClick={() => {
                setNewMessageForm({
                  phone: '',
                  name: '',
                  type: 'template',
                  text: '',
                  templateName: 'hello_world',
                  languageCode: 'en_US',
                  variables: ['', '', ''],
                  warnLiveSend: dispatchMode === 'live'
                });
                setNewMessageResult(null);
                setShowNewMessageModal(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg flex items-center space-x-1.5 shadow-md shadow-emerald-900/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>New Message</span>
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <button
              onClick={fetchAllData}
              className="text-slate-400 hover:text-slate-200 flex items-center space-x-1 p-1"
              title="Refresh all data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Live Mode Warning Banner if Live is Active */}
        {dispatchMode === 'live' && (
          <div className="bg-amber-950/70 border-b border-amber-800/80 px-6 py-2 text-xs text-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Warning — Live WhatsApp Mode is Active:</strong> All messages sent from this dashboard or campaigns will dispatch via Meta Cloud API directly to the recipient's phone number. Ensure valid <code className="text-amber-300 font-mono">WHATSAPP_TOKEN</code>.
              </span>
            </div>
            <button
              onClick={() => applyModeSwitch('simulator')}
              className="text-xs px-2.5 py-0.5 bg-amber-900 hover:bg-amber-800 text-white rounded border border-amber-700 ml-4 font-semibold"
            >
              Switch to Sandbox Simulator
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 1: Live Interactive WhatsApp Simulator                     */}
        {/* ============================================================== */}
        {activeTab === 'simulator' && (
          <div className="flex-1 flex overflow-hidden p-6 gap-6 justify-center items-center bg-slate-950">
            {/* Phone Container */}
            <div className="w-[380px] h-[720px] bg-slate-900 border-4 border-slate-700 rounded-[44px] shadow-2xl flex flex-col overflow-hidden relative">
              {/* Phone Speaker & Camera Notch */}
              <div className="h-6 bg-slate-950 flex items-center justify-center relative">
                <div className="w-20 h-3.5 bg-slate-800 rounded-full flex items-center justify-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                  <div className="w-2 h-1 bg-slate-700 rounded-full" />
                </div>
              </div>

              {/* WhatsApp App Header */}
              <div className="bg-emerald-800 text-white p-3 flex items-center justify-between border-b border-emerald-900 shadow-md">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm text-white shrink-0">
                    {businessSettings.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h2 className="text-xs font-bold truncate leading-tight">{businessSettings.name}</h2>
                    <p className="text-[10px] text-emerald-200 leading-tight">Official Business Account</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setChatMessages([
                        {
                          id: `init-${Date.now()}`,
                          sender: 'bot',
                          type: 'text',
                          text: `👋 Welcome to *${businessSettings.name}*!\n${businessSettings.tagline}\n\nType *hi* or *menu* to explore our options!`,
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                    }}
                    className="p-1 hover:bg-emerald-700 rounded text-emerald-200"
                    title="Reset Simulator Chat"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#0b141a] text-slate-100 font-sans text-xs">
                {/* Meta Verified Business Notice */}
                <div className="p-2 bg-[#182229] border border-emerald-900/40 rounded-lg text-center text-[10px] text-slate-400">
                  🔒 Messages and calls are end-to-end encrypted. This business uses a secure Meta service to manage conversations.
                </div>

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-2.5 shadow-sm space-y-1.5 ${
                        msg.sender === 'customer'
                          ? 'bg-[#005c4b] text-white rounded-tr-none'
                          : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/30'
                      }`}
                    >
                      {/* Formatted Text Message */}
                      {msg.text && (
                        <div className="whitespace-pre-wrap leading-relaxed text-xs">
                          {msg.text.split('\n').map((line, i) => (
                            <React.Fragment key={i}>
                              {line.startsWith('*') && line.endsWith('*') ? (
                                <strong className="text-white">{line.slice(1, -1)}</strong>
                              ) : (
                                line
                              )}
                              <br />
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      {/* Interactive Buttons (max 3) */}
                      {msg.payload?.interactive?.type === 'button' && (
                        <div className="pt-1.5 border-t border-slate-700/50 space-y-1">
                          {msg.payload.interactive.action?.buttons?.map((btn: any) => (
                            <button
                              key={btn.reply.id}
                              onClick={() => sendSimulatorMessage(btn.reply.title, { button_reply: btn.reply })}
                              className="w-full py-1.5 px-3 bg-[#2a3942] hover:bg-emerald-700 text-emerald-300 hover:text-white rounded text-xs font-semibold text-center transition-colors shadow-sm"
                            >
                              {btn.reply.title}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Interactive List (max 10 rows) */}
                      {msg.payload?.interactive?.type === 'list' && (
                        <div className="pt-1.5 border-t border-slate-700/50">
                          <button
                            onClick={() => setSelectedListSection(msg.payload.interactive.action)}
                            className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold text-center flex items-center justify-center space-x-1.5 shadow-md"
                          >
                            <span>{msg.payload.interactive.action?.button || 'View Menu / Options'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-end space-x-1 text-[9px] text-slate-400 select-none">
                        <span>{msg.timestamp}</span>
                        {msg.sender === 'customer' && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Interactive List Drawer Modal in Simulator */}
              {selectedListSection && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col justify-end animate-in fade-in">
                  <div className="bg-[#111b21] border-t border-slate-800 rounded-t-2xl p-4 max-h-[80%] overflow-y-auto space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <h3 className="font-bold text-xs text-emerald-400">Select an Option</h3>
                      <button
                        onClick={() => setSelectedListSection(null)}
                        className="text-xs text-slate-400 hover:text-white p-1"
                      >
                        ✕ Close
                      </button>
                    </div>

                    {selectedListSection.sections?.map((sec: any, idx: number) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {sec.title}
                        </div>
                        <div className="space-y-1">
                          {sec.rows?.map((row: any) => (
                            <button
                              key={row.id}
                              onClick={() => {
                                setSelectedListSection(null);
                                sendSimulatorMessage(row.title, { list_reply: row });
                              }}
                              className="w-full text-left p-2.5 rounded bg-[#202c33] hover:bg-emerald-900/60 border border-slate-700/40 text-xs transition-colors"
                            >
                              <div className="font-semibold text-white">{row.title}</div>
                              {row.description && (
                                <div className="text-[10px] text-slate-400 truncate">{row.description}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input Bar */}
              <div className="p-2 bg-[#202c33] border-t border-slate-800 flex items-center space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendSimulatorMessage(inputMessage);
                  }}
                  placeholder="Type 'hi', 'menu', 'order'..."
                  className="flex-1 bg-[#2a3942] rounded-full px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={() => sendSimulatorMessage(inputMessage)}
                  disabled={isLoading || !inputMessage.trim()}
                  className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Keyword Buttons & State Debugger */}
            <div className="w-80 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-xs text-slate-200 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Quick Test Inputs (Chat Simulator)</span>
                </h3>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Click any keyword to simulate an incoming customer WhatsApp message:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    onClick={() => sendSimulatorMessage('hi')}
                    className="p-2 bg-slate-800 hover:bg-emerald-700 hover:text-white rounded text-slate-200 border border-slate-700 text-left transition-colors"
                  >
                    👋 hi / hello
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('menu')}
                    className="p-2 bg-slate-800 hover:bg-emerald-700 hover:text-white rounded text-slate-200 border border-slate-700 text-left transition-colors"
                  >
                    🛍️ menu
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('order')}
                    className="p-2 bg-slate-800 hover:bg-emerald-700 hover:text-white rounded text-slate-200 border border-slate-700 text-left transition-colors"
                  >
                    🛒 order
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('status')}
                    className="p-2 bg-slate-800 hover:bg-emerald-700 hover:text-white rounded text-slate-200 border border-slate-700 text-left transition-colors"
                  >
                    📍 status
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('agent')}
                    className="p-2 bg-slate-800 hover:bg-amber-700 hover:text-white rounded text-slate-200 border border-slate-700 text-left transition-colors"
                  >
                    👤 agent
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('language')}
                    className="p-2 bg-slate-800 hover:bg-emerald-700 hover:text-white rounded text-slate-200 border border-slate-700 text-left transition-colors"
                  >
                    🌐 language
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('STOP')}
                    className="p-2 bg-rose-950 hover:bg-rose-800 text-rose-300 hover:text-white rounded border border-rose-800 text-left transition-colors"
                  >
                    🛑 STOP
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('START')}
                    className="p-2 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 hover:text-white rounded border border-emerald-800 text-left transition-colors"
                  >
                    ✅ START
                  </button>
                </div>
              </div>

              {/* Simulator Customer Profile Config */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                <h4 className="font-semibold text-slate-200">Customer Identity</h4>
                <div>
                  <label className="text-slate-400 block mb-1">Phone Number (E.164):</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Customer Name:</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 2: Orders & Bookings Management                            */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-400" />
                    <span>Orders & Status Notification Management</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live orders placed through WhatsApp. Updating status automatically messages the customer.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Owner Alerts Phone:</span>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-emerald-400">
                    +{envConfig.ownerPhone}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Items Ordered</th>
                        <th className="py-3 px-4">Total</th>
                        <th className="py-3 px-4">Delivery Address</th>
                        <th className="py-3 px-4">Status & Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {adminOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                            No orders placed yet. Open Chat Simulator and type 'order' to place a test order!
                          </td>
                        </tr>
                      ) : (
                        adminOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-bold text-emerald-400">{ord.orderNumber}</td>
                            <td className="py-3 px-4 font-sans">
                              <div className="font-semibold text-slate-200">{ord.customerName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">+{ord.customerPhone}</div>
                            </td>
                            <td className="py-3 px-4 font-sans text-slate-300">
                              {ord.items?.map((it: any, idx: number) => (
                                <div key={idx}>
                                  {it.quantity}x {it.itemName}
                                </div>
                              ))}
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              {businessSettings.currency}
                              {ord.totalAmount}
                            </td>
                            <td className="py-3 px-4 font-sans text-slate-400 max-w-xs truncate">
                              {ord.deliveryAddress}
                            </td>
                            <td className="py-3 px-4 font-sans">
                              <select
                                value={ord.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  await fetch(`/api/admin/orders/${ord.id}/status`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-Admin-Api-Key': adminApiKey
                                    },
                                    body: JSON.stringify({ status: newStatus })
                                  });
                                  fetchAllData();
                                }}
                                className={`px-2 py-1 rounded text-xs font-semibold outline-none border ${
                                  ord.status === 'DELIVERED'
                                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                    : ord.status === 'READY'
                                    ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                                    : ord.status === 'PREPARING'
                                    ? 'bg-amber-950 text-amber-400 border-amber-800'
                                    : ord.status === 'CANCELLED'
                                    ? 'bg-rose-950 text-rose-400 border-rose-800'
                                    : 'bg-slate-800 text-slate-200 border-slate-700'
                                }`}
                              >
                                <option value="PLACED">PLACED</option>
                                <option value="PREPARING">PREPARING</option>
                                <option value="READY">READY</option>
                                <option value="DELIVERED">DELIVERED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 3: Dedicated Customers Page                                */}
        {/* ============================================================== */}
        {activeTab === 'customers' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>Customers Directory & 24h Window Enforcement</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Track opt-in compliance, 24-hour service windows, message sources, and send direct WhatsApp messages.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  {/* CUSTOMERS PAGE: NEW MESSAGE BUTTON */}
                  <button
                    onClick={() => {
                      setNewMessageForm({
                        phone: '',
                        name: '',
                        type: 'template',
                        text: '',
                        templateName: 'hello_world',
                        languageCode: 'en_US',
                        variables: ['', '', ''],
                        warnLiveSend: dispatchMode === 'live'
                      });
                      setNewMessageResult(null);
                      setShowNewMessageModal(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>New Message</span>
                  </button>

                  {/* CUSTOMERS PAGE: ADD CUSTOMER BUTTON */}
                  <button
                    onClick={() => {
                      setAddCustomerError(null);
                      setShowAddCustomerModal(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Customer</span>
                  </button>

                  {/* CUSTOMERS PAGE: IMPORT CSV BUTTON */}
                  <button
                    onClick={() => {
                      setCsvImportResult(null);
                      setShowImportCsvModal(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Import CSV</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center space-x-2 flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by phone or name..."
                    className="bg-transparent text-xs text-slate-200 outline-none w-full placeholder-slate-500"
                  />
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <button
                    onClick={() => setCustomerFilter('all')}
                    className={`px-2.5 py-1 rounded ${
                      customerFilter === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    All ({adminCustomers.length})
                  </button>
                  <button
                    onClick={() => setCustomerFilter('subscribed')}
                    className={`px-2.5 py-1 rounded ${
                      customerFilter === 'subscribed'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Subscribed ({optedInCount})
                  </button>
                  <button
                    onClick={() => setCustomerFilter('unsubscribed')}
                    className={`px-2.5 py-1 rounded ${
                      customerFilter === 'unsubscribed'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Opted Out ({optedOutCount})
                  </button>
                  <button
                    onClick={() => setCustomerFilter('paused')}
                    className={`px-2.5 py-1 rounded ${
                      customerFilter === 'paused' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Agent Paused ({adminConversations.filter((c) => c.isBotPaused).length})
                  </button>
                </div>
              </div>

              {/* Customers Table with Upgraded Columns */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Language</th>
                      <th className="py-2.5 px-3">Compliance</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Last Message</th>
                      <th className="py-2.5 px-3">24h Window</th>
                      <th className="py-2.5 px-3">Bot State</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                          No customers found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => {
                        const conv = adminConversations.find((c) => c.customerId === cust.id);
                        const windowStatus = cust.windowStatus || { isOpen: false, timeLeftFormatted: 'Closed' };

                        return (
                          <tr key={cust.id} className="hover:bg-slate-800/30 transition-colors">
                            {/* Customer Name */}
                            <td className="py-3 px-3 font-sans font-medium text-slate-200">
                              <div>{cust.name || 'Anonymous User'}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{cust.id}</div>
                            </td>

                            {/* Phone */}
                            <td className="py-3 px-3 text-emerald-400 font-mono">+{cust.phone}</td>

                            {/* Language */}
                            <td className="py-3 px-3">
                              <button
                                onClick={() => handleChangeLanguage(cust.id, cust.language === 'en' ? 'hi' : 'en')}
                                className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 uppercase font-semibold"
                                title="Click to toggle EN/HI"
                              >
                                {cust.language}
                              </button>
                            </td>

                            {/* Compliance / Opt-in Toggle */}
                            <td className="py-3 px-3 font-sans">
                              <button
                                onClick={() => handleToggleOptIn(cust.id, cust.optedIn)}
                                title="Click to toggle opt-in / opt-out"
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  cust.optedIn
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                                }`}
                              >
                                {cust.optedIn ? 'Opted In' : 'Opted Out'}
                              </button>
                            </td>

                            {/* Source Column */}
                            <td className="py-3 px-3 font-sans text-slate-400 text-[11px]">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[10px]">
                                {cust.source || 'customer messaged'}
                              </span>
                            </td>

                            {/* Last Message Time */}
                            <td className="py-3 px-3 font-sans text-slate-400 text-[11px]">
                              {cust.lastInboundAt
                                ? new Date(cust.lastInboundAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Never'}
                            </td>

                            {/* 24h Window Badge */}
                            <td className="py-3 px-3 font-sans">
                              {windowStatus.isOpen ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold flex items-center space-x-1 w-max">
                                  <Clock className="w-3 h-3 text-emerald-400" />
                                  <span>Open ({windowStatus.timeLeftFormatted})</span>
                                </span>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 w-max">
                                    Closed (Templates only)
                                  </span>
                                  <button
                                    onClick={() => handleSimulateInbound(cust.id)}
                                    className="p-1 hover:text-emerald-400 text-slate-500"
                                    title="Simulate inbound message to open 24h window"
                                  >
                                    <Zap className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Bot State */}
                            <td className="py-3 px-3 font-sans">
                              {conv?.isBotPaused ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1 w-max">
                                  <PauseCircle className="w-3 h-3" />
                                  <span>Agent Paused</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Active ({conv?.state || 'MAIN_MENU'})
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-right font-sans space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => openNewMessageForCustomer(cust)}
                                className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-medium"
                                title="Open New Message modal pre-filled with this customer"
                              >
                                Send Message
                              </button>

                              {conv?.isBotPaused ? (
                                <button
                                  onClick={() => handleResumeBot(cust.id)}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-medium"
                                >
                                  Resume Bot
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePauseBot(cust.id)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                                >
                                  Pause Bot
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 4: Upgraded Broadcast Campaign Page                        */}
        {/* ============================================================== */}
        {activeTab === 'broadcast' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Radio className="w-5 h-5 text-emerald-400" />
                    <span>Broadcast Campaigns & Targeted Templates</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Send approved WhatsApp template messages to opted-in audiences with strict compliance safeguards.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span
                    className={`px-3 py-1 rounded-full font-mono font-semibold ${
                      dispatchMode === 'live'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    Target Mode: {dispatchMode.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {/* Broadcast Builder (2 Cols) */}
                <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span>1. Campaign Configuration</span>
                  </h3>

                  <div className="space-y-4 text-xs">
                    {/* Template Selector */}
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Approved WhatsApp Template:</label>
                      <select
                        value={broadcastTemplate}
                        onChange={(e) => {
                          setBroadcastTemplate(e.target.value);
                          const t = APPROVED_TEMPLATES.find((tpl) => tpl.name === e.target.value);
                          if (t) setBroadcastTemplateVars(t.sampleValues);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      >
                        {APPROVED_TEMPLATES.map((tmpl) => (
                          <option key={tmpl.name} value={tmpl.name}>
                            {tmpl.title} ({tmpl.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Template Variables Inputs */}
                    {selectedTemplateObj.variables.length > 0 && (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                        <div className="font-semibold text-slate-300 text-xs">Template Dynamic Variables:</div>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedTemplateObj.variables.map((varName, idx) => (
                            <div key={idx}>
                              <label className="text-[10px] text-slate-400 block mb-0.5">
                                {'{{' + (idx + 1) + '}}'} {varName}:
                              </label>
                              <input
                                type="text"
                                value={broadcastTemplateVars[idx] || ''}
                                onChange={(e) => {
                                  const copy = [...broadcastTemplateVars];
                                  copy[idx] = e.target.value;
                                  setBroadcastTemplateVars(copy);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audience Targeting Options */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2.5">
                      <div className="font-semibold text-slate-300 text-xs">Audience Targeting Filters:</div>
                      <div className="grid grid-cols-3 gap-3">
                        <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="broadcastFilter"
                            checked={broadcastFilterSource === 'all'}
                            onChange={() => setBroadcastFilterSource('all')}
                            className="text-emerald-600"
                          />
                          <span>All Opted-In Customers</span>
                        </label>

                        <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="broadcastFilter"
                            checked={broadcastFilterSource === 'csv'}
                            onChange={() => setBroadcastFilterSource('csv')}
                            className="text-emerald-600"
                          />
                          <span>Only Added via CSV</span>
                        </label>

                        <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="broadcastFilter"
                            checked={broadcastFilterSource === 'consent_after'}
                            onChange={() => setBroadcastFilterSource('consent_after')}
                            className="text-emerald-600"
                          />
                          <span>Consent On/After Date</span>
                        </label>
                      </div>

                      {broadcastFilterSource === 'consent_after' && (
                        <div className="pt-2">
                          <label className="text-slate-400 block mb-1 text-[11px]">Consent Cutoff Date:</label>
                          <input
                            type="date"
                            value={broadcastConsentDate}
                            onChange={(e) => setBroadcastConsentDate(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs"
                          />
                        </div>
                      )}

                      {/* Language Filter */}
                      <div className="pt-2 border-t border-slate-800 flex items-center space-x-4">
                        <span className="text-slate-400">Filter by Language:</span>
                        <div className="flex space-x-3">
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="radio"
                              name="langFilter"
                              checked={broadcastLangFilter === 'all'}
                              onChange={() => setBroadcastLangFilter('all')}
                            />
                            <span>All</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="radio"
                              name="langFilter"
                              checked={broadcastLangFilter === 'en'}
                              onChange={() => setBroadcastLangFilter('en')}
                            />
                            <span>English</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="radio"
                              name="langFilter"
                              checked={broadcastLangFilter === 'hi'}
                              onChange={() => setBroadcastLangFilter('hi')}
                            />
                            <span>Hindi (हिंदी)</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Rate limiting delay */}
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">Rate-limit delay between sends:</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min={200}
                          max={2000}
                          step={100}
                          value={broadcastDelay}
                          onChange={(e) => setBroadcastDelay(Number(e.target.value))}
                          className="w-32 accent-emerald-500"
                        />
                        <span className="font-mono text-emerald-400 w-16 text-right">{broadcastDelay} ms</span>
                      </div>
                    </div>

                    {/* REQUIRED EXPLICIT OPT-IN CONFIRMATION CHECKBOX */}
                    <div className="p-3 bg-slate-950 border border-emerald-900/60 rounded-lg">
                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={broadcastConsentConfirmed}
                          onChange={(e) => setBroadcastConsentConfirmed(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded text-emerald-600 accent-emerald-500"
                        />
                        <span className="text-xs text-slate-200 font-medium">
                          I confirm all recipients have explicitly opted in to receive WhatsApp messages from my business.
                        </span>
                      </label>
                    </div>

                    {/* Launch Broadcast Button */}
                    <button
                      onClick={handleTriggerBroadcast}
                      disabled={isBroadcasting || !broadcastConsentConfirmed || targetedBroadcastRecipients.length === 0}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-900/30"
                    >
                      <Radio className="w-4 h-4" />
                      <span>
                        {isBroadcasting
                          ? 'Broadcasting Campaign...'
                          : `Launch Broadcast (${targetedBroadcastRecipients.length} Recipients)`}
                      </span>
                    </button>

                    {/* Progress Bar during Broadcast */}
                    {isBroadcasting && (
                      <div className="p-3 bg-slate-950 border border-emerald-800 rounded-lg space-y-2 animate-pulse">
                        <div className="flex justify-between font-semibold text-emerald-300">
                          <span>Dispatching campaign...</span>
                          <span>
                            {broadcastProgress.current} of {broadcastProgress.total}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{
                              width: `${
                                broadcastProgress.total > 0
                                  ? (broadcastProgress.current / broadcastProgress.total) * 100
                                  : 0
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audience & Live Template Preview (1 Col) */}
                <div className="space-y-4">
                  {/* Audience Stats Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                    <h4 className="font-semibold text-white flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Selected Audience Stats</span>
                    </h4>

                    <div className="space-y-2">
                      <div className="flex justify-between text-slate-400">
                        <span>Total Customers in Database:</span>
                        <span className="font-mono text-white">{adminCustomers.length}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Targeted & Opted In:</span>
                        <span className="font-mono font-bold">{targetedBroadcastRecipients.length}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Estimated Duration:</span>
                        <span className="font-mono text-white">~{estimatedSendSeconds}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Template Message Preview */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                    <h4 className="font-semibold text-white flex items-center space-x-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>Live WhatsApp Template Preview</span>
                    </h4>

                    <div className="p-3 bg-[#0b141a] border border-slate-800 rounded-xl">
                      <div className="p-2.5 bg-[#202c33] text-white rounded-xl rounded-tl-none text-xs whitespace-pre-wrap leading-relaxed shadow-sm font-sans">
                        {selectedTemplateObj.previewText(broadcastTemplateVars)}
                        <div className="text-[9px] text-slate-400 text-right mt-1">12:00 PM • Template</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Broadcast Send Summary & CSV Export */}
              {lastBroadcastResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Recent Campaign Results</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Dispatched in {lastBroadcastResult.mode || dispatchMode} mode: {lastBroadcastResult.sentCount} sent,{' '}
                        {lastBroadcastResult.failedCount} failed, {lastBroadcastResult.skippedUnsubscribed} skipped.
                      </p>
                    </div>

                    <button
                      onClick={() => handleExportBroadcastReport(lastBroadcastResult)}
                      disabled={!lastBroadcastResult.recipients || lastBroadcastResult.recipients.length === 0}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export Send Report as CSV</span>
                    </button>
                  </div>

                  {/* Recipient Details Table */}
                  {lastBroadcastResult.recipients && lastBroadcastResult.recipients.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-2 px-3">Recipient Phone</th>
                            <th className="py-2 px-3">Name</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Error / Diagnostics</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {lastBroadcastResult.recipients.map((rec: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 text-emerald-400">+{rec.phone}</td>
                              <td className="py-2 px-3 font-sans text-slate-200">{rec.name || 'Customer'}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    rec.status === 'sent'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                                  }`}
                                >
                                  {rec.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                                {rec.error || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Historical Broadcast Campaigns */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-sm text-white">Broadcast Campaign Archive</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3">Date & Time</th>
                        <th className="py-2 px-3">Template</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3">Targeted</th>
                        <th className="py-2 px-3">Delivered</th>
                        <th className="py-2 px-3">Failed</th>
                        <th className="py-2 px-3 text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {broadcastHistory.map((bc, idx) => (
                        <tr key={bc.id || idx}>
                          <td className="py-2.5 px-3 text-slate-400">
                            {new Date(bc.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-semibold">{bc.templateName}</td>
                          <td className="py-2.5 px-3 uppercase text-slate-300">{bc.mode || 'simulator'}</td>
                          <td className="py-2.5 px-3 text-slate-300">{bc.totalTargeted}</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{bc.sentCount}</td>
                          <td className="py-2.5 px-3 text-rose-400 font-bold">{bc.failedCount || 0}</td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            <button
                              onClick={() => handleExportBroadcastReport(bc)}
                              disabled={!bc.recipients || bc.recipients.length === 0}
                              className="text-xs text-emerald-400 hover:underline disabled:opacity-30"
                            >
                              Download CSV
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 5: Auto-Reply Settings & Menu Editor                       */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-emerald-400" />
                    <span>Auto-Reply Settings & Business Profile</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Configure business identity, operating hours, custom welcome auto-replies, and catalog items.
                  </p>
                </div>
                <button
                  onClick={handleSaveBusinessSettings}
                  disabled={isSavingConfig}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-lg shadow-emerald-900/30"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingConfig ? 'Saving Changes...' : 'Save Configuration'}</span>
                </button>
              </div>

              {configSaveSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500 rounded-lg text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Configuration updated successfully! Available immediately in bot and live dispatch.</span>
                </div>
              )}

              {/* Meta WhatsApp Cloud API Connection Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Meta WhatsApp Cloud API Connection & Token Manager</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure your Meta Phone Number ID and Access Token. Tokens can be updated live without restarting.
                    </p>
                  </div>
                  <button
                    onClick={checkMetaStatus}
                    disabled={metaStatus.loading}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    <span>Test Connection</span>
                  </button>
                </div>

                {/* Token Expired (190) Notification Banner */}
                {metaStatus.isExpired && (
                  <div className="p-4 bg-rose-950/60 border border-rose-600 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-rose-300 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Meta Access Token Expired (HTTP 401 / Error Code 190)</span>
                    </div>
                    <p className="text-rose-200 leading-relaxed">
                      Your Meta temporary access token has expired (tokens expire after 24 hours).
                    </p>
                    <div className="bg-slate-950/80 p-3 rounded border border-rose-800 text-[11px] text-slate-300 space-y-1">
                      <div className="font-semibold text-white">How to fix in 30 seconds:</div>
                      <div>1. Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">developers.facebook.com</a> ➔ My Apps ➔ WhatsApp ➔ API Setup</div>
                      <div>2. Click "Copy" next to the new <strong>Temporary access token</strong>.</div>
                      <div>3. Paste it in the <strong>Access Token</strong> field below and click <strong>Save Configuration</strong>!</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Phone Number ID (from Meta Developer Console):</label>
                    <input
                      type="text"
                      value={metaCredentials.phoneNumberId}
                      onChange={(e) => setMetaCredentials({ ...metaCredentials, phoneNumberId: e.target.value })}
                      placeholder="e.g. 109876543210987"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Permanent or Temporary Access Token:</label>
                    <input
                      type="password"
                      value={metaCredentials.whatsappToken}
                      onChange={(e) => setMetaCredentials({ ...metaCredentials, whatsappToken: e.target.value })}
                      placeholder={metaCredentials.hasLiveToken ? '••••••••••••••••••••••••' : 'Paste EAA... token here'}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-emerald-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Business Profile Details */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>Business Profile Information</span>
                </h3>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Business Name:</label>
                    <input
                      type="text"
                      value={businessSettings.name}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Business Category:</label>
                    <select
                      value={businessSettings.category}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, category: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white"
                    >
                      <option value="restaurant">Restaurant / Cafe</option>
                      <option value="grocery">Grocery / Supermarket</option>
                      <option value="salon">Salon / Spa / Wellness</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Currency Symbol:</label>
                    <input
                      type="text"
                      value={businessSettings.currency}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, currency: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-emerald-400 font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1">Tagline:</label>
                    <input
                      type="text"
                      value={businessSettings.tagline}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, tagline: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Support Phone:</label>
                    <input
                      type="text"
                      value={businessSettings.supportPhone}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, supportPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1">Physical Address:</label>
                    <input
                      type="text"
                      value={businessSettings.address}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Operating Hours:</label>
                    <input
                      type="text"
                      value={businessSettings.hours}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, hours: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Welcome Messages Customization */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Welcome Auto-Replies</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Custom greeting sent when a customer first contacts your business or after 24h of inactivity.
                </p>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">English Welcome Message:</label>
                    <textarea
                      rows={5}
                      value={businessSettings.welcomeMessageEn}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, welcomeMessageEn: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Hindi Welcome Message (हिंदी):</label>
                    <textarea
                      rows={5}
                      value={businessSettings.welcomeMessageHi}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, welcomeMessageHi: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Menu & Catalog Items Customizer */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-400" />
                      <span>Catalog Menu Items ({businessSettings.menuItems.length} Items)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Items rendered in WhatsApp Interactive List Messages when customers click "Order Now" or type "menu".
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddingNewItem(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Add New Item Form */}
                {isAddingNewItem && (
                  <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-emerald-400">Add New Dish / Service</h4>
                      <button onClick={() => setIsAddingNewItem(false)} className="text-xs text-slate-400 hover:text-white">
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-1">Item Title:</label>
                        <input
                          type="text"
                          value={newItemForm.title}
                          onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Category:</label>
                        <input
                          type="text"
                          value={newItemForm.category}
                          onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Price ({businessSettings.currency}):</label>
                        <input
                          type="number"
                          value={newItemForm.price}
                          onChange={(e) => setNewItemForm({ ...newItemForm, price: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Item ID:</label>
                        <input
                          type="text"
                          value={newItemForm.id}
                          onChange={(e) => setNewItemForm({ ...newItemForm, id: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-300 font-mono"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-slate-400 block mb-1">Description:</label>
                        <input
                          type="text"
                          value={newItemForm.description}
                          onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddMenuItem}
                        disabled={!newItemForm.title || !newItemForm.price}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save to Catalog</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit Item Form */}
                {editingMenuItem && (
                  <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-amber-400">Edit Dish / Service</h4>
                      <button onClick={() => setEditingMenuItem(null)} className="text-xs text-slate-400 hover:text-white">
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-1">Item Title:</label>
                        <input
                          type="text"
                          value={editingMenuItem.title}
                          onChange={(e) => setEditingMenuItem({ ...editingMenuItem, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Category:</label>
                        <input
                          type="text"
                          value={editingMenuItem.category}
                          onChange={(e) => setEditingMenuItem({ ...editingMenuItem, category: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Price ({businessSettings.currency}):</label>
                        <input
                          type="number"
                          value={editingMenuItem.price}
                          onChange={(e) => setEditingMenuItem({ ...editingMenuItem, price: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-400 font-bold"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-slate-400 block mb-1">Description:</label>
                        <input
                          type="text"
                          value={editingMenuItem.description}
                          onChange={(e) => setEditingMenuItem({ ...editingMenuItem, description: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => setEditingMenuItem(null)} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg">
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateMenuItem}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Update Dish</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Price</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {businessSettings.menuItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-white">{item.title}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 max-w-sm truncate">{item.description}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                            {businessSettings.currency}
                            {item.price}
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1">
                            <button onClick={() => setEditingMenuItem(item)} className="p-1 hover:text-amber-400 text-slate-400">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteMenuItem(item.id)} className="p-1 hover:text-rose-400 text-slate-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 6: Webhook Inspector                                       */}
        {/* ============================================================== */}
        {activeTab === 'webhook' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>1. GET /webhook — Meta Verification Handshake</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Meta sends a GET request with <code className="text-emerald-300">hub.mode=subscribe</code> and <code className="text-emerald-300">hub.verify_token</code>.
                    </p>
                  </div>
                  <button
                    onClick={testGetWebhookVerification}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Test GET Verification</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Verify Token:</label>
                    <input
                      type="text"
                      value={webhookVerifyToken}
                      onChange={(e) => setWebhookVerifyToken(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 font-mono text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Full Webhook Callback URL:</label>
                    <div className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 font-mono text-slate-300 truncate">
                      {window.location.origin}/webhook
                    </div>
                  </div>
                </div>

                {verifyResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono ${
                      verifyResult.passed
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="font-bold mb-1">
                      {verifyResult.passed ? '✅ Verification Passed (HTTP 200)' : '❌ Verification Failed'}
                    </div>
                    <div>Status Code: {verifyResult.status}</div>
                    <div>Challenge Returned: {verifyResult.response}</div>
                  </div>
                )}
              </div>

              {/* POST /webhook test */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <span>2. POST /webhook — Inbound Message Payload & Idempotency</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Immediate HTTP 200 response, duplicate message ID deduplication, and HMAC-SHA256 signature check.
                    </p>
                  </div>
                  <button
                    onClick={testPostWebhookPayload}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Send POST Payload</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Meta Incoming Webhook JSON Payload:</span>
                    <button
                      onClick={() => copyToClipboard(customWebhookPayload || sampleIncomingText, 'webhook_json')}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                    >
                      {copiedKey === 'webhook_json' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Sample Payload</span>
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={customWebhookPayload}
                    onChange={(e) => setCustomWebhookPayload(e.target.value)}
                    placeholder="Leave empty to send default 'hi' message payload..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>

                {postWebhookResult && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono space-y-1">
                    <div className="text-emerald-400 font-bold">Response: HTTP {postWebhookResult.status} OK</div>
                    <div className="text-slate-400">Body: {postWebhookResult.body}</div>
                    <div className="text-slate-500 text-[10px]">Processed at: {postWebhookResult.timestamp}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 7: Sample JSON Payloads                                    */}
        {/* ============================================================== */}
        {activeTab === 'samples' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-100">Meta WhatsApp Cloud API Payload References</h3>
                <div className="space-y-6">
                  {/* Incoming Text Message */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-400 font-mono">1. Incoming Text Message</span>
                      <button
                        onClick={() => copyToClipboard(sampleIncomingText, 'sample_in_text')}
                        className="text-slate-400 hover:text-white flex items-center space-x-1"
                      >
                        {copiedKey === 'sample_in_text' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-emerald-400" />}
                        <span>Copy JSON</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                      {sampleIncomingText}
                    </pre>
                  </div>

                  {/* Incoming List Selection Reply */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-400 font-mono">2. Incoming Interactive List Reply</span>
                      <button
                        onClick={() => copyToClipboard(sampleIncomingListReply, 'sample_in_list')}
                        className="text-slate-400 hover:text-white flex items-center space-x-1"
                      >
                        {copiedKey === 'sample_in_list' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-emerald-400" />}
                        <span>Copy JSON</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                      {sampleIncomingListReply}
                    </pre>
                  </div>

                  {/* Outgoing List Message */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-400 font-mono">3. Outgoing Interactive List Message</span>
                      <button
                        onClick={() => copyToClipboard(sampleOutgoingList, 'sample_out_list')}
                        className="text-slate-400 hover:text-white flex items-center space-x-1"
                      >
                        {copiedKey === 'sample_out_list' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-emerald-400" />}
                        <span>Copy JSON</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                      {sampleOutgoingList}
                    </pre>
                  </div>

                  {/* Outgoing Template Message */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-400 font-mono">4. Outgoing WhatsApp Template Message</span>
                      <button
                        onClick={() => copyToClipboard(sampleOutgoingTemplate, 'sample_out_tmpl')}
                        className="text-slate-400 hover:text-white flex items-center space-x-1"
                      >
                        {copiedKey === 'sample_out_tmpl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-emerald-400" />}
                        <span>Copy JSON</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                      {sampleOutgoingTemplate}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 8: Setup Guide & Test Plan                                 */}
        {/* ============================================================== */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Meta WhatsApp Cloud API Setup (100% Free)</span>
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-emerald-400 underline">developers.facebook.com</a> and sign in.</li>
                  <li>Click <strong>Create App</strong> ➔ Select <strong>Other</strong> ➔ Choose <strong>Business</strong>.</li>
                  <li>Under WhatsApp, click <strong>Set Up</strong> ➔ Navigate to <strong>API Setup</strong>.</li>
                  <li>Copy the <strong>Phone Number ID</strong> and <strong>Temporary Access Token</strong> into the Settings tab.</li>
                  <li>Under <strong>To</strong> field, click <strong>Manage phone number list</strong> to add test recipients.</li>
                </ol>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Local Webhook Testing with ngrok</span>
                </h3>
                <div className="space-y-2">
                  <p>1. Start the server on port 3000:</p>
                  <pre className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-emerald-400">npm run dev</pre>
                  <p>2. In a separate terminal, expose port 3000:</p>
                  <pre className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-emerald-400">ngrok http 3000</pre>
                  <p>3. In Meta Developer Console ➔ WhatsApp ➔ Configuration:</p>
                  <ul className="list-disc list-inside pl-2 space-y-1 text-slate-400">
                    <li>Callback URL: <code>https://your-ngrok-subdomain.ngrok-free.app/webhook</code></li>
                    <li>Verify Token: <code>{envConfig.verifyToken}</code></li>
                    <li>Subscribe to the <code>messages</code> webhook field.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: NEW MESSAGE MODAL (Send to Any Number)                */}
      {/* ============================================================== */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Send WhatsApp Message</h3>
                  <p className="text-xs text-slate-400">
                    Send to any recipient phone number via {dispatchMode === 'live' ? 'Live Meta API' : 'Sandbox Simulator'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Live Mode Warning in Modal */}
              {dispatchMode === 'live' && (
                <div className="p-3 bg-amber-950/70 border border-amber-700/80 rounded-xl text-amber-200 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Warning:</strong> You are in Live Mode. A real WhatsApp message will be sent through Meta Cloud API to this phone number.
                  </span>
                </div>
              )}

              {/* Recipient Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Recipient Phone Number (with Country Code):</label>
                  <input
                    type="text"
                    value={newMessageForm.phone}
                    onChange={(e) => setNewMessageForm({ ...newMessageForm, phone: e.target.value })}
                    placeholder="e.g. 919876543210"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">E.164 standard (digits only, e.g. 919876543210)</span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Recipient Name (Optional):</label>
                  <input
                    type="text"
                    value={newMessageForm.name}
                    onChange={(e) => setNewMessageForm({ ...newMessageForm, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 24-HOUR SERVICE WINDOW INDICATOR */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Customer 24-Hour Service Window:</span>
                  {windowStatusForNewMessage.isOpen ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>24h window OPEN ({windowStatusForNewMessage.timeLeftFormatted})</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                      24h window CLOSED (Templates only)
                    </span>
                  )}
                </div>

                {!windowStatusForNewMessage.isOpen && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Free-text messages require customer to message first within last 24h.</span>
                    {enteredCustomerMatch && (
                      <button
                        onClick={async () => {
                          await handleSimulateInbound(enteredCustomerMatch.id);
                          await fetchAllData();
                        }}
                        className="text-emerald-400 hover:underline flex items-center space-x-1 font-semibold"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Simulate Inbound (Open Window)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Message Type Selector */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Message Type:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewMessageForm({ ...newMessageForm, type: 'template' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newMessageForm.type === 'template'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Approved Template Message</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Always allowed outside 24h window. Pre-approved by Meta for business notifications.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!windowStatusForNewMessage.isOpen}
                    onClick={() => setNewMessageForm({ ...newMessageForm, type: 'text' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      !windowStatusForNewMessage.isOpen
                        ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-800 text-slate-500'
                        : newMessageForm.type === 'text'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center space-x-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Free Text Message</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {windowStatusForNewMessage.isOpen
                        ? 'Allowed because recipient messaged within last 24h.'
                        : 'Disabled: 24h window is closed. Send an approved template instead.'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Template Selection Form */}
              {newMessageForm.type === 'template' && (
                <div className="space-y-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Select Approved Template:</label>
                    <select
                      value={newMessageForm.templateName}
                      onChange={(e) => {
                        const t = APPROVED_TEMPLATES.find((tpl) => tpl.name === e.target.value);
                        setNewMessageForm({
                          ...newMessageForm,
                          templateName: e.target.value,
                          variables: t?.sampleValues || []
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono outline-none"
                    >
                      {APPROVED_TEMPLATES.map((tmpl) => (
                        <option key={tmpl.name} value={tmpl.name}>
                          {tmpl.title} ({tmpl.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Template Variables */}
                  {selectedTemplateObj.variables.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="font-semibold text-slate-300">Template Variables:</div>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedTemplateObj.variables.map((varName, idx) => (
                          <div key={idx}>
                            <label className="text-[10px] text-slate-400 block mb-0.5">
                              {'{{' + (idx + 1) + '}}'} {varName}:
                            </label>
                            <input
                              type="text"
                              value={newMessageForm.variables[idx] || ''}
                              onChange={(e) => {
                                const vars = [...newMessageForm.variables];
                                vars[idx] = e.target.value;
                                setNewMessageForm({ ...newMessageForm, variables: vars });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs font-mono"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Template Live Preview Bubble */}
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1">Live Message Preview:</span>
                    <div className="p-3 bg-[#0b141a] border border-slate-800 rounded-lg">
                      <div className="p-2.5 bg-[#202c33] text-white rounded-lg rounded-tl-none whitespace-pre-wrap leading-relaxed text-xs shadow-sm font-sans">
                        {selectedTemplateObj.previewText(newMessageForm.variables)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Free Text Input Form */}
              {newMessageForm.type === 'text' && (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Message Content:</label>
                  <textarea
                    rows={4}
                    value={newMessageForm.text}
                    onChange={(e) => setNewMessageForm({ ...newMessageForm, text: e.target.value })}
                    placeholder="Type your message here..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              )}

              {/* Send Result Display Inline */}
              {newMessageResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                    newMessageResult.loading
                      ? 'bg-slate-950 border-slate-800 text-slate-300 animate-pulse'
                      : newMessageResult.success
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-700 text-rose-300'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5">
                    {newMessageResult.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : newMessageResult.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>
                      {newMessageResult.loading
                        ? 'Dispatching message...'
                        : newMessageResult.success
                        ? `Message Sent Successfully (${newMessageResult.mode})`
                        : 'Message Dispatch Failed'}
                    </span>
                  </div>

                  {newMessageResult.messageId && (
                    <div className="text-[11px] text-slate-300">Message ID: {newMessageResult.messageId}</div>
                  )}

                  {newMessageResult.error && (
                    <div className="text-[11px] text-rose-200 mt-1 font-sans">{newMessageResult.error}</div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowNewMessageModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendNewMessage}
                disabled={
                  newMessageResult?.loading ||
                  !newMessageForm.phone.trim() ||
                  (newMessageForm.type === 'text' && !newMessageForm.text.trim())
                }
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-900/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{newMessageResult?.loading ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADD CUSTOMER MODAL (With Required Consent Checkbox)   */}
      {/* ============================================================== */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <form
            onSubmit={handleAddCustomerSubmit}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Add New Customer</h3>
                  <p className="text-xs text-slate-400">Record recipient phone and explicit opt-in consent</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {addCustomerError && (
                <div className="p-3 bg-rose-950/60 border border-rose-700 rounded-xl text-rose-300 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{addCustomerError}</span>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Customer Full Name (Optional):</label>
                <input
                  type="text"
                  value={addCustomerForm.name}
                  onChange={(e) => setAddCustomerForm({ ...addCustomerForm, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">WhatsApp Phone Number (E.164):</label>
                <input
                  type="text"
                  value={addCustomerForm.phone}
                  onChange={(e) => setAddCustomerForm({ ...addCustomerForm, phone: e.target.value })}
                  placeholder="e.g. 919876543210"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Language Preference:</label>
                <select
                  value={addCustomerForm.language}
                  onChange={(e) => setAddCustomerForm({ ...addCustomerForm, language: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none"
                >
                  <option value="en">English (en)</option>
                  <option value="hi">Hindi / हिंदी (hi)</option>
                </select>
              </div>

              {/* REQUIRED CONSENT CHECKBOX */}
              <div className="p-3.5 bg-slate-950 border border-emerald-900/80 rounded-xl space-y-2">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addCustomerForm.consentAgreed}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, consentAgreed: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 accent-emerald-500 shrink-0"
                  />
                  <span className="text-xs text-slate-200 font-bold">
                    This person agreed to receive WhatsApp messages from my business. <span className="text-rose-400">*</span>
                  </span>
                </label>
                <p className="text-[10px] text-slate-400 pl-6 leading-relaxed">
                  Meta anti-spam regulations require verifiable consent. Unsolicited messages without consent risk phone number banning.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingCustomer || !addCustomerForm.consentAgreed || !addCustomerForm.phone.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isAddingCustomer ? 'Saving...' : 'Add Customer'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: IMPORT CSV MODAL                                      */}
      {/* ============================================================== */}
      {showImportCsvModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Import Customers via CSV</h3>
                  <p className="text-xs text-slate-400">Batch import customer list with consent dates</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportCsvModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-semibold">Required Columns: <code className="text-emerald-400 font-mono">phone, name, language, consent_date</code></span>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="text-emerald-400 hover:underline flex items-center space-x-1 font-semibold text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Paste CSV content below:</label>
                <textarea
                  rows={8}
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              {csvImportResult && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs font-mono">
                  <div className="font-bold text-emerald-400">{csvImportResult.summary}</div>
                  {csvImportResult.importedCount !== undefined && (
                    <div className="text-slate-300 text-[11px] pt-1">
                      ✅ {csvImportResult.importedCount} Imported Successfully | ⚠️ {csvImportResult.skippedNoConsent} Skipped (no consent) | ❌ {csvImportResult.skippedInvalidPhone} Skipped (invalid phone)
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowImportCsvModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleImportCsvSubmit}
                disabled={isImportingCsv || !csvRawText.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isImportingCsv ? 'Validating & Importing...' : 'Import CSV Rows'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: TOKEN EXPIRED / FIX GUIDE MODAL (Code 190)            */}
      {/* ============================================================== */}
      {showMetaFixModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-600/70 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Meta Token Expired (Code 190)</h3>
                  <p className="text-xs text-rose-300">Temporary access tokens expire after 24 hours</p>
                </div>
              </div>
              <button
                onClick={() => setShowMetaFixModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
              <p>
                Meta WhatsApp Cloud API issues temporary developer tokens that automatically expire after <strong>24 hours</strong>. This caused the <code className="text-rose-400 font-mono">OAuthException 190</code> error.
              </p>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quick 1-Minute Fix:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>
                    Log in to{' '}
                    <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">
                      developers.facebook.com
                    </a>.
                  </li>
                  <li>Go to <strong>My Apps</strong> ➔ Select your WhatsApp App ➔ <strong>API Setup</strong>.</li>
                  <li>Click <strong>Copy</strong> next to the newly generated <strong>Temporary access token</strong>.</li>
                  <li>Go to the <strong>Auto-Reply & Settings</strong> tab in this dashboard, paste the token, and click <strong>Save Configuration</strong>!</li>
                </ol>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Production Permanent Token (Never Expires):</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  In Meta Business Settings ➔ System Users ➔ Add System User (Admin) ➔ Assign WhatsApp Assets with full access ➔ Generate Token with <code className="text-cyan-300 font-mono">whatsapp_business_messaging</code> and <code className="text-cyan-300 font-mono">whatsapp_business_management</code>.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowMetaFixModal(false);
                  setActiveTab('settings');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
              >
                Go to Settings & Update Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CONFIRM SWITCH TO LIVE WHATSAPP MODE                  */}
      {/* ============================================================== */}
      {showLiveModeConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-600/70 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Switch to Live WhatsApp Mode?</h3>
                  <p className="text-xs text-amber-300">Real WhatsApp messages will be dispatched</p>
                </div>
              </div>
              <button
                onClick={() => setShowLiveModeConfirm(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                In <strong>Live WhatsApp Mode</strong>, every message you send from the dashboard or via campaign broadcast connects directly to the Meta WhatsApp Cloud API and reaches actual WhatsApp mobile numbers.
              </p>
              <div className="p-3 bg-slate-950 border border-amber-900/60 rounded-xl space-y-1 text-amber-200">
                <div className="font-semibold text-white">Before proceeding, ensure:</div>
                <div>• Your <code className="text-amber-400 font-mono">WHATSAPP_TOKEN</code> is valid and active.</div>
                <div>• If using Meta free test number, recipient numbers must be added to your recipient whitelist in Meta Developer Console.</div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowLiveModeConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Stay in Simulator
              </button>
              <button
                type="button"
                onClick={() => applyModeSwitch('live')}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 shadow-md shadow-amber-900/30"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Confirm & Enable Live Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sample JSON payloads for reference tab
const sampleIncomingText = JSON.stringify(
  {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '109876543210987',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550293421',
                phone_number_id: '109876543210987'
              },
              contacts: [
                {
                  profile: { name: 'Tushar' },
                  wa_id: '919876543210'
                }
              ],
              messages: [
                {
                  from: '919876543210',
                  id: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAEhggMTIzNDU2Nzg5MAA=',
                  timestamp: '1728739200',
                  text: {
                    body: 'hi'
                  },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  },
  null,
  2
);

const sampleIncomingListReply = JSON.stringify(
  {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '109876543210987',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              contacts: [{ profile: { name: 'Tushar' }, wa_id: '919876543210' }],
              messages: [
                {
                  from: '919876543210',
                  id: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAEhggOTg3NjU0MzIxMAA=',
                  timestamp: '1728739250',
                  type: 'interactive',
                  interactive: {
                    type: 'list_reply',
                    list_reply: {
                      id: 'item_dish_01',
                      title: 'Butter Chicken (₹380)',
                      description: 'Tender chicken in rich creamy tomato cashew gravy'
                    }
                  }
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  },
  null,
  2
);

const sampleOutgoingList = JSON.stringify(
  {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '919876543210',
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: 'Main Menu'
      },
      body: {
        text: 'Please select what you would like to do:'
      },
      action: {
        button: 'View Options',
        sections: [
          {
            title: 'Services & Orders',
            rows: [
              {
                id: 'action_order_now',
                title: '🛍️ Order Now',
                description: 'Browse our popular dishes and place an order'
              },
              {
                id: 'action_track_order',
                title: '📍 Track Order',
                description: 'Check live status of your recent order'
              },
              {
                id: 'action_hours_location',
                title: '🕒 Hours & Location',
                description: 'Check operating hours and restaurant address'
              }
            ]
          },
          {
            title: 'Support & Settings',
            rows: [
              {
                id: 'action_agent',
                title: '👤 Talk to Human',
                description: 'Connect directly with our support team'
              },
              {
                id: 'action_change_lang',
                title: '🌐 Change Language',
                description: 'Switch language (English / हिंदी)'
              }
            ]
          }
        ]
      }
    }
  },
  null,
  2
);

const sampleOutgoingTemplate = JSON.stringify(
  {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '919876543210',
    type: 'template',
    template: {
      name: 'order_status_update',
      language: {
        code: 'en_US'
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: 'ORD-1001'
            },
            {
              type: 'text',
              text: 'DELIVERED'
            }
          ]
        }
      ]
    }
  },
  null,
  2
);
