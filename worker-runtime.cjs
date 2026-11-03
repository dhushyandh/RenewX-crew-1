var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/models/Order.ts
var import_mongoose, OrderItemSchema, OrderSchema, OrderModel;
var init_Order = __esm({
  "server/models/Order.ts"() {
    import_mongoose = __toESM(require("mongoose"));
    OrderItemSchema = new import_mongoose.Schema(
      {
        product_id: { type: String, required: true },
        product_name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }
      },
      { _id: false }
    );
    OrderSchema = new import_mongoose.Schema(
      {
        user_id: { type: String, required: true, index: true },
        subtotal: { type: Number, required: true, min: 0 },
        savings: { type: Number, default: 0, min: 0 },
        status: {
          type: String,
          enum: ["pending", "verified", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"],
          default: "pending",
          index: true
        },
        payment_status: {
          type: String,
          enum: ["created", "paid", "failed", "refunded", "refund_pending"],
          default: "created",
          index: true
        },
        payment_method: { type: String, default: "razorpay" },
        razorpay_order_id: { type: String, index: true },
        razorpay_payment_id: { type: String },
        payment_verified_at: { type: Date },
        checkout_key: { type: String, select: false },
        currency: { type: String, enum: ["INR"], default: "INR" },
        courier: { type: String, default: "" },
        courier_phone: { type: String, default: "" },
        tracking_number: { type: String, default: "" },
        estimated_delivery: { type: String, default: "" },
        customer_info: {
          name: { type: String, default: "" },
          phone: { type: String, default: "" },
          address: { type: String, default: "" },
          pincode: { type: String, default: "" },
          whatsapp_consent: { type: Boolean, default: true }
        },
        order_items: { type: [OrderItemSchema], default: [] }
      },
      {
        autoIndex: false,
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
        toJSON: {
          virtuals: true,
          transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            delete ret.checkout_key;
            return ret;
          }
        }
      }
    );
    OrderSchema.index(
      { user_id: 1, checkout_key: 1 },
      { unique: true, partialFilterExpression: { checkout_key: { $type: "string" } } }
    );
    OrderSchema.index(
      { razorpay_payment_id: 1 },
      { unique: true, partialFilterExpression: { razorpay_payment_id: { $type: "string" } } }
    );
    OrderSchema.index({ user_id: 1, created_at: -1 });
    OrderSchema.index({ status: 1, created_at: -1 });
    OrderSchema.index({ created_at: -1 });
    OrderModel = import_mongoose.default.models.Order || import_mongoose.default.model("Order", OrderSchema);
  }
});

// server/config/db.ts
var import_mongoose3 = __toESM(require("mongoose"));

// server/config/env.ts
var import_dotenv = __toESM(require("dotenv"));
var import_path = __toESM(require("path"));
var projectRoot = import_path.default.basename(process.cwd()) === "server" ? import_path.default.resolve(process.cwd(), "..") : process.cwd();
import_dotenv.default.config({ path: import_path.default.join(projectRoot, ".env") });
import_dotenv.default.config({ path: import_path.default.join(projectRoot, "server", ".env") });
var required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};
var optional = (name) => process.env[name]?.trim() || "";
var parsePort = (value) => {
  const port = Number(value || 5e3);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
};
var parseCorsOrigins = (value) => {
  if (!value || value.trim() === "*") return ["*"];
  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
};
var env = {
  NODE_ENV: process.env.NODE_ENV?.trim() || "development",
  PORT: parsePort(process.env.PORT),
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGIN || process.env.CORS_ORIGINS),
  MONGODB_URI: required("MONGODB_URI"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN?.trim() || "7d",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL?.trim() || "",
  GOOGLE_CLIENT_IDS: process.env.GOOGLE_CLIENT_IDS?.trim() || "",
  RAZORPAY_KEY_ID: optional("RAZORPAY_KEY_ID"),
  RAZORPAY_KEY_SECRET: optional("RAZORPAY_KEY_SECRET"),
  RAZORPAY_WEBHOOK_SECRET: optional("RAZORPAY_WEBHOOK_SECRET"),
  SUPABASE_URL: process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim() || "",
  SUPABASE_SERVICE_ROLE_KEY: optional("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "product-images",
  FRONTEND_URL: process.env.FRONTEND_URL?.trim() || "https://renewx.expo.app",
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY?.trim() || "BM8x0O0kwul8vZa6WqY5UgN0SxJXOmCecsFAviuEFQsSN7-k-M2Eg9U8gsIFRfSF2SgbHqr-0nbfF-CVT95AgIQ",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY?.trim() || "xGdYET2PWEVKgfK4LD1T9iOBPMyLzxOr4TySNaru85U",
  VAPID_SUBJECT: process.env.VAPID_SUBJECT?.trim() || "mailto:admin@renewx.com",
  OPENWA_BASE_URL: optional("OPENWA_BASE_URL") || "http://localhost:2785",
  OPENWA_API_KEY: optional("OPENWA_API_KEY"),
  OPENWA_SESSION_ID: optional("OPENWA_SESSION_ID")
};
var isProduction = env.NODE_ENV === "production";

// server/config/db.ts
init_Order();

// server/models/WhatsAppMessage.ts
var import_mongoose2 = __toESM(require("mongoose"));
var WhatsAppMessageSchema = new import_mongoose2.Schema(
  {
    order_id: { type: String, required: true, index: true },
    event_key: { type: String, required: true, unique: true, index: true },
    recipient_phone: { type: String, required: true },
    chat_id: { type: String, required: true },
    template_action: { type: String, required: true },
    message_text: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending",
      index: true
    },
    openwa_message_id: { type: String, default: null },
    error_message: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    next_retry_at: { type: Date, default: null, index: true },
    sent_at: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);
WhatsAppMessageSchema.index({ order_id: 1, created_at: -1 });
WhatsAppMessageSchema.index({ status: 1, created_at: -1 });
WhatsAppMessageSchema.index({ status: 1, next_retry_at: 1 });
var WhatsAppMessageModel = import_mongoose2.default.models.WhatsAppMessage || import_mongoose2.default.model("WhatsAppMessage", WhatsAppMessageSchema);
async function reconcileWhatsAppIndexes() {
  try {
    await WhatsAppMessageModel.syncIndexes();
    console.log("\u{1F33F} [MongoDB] WhatsAppMessage unique event_key index verified");
  } catch (err) {
    console.warn("[MongoDB] Notice during WhatsApp index reconciliation:", err?.message || err);
  }
}

// server/config/db.ts
var connectPromise = null;
async function reconcileOrderIndexes() {
  try {
    const indexes = await OrderModel.collection.indexes();
    const legacyOrderNumberIndex = indexes.find((index) => index.name === "orderNumber_1");
    if (legacyOrderNumberIndex) {
      await OrderModel.collection.dropIndex("orderNumber_1");
      console.log("[MongoDB] Removed obsolete orderNumber index");
    }
    const legacyPaymentIndex = indexes.find((index) => index.name === "razorpay_payment_id_1");
    if (legacyPaymentIndex && (!legacyPaymentIndex.unique || !legacyPaymentIndex.partialFilterExpression)) {
      await OrderModel.collection.dropIndex("razorpay_payment_id_1");
      console.log("[MongoDB] Dropped obsolete non-unique razorpay_payment_id_1 index");
    }
    await OrderModel.syncIndexes();
  } catch (err) {
    console.warn("[MongoDB] Notice during order index reconciliation:", err?.message || err);
  }
}
async function connectDB() {
  if (import_mongoose3.default.connection.readyState === 1) return import_mongoose3.default;
  if (connectPromise) return connectPromise;
  connectPromise = import_mongoose3.default.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production",
    serverSelectionTimeoutMS: 15e3,
    connectTimeoutMS: 15e3,
    socketTimeoutMS: 45e3,
    maxIdleTimeMS: 6e4,
    maxPoolSize: 50,
    minPoolSize: env.NODE_ENV === "production" ? 5 : 2
  }).then(async (connection) => {
    await reconcileOrderIndexes();
    await reconcileWhatsAppIndexes();
    console.log(`\u{1F33F} [MongoDB] Connected to ${connection.connection.name} at ${connection.connection.host}`);
    return connection;
  }).catch((error) => {
    connectPromise = null;
    console.error("\u274C [MongoDB] Connection failed:", error.message);
    throw error;
  });
  return connectPromise;
}
import_mongoose3.default.connection.on("disconnected", () => {
  connectPromise = null;
  console.warn("\u26A0\uFE0F [MongoDB] Disconnected");
});
import_mongoose3.default.connection.on("reconnected", () => {
  console.log("\u{1F504} [MongoDB] Reconnected");
});
import_mongoose3.default.connection.on("error", (error) => console.error("\u274C [MongoDB] Runtime error:", error.message));

// server/services/openwaService.ts
var cachedSessionId = null;
var SESSION_CACHE_TTL_MS = 5 * 60 * 1e3;
async function getActiveOpenWASessionId() {
  const configured = env.OPENWA_SESSION_ID?.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (configured && uuidRegex.test(configured)) {
    return configured;
  }
  const now = Date.now();
  if (cachedSessionId && cachedSessionId.expiresAt > now) {
    return cachedSessionId.id;
  }
  const baseUrl = (env.OPENWA_BASE_URL || "http://localhost:2785").replace(/\/+$/, "");
  const apiKey = env.OPENWA_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[OpenWA] Failed to list sessions: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const sessions = Array.isArray(data) ? data : data?.data ? data.data : data?.id ? [data] : [];
    if (!sessions.length) {
      console.warn("[OpenWA] No active sessions found on OpenWA gateway.");
      return null;
    }
    let matched = configured ? sessions.find((s) => s.name === configured || s.id === configured) : null;
    if (!matched) {
      matched = sessions.find((s) => s.status === "ready" || s.engineLoaded === true) || sessions[0];
    }
    if (matched?.id && uuidRegex.test(matched.id)) {
      cachedSessionId = { id: matched.id, expiresAt: now + SESSION_CACHE_TTL_MS };
      return matched.id;
    }
    return null;
  } catch (err) {
    console.warn("[OpenWA] Unable to resolve active session:", err?.message || "Network error");
    return null;
  }
}
var MAX_RETRY_ATTEMPTS = 5;
var BASE_RETRY_DELAY_MS = 30 * 1e3;
var MAX_RETRY_DELAY_MS = 15 * 60 * 1e3;
function calculateNextRetry(attempts) {
  if (attempts >= MAX_RETRY_ATTEMPTS) {
    return null;
  }
  const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, Math.max(0, attempts - 1)), MAX_RETRY_DELAY_MS);
  return new Date(Date.now() + delay);
}
async function dispatchOutboxMessage(record) {
  const recordId = record.id || record._id;
  const baseUrl = (env.OPENWA_BASE_URL || "http://localhost:2785").replace(/\/+$/, "");
  const apiKey = env.OPENWA_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      skipped: true,
      reason: "OPENWA_NOT_CONFIGURED"
    };
  }
  const sessionId = await getActiveOpenWASessionId();
  if (!sessionId) {
    const errorMsg = "No active or ready OpenWA session available";
    console.warn(`[OpenWA] Order #${record.order_id}: ${errorMsg}`);
    const nextAttempts = (record.attempts || 0) + 1;
    const nextRetry = calculateNextRetry(nextAttempts);
    await WhatsAppMessageModel.updateOne(
      { _id: recordId },
      {
        $set: {
          status: "failed",
          error_message: errorMsg,
          next_retry_at: nextRetry,
          attempts: nextAttempts
        }
      }
    );
    return { success: false, error: errorMsg };
  }
  const targetUrl = `${baseUrl}/api/sessions/${sessionId}/messages/send-text`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12e3);
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Key": apiKey,
        "Idempotency-Key": record.event_key
      },
      body: JSON.stringify({
        chatId: record.chat_id,
        text: record.message_text
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const responseText = await response.text();
    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }
    if (response.status === 200 || response.status === 201) {
      const messageId = responseData?.messageId || responseData?.id || "openwa_ack";
      await WhatsAppMessageModel.updateOne(
        { _id: recordId },
        {
          $set: {
            status: "sent",
            openwa_message_id: messageId,
            sent_at: /* @__PURE__ */ new Date(),
            error_message: null,
            next_retry_at: null
          },
          $inc: { attempts: 1 }
        }
      );
      return {
        success: true,
        messageId
      };
    }
    const safeError = `HTTP ${response.status}: ${responseData?.message || responseData?.error || "OpenWA rejected send"}`;
    console.warn(`[OpenWA] Order #${record.order_id} message delivery rejected: ${safeError}`);
    const nextAttempts = (record.attempts || 0) + 1;
    const nextRetry = calculateNextRetry(nextAttempts);
    await WhatsAppMessageModel.updateOne(
      { _id: recordId },
      {
        $set: {
          status: "failed",
          error_message: safeError,
          next_retry_at: nextRetry,
          attempts: nextAttempts
        }
      }
    );
    return {
      success: false,
      error: safeError
    };
  } catch (netErr) {
    const safeError = netErr?.name === "AbortError" ? "Request timed out after 12s connecting to OpenWA" : netErr?.message || "Network error connecting to OpenWA";
    console.warn(`[OpenWA] Order #${record.order_id} send failed: ${safeError}`);
    const nextAttempts = (record.attempts || 0) + 1;
    const nextRetry = calculateNextRetry(nextAttempts);
    await WhatsAppMessageModel.updateOne(
      { _id: recordId },
      {
        $set: {
          status: "failed",
          error_message: safeError,
          next_retry_at: nextRetry,
          attempts: nextAttempts
        }
      }
    );
    return {
      success: false,
      error: safeError
    };
  }
}
var retryWorkerTimer = null;
var initialWorkerTimer = null;
var isProcessingRetries = false;
async function processPendingWhatsAppRetries(batchSize = 10) {
  if (isProcessingRetries) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  isProcessingRetries = true;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  try {
    const now = /* @__PURE__ */ new Date();
    const stalePendingCutoff = new Date(Date.now() - 6e4);
    const candidates = await WhatsAppMessageModel.find({
      $or: [
        {
          status: "failed",
          next_retry_at: { $lte: now },
          attempts: { $lt: MAX_RETRY_ATTEMPTS }
        },
        {
          status: "pending",
          attempts: { $lt: MAX_RETRY_ATTEMPTS },
          updated_at: { $lte: stalePendingCutoff }
        }
      ]
    }).sort({ next_retry_at: 1, created_at: 1 }).limit(batchSize).lean();
    for (const candidate of candidates) {
      const claimed = await WhatsAppMessageModel.findOneAndUpdate(
        {
          _id: candidate._id,
          status: candidate.status,
          updated_at: candidate.updated_at
        },
        {
          $set: {
            status: "pending",
            updated_at: /* @__PURE__ */ new Date()
          }
        },
        { new: true }
      );
      if (!claimed) {
        continue;
      }
      processed++;
      const res = await dispatchOutboxMessage(claimed);
      if (res.success) {
        succeeded++;
      } else {
        failed++;
      }
    }
  } catch (err) {
    console.error("[OpenWA] Error in retry worker loop:", err?.message || err);
  } finally {
    isProcessingRetries = false;
  }
  return { processed, succeeded, failed };
}
function startWhatsAppRetryWorker(intervalMs = 6e4) {
  if (retryWorkerTimer) {
    return retryWorkerTimer;
  }
  console.log(`\u{1F33F} [OpenWA] Started WhatsApp retry worker (interval: ${intervalMs}ms)`);
  initialWorkerTimer = setTimeout(() => {
    initialWorkerTimer = null;
    processPendingWhatsAppRetries().catch(() => {
    });
  }, 5e3);
  if (initialWorkerTimer.unref) initialWorkerTimer.unref();
  retryWorkerTimer = setInterval(() => {
    processPendingWhatsAppRetries().catch((err) => {
      console.warn("[OpenWA] WhatsApp retry worker interval error:", err?.message || err);
    });
  }, intervalMs);
  if (retryWorkerTimer.unref) retryWorkerTimer.unref();
  return retryWorkerTimer;
}
function stopWhatsAppRetryWorker() {
  if (initialWorkerTimer) {
    clearTimeout(initialWorkerTimer);
    initialWorkerTimer = null;
  }
  if (retryWorkerTimer) {
    clearInterval(retryWorkerTimer);
    retryWorkerTimer = null;
    console.log("[OpenWA] WhatsApp retry worker stopped");
  }
}

// server/worker.ts
var import_mongoose4 = __toESM(require("mongoose"));
async function start() {
  console.log("=======================================================");
  console.log("\u2699\uFE0F  RenewX Dedicated Background Queue Worker");
  console.log("\u{1F4E1} Role: Asynchronous WhatsApp & Notification Dispatch");
  console.log("=======================================================");
  await connectDB();
  startWhatsAppRetryWorker(15e3);
  const gracefulShutdown = (signal) => {
    console.log(`[Worker] Received ${signal}. Shutting down queue worker...`);
    stopWhatsAppRetryWorker();
    import_mongoose4.default.disconnect().catch(() => void 0).finally(() => {
      console.log("[Worker] Dedicated queue worker stopped cleanly.");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
start().catch((err) => {
  console.error("\u274C [Worker] Failed to start dedicated queue worker:", err);
  process.exit(1);
});
