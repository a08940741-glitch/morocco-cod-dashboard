import Fastify, { type FastifyInstance } from "fastify";
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { z, ZodError } from "zod";
import type { AppConfig } from "./config.js";
import { AdminAccountStore } from "./admin-account.js";
import { dashboardHtml } from "./dashboard.js";
import { findProduct, hasAvailableStock, products } from "./catalog.js";
import { AppError } from "./errors.js";
import { MockClaudeProvider, MockWhatsAppAdapter } from "./mocks.js";
import { normalizeMoroccanPhone } from "./phone.js";
import { AwsSnsSmsProvider, type SmsProvider } from "./sms.js";
import { createLocalStore, orderStatuses, type Conversation, type Order, type OrderStatus, type LocalStore } from "./store.js";

const orderInputSchema = z.object({
  customerName: z.string().trim().min(1).max(100),
  phone: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
  address: z.string().trim().min(5).max(300),
});

const confirmationSchema = z.object({ confirmed: z.literal(true) });
const orderStatusSchema = z.object({ status: z.enum(orderStatuses) });
const productStockSchema = z.object({ stock: z.number().int().min(0).max(5000) });
const loginSchema = z.object({
  username: z.string().trim().min(3).max(100),
  password: z.string().min(12).max(200),
});
const registrationSchema = loginSchema.extend({
  fullName: z.string().trim().min(2).max(100),
  email: z.email().trim().max(254),
  phone: z.string().trim().min(1).max(30),
  storeName: z.string().trim().min(2).max(100),
  inviteCode: z.string().max(256).optional(),
});
const registrationVerificationSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  code: z.string().regex(/^\d{6}$/),
});
const conversationInputSchema = z.object({ phone: z.string().min(1) });
const messageInputSchema = z.object({ text: z.string().trim().min(1).max(2000) });
const handoffInputSchema = z.object({ reason: z.string().trim().min(1).max(300) });
const replyInputSchema = z.object({ text: z.string().trim().min(1).max(2000) });
const sessionCookieName = "darija_desk_session";
const sessionDurationMs = 8 * 60 * 60 * 1000;
const loginWindowMs = 15 * 60 * 1000;
const maxLoginAttempts = 5;
const verificationDurationMs = 5 * 60 * 1000;
const verificationResendCooldownMs = 60 * 1000;
const maxVerificationAttempts = 5;

interface LoginAttempts {
  count: number;
  resetAt: number;
}

interface PendingRegistration {
  profile: {
    username: string;
    fullName: string;
    email: string;
    phone: string;
    storeName: string;
  };
  password: string;
  codeDigest: Buffer;
  expiresAt: number;
  attempts: number;
}

export interface AppDependencies {
  whatsapp: MockWhatsAppAdapter;
  claude: MockClaudeProvider;
  store?: LocalStore;
  sms?: SmsProvider;
}

export function createApp(
  config: AppConfig,
  dependencies: AppDependencies = {
    whatsapp: new MockWhatsAppAdapter(),
    claude: new MockClaudeProvider(),
    store: createLocalStore(config.NODE_ENV, config.LOCAL_DATA_FILE),
    sms: new AwsSnsSmsProvider(config.AWS_REGION),
  },
): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
  });
  const store = dependencies.store ?? createLocalStore(config.NODE_ENV, config.LOCAL_DATA_FILE);
  const orders = store.orders;
  const conversations = store.conversations;
  const accountStore = new AdminAccountStore(`${config.LOCAL_DATA_FILE}.admin-account.json`);
  const sms = dependencies.sms ?? new AwsSnsSmsProvider(config.AWS_REGION);
  const sessions = new Map<string, number>();
  const loginAttempts = new Map<string, LoginAttempts>();
  const registrationAttempts = new Map<string, LoginAttempts>();
  const pendingRegistrations = new Map<string, PendingRegistration>();
  const verificationResends = new Map<string, number>();

  function getSessionToken(cookieHeader: string | undefined): string | undefined {
    const cookie = cookieHeader?.split(";").map((part) => part.trim())
      .find((part) => part.startsWith(`${sessionCookieName}=`));
    const token = cookie?.slice(sessionCookieName.length + 1);
    if (!token) return undefined;
    const [sessionId, signature] = token.split(".");
    if (!sessionId || !signature || !/^[a-f0-9]{64}$/.test(sessionId) || !/^[a-f0-9]{64}$/.test(signature)) {
      return undefined;
    }
    const expected = createHmac("sha256", config.SESSION_SECRET).update(sessionId).digest();
    const supplied = Buffer.from(signature, "hex");
    return timingSafeEqual(expected, supplied) ? sessionId : undefined;
  }

  function sessionCookie(token: string, maxAge: number): string {
    const secure = config.NODE_ENV === "production" ? "; Secure" : "";
    return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
  }

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      request.log.warn({ err: error }, "Request validation failed");
      return reply.code(400).send({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    if (error instanceof AppError) {
      request.log.info({ code: error.code }, error.message);
      return reply.code(error.statusCode).send({ error: error.message, code: error.code });
    }
    request.log.error({ err: error }, "Unhandled request error");
    return reply.code(500).send({ error: "Internal server error", code: "INTERNAL_ERROR" });
  });

  app.addHook("preHandler", async (request, reply) => {
    const publicRoutes = new Set([
      "GET /health",
      "GET /",
      "GET /auth/session",
      "GET /auth/setup",
      "POST /auth/login",
      "POST /auth/registration/start",
      "POST /auth/registration/verify",
      "POST /auth/logout",
    ]);
    if (publicRoutes.has(`${request.method} ${request.routeOptions.url}`)) {
      return;
    }

    const token = getSessionToken(request.headers.cookie);
    const expiresAt = token ? sessions.get(token) : undefined;
    if (!token || expiresAt === undefined || expiresAt <= Date.now()) {
      if (token) sessions.delete(token);
      return reply.code(401).send({ error: "Authentication required.", code: "UNAUTHENTICATED" });
    }
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/", async (_request, reply) => reply
    .header("cache-control", "no-store")
    .type("text/html; charset=utf-8")
    .send(dashboardHtml));

  app.get("/auth/session", async (request) => {
    const token = getSessionToken(request.headers.cookie);
    const expiresAt = token ? sessions.get(token) : undefined;
    return { authenticated: Boolean(expiresAt && expiresAt > Date.now()) };
  });

  app.get("/auth/setup", async () => ({
    setupRequired: !accountStore.isConfigured,
    registrationEnabled: true,
    registrationRequiresInvite: Boolean(config.REGISTRATION_INVITE_CODE),
  }));

  app.post("/auth/registration/start", async (request, reply) => {
    const input = registrationSchema.parse(request.body);
    if (config.REGISTRATION_INVITE_CODE) {
      const suppliedInvite = Buffer.from(input.inviteCode ?? "");
      const expectedInvite = Buffer.from(config.REGISTRATION_INVITE_CODE);
      if (suppliedInvite.length !== expectedInvite.length || !timingSafeEqual(suppliedInvite, expectedInvite)) {
        return reply.code(403).send({ error: "A valid invitation code is required to register.", code: "INVALID_INVITE_CODE" });
      }
    }
    const phone = normalizeMoroccanPhone(input.phone);
    const now = Date.now();
    const attempts = registrationAttempts.get(request.ip);
    if (attempts && attempts.resetAt <= now) {
      registrationAttempts.delete(request.ip);
    } else if (attempts && attempts.count >= maxLoginAttempts) {
      return reply.code(429).send({ error: "Too many registration attempts. Try again later.", code: "REGISTRATION_RATE_LIMITED" });
    }

    registrationAttempts.set(request.ip, {
      count: attempts && attempts.resetAt > now ? attempts.count + 1 : 1,
      resetAt: attempts && attempts.resetAt > now ? attempts.resetAt : now + loginWindowMs,
    });

    const profile = {
      username: input.username,
      fullName: input.fullName,
      email: input.email.toLocaleLowerCase(),
      phone,
      storeName: input.storeName,
    };
    if (accountStore.isTaken(profile.username, profile.email)) {
      return reply.code(409).send({ error: "That username or email is already registered.", code: "ACCOUNT_ALREADY_EXISTS" });
    }

    const lastSentAt = verificationResends.get(phone);
    if (lastSentAt !== undefined && now - lastSentAt < verificationResendCooldownMs) {
      return reply.code(429).send({ error: "Wait before requesting another verification code.", code: "SMS_COOLDOWN" });
    }

    for (const [token, pending] of pendingRegistrations) {
      if (pending.expiresAt <= now) pendingRegistrations.delete(token);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const token = randomBytes(32).toString("hex");
    const codeDigest = createHmac("sha256", config.SESSION_SECRET).update(`${token}:${code}`).digest();
    verificationResends.set(phone, now);
    try {
      await sms.sendVerificationCode(phone, code);
    } catch (error) {
      verificationResends.delete(phone);
      request.log.error({ err: error }, "Unable to send registration verification SMS");
      return reply.code(503).send({
        error: "Unable to send the verification SMS. Check AWS SNS configuration and credentials.",
        code: "SMS_DELIVERY_FAILED",
      });
    }
    pendingRegistrations.set(token, {
      profile,
      password: input.password,
      codeDigest,
      expiresAt: now + verificationDurationMs,
      attempts: 0,
    });
    return reply.header("cache-control", "no-store").send({
      verificationToken: token,
      expiresInSeconds: verificationDurationMs / 1000,
    });
  });

  app.post("/auth/registration/verify", async (request, reply) => {
    const input = registrationVerificationSchema.parse(request.body);
    const pending = pendingRegistrations.get(input.token);
    if (!pending || pending.expiresAt <= Date.now()) {
      pendingRegistrations.delete(input.token);
      return reply.code(400).send({ error: "Verification code expired or invalid. Start registration again.", code: "VERIFICATION_EXPIRED" });
    }

    pending.attempts++;
    const suppliedDigest = createHmac("sha256", config.SESSION_SECRET)
      .update(`${input.token}:${input.code}`)
      .digest();
    if (!timingSafeEqual(suppliedDigest, pending.codeDigest)) {
      if (pending.attempts >= maxVerificationAttempts) {
        pendingRegistrations.delete(input.token);
        return reply.code(429).send({ error: "Too many incorrect codes. Start registration again.", code: "VERIFICATION_ATTEMPTS_EXCEEDED" });
      }
      return reply.code(400).send({ error: "The verification code is incorrect.", code: "INVALID_VERIFICATION_CODE" });
    }

    if (!accountStore.create(pending.profile, pending.password)) {
      pendingRegistrations.delete(input.token);
      return reply.code(409).send({ error: "That username or email is already registered.", code: "ACCOUNT_ALREADY_EXISTS" });
    }
    pendingRegistrations.delete(input.token);
    const sessionId = randomBytes(32).toString("hex");
    const signature = createHmac("sha256", config.SESSION_SECRET).update(sessionId).digest("hex");
    sessions.set(sessionId, Date.now() + sessionDurationMs);
    loginAttempts.delete(request.ip);
    return reply
      .header("set-cookie", sessionCookie(`${sessionId}.${signature}`, sessionDurationMs / 1000))
      .header("cache-control", "no-store")
      .code(201)
      .send({ authenticated: true });
  });

  app.post("/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const now = Date.now();
    const attempts = loginAttempts.get(request.ip);
    if (attempts && attempts.resetAt <= now) {
      loginAttempts.delete(request.ip);
    } else if (attempts && attempts.count >= maxLoginAttempts) {
      return reply.code(429).send({ error: "Too many login attempts. Try again later.", code: "LOGIN_RATE_LIMITED" });
    }

    if (!accountStore.isConfigured) {
      return reply.code(409).send({ error: "Create the administrator account first.", code: "ACCOUNT_SETUP_REQUIRED" });
    }

    if (!accountStore.verify(input.username, input.password)) {
      const current = loginAttempts.get(request.ip);
      loginAttempts.set(request.ip, {
        count: current && current.resetAt > now ? current.count + 1 : 1,
        resetAt: current && current.resetAt > now ? current.resetAt : now + loginWindowMs,
      });
      return reply.code(401).send({ error: "Invalid username or password.", code: "INVALID_CREDENTIALS" });
    }

    loginAttempts.delete(request.ip);
    for (const [sessionId, expiresAt] of sessions) {
      if (expiresAt <= now) sessions.delete(sessionId);
    }
    const sessionId = randomBytes(32).toString("hex");
    const signature = createHmac("sha256", config.SESSION_SECRET).update(sessionId).digest("hex");
    sessions.set(sessionId, now + sessionDurationMs);
    return reply
      .header("set-cookie", sessionCookie(`${sessionId}.${signature}`, sessionDurationMs / 1000))
      .header("cache-control", "no-store")
      .send({ authenticated: true });
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = getSessionToken(request.headers.cookie);
    if (token) sessions.delete(token);
    return reply
      .header("set-cookie", sessionCookie("", 0))
      .header("cache-control", "no-store")
      .send({ authenticated: false });
  });

  app.get("/products", async () => ({ products }));

  app.get("/orders", async () => ({ orders: [...orders.values()] }));

  app.post("/orders", async (request, reply) => {
    const input = orderInputSchema.parse(request.body);
    const phone = normalizeMoroccanPhone(input.phone);
    const product = findProduct(input.productId);
    if (!product) {
      throw new AppError("Product not found.", 404, "PRODUCT_NOT_FOUND");
    }
    if (!hasAvailableStock(product, input.quantity)) {
      throw new AppError("Product is out of stock for that quantity.", 409, "OUT_OF_STOCK");
    }

    product.stock -= input.quantity;

    const order: Order = {
      id: randomUUID(),
      customerName: input.customerName,
      phone,
      productId: product.id,
      productName: product.name,
      quantity: input.quantity,
      unitPriceMad: product.priceMad,
      totalMad: product.priceMad * input.quantity,
      address: input.address,
      status: "awaiting_confirmation",
    };
    orders.set(order.id, order);
    store.save();
    return reply.code(201).send({
      order,
      confirmationRequired: true,
      confirmationMessage: `Confirm order ${order.id}: ${order.quantity} x ${order.productName}, ${order.totalMad} MAD, cash on delivery. Reply YES to confirm.`,
    });
  });

  app.post<{ Params: { orderId: string } }>("/orders/:orderId/confirm", async (request) => {
    confirmationSchema.parse(request.body);
    const order = orders.get(request.params.orderId);
    if (!order) {
      throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
    }
    if (order.status === "confirmed") {
      throw new AppError("Order has already been confirmed.", 409, "ORDER_ALREADY_CONFIRMED");
    }
    if (order.status !== "awaiting_confirmation") {
      throw new AppError("Order cannot be confirmed in its current status.", 409, "INVALID_ORDER_TRANSITION");
    }
    order.status = "confirmed";
    store.save();
    return { order };
  });

  app.patch<{ Params: { orderId: string } }>("/orders/:orderId/status", async (request) => {
    const input = orderStatusSchema.parse(request.body);
    const order = orders.get(request.params.orderId);
    if (!order) {
      throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
    }
    const allowedNextStatuses: Record<OrderStatus, OrderStatus[]> = {
      awaiting_confirmation: ["cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };
    if (!allowedNextStatuses[order.status].includes(input.status)) {
      throw new AppError("Order status transition is not allowed.", 409, "INVALID_ORDER_TRANSITION");
    }
    if (input.status === "cancelled" && order.status !== "cancelled") {
      const product = findProduct(order.productId);
      if (product) {
        product.stock += order.quantity;
      }
    }
    order.status = input.status;
    store.save();
    return { order };
  });

  app.patch<{ Params: { productId: string } }>("/products/:productId/stock", async (request) => {
    const input = productStockSchema.parse(request.body);
    const product = findProduct(request.params.productId);
    if (!product) {
      throw new AppError("Product not found.", 404, "PRODUCT_NOT_FOUND");
    }
    product.stock = input.stock;
    store.save();
    return { product };
  });

  app.get("/conversations", async () => ({ conversations: [...conversations.values()] }));

  app.post("/conversations", async (request, reply) => {
    const input = conversationInputSchema.parse(request.body);
    const conversation: Conversation = {
      id: randomUUID(),
      phone: normalizeMoroccanPhone(input.phone),
      status: "ai",
      messages: [],
    };
    conversations.set(conversation.id, conversation);
    store.save();
    return reply.code(201).send({ conversation });
  });

  app.post<{ Params: { conversationId: string } }>("/conversations/:conversationId/messages", async (request) => {
    const input = messageInputSchema.parse(request.body);
    const conversation = conversations.get(request.params.conversationId);
    if (!conversation) {
      throw new AppError("Conversation not found.", 404, "CONVERSATION_NOT_FOUND");
    }
    const customerMessage = { role: "customer" as const, text: input.text, sentAt: new Date().toISOString() };
    conversation.messages.push(customerMessage);

    if (conversation.status === "human") {
      return { conversation, automatedReply: false, handoffReason: conversation.handoffReason };
    }

    const response = await dependencies.claude.reply(input.text);
    await dependencies.whatsapp.sendMessage(conversation.phone, response);
    conversation.messages.push({
      role: "assistant",
      text: response,
      sentAt: new Date().toISOString(),
    });
    store.save();
    return { conversation, automatedReply: true };
  });

  app.post<{ Params: { conversationId: string } }>("/conversations/:conversationId/replies", async (request) => {
    const input = replyInputSchema.parse(request.body);
    const conversation = conversations.get(request.params.conversationId);
    if (!conversation) {
      throw new AppError("Conversation not found.", 404, "CONVERSATION_NOT_FOUND");
    }
    if (conversation.status !== "human") {
      throw new AppError("Transfer the conversation to an agent before replying.", 409, "HANDOFF_REQUIRED");
    }
    conversation.messages.push({ role: "agent", text: input.text, sentAt: new Date().toISOString() });
    store.save();
    return { conversation };
  });

  app.post<{ Params: { conversationId: string } }>("/conversations/:conversationId/handoff", async (request) => {
    const input = handoffInputSchema.parse(request.body);
    const conversation = conversations.get(request.params.conversationId);
    if (!conversation) {
      throw new AppError("Conversation not found.", 404, "CONVERSATION_NOT_FOUND");
    }
    conversation.status = "human";
    conversation.handoffReason = input.reason;
    store.save();
    return { conversation };
  });

  return app;
}
