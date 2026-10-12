import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Smartphone,
  CheckCheck,
  Clock,
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
  AlertTriangle,
  Globe,
  RefreshCw,
  Play,
  CheckCircle2,
  PhoneCall,
  UserCheck,
  ChevronRight,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { businessConfig, envConfig } from './config';

interface ChatMessage {
  id: string;
  sender: 'customer' | 'bot';
  type: 'text' | 'interactive_list' | 'interactive_button' | 'template';
  text?: string;
  payload?: any;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'webhook' | 'admin' | 'guide' | 'samples'>('simulator');
  const [phone, setPhone] = useState('919876543210');
  const [customerName, setCustomerName] = useState('Tushar');
  const [inputMessage, setInputMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedListSection, setSelectedListSection] = useState<any | null>(null);

  // Admin state
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [adminCustomers, setAdminCustomers] = useState<any[]>([]);
  const [adminConversations, setAdminConversations] = useState<any[]>([]);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [adminApiKey, setAdminApiKey] = useState(envConfig.adminApiKey || 'wh_admin_secret_key_prod_2026');
  const [broadcastTemplate, setBroadcastTemplate] = useState('seasonal_offer');
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

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

  // Fetch admin data periodically or when switching tabs
  const fetchAdminData = async () => {
    try {
      const headers = { 'X-Admin-Api-Key': adminApiKey };
      const [ordRes, custRes, convRes, msgRes] = await Promise.all([
        fetch('/api/admin/orders', { headers }).then((r) => r.json()),
        fetch('/api/admin/customers', { headers }).then((r) => r.json()),
        fetch('/api/admin/conversations', { headers }).then((r) => r.json()),
        fetch('/api/admin/messages', { headers }).then((r) => r.json())
      ]);

      if (ordRes.data) setAdminOrders(ordRes.data);
      if (custRes.data) setAdminCustomers(custRes.data);
      if (convRes.data) setAdminConversations(convRes.data);
      if (msgRes.data) setAdminMessages(msgRes.data);
    } catch (e) {
      console.warn('Could not fetch admin data', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAdminData();
    }
  }, [activeTab]);

  // Initial welcome greeting in simulator
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: 'init-1',
          sender: 'bot',
          type: 'text',
          text: `👋 Welcome to *${businessConfig.name}*!\n${businessConfig.tagline}\n\nType *hi* or *menu* to explore our options!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, []);

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
        fetchAdminData();
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
      fetchAdminData();
    } catch (err) {
      console.error('Failed to resume bot', err);
    }
  };

  const handleTriggerBroadcast = async () => {
    setBroadcastStatus('Sending broadcast...');
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminApiKey
        },
        body: JSON.stringify({ templateName: broadcastTemplate, delayMs: 400 })
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastStatus(
          `Broadcast sent to ${data.data.sentCount} opted-in customers (${data.data.skippedUnsubscribed} skipped)!`
        );
      } else {
        setBroadcastStatus(`Failed: ${data.error}`);
      }
    } catch (e: any) {
      setBroadcastStatus(`Error: ${e.message}`);
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
      let bodyToPost = customWebhookPayload;
      if (!bodyToPost) {
        bodyToPost = JSON.stringify(
          {
            object: 'whatsapp_business_account',
            entry: [
              {
                id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
                changes: [
                  {
                    value: {
                      messaging_product: 'whatsapp',
                      contacts: [{ profile: { name: 'Tushar' }, wa_id: phone }],
                      messages: [
                        {
                          from: phone,
                          id: `wamid.TEST${Date.now()}`,
                          timestamp: String(Math.floor(Date.now() / 1000)),
                          type: 'text',
                          text: { body: 'hi' }
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
      }

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

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/80 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-sm text-slate-100 tracking-tight">WhatsApp Bot</h1>
              <p className="text-xs text-emerald-400 font-mono">Meta Cloud API</p>
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
              onClick={() => setActiveTab('webhook')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'webhook'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Webhook Inspector</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Orders & Admin</span>
            </button>

            <button
              onClick={() => setActiveTab('samples')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'samples'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Payload JSONs</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
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
            <span className="font-medium text-sm text-slate-200">{businessConfig.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
              Ready
            </span>
            <span className="text-xs text-slate-400">Port 3000</span>
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
            <span className="text-slate-400 font-mono">Verify Token: {envConfig.verifyToken}</span>
          </div>
        </header>

        {/* Tab 1: Live Interactive WhatsApp Simulator */}
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
                    SG
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight flex items-center space-x-1">
                      <span>{businessConfig.name}</span>
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
                  🔒 Messages are end-to-end encrypted. Meta Cloud API Free Sandbox.
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
                    <span>Spice Garden Bot is typing...</span>
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

            {/* Quick Actions & Quick Scripts Panel */}
            <div className="w-80 flex flex-col space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Customer Simulation Settings</span>
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

        {/* Tab 2: Webhook Inspector */}
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
                      Meta WhatsApp Cloud API sends a GET request with <code className="text-emerald-300">hub.mode=subscribe</code>,{' '}
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
                          copyToClipboard(
                            customWebhookPayload || sampleIncomingText,
                            'webhook_json'
                          )
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

        {/* Tab 3: Admin Console & Orders */}
        {activeTab === 'admin' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header stats & actions */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs mb-1">Total Orders</div>
                  <div className="text-2xl font-bold text-white">{adminOrders.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs mb-1">Total Customers</div>
                  <div className="text-2xl font-bold text-emerald-400">{adminCustomers.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs mb-1">Active Handoffs (Agent Paused)</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {adminConversations.filter((c) => c.isBotPaused).length}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-slate-400 text-xs">Admin Key</div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      value={adminApiKey}
                      onChange={(e) => setAdminApiKey(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1 w-full font-mono text-slate-300"
                    />
                    <button
                      onClick={fetchAdminData}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                      title="Refresh Data"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Order Management & Status Triggers */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>Orders Table & WhatsApp Status Update Dispatcher</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Updating status dispatches a free-form WhatsApp notification to the customer if within 24h, or a WhatsApp Template message outside 24h.
                </p>

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
                      {adminOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-3 font-semibold text-emerald-400">{ord.orderNumber}</td>
                          <td className="py-3 px-3 text-slate-300">
                            <div>{ord.customerName}</div>
                            <div className="text-[10px] text-slate-500">+{ord.customerPhone}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {ord.items?.map((it: any, i: number) => (
                              <div key={i}>
                                {it.itemName} x{it.quantity}
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-3 text-slate-200">
                            {businessConfig.currency}
                            {ord.totalAmount}
                          </td>
                          <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{ord.deliveryAddress}</td>
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
                          <td className="py-3 px-3 text-right space-x-1">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Directory & Bot Handoff Control */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Customer List & Opt-In Status</span>
                  </h3>
                  <div className="space-y-2">
                    {adminCustomers.map((cust) => {
                      const conv = adminConversations.find((c) => c.customerId === cust.id);
                      return (
                        <div
                          key={cust.id}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-slate-200">
                              {cust.name || 'Anonymous'} (+{cust.phone})
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                              <span>Lang: {cust.language.toUpperCase()}</span>
                              <span>•</span>
                              <span className={cust.optedIn ? 'text-emerald-400' : 'text-rose-400'}>
                                {cust.optedIn ? 'Subscribed' : 'Opted Out (STOP)'}
                              </span>
                            </div>
                          </div>

                          {conv?.isBotPaused && (
                            <button
                              onClick={() => handleResumeBot(cust.id)}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>Resume Bot</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Broadcast Campaign Runner */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>Rate-Limited WhatsApp Broadcast</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sends an approved WhatsApp Template to all opted-in customers with rate limiting (600ms delay between sends).
                  </p>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Template Name:</label>
                      <input
                        type="text"
                        value={broadcastTemplate}
                        onChange={(e) => setBroadcastTemplate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 font-mono text-emerald-400"
                      />
                    </div>
                    <button
                      onClick={handleTriggerBroadcast}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium flex items-center justify-center space-x-2"
                    >
                      <Radio className="w-4 h-4" />
                      <span>Dispatch Broadcast Campaign</span>
                    </button>
                    {broadcastStatus && (
                      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-emerald-400 font-mono text-[11px]">
                        {broadcastStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Sample JSON Payloads */}
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

        {/* Tab 5: Setup Guide & Test Plan */}
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
                      Bot:  [Sends Catalog List of 10 dishes]
                      User: [Selects 'Butter Chicken' (dish_01)]
                      Bot:  [Sends Quantity buttons: 1, 2, 3]
                      User: [Clicks 2]
                      Bot:  "Great! You have selected 2x Butter Chicken (Total: ₹760). Please enter your Delivery Address:"
                      User: "Flat 402, Sunshine Heights, MG Road, Bangalore"
                      Bot:  [Summary + Confirm Order / Cancel buttons]
                      User: [Clicks Confirm Order]
                      Bot:  "Order Placed Successfully! Order ID: #ORD-1002" (+ Instant alert to Owner WhatsApp)
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
