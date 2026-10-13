import { logger } from '../utils/logger';

export type OrderStatus = 'PLACED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface CustomerModel {
  id: string;
  phone: string;
  name: string | null;
  language: 'en' | 'hi';
  optedIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemModel {
  id: string;
  orderId: string;
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
}

export interface OrderModel {
  id: string;
  orderNumber: string;
  customerId: string;
  customerPhone?: string;
  customerName?: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  notes?: string | null;
  items: OrderItemModel[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageModel {
  id: string;
  messageId?: string;
  customerId?: string;
  sender: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  body: string;
  rawPayload?: Record<string, unknown>;
  createdAt: string;
}

export interface ConversationModel {
  id: string;
  customerId: string;
  state: string; // MAIN_MENU, BROWSING, SELECT_ITEM, QUANTITY, ADDRESS, CONFIRM, DONE
  isBotPaused: boolean;
  pausedAt?: string | null;
  lastInteraction: string;
  contextData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

class DatabaseService {
  private customers = new Map<string, CustomerModel>(); // phone -> Customer
  private orders = new Map<string, OrderModel>(); // orderId -> Order
  private messages: MessageModel[] = [];
  private processedMessageIds = new Set<string>();
  private conversations = new Map<string, ConversationModel>(); // customerId -> Conversation
  private orderCounter = 1000;

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    // Seed sample customer and order for immediate testing
    const samplePhone = "919876543210";
    const sampleCustomer: CustomerModel = {
      id: "cust-demo-1",
      phone: samplePhone,
      name: "Tushar K",
      language: "en",
      optedIn: true,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.customers.set(samplePhone, sampleCustomer);

    const demoOrder: OrderModel = {
      id: "ord-demo-1",
      orderNumber: "ORD-1001",
      customerId: sampleCustomer.id,
      customerPhone: samplePhone,
      customerName: sampleCustomer.name || "Customer",
      status: "PLACED",
      totalAmount: 760,
      deliveryAddress: "Flat 402, Sunshine Heights, MG Road, Bangalore",
      items: [
        {
          id: "item-1",
          orderId: "ord-demo-1",
          itemId: "dish_01",
          itemName: "Butter Chicken",
          price: 380,
          quantity: 2
        }
      ],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    };
    this.orders.set(demoOrder.id, demoOrder);

    this.conversations.set(sampleCustomer.id, {
      id: "conv-demo-1",
      customerId: sampleCustomer.id,
      state: "MAIN_MENU",
      isBotPaused: false,
      lastInteraction: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // --- Customer Operations ---
  async findCustomerByPhone(phone: string): Promise<CustomerModel | null> {
    return this.customers.get(phone) || null;
  }

  async upsertCustomer(phone: string, name?: string, language: 'en' | 'hi' = 'en'): Promise<CustomerModel> {
    let customer = this.customers.get(phone);
    const now = new Date().toISOString();

    if (!customer) {
      customer = {
        id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone,
        name: name || null,
        language,
        optedIn: true,
        createdAt: now,
        updatedAt: now
      };
      this.customers.set(phone, customer);
    } else {
      if (name && !customer.name) customer.name = name;
      customer.updatedAt = now;
      this.customers.set(phone, customer);
    }
    return customer;
  }

  async updateCustomerLanguage(phone: string, language: 'en' | 'hi'): Promise<CustomerModel | null> {
    const customer = this.customers.get(phone);
    if (!customer) return null;
    customer.language = language;
    customer.updatedAt = new Date().toISOString();
    return customer;
  }

  async findCustomerById(id: string): Promise<CustomerModel | null> {
    for (const cust of this.customers.values()) {
      if (cust.id === id) return cust;
    }
    return null;
  }

  async updateCustomerOptInById(id: string, optedIn: boolean): Promise<CustomerModel | null> {
    const customer = await this.findCustomerById(id);
    if (!customer) return null;
    customer.optedIn = optedIn;
    customer.updatedAt = new Date().toISOString();
    return customer;
  }

  async updateCustomerLanguageById(id: string, language: 'en' | 'hi'): Promise<CustomerModel | null> {
    const customer = await this.findCustomerById(id);
    if (!customer) return null;
    customer.language = language;
    customer.updatedAt = new Date().toISOString();
    return customer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const customer = await this.findCustomerById(id);
    if (!customer) return false;
    this.customers.delete(customer.phone);
    return true;
  }

  async setCustomerOptIn(phone: string, optedIn: boolean): Promise<CustomerModel | null> {
    const customer = this.customers.get(phone);
    if (!customer) return null;
    customer.optedIn = optedIn;
    customer.updatedAt = new Date().toISOString();
    return customer;
  }

  async listCustomers(): Promise<CustomerModel[]> {
    return Array.from(this.customers.values());
  }

  // --- Order Operations ---
  async createOrder(params: {
    customerId: string;
    customerPhone: string;
    customerName?: string;
    items: Array<{ itemId: string; itemName: string; price: number; quantity: number }>;
    totalAmount: number;
    deliveryAddress: string;
    notes?: string;
  }): Promise<OrderModel> {
    this.orderCounter += 1;
    const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const order: OrderModel = {
      id: orderId,
      orderNumber: `ORD-${this.orderCounter}`,
      customerId: params.customerId,
      customerPhone: params.customerPhone,
      customerName: params.customerName || "Customer",
      status: "PLACED",
      totalAmount: params.totalAmount,
      deliveryAddress: params.deliveryAddress,
      notes: params.notes,
      items: params.items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        orderId,
        itemId: it.itemId,
        itemName: it.itemName,
        price: it.price,
        quantity: it.quantity
      })),
      createdAt: now,
      updatedAt: now
    };

    this.orders.set(orderId, order);
    logger.info(`New order created: ${order.orderNumber} for customer ${params.customerPhone}`);
    return order;
  }

  async getOrderById(orderId: string): Promise<OrderModel | null> {
    return this.orders.get(orderId) || null;
  }

  async getLatestOrderByPhone(phone: string): Promise<OrderModel | null> {
    const customer = await this.findCustomerByPhone(phone);
    if (!customer) return null;

    const customerOrders = Array.from(this.orders.values())
      .filter((o) => o.customerId === customer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return customerOrders[0] || null;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderModel | null> {
    const order = this.orders.get(orderId);
    if (!order) return null;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  async listOrders(): Promise<OrderModel[]> {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Idempotency & Message Logs ---
  isMessageProcessed(messageId: string): boolean {
    if (!messageId) return false;
    return this.processedMessageIds.has(messageId);
  }

  markMessageProcessed(messageId: string): void {
    if (messageId) {
      this.processedMessageIds.add(messageId);
    }
  }

  async recordMessage(msg: Omit<MessageModel, 'id' | 'createdAt'>): Promise<MessageModel> {
    const record: MessageModel = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...msg,
      createdAt: new Date().toISOString()
    };
    if (msg.messageId) {
      this.processedMessageIds.add(msg.messageId);
    }
    this.messages.push(record);
    // Keep max 200 in-memory messages
    if (this.messages.length > 200) {
      this.messages.shift();
    }
    return record;
  }

  async listMessages(): Promise<MessageModel[]> {
    return [...this.messages].reverse();
  }

  // --- Conversation & Human Handoff ---
  async getConversation(customerId: string): Promise<ConversationModel | null> {
    return this.conversations.get(customerId) || null;
  }

  async upsertConversation(customerId: string, state: string, contextData?: Record<string, unknown>): Promise<ConversationModel> {
    let conv = this.conversations.get(customerId);
    const now = new Date().toISOString();
    if (!conv) {
      conv = {
        id: `conv-${Date.now()}`,
        customerId,
        state,
        isBotPaused: false,
        lastInteraction: now,
        contextData: contextData || {},
        createdAt: now,
        updatedAt: now
      };
    } else {
      conv.state = state;
      conv.lastInteraction = now;
      if (contextData !== undefined) {
        conv.contextData = { ...(conv.contextData || {}), ...contextData };
      }
      conv.updatedAt = now;
    }
    this.conversations.set(customerId, conv);
    return conv;
  }

  async setBotPaused(customerId: string, paused: boolean): Promise<ConversationModel | null> {
    let conv = this.conversations.get(customerId);
    const now = new Date().toISOString();
    if (!conv) {
      conv = {
        id: `conv-${Date.now()}`,
        customerId,
        state: "MAIN_MENU",
        isBotPaused: paused,
        pausedAt: paused ? now : null,
        lastInteraction: now,
        createdAt: now,
        updatedAt: now
      };
      this.conversations.set(customerId, conv);
    } else {
      conv.isBotPaused = paused;
      conv.pausedAt = paused ? now : null;
      conv.updatedAt = now;
    }
    return conv;
  }

  async listConversations(): Promise<ConversationModel[]> {
    return Array.from(this.conversations.values());
  }
}

export const dbService = new DatabaseService();
