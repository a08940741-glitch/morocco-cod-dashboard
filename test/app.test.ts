import assert from "node:assert/strict";
import { randomUUID, scryptSync } from "node:crypto";
import { afterEach, describe, it } from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Script } from "node:vm";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { dashboardHtml } from "../src/dashboard.js";
import { findProduct } from "../src/catalog.js";
import { MockClaudeProvider, MockWhatsAppAdapter } from "../src/mocks.js";
import { JsonFileStore } from "../src/store.js";

const testDataFile = join(tmpdir(), `darija-desk-test-${randomUUID()}.json`);
const accountFile = `${testDataFile}.admin-account.json`;
const testUsername = "test-admin";
const testPassword = "test-password-123";
function registrationPayload(username: string, email = `${username}@example.com`, phone = "0612345678") {
  return {
    fullName: "Test Administrator",
    email,
    phone,
    storeName: "Test Store",
    username,
    password: testPassword,
  };
}
const config = loadConfig({
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  LOCAL_DATA_FILE: testDataFile,
  SESSION_SECRET: "test-session-secret-at-least-32-characters",
});

describe("local support prototype", () => {
  const apps: ReturnType<typeof createApp>[] = [];
  const cookies = new WeakMap<FastifyInstance, string>();
  const verificationCodes = new WeakMap<FastifyInstance, string>();

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    rmSync(accountFile, { force: true });
  });

  async function authenticate(app: FastifyInstance) {
    const setup = await app.inject({ method: "GET", url: "/auth/setup" });
    const registering = setup.json().setupRequired;
    const login = registering
      ? (await registerAccount(app, registrationPayload(testUsername))).verified
      : await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { username: testUsername, password: testPassword },
      });
    assert.ok(login);
    assert.equal(login.statusCode, registering ? 201 : 200);
    const setCookie = login.headers["set-cookie"];
    assert.equal(typeof setCookie, "string");
    cookies.set(app, setCookie.split(";")[0] ?? "");
  }

  async function makeApp() {
    const app = createTestApp();
    await authenticate(app);
    return app;
  }

  function createTestApp(
    sms?: { sendVerificationCode(phone: string, code: string): Promise<void> },
    appConfig = config,
  ) {
    let app: FastifyInstance;
    const smsProvider = sms ?? {
      async sendVerificationCode(_phone: string, code: string) {
        verificationCodes.set(app, code);
      },
    };
    app = createApp(appConfig, {
      whatsapp: new MockWhatsAppAdapter(),
      claude: new MockClaudeProvider(),
      sms: smsProvider,
    });
    apps.push(app);
    return app;
  }

  async function registerAccount(app: FastifyInstance, payload: ReturnType<typeof registrationPayload>) {
    const started = await app.inject({
      method: "POST",
      url: "/auth/registration/start",
      payload,
    });
    if (started.statusCode !== 200) return { started, verified: undefined };
    const code = verificationCodes.get(app);
    assert.ok(code);
    const verified = await app.inject({
      method: "POST",
      url: "/auth/registration/verify",
      payload: { token: started.json().verificationToken, code },
    });
    return { started, verified };
  }

  function request(app: FastifyInstance, options: Parameters<FastifyInstance["inject"]>[0]) {
    return app.inject({
      ...options,
      headers: { ...options.headers, cookie: cookies.get(app) },
    });
  }

  it("allows registering multiple accounts, rejects duplicate usernames, and revokes logout sessions", async () => {
    const app = createTestApp();
    assert.equal((await app.inject({ method: "GET", url: "/auth/setup" })).json().setupRequired, true);
    const unauthorized = await app.inject({ method: "GET", url: "/orders" });
    assert.equal(unauthorized.statusCode, 401);

    const invalidLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: testUsername, password: "wrong-password-123" },
    });
    assert.equal(invalidLogin.statusCode, 409);
    assert.equal(invalidLogin.json().code, "ACCOUNT_SETUP_REQUIRED");

    const firstRegistration = await registerAccount(app, registrationPayload(testUsername));
    assert.equal(firstRegistration.started.statusCode, 200);
    const registered = firstRegistration.verified;
    assert.ok(registered);
    assert.equal(registered.statusCode, 201);
    assert.equal((await app.inject({ method: "GET", url: "/auth/setup" })).json().setupRequired, false);
    assert.equal((await registerAccount(app, registrationPayload("second-admin", "second@example.com", "0622345678"))).verified?.statusCode, 201);
    const duplicateAccount = await registerAccount(app, registrationPayload(testUsername.toUpperCase(), "other@example.com", "0632345678"));
    assert.equal(duplicateAccount.started.statusCode, 409);
    assert.equal(duplicateAccount.started.json().code, "ACCOUNT_ALREADY_EXISTS");
    const duplicateEmail = await registerAccount(app, registrationPayload("third-admin", "TEST-ADMIN@example.com", "0642345678"));
    assert.equal(duplicateEmail.started.statusCode, 409);
    cookies.set(app, (registered.headers["set-cookie"] as string).split(";")[0] ?? "");
    const authorized = await request(app, { method: "GET", url: "/orders" });
    assert.equal(authorized.statusCode, 200);

    await request(app, { method: "POST", url: "/auth/logout" });
    cookies.delete(app);
    const revoked = await app.inject({ method: "GET", url: "/orders" });
    assert.equal(revoked.statusCode, 401);

    const restartedApp = createTestApp();
    const anotherLogin = await restartedApp.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "second-admin", password: testPassword },
    });
    assert.equal(anotherLogin.statusCode, 200);
  });

  it("limits repeated failed login attempts", async () => {
    const app = createTestApp();
    assert.equal((await registerAccount(app, registrationPayload(testUsername))).verified?.statusCode, 201);
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { username: "wrong", password: "wrong-password-123" },
      });
      assert.equal(response.statusCode, 401);
    }
    const limited = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: testUsername, password: testPassword },
    });
    assert.equal(limited.statusCode, 429);
    assert.equal(limited.json().code, "LOGIN_RATE_LIMITED");
  });

  it("validates signup email and Moroccan phone before creating the account", async () => {
    const app = createTestApp();
    const invalidEmail = await app.inject({
      method: "POST",
      url: "/auth/registration/start",
      payload: { ...registrationPayload(testUsername), email: "not-an-email" },
    });
    assert.equal(invalidEmail.statusCode, 400);
    assert.equal(invalidEmail.json().code, "VALIDATION_ERROR");

    const invalidPhone = await app.inject({
      method: "POST",
      url: "/auth/registration/start",
      payload: { ...registrationPayload(testUsername), phone: "+33123456789" },
    });
    assert.equal(invalidPhone.statusCode, 400);
    assert.equal(invalidPhone.json().code, "INVALID_PHONE");
    assert.equal((await app.inject({ method: "GET", url: "/auth/setup" })).json().setupRequired, true);
  });

  it("creates an account only after the SMS verification code is correct", async () => {
    const app = createTestApp();
    const start = await app.inject({
      method: "POST",
      url: "/auth/registration/start",
      payload: registrationPayload(testUsername),
    });
    assert.equal(start.statusCode, 200);
    const token = start.json().verificationToken;
    const code = verificationCodes.get(app);
    assert.ok(code);
    assert.equal(start.json().expiresInSeconds, 300);

    const wrongCode = await app.inject({
      method: "POST",
      url: "/auth/registration/verify",
      payload: { token, code: code === "000000" ? "000001" : "000000" },
    });
    assert.equal(wrongCode.statusCode, 400);
    assert.equal(wrongCode.json().code, "INVALID_VERIFICATION_CODE");
    assert.equal((await app.inject({ method: "GET", url: "/auth/setup" })).json().setupRequired, true);

    const verified = await app.inject({
      method: "POST",
      url: "/auth/registration/verify",
      payload: { token, code },
    });
    assert.equal(verified.statusCode, 201);
    assert.equal((await app.inject({ method: "GET", url: "/auth/setup" })).json().setupRequired, false);
  });

  it("requires the configured invitation code before sending a registration SMS", async () => {
    const inviteCode = "deployment-invite-code-with-32-chars";
    const inviteConfig = loadConfig({
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      LOCAL_DATA_FILE: testDataFile,
      SESSION_SECRET: "test-session-secret-at-least-32-characters",
      REGISTRATION_INVITE_CODE: inviteCode,
    });
    const app = createTestApp(undefined, inviteConfig);
    assert.equal((await app.inject({ method: "GET", url: "/auth/setup" })).json().registrationRequiresInvite, true);

    const missingInvite = await app.inject({
      method: "POST",
      url: "/auth/registration/start",
      payload: registrationPayload(testUsername),
    });
    assert.equal(missingInvite.statusCode, 403);
    assert.equal(missingInvite.json().code, "INVALID_INVITE_CODE");

    const invalidInvite = await app.inject({
      method: "POST",
      url: "/auth/registration/start",
      payload: { ...registrationPayload(testUsername), inviteCode: "incorrect" },
    });
    assert.equal(invalidInvite.statusCode, 403);
    assert.equal(invalidInvite.json().code, "INVALID_INVITE_CODE");
    assert.equal(verificationCodes.has(app), false);

    const validInvite = await app.inject({
      method: "POST",
      url: "/auth/registration/start",
      payload: { ...registrationPayload(testUsername), inviteCode },
    });
    assert.equal(validInvite.statusCode, 200);
    assert.equal(verificationCodes.has(app), true);
  });

  it("does not create an account when AWS SNS cannot send the verification SMS", async () => {
    const app = createTestApp({
      async sendVerificationCode() {
        throw new Error("AWS credentials are unavailable");
      },
    });
    const result = await app.inject({
      method: "POST",
      url: "/auth/registration/start",
      payload: registrationPayload(testUsername),
    });
    assert.equal(result.statusCode, 503);
    assert.equal(result.json().code, "SMS_DELIVERY_FAILED");
    assert.equal((await app.inject({ method: "GET", url: "/auth/setup" })).json().setupRequired, true);
  });

  it("migrates the existing single-account file and preserves login access", async () => {
    const salt = "a".repeat(64);
    writeFileSync(accountFile, JSON.stringify({
      version: 1,
      username: testUsername,
      salt,
      passwordHash: scryptSync(testPassword, salt, 32).toString("hex"),
    }));
    const app = createTestApp();
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: testUsername, password: testPassword },
    });
    assert.equal(login.statusCode, 200);
  });

  it("validates and normalizes Moroccan phone numbers", async () => {
    const app = await makeApp();
    const valid = await request(app, {
      method: "POST",
      url: "/conversations",
      payload: { phone: "06 12 34 56 78" },
    });

    assert.equal(valid.statusCode, 201);
    assert.equal(valid.json().conversation.phone, "+212612345678");

    const invalid = await request(app, {
      method: "POST",
      url: "/conversations",
      payload: { phone: "+33123456789" },
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().code, "INVALID_PHONE");
  });

  it("creates an unconfirmed COD order and confirms only explicit consent", async () => {
    const app = await makeApp();
    const created = await request(app, {
      method: "POST",
      url: "/orders",
      payload: {
        customerName: "Test Customer",
        phone: "0612345678",
        productId: "argan-oil-100",
        quantity: 2,
        address: "12 Example Street, Rabat",
      },
    });
    assert.equal(created.statusCode, 201);
    const { order } = created.json();
    assert.equal(order.totalMad, 258);
    assert.equal(order.status, "awaiting_confirmation");

    const missingConsent = await request(app, {
      method: "POST",
      url: `/orders/${order.id}/confirm`,
      payload: { confirmed: false },
    });
    assert.equal(missingConsent.statusCode, 400);

    const confirmed = await request(app, {
      method: "POST",
      url: `/orders/${order.id}/confirm`,
      payload: { confirmed: true },
    });
    assert.equal(confirmed.statusCode, 200);
    assert.equal(confirmed.json().order.status, "confirmed");

    const invalidConfirm = await request(app, {
      method: "POST",
      url: `/orders/${order.id}/confirm`,
      payload: { confirmed: true },
    });
    assert.equal(invalidConfirm.statusCode, 409);
    assert.equal(invalidConfirm.json().code, "ORDER_ALREADY_CONFIRMED");
  });

  it("blocks confirmation for orders outside the awaiting-confirmation state", async () => {
    const app = await makeApp();
    const created = await request(app, {
      method: "POST",
      url: "/orders",
      payload: {
        customerName: "Cancelled Customer",
        phone: "0612345678",
        productId: "ceramic-mug",
        quantity: 1,
        address: "15 Rue de l'Exemple, Marrakech",
      },
    });
    const orderId = created.json().order.id;
    await request(app, {
      method: "PATCH",
      url: `/orders/${orderId}/status`,
      payload: { status: "cancelled" },
    });

    const invalidConfirm = await request(app, {
      method: "POST",
      url: `/orders/${orderId}/confirm`,
      payload: { confirmed: true },
    });
    assert.equal(invalidConfirm.statusCode, 409);
    assert.equal(invalidConfirm.json().code, "INVALID_ORDER_TRANSITION");
  });

  it("returns MAD catalog prices, enforces stock, and releases stock when cancelled", async () => {
    const app = await makeApp();
    const catalog = await request(app, { method: "GET", url: "/products" });
    assert.ok(catalog.json().products.every((product: { priceMad: number }) => product.priceMad > 0));

    const product = findProduct("ceramic-mug");
    assert.ok(product);
    const previousStock = product.stock;
    product.stock = 2;

    const validOrder = await request(app, {
      method: "POST",
      url: "/orders",
      payload: {
        customerName: "Test Customer",
        phone: "0612345678",
        productId: "ceramic-mug",
        quantity: 2,
        address: "12 Example Street, Rabat",
      },
    });
    assert.equal(validOrder.statusCode, 201);
    assert.equal(product.stock, 0);

    const outOfStock = await request(app, {
      method: "POST",
      url: "/orders",
      payload: {
        customerName: "Second Customer",
        phone: "0676543210",
        productId: "ceramic-mug",
        quantity: 1,
        address: "14 Example Street, Casablanca",
      },
    });
    assert.equal(outOfStock.statusCode, 409);
    assert.equal(outOfStock.json().code, "OUT_OF_STOCK");

    const cancelled = await request(app, {
      method: "PATCH",
      url: `/orders/${validOrder.json().order.id}/status`,
      payload: { status: "cancelled" },
    });
    assert.equal(cancelled.statusCode, 200);
    assert.equal(product.stock, 2);

    product.stock = previousStock;

    const invalidOrder = await request(app, {
      method: "POST",
      url: "/orders",
      payload: {
        customerName: "Test Customer",
        phone: "0612345678",
        productId: "argan-oil-100",
        quantity: 0,
        address: "12 Example Street, Rabat",
      },
    });
    assert.equal(invalidOrder.statusCode, 400);
    assert.equal(invalidOrder.json().code, "VALIDATION_ERROR");
  });

  it("serves the local dashboard and supports guarded COD status changes", async () => {
    const app = await makeApp();
    const dashboard = await request(app, { method: "GET", url: "/" });
    assert.equal(dashboard.statusCode, 200);
    assert.match(dashboard.headers["content-type"] ?? "", /text\/html/);
    assert.equal(dashboard.headers["cache-control"], "no-store");
    assert.match(dashboard.body, /lang="ar" dir="rtl"/);
    assert.match(dashboard.body, /id="login-screen"/);
    assert.match(dashboard.body, /id="login-form"/);
    assert.match(dashboard.body, /الإحصائيات/);
    assert.match(dashboard.body, /الزبناء/);
    assert.match(dashboard.body, /المصاريف/);
    assert.match(dashboard.body, /صندوق وارد الدعم/);
    assert.match(dashboard.body, /AI نشط/);
    assert.match(dashboard.body, /تسليم لموظف/);

    const created = await request(app, {
      method: "POST",
      url: "/orders",
      payload: {
        customerName: "Test Customer",
        phone: "0612345678",
        productId: "ceramic-mug",
        quantity: 1,
        address: "Test address, Rabat",
      },
    });
    const orderId = created.json().order.id;
    const invalidTransition = await request(app, {
      method: "PATCH",
      url: `/orders/${orderId}/status`,
      payload: { status: "delivered" },
    });
    assert.equal(invalidTransition.statusCode, 409);
    assert.equal(invalidTransition.json().code, "INVALID_ORDER_TRANSITION");

    await request(app, { method: "POST", url: `/orders/${orderId}/confirm`, payload: { confirmed: true } });
    const processing = await request(app, {
      method: "PATCH",
      url: `/orders/${orderId}/status`,
      payload: { status: "processing" },
    });
    assert.equal(processing.statusCode, 200);
    assert.equal(processing.json().order.status, "processing");
    assert.equal((await request(app, { method: "GET", url: "/orders" })).json().orders.length, 1);
  });

  it("stops automated responses after human handoff", async () => {
    const whatsapp = new MockWhatsAppAdapter();
    const claude = new MockClaudeProvider();
    let app: FastifyInstance;
    app = createApp(config, {
      whatsapp,
      claude,
      sms: {
        async sendVerificationCode(_phone, code) {
          verificationCodes.set(app, code);
        },
      },
    });
    apps.push(app);
    await authenticate(app);
    const created = await request(app, {
      method: "POST",
      url: "/conversations",
      payload: { phone: "+212 6 12 34 56 78" },
    });
    const conversationId = created.json().conversation.id;
    const firstMessage = await request(app, {
      method: "POST",
      url: `/conversations/${conversationId}/messages`,
      payload: { text: "Where is my order?" },
    });
    assert.equal(firstMessage.json().automatedReply, true);
    assert.equal(whatsapp.sentMessages.length, 1);
    assert.equal(whatsapp.sentMessages[0]?.to, "+212612345678");
    assert.match(whatsapp.sentMessages[0]?.text ?? "", /suivi|commande/i);
    assert.equal(firstMessage.json().conversation.messages.at(-1).role, "assistant");
    assert.equal(firstMessage.json().conversation.messages.at(-1).text, whatsapp.sentMessages[0]?.text);

    await request(app, {
      method: "POST",
      url: `/conversations/${conversationId}/handoff`,
      payload: { reason: "Customer requested an agent" },
    });
    const nextMessage = await request(app, {
      method: "POST",
      url: `/conversations/${conversationId}/messages`,
      payload: { text: "Please call me." },
    });
    assert.equal(nextMessage.json().automatedReply, false);
    assert.equal(whatsapp.sentMessages.length, 1);
    assert.equal(nextMessage.json().conversation.messages.at(-1).role, "customer");

    const reply = await request(app, {
      method: "POST",
      url: `/conversations/${conversationId}/replies`,
      payload: { text: "Bonjour, je vous aide." },
    });
    assert.equal(reply.statusCode, 200);
    assert.equal(reply.json().conversation.messages.at(-1).role, "agent");
    assert.equal((await request(app, { method: "GET", url: "/conversations" })).json().conversations.length, 1);
  });
});

describe("mock assistant", () => {
  it("answers Arabic price and stock questions using real catalog data", async () => {
    const assistant = new MockClaudeProvider();
    const priceReply = await assistant.reply("شحال ثمن زيت الأركان؟");
    const stockReply = await assistant.reply("شكون متوفر؟");
    assert.match(priceReply, /129|Argan Oil 100 ml|درهم/i);
    assert.match(stockReply, /المخزون|قطعة|Argan Oil 100 ml|Handmade Ceramic Mug|Woven Market Basket/i);
  });
});

describe("configuration", () => {
  it("rejects invalid ports", () => {
    assert.throws(() => loadConfig({ PORT: "70000" }));
  });

  it("requires a strong session secret", () => {
    assert.throws(() => loadConfig({ SESSION_SECRET: "too-short" }));
  });

  it("accepts an AWS region for SNS delivery", () => {
    assert.equal(loadConfig({ SESSION_SECRET: "test-session-secret-at-least-32-characters", AWS_REGION: "eu-west-1" }).AWS_REGION, "eu-west-1");
  });
});

describe("local dashboard", () => {
  it("provides buttons to switch between login and account registration", () => {
    assert.match(dashboardHtml, /id="show-register"/);
    assert.match(dashboardHtml, /id="show-login"/);
    assert.match(dashboardHtml, /id="registration-code"/);
    assert.match(dashboardHtml, /تأكيد الهاتف وإنشاء الحساب/);
  });

  it("includes a syntactically valid client script", () => {
    const script = dashboardHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(script);
    assert.doesNotThrow(() => new Script(script));
    assert.match(script, /\/auth\/registration\/start/);
    assert.match(script, /\/auth\/registration\/verify/);
  });
});

describe("local JSON persistence", () => {
  it("loads and saves local-only state", () => {
    const directory = mkdtempSync(join(tmpdir(), "darija-desk-test-"));
    try {
      const path = join(directory, "store.json");
      const store = new JsonFileStore(path);
      store.orders.set("test-order", {
        id: "test-order",
        customerName: "Synthetic Customer",
        phone: "+212612345678",
        productId: "ceramic-mug",
        productName: "Handmade Ceramic Mug",
        quantity: 1,
        unitPriceMad: 89,
        totalMad: 89,
        address: "Synthetic address, Rabat",
        status: "confirmed",
      });
      store.save();
      const reopened = new JsonFileStore(path);
      assert.equal(reopened.orders.get("test-order")?.totalMad, 89);
      assert.equal(reopened.orders.get("test-order")?.status, "confirmed");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
