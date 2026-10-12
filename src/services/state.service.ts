import { logger } from '../utils/logger';

export type BotState =
  | 'MAIN_MENU'
  | 'BROWSING'
  | 'SELECT_ITEM'
  | 'QUANTITY'
  | 'ADDRESS'
  | 'CONFIRM'
  | 'DONE';

export interface StateData {
  state: BotState;
  draftItem?: {
    id: string;
    title: string;
    price: number;
  };
  draftQuantity?: number;
  draftAddress?: string;
  notes?: string;
  updatedAt: number;
}

const STATE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL as required

class StateService {
  private memoryStore = new Map<string, StateData>(); // phone -> StateData

  /**
   * Get current conversation state for a phone number.
   * If state is older than 30 minutes, it automatically resets to MAIN_MENU.
   */
  async getState(phone: string): Promise<StateData> {
    const existing = this.memoryStore.get(phone);
    const now = Date.now();

    if (!existing) {
      const initial: StateData = {
        state: 'MAIN_MENU',
        updatedAt: now
      };
      this.memoryStore.set(phone, initial);
      return initial;
    }

    // Check 30-minute expiration
    if (now - existing.updatedAt > STATE_TTL_MS) {
      logger.info(`State for ${phone} expired after 30 min inactivity. Resetting to MAIN_MENU.`);
      const resetState: StateData = {
        state: 'MAIN_MENU',
        updatedAt: now
      };
      this.memoryStore.set(phone, resetState);
      return resetState;
    }

    return existing;
  }

  /**
   * Set new state and update TTL timestamp
   */
  async setState(phone: string, newState: BotState, partialData?: Partial<StateData>): Promise<StateData> {
    const current = await this.getState(phone);
    const updated: StateData = {
      ...current,
      ...(partialData || {}),
      state: newState,
      updatedAt: Date.now()
    };
    this.memoryStore.set(phone, updated);
    logger.debug(`State transitioned for ${phone}: ${current.state} -> ${newState}`);
    return updated;
  }

  /**
   * Update draft data without changing state
   */
  async updateData(phone: string, partialData: Partial<StateData>): Promise<StateData> {
    const current = await this.getState(phone);
    const updated: StateData = {
      ...current,
      ...partialData,
      updatedAt: Date.now()
    };
    this.memoryStore.set(phone, updated);
    return updated;
  }

  /**
   * Reset state back to MAIN_MENU and clear draft order data
   */
  async resetState(phone: string): Promise<StateData> {
    const cleared: StateData = {
      state: 'MAIN_MENU',
      updatedAt: Date.now()
    };
    this.memoryStore.set(phone, cleared);
    return cleared;
  }

  /**
   * Handle "back" navigation step-by-step
   */
  async handleBack(phone: string): Promise<BotState> {
    const current = await this.getState(phone);
    let targetState: BotState = 'MAIN_MENU';

    switch (current.state) {
      case 'CONFIRM':
        targetState = 'ADDRESS';
        break;
      case 'ADDRESS':
        targetState = 'QUANTITY';
        break;
      case 'QUANTITY':
        targetState = 'SELECT_ITEM';
        break;
      case 'SELECT_ITEM':
        targetState = 'BROWSING';
        break;
      case 'BROWSING':
      default:
        targetState = 'MAIN_MENU';
        break;
    }

    await this.setState(phone, targetState);
    return targetState;
  }
}

export const stateService = new StateService();
