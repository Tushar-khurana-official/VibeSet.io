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
  DollarSign
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

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'simulator' | 'orders' | 'customers' | 'broadcast' | 'settings' | 'webhook' | 'samples' | 'guide'
  >('simulator');

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

  // Broadcast state
  const [broadcastTemplate, setBroadcastTemplate] = useState('seasonal_offer');
  const [broadcastLang, setBroadcastLang] = useState('en_US');
  const [broadcastDelay, setBroadcastDelay] = useState(500);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
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

  // Fetch admin and business config data
  const fetchAllData = async () => {
    try {
      const headers = { 'X-Admin-Api-Key': adminApiKey };
      const [ordRes, custRes, convRes, cfgRes, bcRes] = await Promise.all([
        fetch('/api/admin/orders', { headers }).then((r) => r.json()),
        fetch('/api/admin/customers', { headers }).then((r) => r.json()),
        fetch('/api/admin/conversations', { headers }).then((r) => r.json()),
        fetch('/api/admin/config', { headers }).then((r) => r.json()),
        fetch('/api/admin/broadcast/history', { headers }).then((r) => r.json()).catch(() => ({ data: [] }))
      ]);

      if (ordRes.data) setAdminOrders(ordRes.data);
      if (custRes.data) setAdminCustomers(custRes.data);
      if (convRes.data) setAdminConversations(convRes.data);
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
  }, [activeTab]);

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
                  interactivePayload
                    ? {
                        from: phone,
                        id: `wamid.HBgM${Date.now()}`,
                        timestamp: String(Math.floor(Date.now() / 1000)),
                        type: 'interactive',
                        interactive: interactivePayload
                      }
                    : {
                        from: phone,
                        id: `wamid.HBgM${Date.now()}`,
                        timestamp: String(Math.floor(Date.now() / 1000)),
                        type: 'text',
                        text: { body: currentMsgText }
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });
    } catch (err) {
      console.error('Error dispatching webhook in simulator', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to update order status', err);
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

  const handleSendDirectMessage = async () => {
    if (!selectedCustomer || !directMessageText.trim()) return;
    setIsSendingDirectMessage(true);
    try {
      await fetch(`/api/admin/customers/${selectedCustomer.id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({ text: directMessageText.trim() })
      });
      setDirectMessageText('');
      fetchAllData();
    } catch (err) {
      console.error('Failed to send direct message', err);
    } finally {
      setIsSendingDirectMessage(false);
    }
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

  const handleTriggerBroadcast = async () => {
    setIsBroadcasting(true);
    setBroadcastStatus('Broadcasting campaign in progress...');
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
          delayMs: broadcastDelay
        })
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastStatus(
          `Campaign dispatched successfully! Sent: ${data.data.sentCount}, Skipped: ${data.data.skippedUnsubscribed}, Failed: ${data.data.failedCount}`
        );
        fetchAllData();
      } else {
        setBroadcastStatus(`Broadcast failed: ${data.error}`);
      }
    } catch (e: any) {
      setBroadcastStatus(`Error: ${e.message}`);
    } finally {
      setIsBroadcasting(false);
    }
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
              <p className="text-xs text-emerald-400 font-mono">WhatsApp Cloud API</p>
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
              <span className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Developer</span>
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

        {/* Free Stack Badge */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">100% Free Stack</div>
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
              <span>Hosting:</span>
              <span className="font-mono text-emerald-400">Render Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tunnel:</span>
              <span className="font-mono text-emerald-400">ngrok Free</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-sm text-slate-100">{businessSettings.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono capitalize">
              {businessSettings.category}
            </span>
            <span className="text-xs text-slate-400">{businessSettings.menuItems.length} menu items</span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <a
              href="/health"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-emerald-400 flex items-center space-x-1"
            >
              <span>GET /health</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={fetchAllData}
              className="text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              title="Refresh all data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* ============================================================== */}
        {/* Tab 1: Live Interactive WhatsApp Simulator                     */}
        {/* ============================================================== */}
        {activeTab === 'simulator' && (
          <div className="flex-1 flex overflow-hidden p-6 gap-6 justify-center items-center bg-slate-950">
            {/* Phone Container */}
            <div className="w-[380px] h-[720px] max-h-[92vh] bg-slate-900 rounded-[38px] border-4 border-slate-700 shadow-2xl flex flex-col overflow-hidden relative">
              {/* Phone Camera Notch & Status Bar */}
              <div className="h-7 bg-slate-950 flex items-center justify-between px-6 text-[11px] text-slate-400">
                <span>9:41</span>
                <div className="w-20 h-4 bg-slate-900 rounded-full" />
                <div className="flex space-x-1">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* WhatsApp Header */}
              <div className="bg-emerald-800 px-4 py-3 flex items-center justify-between text-white shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 border border-emerald-400 flex items-center justify-center font-bold text-sm">
                    {businessSettings.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight flex items-center space-x-1">
                      <span>{businessSettings.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    </div>
                    <div className="text-[11px] text-emerald-200">Official Business Account</div>
                  </div>
                </div>
                <div className="flex space-x-2 text-emerald-200">
                  <button
                    onClick={() => {
                      setChatMessages([]);
                      sendSimulatorMessage('hi');
                    }}
                    title="Reset Conversation"
                    className="p-1 hover:text-white"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div
                className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0b141a]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at center, rgba(16, 185, 129, 0.03) 0%, transparent 70%)'
                }}
              >
                {/* Security encryption pill */}
                <div className="bg-slate-800/80 text-[10px] text-amber-300/80 rounded-md p-1.5 text-center shadow-sm">
                  🔒 Messages are end-to-end encrypted. Meta Cloud API Sandbox.
                </div>

                {chatMessages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                      {/* Message Bubble */}
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                          isBot
                            ? 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/50'
                            : 'bg-[#005c4b] text-white rounded-tr-none'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>

                        {/* Interactive List trigger if present */}
                        {msg.payload?.interactive?.type === 'list' && (
                          <div className="mt-2.5 pt-2 border-t border-slate-700">
                            <button
                              onClick={() => setSelectedListSection(msg.payload.interactive)}
                              className="w-full bg-[#111b21] hover:bg-slate-800 text-emerald-400 font-medium py-1.5 px-3 rounded-lg flex items-center justify-between border border-emerald-500/30 transition-colors"
                            >
                              <span>{msg.payload.interactive.action?.button || 'View Menu Options'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Interactive Buttons if present */}
                        {msg.payload?.interactive?.type === 'button' && (
                          <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-700">
                            {msg.payload.interactive.action?.buttons?.map((btn: any) => (
                              <button
                                key={btn.reply.id}
                                onClick={() =>
                                  sendSimulatorMessage(btn.reply.title, {
                                    type: 'button_reply',
                                    button_reply: { id: btn.reply.id, title: btn.reply.title }
                                  })
                                }
                                className="w-full bg-[#111b21] hover:bg-emerald-950/40 text-emerald-300 font-medium py-1.5 px-2 rounded-lg text-center border border-emerald-500/30 transition-colors"
                              >
                                {btn.reply.title}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Timestamp & checks */}
                        <div className="flex justify-end items-center space-x-1 mt-1 text-[10px] text-slate-400">
                          <span>{msg.timestamp}</span>
                          {!isBot && <CheckCheck className="w-3.5 h-3.5 text-sky-400" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-center space-x-1 text-slate-400 text-xs italic pl-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{businessSettings.name} is typing...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Interactive List Modal Sheet */}
              {selectedListSection && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col justify-end animate-in fade-in">
                  <div className="bg-[#1f2c34] rounded-t-2xl p-4 max-h-[70%] overflow-y-auto space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                      <h4 className="text-sm font-semibold text-white">
                        {selectedListSection.header?.text || selectedListSection.body?.text || 'Select an Option'}
                      </h4>
                      <button
                        onClick={() => setSelectedListSection(null)}
                        className="text-xs bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded"
                      >
                        Close
                      </button>
                    </div>

                    {selectedListSection.action?.sections?.map((sec: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                          {sec.title}
                        </div>
                        {sec.rows?.map((row: any) => (
                          <button
                            key={row.id}
                            onClick={() => {
                              setSelectedListSection(null);
                              sendSimulatorMessage(row.title, {
                                type: 'list_reply',
                                list_reply: { id: row.id, title: row.title, description: row.description }
                              });
                            }}
                            className="w-full text-left p-2.5 rounded-lg bg-[#111b21] hover:bg-[#202c33] transition-colors border border-slate-700/60 block"
                          >
                            <div className="text-xs font-medium text-slate-100">{row.title}</div>
                            {row.description && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{row.description}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendSimulatorMessage(inputMessage);
                }}
                className="bg-[#202c33] p-2.5 flex items-center space-x-2 border-t border-slate-800"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type message (e.g. hi, menu, order)..."
                  className="flex-1 bg-[#2a3942] text-xs text-white placeholder-slate-400 rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center text-white shrink-0 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Quick Actions & Customer Controls Panel */}
            <div className="w-80 flex flex-col space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Test Customer Profile</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Customer Phone (E.164):</label>
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
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">⚡ Quick Test Commands</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => sendSimulatorMessage('hi')}
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 font-mono"
                  >
                    👉 hi / hello
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('menu')}
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 font-mono"
                  >
                    👉 menu
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('order')}
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 font-mono"
                  >
                    👉 order
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('status')}
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 font-mono"
                  >
                    👉 status
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('agent')}
                    className="p-2 rounded bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-left border border-amber-800 font-mono"
                  >
                    👉 agent (handoff)
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('stop')}
                    className="p-2 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-left border border-rose-800 font-mono"
                  >
                    👉 stop (opt-out)
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('start')}
                    className="p-2 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-left border border-emerald-800 font-mono"
                  >
                    👉 start (opt-in)
                  </button>
                  <button
                    onClick={() => sendSimulatorMessage('language')}
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 font-mono"
                  >
                    👉 language (भाषा)
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                <span className="font-semibold text-slate-200 block mb-1">State Machine Flow:</span>
                MAIN_MENU ➔ BROWSING ➔ QUANTITY ➔ ADDRESS ➔ CONFIRM ➔ DONE
                <p className="mt-2 text-slate-500">
                  Type <span className="text-slate-300 font-mono">back</span> or{' '}
                  <span className="text-slate-300 font-mono">cancel</span> anytime to test rollback.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 2: Orders Page                                             */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-400" />
                    <span>Orders Management</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Track customer orders and dispatch automated WhatsApp status updates.
                  </p>
                </div>
                <button
                  onClick={fetchAllData}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Orders</span>
                </button>
              </div>

              {/* Orders Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">Order #</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Items</th>
                        <th className="py-2.5 px-3">Total</th>
                        <th className="py-2.5 px-3">Address</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {adminOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                            No orders placed yet. Place an order in the Chat Simulator to see it here!
                          </td>
                        </tr>
                      ) : (
                        adminOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-800/30">
                            <td className="py-3 px-3 font-semibold text-emerald-400">{ord.orderNumber}</td>
                            <td className="py-3 px-3 text-slate-300">
                              <div>{ord.customerName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">+{ord.customerPhone}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-300 font-sans">
                              {ord.items?.map((it: any, i: number) => (
                                <div key={i}>
                                  {it.itemName} x{it.quantity}
                                </div>
                              ))}
                            </td>
                            <td className="py-3 px-3 text-slate-200 font-semibold">
                              {businessSettings.currency}
                              {ord.totalAmount}
                            </td>
                            <td className="py-3 px-3 text-slate-400 max-w-xs truncate font-sans">{ord.deliveryAddress}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ord.status === 'PLACED'
                                    ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                    : ord.status === 'PREPARING'
                                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                    : ord.status === 'READY'
                                    ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                    : ord.status === 'DELIVERED'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-1 font-sans">
                              {ord.status !== 'PREPARING' && ord.status !== 'DELIVERED' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                                  className="px-2 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded text-[10px]"
                                >
                                  Prepare
                                </button>
                              )}
                              {ord.status !== 'READY' && ord.status !== 'DELIVERED' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, 'READY')}
                                  className="px-2 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded text-[10px]"
                                >
                                  Ready
                                </button>
                              )}
                              {ord.status !== 'DELIVERED' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, 'DELIVERED')}
                                  className="px-2 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded text-[10px]"
                                >
                                  Deliver
                                </button>
                              )}
                              {ord.status !== 'CANCELLED' && ord.status !== 'DELIVERED' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, 'CANCELLED')}
                                  className="px-2 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[10px]"
                                >
                                  Cancel
                                </button>
                              )}
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
                    <span>Customers & Audience Directory</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Manage opt-in compliance, human handoffs, language preferences, and direct messages.
                  </p>
                </div>
                <div className="flex space-x-2 text-xs">
                  <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center space-x-2">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-bold text-white font-mono">{adminCustomers.length}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center space-x-2">
                    <span className="text-emerald-400">Opted In:</span>
                    <span className="font-bold text-emerald-400 font-mono">{optedInCount}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center space-x-2">
                    <span className="text-rose-400">Opted Out:</span>
                    <span className="font-bold text-rose-400 font-mono">{optedOutCount}</span>
                  </div>
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

              {/* Customers List & Management Grid */}
              <div className="grid grid-cols-3 gap-6">
                {/* Customers Table (2 Cols) */}
                <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Language</th>
                        <th className="py-2.5 px-3">Compliance</th>
                        <th className="py-2.5 px-3">Bot State</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                            No customers found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((cust) => {
                          const conv = adminConversations.find((c) => c.customerId === cust.id);
                          const isSelected = selectedCustomer?.id === cust.id;
                          return (
                            <tr
                              key={cust.id}
                              onClick={() => setSelectedCustomer(cust)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-emerald-950/40 border-l-2 border-emerald-500' : 'hover:bg-slate-800/30'
                              }`}
                            >
                              <td className="py-3 px-3 font-sans font-medium text-slate-200">
                                {cust.name || 'Anonymous User'}
                              </td>
                              <td className="py-3 px-3 text-emerald-400 font-mono">+{cust.phone}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 uppercase font-semibold">
                                  {cust.language}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-sans">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleOptIn(cust.id, cust.optedIn);
                                  }}
                                  title="Click to toggle opt-in/opt-out"
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    cust.optedIn
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                                  }`}
                                >
                                  {cust.optedIn ? 'Opted In' : 'Opted Out'}
                                </button>
                              </td>
                              <td className="py-3 px-3 font-sans">
                                {conv?.isBotPaused ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1 w-max">
                                    <PauseCircle className="w-3 h-3" />
                                    <span>Agent Paused</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {conv?.state || 'MAIN_MENU'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-sans space-x-1">
                                {conv?.isBotPaused ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResumeBot(cust.id);
                                    }}
                                    className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-medium"
                                  >
                                    Resume Bot
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePauseBot(cust.id);
                                    }}
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

                {/* Customer Details & Direct Messaging Panel (1 Col) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  {selectedCustomer ? (
                    <>
                      <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="font-semibold text-sm text-white">
                            {selectedCustomer.name || 'Anonymous User'}
                          </h3>
                          <div className="text-xs text-emerald-400 font-mono">+{selectedCustomer.phone}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedCustomer.optedIn
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {selectedCustomer.optedIn ? 'Active Subscriber' : 'Unsubscribed'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Language:</span>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleChangeLanguage(selectedCustomer.id, 'en')}
                              className={`px-2 py-0.5 rounded ${
                                selectedCustomer.language === 'en'
                                  ? 'bg-emerald-600 text-white font-bold'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              EN
                            </button>
                            <button
                              onClick={() => handleChangeLanguage(selectedCustomer.id, 'hi')}
                              className={`px-2 py-0.5 rounded ${
                                selectedCustomer.language === 'hi'
                                  ? 'bg-emerald-600 text-white font-bold'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              HI (हिंदी)
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Joined:</span>
                          <span className="text-slate-300">
                            {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Orders:</span>
                          <span className="font-semibold text-white">
                            {adminOrders.filter((o) => o.customerId === selectedCustomer.id).length} Orders
                          </span>
                        </div>
                      </div>

                      {/* Direct Staff Message to WhatsApp */}
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Direct Staff WhatsApp Message</span>
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Send a message directly from staff to this customer’s WhatsApp phone:
                        </p>
                        <textarea
                          rows={3}
                          value={directMessageText}
                          onChange={(e) => setDirectMessageText(e.target.value)}
                          placeholder="Type your message to customer..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={handleSendDirectMessage}
                          disabled={isSendingDirectMessage || !directMessageText.trim()}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send WhatsApp Message</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Select a customer from the table to view details or send a direct WhatsApp message.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 4: Dedicated Broadcast Page                                */}
        {/* ============================================================== */}
        {activeTab === 'broadcast' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Radio className="w-5 h-5 text-emerald-400" />
                    <span>WhatsApp Broadcast Campaigns</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Send approved WhatsApp template announcements to opted-in customers with rate limiting.
                  </p>
                </div>
              </div>

              {/* Campaign Runner Card */}
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-sm text-white">Create New Broadcast</h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">WhatsApp Approved Template Name:</label>
                      <select
                        value={broadcastTemplate}
                        onChange={(e) => setBroadcastTemplate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                      >
                        <option value="seasonal_offer">seasonal_offer (Festival Discount Announcement)</option>
                        <option value="weekend_special_offer">weekend_special_offer (Weekend Chef Special Menu)</option>
                        <option value="store_announcement">store_announcement (Operating Hours & Updates)</option>
                        <option value="order_status_update">order_status_update (Utility Template)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Language Code:</label>
                        <select
                          value={broadcastLang}
                          onChange={(e) => setBroadcastLang(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                        >
                          <option value="en_US">English (en_US)</option>
                          <option value="hi">Hindi (hi)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Rate-Limit Delay Between Sends (ms):</label>
                        <input
                          type="number"
                          value={broadcastDelay}
                          onChange={(e) => setBroadcastDelay(Number(e.target.value))}
                          step={100}
                          min={200}
                          max={5000}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    {/* Audience preview */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs">
                      <div className="font-semibold text-slate-300">Target Audience Preview:</div>
                      <div className="flex justify-between text-slate-400">
                        <span>Total Registered Customers:</span>
                        <span className="font-mono text-white">{adminCustomers.length}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Eligible Opted-In Recipients:</span>
                        <span className="font-mono font-bold">{optedInCount}</span>
                      </div>
                      <div className="flex justify-between text-rose-400">
                        <span>Unsubscribed (Will be skipped per Meta policy):</span>
                        <span className="font-mono">{optedOutCount}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerBroadcast}
                      disabled={isBroadcasting || optedInCount === 0}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-900/30"
                    >
                      <Radio className="w-4 h-4" />
                      <span>{isBroadcasting ? 'Broadcasting...' : 'Launch Broadcast Campaign'}</span>
                    </button>

                    {broadcastStatus && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300 font-mono text-xs">
                        {broadcastStatus}
                      </div>
                    )}
                  </div>
                </div>

                {/* Compliance & Meta Guidelines Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs text-slate-300 leading-relaxed">
                  <h3 className="font-semibold text-sm text-white flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Broadcast Rules & Limits</span>
                  </h3>
                  <p>
                    • <strong>Opt-In Strict Enforcement:</strong> The bot strictly verifies that{' '}
                    <code className="text-emerald-400">optedIn === true</code>. Any customer who replied STOP is
                    never messaged.
                  </p>
                  <p>
                    • <strong>Rate Limiting:</strong> A delay of {broadcastDelay}ms is added between each API call to
                    avoid Meta API Tier throttles and keep Render within free memory limits.
                  </p>
                  <p>
                    • <strong>Templates Only:</strong> Meta WhatsApp Cloud API policy requires pre-approved template
                    messages for unsolicited broadcasts outside 24h windows.
                  </p>
                </div>
              </div>

              {/* Broadcast History Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-sm text-white">Broadcast History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3">Date & Time</th>
                        <th className="py-2 px-3">Template</th>
                        <th className="py-2 px-3">Targeted</th>
                        <th className="py-2 px-3">Delivered</th>
                        <th className="py-2 px-3">Skipped (Opt-out)</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {broadcastHistory.map((bc, idx) => (
                        <tr key={bc.id || idx}>
                          <td className="py-2.5 px-3 text-slate-400">
                            {new Date(bc.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-semibold">{bc.templateName}</td>
                          <td className="py-2.5 px-3 text-slate-300">{bc.totalTargeted}</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{bc.sentCount}</td>
                          <td className="py-2.5 px-3 text-slate-400">{bc.skippedUnsubscribed}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Completed
                            </span>
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
                    <span>Auto-Reply Settings & Menu Customizer</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Change business name, category, currency, welcome messages, operating hours, and catalog menu items.
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
                  <span>Business settings, welcome message, and menu updated successfully! Tested live in bot.</span>
                </div>
              )}

              {/* Business Profile Details */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>1. Business Profile Information</span>
                </h3>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Business Name:</label>
                    <input
                      type="text"
                      value={businessSettings.name}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                      placeholder="e.g. Spice Garden Bistro & Cafe"
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
                      placeholder="₹, $, €, £"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-emerald-400 font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1">Tagline:</label>
                    <input
                      type="text"
                      value={businessSettings.tagline}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, tagline: e.target.value })}
                      placeholder="e.g. Authentic Flavors, Fresh Ingredients"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Support Phone:</label>
                    <input
                      type="text"
                      value={businessSettings.supportPhone}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, supportPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1">Physical Address:</label>
                    <input
                      type="text"
                      value={businessSettings.address}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                      placeholder="Street, City, Zip"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Operating Hours:</label>
                    <input
                      type="text"
                      value={businessSettings.hours}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, hours: e.target.value })}
                      placeholder="Mon - Sun: 10:00 AM - 11:00 PM"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Welcome Messages Customization */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>2. Welcome Messages (Auto-Replies)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Custom greeting sent when a customer first contacts your business or after 24h of inactivity. Supports variables:{' '}
                  <code className="text-emerald-300 font-mono">{'{businessName}'}</code>,{' '}
                  <code className="text-emerald-300 font-mono">{'{tagline}'}</code>.
                </p>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1 flex items-center space-x-1">
                      <span>English Welcome Message:</span>
                    </label>
                    <textarea
                      rows={5}
                      value={businessSettings.welcomeMessageEn}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, welcomeMessageEn: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1 flex items-center space-x-1">
                      <span>Hindi Welcome Message (हिंदी):</span>
                    </label>
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
                      <span>3. Catalog Menu Items & Services ({businessSettings.menuItems.length} Items)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      These items are rendered in WhatsApp Interactive List Messages when customers click "Order Now" or type "menu".
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

                {/* Add New Item Drawer / Form */}
                {isAddingNewItem && (
                  <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-emerald-400">Add New Dish / Service</h4>
                      <button
                        onClick={() => setIsAddingNewItem(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
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
                          placeholder="e.g. Masala Dosa"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Category:</label>
                        <input
                          type="text"
                          value={newItemForm.category}
                          onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                          placeholder="e.g. Starters, Main Course"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Price ({businessSettings.currency}):</label>
                        <input
                          type="number"
                          value={newItemForm.price}
                          onChange={(e) => setNewItemForm({ ...newItemForm, price: Number(e.target.value) })}
                          placeholder="150"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Item ID (optional):</label>
                        <input
                          type="text"
                          value={newItemForm.id}
                          onChange={(e) => setNewItemForm({ ...newItemForm, id: e.target.value })}
                          placeholder="e.g. dish_11"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-300 font-mono"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-slate-400 block mb-1">Description:</label>
                        <input
                          type="text"
                          value={newItemForm.description}
                          onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                          placeholder="Brief dish ingredients or service details (max 72 chars)"
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
                        <span>Save and Add to Menu</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit Item Modal / Inline Form */}
                {editingMenuItem && (
                  <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-amber-400">Edit Dish / Service</h4>
                      <button
                        onClick={() => setEditingMenuItem(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
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
                      <button
                        onClick={() => setEditingMenuItem(null)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg"
                      >
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

                {/* Menu items table */}
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
                            <button
                              onClick={() => setEditingMenuItem(item)}
                              className="p-1 hover:text-amber-400 text-slate-400"
                              title="Edit Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenuItem(item.id)}
                              className="p-1 hover:text-rose-400 text-slate-400"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Meta WhatsApp Cloud API Credentials & Live Sync */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-sm text-white flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>4. Meta WhatsApp Cloud API Connection</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Connect your live Meta WhatsApp Cloud number, or run in 100% free simulated sandbox mode.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 ${
                      metaCredentials.hasLiveToken
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-sky-950 text-sky-300 border border-sky-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${metaCredentials.hasLiveToken ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`} />
                    <span>{metaCredentials.hasLiveToken ? 'Live Meta API Connected' : 'Sandbox Simulation Mode Active'}</span>
                  </span>
                </div>

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
                    <label className="text-slate-400 block mb-1">Permanent Access Token (or Temporary 24h Token):</label>
                    <input
                      type="password"
                      value={metaCredentials.whatsappToken}
                      onChange={(e) => setMetaCredentials({ ...metaCredentials, whatsappToken: e.target.value })}
                      placeholder={metaCredentials.hasLiveToken ? '••••••••••••••••••••••••' : 'Paste EAA... token here'}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-emerald-400 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                  <div className="text-slate-300 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Zero-Downtime Sandbox Fallback Guarantee:</span>
                  </div>
                  <p>
                    If your Meta token expires (HTTP 401 error code 190) or has not been configured yet, the assistant automatically routes messages via the interactive <strong>Sandbox Simulator</strong> so your chat assistant never crashes, drops messages, or gets stuck in retries!
                  </p>
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
              {/* GET /webhook verification test */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>1. GET /webhook — Meta Verification Handshake</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Meta WhatsApp Cloud API sends a GET request with{' '}
                      <code className="text-emerald-300">hub.mode=subscribe</code>,{' '}
                      <code className="text-emerald-300">hub.verify_token</code>, and a challenge.
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
                      onClick={() =>
                        copyToClipboard(customWebhookPayload || sampleIncomingText, 'webhook_json')
                      }
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
                    placeholder="Leave empty to send default 'hi' message payload, or paste custom Meta payload here..."
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
                <p className="text-xs text-slate-400">
                  Ready-to-use production JSON schemas for incoming messages and outgoing interactive WhatsApp messages.
                </p>

                <div className="space-y-6">
                  {/* Incoming Text Message */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-400 font-mono">1. Incoming Text Message</span>
                      <button
                        onClick={() => copyToClipboard(sampleIncomingText, 'sample_in_text')}
                        className="text-slate-400 hover:text-white flex items-center space-x-1"
                      >
                        {copiedKey === 'sample_in_text' ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3 text-emerald-400" />
                        )}
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
                        {copiedKey === 'sample_in_list' ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3 text-emerald-400" />
                        )}
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
                        {copiedKey === 'sample_out_list' ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3 text-emerald-400" />
                        )}
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
                        {copiedKey === 'sample_out_tmpl' ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3 text-emerald-400" />
                        )}
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
              {/* Meta Developer Setup */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Module 1 & 2: Meta WhatsApp Cloud API Setup (100% Free)</span>
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>
                    Go to{' '}
                    <a
                      href="https://developers.facebook.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 underline"
                    >
                      developers.facebook.com
                    </a>{' '}
                    and log in or register your Meta Developer account.
                  </li>
                  <li>
                    Click <strong>Create App</strong> ➔ Select <strong>Other</strong> ➔ Choose <strong>Business</strong>.
                  </li>
                  <li>
                    In your App Dashboard, scroll to <strong>WhatsApp</strong> and click <strong>Set Up</strong>.
                  </li>
                  <li>
                    Navigate to <strong>WhatsApp ➔ API Setup</strong>:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-400">
                      <li>Copy the <strong>Phone Number ID</strong> (e.g. <code>109876543210987</code>).</li>
                      <li>Copy the <strong>Temporary Access Token</strong> (valid 24h for initial testing).</li>
                      <li>
                        To get a <strong>Permanent Token</strong>: Go to Business Settings ➔ System Users ➔ Add System User (Admin) ➔ Assign WhatsApp Assets with full control ➔ Generate Token with <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code> permissions.
                      </li>
                      <li>
                        Under <strong>To</strong> field, click <strong>Manage phone number list</strong> and add up to 5 recipient test phone numbers (Meta requires SMS verification for free sandbox test recipients).
                      </li>
                    </ul>
                  </li>
                </ol>
              </div>

              {/* Ngrok & Webhook Setup */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Module 3: Local Webhook Testing with ngrok</span>
                </h3>
                <div className="space-y-2">
                  <p>1. Start this local server on port 3000:</p>
                  <pre className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-emerald-400">
                    npm run dev
                  </pre>
                  <p>2. In a separate terminal, expose port 3000 using free ngrok:</p>
                  <pre className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-emerald-400">
                    ngrok http 3000
                  </pre>
                  <p>3. In Meta Developer Console ➔ WhatsApp ➔ Configuration:</p>
                  <ul className="list-disc list-inside pl-2 space-y-1 text-slate-400">
                    <li>Callback URL: <code>https://your-ngrok-subdomain.ngrok-free.app/webhook</code></li>
                    <li>Verify Token: <code>{envConfig.verifyToken}</code> (set in your .env)</li>
                    <li>Click <strong>Verify and Save</strong>.</li>
                    <li>Under Webhook Fields, click <strong>Manage</strong> and subscribe to <code>messages</code>.</li>
                  </ul>
                </div>
              </div>

              {/* Free Neon & Upstash Setup */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>Module 4: Free Neon PostgreSQL & Upstash Redis</span>
                </h3>
                <div className="space-y-2">
                  <p>
                    <strong>Neon PostgreSQL (Free):</strong> Sign up at{' '}
                    <a href="https://neon.tech" target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                      neon.tech
                    </a>
                    , create a project, and copy the pooled connection string into <code>DATABASE_URL</code>.
                  </p>
                  <p>Run Prisma migration:</p>
                  <pre className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-emerald-400">
                    npx prisma db push
                  </pre>
                  <p>
                    <strong>Upstash Redis (Free):</strong> Sign up at{' '}
                    <a href="https://upstash.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                      upstash.com
                    </a>
                    , create a free Redis database, and copy the <code>rediss://...</code> URL into <code>REDIS_URL</code>.
                  </p>
                </div>
              </div>

              {/* Free Render Deployment */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Module 5: Free Render Deployment & 24/7 Keep-Alive</span>
                </h3>
                <div className="space-y-2">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Push this repository to GitHub.</li>
                    <li>
                      Go to{' '}
                      <a href="https://render.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                        render.com
                      </a>{' '}
                      ➔ New ➔ <strong>Web Service</strong>.
                    </li>
                    <li>Connect your repository.</li>
                    <li>Build Command: <code>npm install && npm run build</code></li>
                    <li>Start Command: <code>npm start</code></li>
                    <li>Add Environment Variables from <code>.env.example</code>.</li>
                    <li>
                      Once deployed, update Meta Webhook Callback URL to:{' '}
                      <code>https://your-app.onrender.com/webhook</code>.
                    </li>
                    <li>
                      <strong>Prevent Sleep:</strong> Add <code>https://your-app.onrender.com/health</code> to a free uptime monitor (e.g., UptimeRobot, cron-job.org) pinging every 10 minutes.
                    </li>
                  </ol>
                </div>
              </div>

              {/* Test Plan */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Module 6: Test Plan & Example Conversation Scripts</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-emerald-400 mb-1">Scenario A: English Order Placement</h4>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-slate-300">
                      User: hi
                      Bot:  [Welcome message + Main Menu List: Order Now, Track Order, Hours & Location...]
                      User: [Selects 'Order Now' or types 'menu']
                      Bot:  [Sends Catalog List of dishes]
                      User: [Selects dish]
                      Bot:  [Sends Quantity buttons: 1, 2, 3]
                      User: [Clicks 2]
                      Bot:  "Great! You have selected 2x [Item] (Total: ₹...). Please enter your Delivery Address:"
                      User: "Flat 402, Sunshine Heights, MG Road, Bangalore"
                      Bot:  [Summary + Confirm Order / Cancel buttons]
                      User: [Clicks Confirm Order]
                      Bot:  "Order Placed Successfully! Order ID: #ORD-..." (+ Instant alert to Owner WhatsApp)
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold text-emerald-400 mb-1">Scenario B: Hindi Language & Support</h4>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-slate-300">
                      User: language
                      Bot:  [Buttons: English, हिंदी]
                      User: [Clicks हिंदी]
                      Bot:  "भाषा बदलकर हिंदी कर दी गई है! विकल्प देखने के लिए menu टाइप करें।"
                      User: agent
                      Bot:  "हमारे एजेंट को सूचित कर दिया गया है! स्वचालित बॉट वर्तमान में रोका गया है।"
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold text-emerald-400 mb-1">Scenario C: Opt-Out & Compliance</h4>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-slate-300">
                      User: STOP
                      Bot:  "You have successfully unsubscribed. You will not receive any further automated messages."
                      User: [Sends another message]
                      Bot:  [Silent - never messages unsubscribed users]
                      User: START
                      Bot:  "Welcome back! You have re-subscribed to updates."
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
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
