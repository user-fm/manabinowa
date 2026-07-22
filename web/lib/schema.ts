// まなびのわ Drizzle スキーマ(型安全なクエリ用)
// 出典: manabi-no-wa-database.md v1.4 / 初期25テーブル(classroom_courses は F-GC 後送のため除外)。
// 注: スキーマの正本は db/migrations/0000_init.sql(enum/索引/RLS/トリガ/auth.users FK 含む)。
//     本ファイルはクエリの型付け用。索引・RLS・トリガ・CHECK は DDL 側にある。

import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

const tz = { withTimezone: true } as const;

// ---- enum ----
export const userRole = pgEnum("user_role", [
  "teacher",
  "student",
  "volunteer",
  "community",
  "admin",
  "board",
]);
export const accountStatus = pgEnum("account_status", [
  "pending",
  "approved",
  "rejected",
  "active",
]);
export const schoolType = pgEnum("school_type", ["elementary", "junior_high"]);
export const requestStatus = pgEnum("request_status", [
  "open",
  "matching",
  "matched",
  "closed",
  "expired",
]);
export const matchOfferStatus = pgEnum("match_offer_status", [
  "offered",
  "accepted",
  "declined",
  "expired",
]);
export const sessionStatus = pgEnum("session_status", [
  "scheduled",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
]);
export const sessionRole = pgEnum("session_role", ["teacher", "volunteer", "student"]);
export const communityCategory = pgEnum("community_category", [
  "poster",
  "event",
  "lecturer",
  "other",
]);
export const communityStatus = pgEnum("community_status", ["pending", "accepted", "rejected"]);
export const blockStatus = pgEnum("block_status", ["pending", "approved", "rejected"]);
export const consentStatus = pgEnum("consent_status", ["pending", "signed"]);
export const inquiryCategory = pgEnum("inquiry_category", [
  "bug",
  "usage",
  "unblock",
  "consent",
  "deletion",
  "other",
]);
export const inquiryStatus = pgEnum("inquiry_status", [
  "open",
  "in_progress",
  "answered",
  "closed",
]);
export const alertLevel = pgEnum("alert_level", ["low", "medium", "high", "urgent"]);
export const alertStatus = pgEnum("alert_status", ["open", "acknowledged", "resolved"]);
export const notificationChannel = pgEnum("notification_channel", ["email", "push"]);
export const notificationCategoryEnum = pgEnum("notification_category", [
  "matching",
  "session_reminder",
  "community",
  "safety_alert",
  "message",
]);
export const notificationStatus = pgEnum("notification_status", ["sent", "failed", "retrying"]);
export const actorType = pgEnum("actor_type", ["user", "operator", "parent", "system", "ai"]);

// ---- マスタ ----
export const municipalities = pgTable("municipalities", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  prefecture: text("prefecture").notNull(),
});

export const schools = pgTable("schools", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  schoolType: schoolType("school_type").notNull(),
  municipalityCode: text("municipality_code")
    .notNull()
    .references(() => municipalities.code, { onDelete: "restrict" }),
  workspaceDomain: text("workspace_domain").unique(),
  address: text("address"),
  // 録画対応校フラグ(E-08 の判定元)。DDL は 0001_school_recording_enabled.sql。
  recordingEnabled: boolean("recording_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});

export const users = pgTable("users", {
  // FK→auth.users(id) on delete cascade は DDL 側で定義(Supabase auth スキーマ)
  id: uuid("id").primaryKey(),
  role: userRole("role").notNull(),
  accountStatus: accountStatus("account_status").default("active").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
  municipalityCode: text("municipality_code").references(() => municipalities.code, {
    onDelete: "restrict",
  }),
  subject: text("subject"),
  grade: text("grade"),
  intro: text("intro"),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }),
  sessionCount: integer("session_count").default(0).notNull(),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", tz).defaultNow().notNull(),
});

export const operators = pgTable("operators", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});

// ---- ボランティア軸 ----
export const volunteerOffers = pgTable("volunteer_offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  volunteerId: uuid("volunteer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subjects: text("subjects").array().notNull(),
  grades: text("grades").array().notNull(),
  availability: text("availability"),
  intro: text("intro"),
  searchText: text("search_text"),
  embedding: vector("embedding", { dimensions: 768 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", tz).defaultNow().notNull(),
});

export const volunteerRequests = pgTable("volunteer_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "restrict" }),
  subject: text("subject").notNull(),
  grade: text("grade").notNull(),
  desiredAt: timestamp("desired_at", tz),
  detail: text("detail").notNull(),
  searchText: text("search_text"),
  embedding: vector("embedding", { dimensions: 768 }),
  status: requestStatus("status").default("open").notNull(),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", tz).defaultNow().notNull(),
});

export const matchOffers = pgTable(
  "match_offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => volunteerRequests.id, { onDelete: "cascade" }),
    volunteerId: uuid("volunteer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: matchOfferStatus("status").default("offered").notNull(),
    offeredAt: timestamp("offered_at", tz).defaultNow().notNull(),
    respondedAt: timestamp("responded_at", tz),
    expiresAt: timestamp("expires_at", tz).notNull(),
  },
  (t) => [unique("uq_match_offers_req_vol").on(t.requestId, t.volunteerId)],
);

export const volunteerSessions = pgTable("volunteer_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => volunteerRequests.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  volunteerId: uuid("volunteer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "restrict" }),
  scheduledAt: timestamp("scheduled_at", tz),
  meetUrl: text("meet_url"),
  status: sessionStatus("status").default("scheduled").notNull(),
  isFirst: boolean("is_first").default(false).notNull(),
  recordingRequired: boolean("recording_required").default(false).notNull(),
  recordingUrl: text("recording_url"),
  teacherReflection: text("teacher_reflection"),
  volunteerReflection: text("volunteer_reflection"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", tz).defaultNow().notNull(),
});

export const sessionParticipants = pgTable(
  "session_participants",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => volunteerSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleInSession: sessionRole("role_in_session").notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.userId] })],
);

export const volunteerReviews = pgTable("volunteer_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .unique()
    .references(() => volunteerSessions.id, { onDelete: "cascade" }),
  volunteerId: uuid("volunteer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: smallint("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});

// ---- 地域軸 ----
export const communityRequests = pgTable("community_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: communityCategory("category").notNull(),
  targetSchoolId: uuid("target_school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  dueDate: date("due_date"),
  status: communityStatus("status").default("pending").notNull(),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", tz).defaultNow().notNull(),
});

export const communityLibrary = pgTable("community_library", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceRequestId: uuid("source_request_id")
    .notNull()
    .references(() => communityRequests.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  category: communityCategory("category").notNull(),
  provider: text("provider"),
  driveUrl: text("drive_url"),
  searchText: text("search_text"),
  embedding: vector("embedding", { dimensions: 768 }),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});

// ---- セッション内通信・安全 ----
export const chatMessages = pgTable("chat_messages", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => volunteerSessions.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  aiChecked: boolean("ai_checked").default(false).notNull(),
  aiRiskLevel: alertLevel("ai_risk_level"),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  eventType: text("event_type").notNull(),
  actorType: actorType("actor_type").default("system").notNull(),
  actorId: uuid("actor_id"), // FKは張らない(多種主体・削除耐性)
  actorLabel: text("actor_label"),
  sessionId: uuid("session_id").references(() => volunteerSessions.id, { onDelete: "set null" }),
  targetId: uuid("target_id"),
  alertLevel: alertLevel("alert_level"),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});

export const safetyAlerts = pgTable("safety_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => volunteerSessions.id, { onDelete: "cascade" }),
  chatMessageId: bigint("chat_message_id", { mode: "number" }).references(() => chatMessages.id, {
    onDelete: "set null",
  }),
  volunteerId: uuid("volunteer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "restrict" }),
  level: alertLevel("level").notNull(),
  status: alertStatus("status").default("open").notNull(),
  handledBy: uuid("handled_by").references(() => users.id, { onDelete: "set null" }),
  acknowledgedAt: timestamp("acknowledged_at", tz),
  resolvedAt: timestamp("resolved_at", tz),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});

export const blockList = pgTable("block_list", {
  id: uuid("id").defaultRandom().primaryKey(),
  volunteerId: uuid("volunteer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "restrict" }),
  requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  status: blockStatus("status").default("pending").notNull(),
  decidedBy: uuid("decided_by").references(() => operators.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  decidedAt: timestamp("decided_at", tz),
});

// ---- 同意・通知・問い合わせ・メッセージ ----
export const consentRecords = pgTable("consent_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  parentName: text("parent_name"),
  consentItems: jsonb("consent_items"),
  status: consentStatus("status").default("pending").notNull(),
  signedAt: timestamp("signed_at", tz),
  signerIp: text("signer_ip"),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});

export const notificationPrefs = pgTable("notification_prefs", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  pushEnabled: boolean("push_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at", tz).defaultNow().notNull(),
});

export const notificationCategories = pgTable(
  "notification_categories",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: notificationCategoryEnum("category").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.category] })],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at", tz),
});

export const notificationLogs = pgTable("notification_logs", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  channel: notificationChannel("channel").notNull(),
  category: notificationCategoryEnum("category").notNull(),
  status: notificationStatus("status").notNull(),
  attempts: integer("attempts").default(1).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});

export const inquiries = pgTable("inquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  contactEmail: text("contact_email"),
  roleSnapshot: text("role_snapshot"),
  category: inquiryCategory("category").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: inquiryStatus("status").default("open").notNull(),
  handledBy: uuid("handled_by").references(() => operators.id, { onDelete: "set null" }),
  response: text("response"),
  respondedAt: timestamp("responded_at", tz),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", tz).defaultNow().notNull(),
});

export const messageThreads = pgTable("message_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at", tz),
});

export const messageThreadParticipants = pgTable(
  "message_thread_participants",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.threadId, t.userId] })],
);

export const messages = pgTable("messages", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => messageThreads.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  readAt: timestamp("read_at", tz),
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
});
