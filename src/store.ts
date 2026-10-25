import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";

export const orderStatuses = [
  "awaiting_confirmation",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMad: number;
  totalMad: number;
  address: string;
  status: OrderStatus;
}

export interface ConversationMessage {
  role: "customer" | "assistant" | "agent";
  text: string;
  sentAt: string;
}

export interface Conversation {
  id: string;
  phone: string;
  status: "ai" | "human";
  handoffReason?: string;
  messages: ConversationMessage[];
}

const messageSchema = z.object({
  role: z.enum(["customer", "assistant", "agent"]),
  text: z.string(),
  sentAt: z.string(),
});

const orderSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  phone: z.string(),
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPriceMad: z.number(),
  totalMad: z.number(),
  address: z.string(),
  status: z.enum(orderStatuses),
});

const conversationSchema = z.object({
  id: z.string(),
  phone: z.string(),
  status: z.enum(["ai", "human"]),
  handoffReason: z.string().optional(),
  messages: z.array(messageSchema),
});

const persistedStateSchema = z.object({
  version: z.literal(1),
  orders: z.array(orderSchema),
  conversations: z.array(conversationSchema),
});

export interface LocalStore {
  readonly orders: Map<string, Order>;
  readonly conversations: Map<string, Conversation>;
  save(): void;
}

export class MemoryStore implements LocalStore {
  readonly orders = new Map<string, Order>();
  readonly conversations = new Map<string, Conversation>();

  save(): void {}
}

export class JsonFileStore implements LocalStore {
  readonly orders = new Map<string, Order>();
  readonly conversations = new Map<string, Conversation>();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, "utf8"));
      const state = persistedStateSchema.parse(parsed);
      for (const order of state.orders) this.orders.set(order.id, order);
      for (const conversation of state.conversations) {
        const value: Conversation = {
          id: conversation.id,
          phone: conversation.phone,
          status: conversation.status,
          messages: conversation.messages,
          ...(conversation.handoffReason === undefined ? {} : { handoffReason: conversation.handoffReason }),
        };
        this.conversations.set(value.id, value);
      }
    } catch (error) {
      if (isMissingFile(error)) return;
      throw new Error(`Unable to load local data file "${this.filePath}".`, { cause: error });
    }
  }

  save(): void {
    const state = {
      version: 1 as const,
      orders: [...this.orders.values()],
      conversations: [...this.conversations.values()],
    };
    const directory = dirname(this.filePath);
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    mkdirSync(directory, { recursive: true });
    writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    renameSync(temporaryPath, this.filePath);
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export function createLocalStore(nodeEnv: string, filePath: string): LocalStore {
  return nodeEnv === "test" ? new MemoryStore() : new JsonFileStore(filePath);
}
