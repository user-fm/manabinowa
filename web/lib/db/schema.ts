import {
  pgTable,
  text,
  varchar,
  uuid,
  integer,
  boolean,
  timestamp,
  numeric,
  smallint,
  jsonb,
} from "drizzle-orm/pg-core";

/* ============================================================
   ENUMS 
============================================================ */

export const user_role = text("user_role");
export const account_status = text("account_status");
export const school_type = text("school_type");
export const request_status = text("request_status");
export const match_offer_status = text("match_offer_status");
export const session_status = text("session_status");
export const session_role = text("session_role");
export const community_category = text("community_category");
export const community_status = text("community_status");
export const block_status = text("block_status");
export const consent_status = text("consent_status");
export const inquiry_category = text("inquiry_category");
export const inquiry_status = text("inquiry_status");
export const alert_level = text("alert_level");
export const alert_status = text("alert_status");
export const notification_channel = text("notification_channel");
export const notification_category = text("notification_category");
export const notification_status = text("notification_status");
export const actor_type = text("actor_type");

/* ============================================================
   municipalities
============================================================ */

export const municipalities = pgTable("municipalities", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  prefecture: text("prefecture").notNull(),
});

/* ============================================================
   schools
============================================================ */

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  school_type: school_type.notNull(),
  municipality_code: text("municipality_code")
    .notNull()
    .references(() => municipalities.code),
  workspace_domain: text("workspace_domain").unique(),
  address: text("address"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   users
============================================================ */

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Supabase auth.users
  role: user_role.notNull(),
  account_status: account_status.notNull().default("active"),
  full_name: text("full_name").notNull(),
  email: text("email").notNull(),
  school_id: uuid("school_id").references(() => schools.id),
  municipality_code: text("municipality_code").references(
    () => municipalities.code
  ),
  subject: text("subject"),
  grade: text("grade"),
  intro: text("intro"),
  rating_avg: numeric("rating_avg", { precision: 3, scale: 2 }),
  session_count: integer("session_count").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   operators
============================================================ */

export const operators = pgTable("operators", {
  id: uuid("id").primaryKey().defaultRandom(),
  full_name: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   volunteer_offers
============================================================ */

export const volunteer_offers = pgTable("volunteer_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  volunteer_id: uuid("volunteer_id")
    .notNull()
    .references(() => users.id),
  subjects: text("subjects").array().notNull(),
  grades: text("grades").array().notNull(),
  availability: text("availability"),
  intro: text("intro"),
  search_text: text("search_text"),
  embedding: text("embedding"), // vector(768) → dùng text
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   volunteer_requests
============================================================ */

export const volunteer_requests = pgTable("volunteer_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacher_id: uuid("teacher_id")
    .notNull()
    .references(() => users.id),
  school_id: uuid("school_id")
    .notNull()
    .references(() => schools.id),
  subject: text("subject").notNull(),
  grade: text("grade").notNull(),
  desired_at: timestamp("desired_at", { withTimezone: true }),
  detail: text("detail").notNull(),
  search_text: text("search_text"),
  embedding: text("embedding"),
  status: request_status.notNull().default("open"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   match_offers
============================================================ */

export const match_offers = pgTable("match_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  request_id: uuid("request_id")
    .notNull()
    .references(() => volunteer_requests.id),
  volunteer_id: uuid("volunteer_id")
    .notNull()
    .references(() => users.id),
  status: match_offer_status.notNull().default("offered"),
  offered_at: timestamp("offered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  responded_at: timestamp("responded_at", { withTimezone: true }),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/* ============================================================
   volunteer_sessions
============================================================ */

export const volunteer_sessions = pgTable("volunteer_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  request_id: uuid("request_id")
    .notNull()
    .references(() => volunteer_requests.id),
  teacher_id: uuid("teacher_id")
    .notNull()
    .references(() => users.id),
  volunteer_id: uuid("volunteer_id")
    .notNull()
    .references(() => users.id),
  school_id: uuid("school_id")
    .notNull()
    .references(() => schools.id),
  scheduled_at: timestamp("scheduled_at", { withTimezone: true }),
  meet_url: text("meet_url"),
  status: session_status.notNull().default("scheduled"),
  is_first: boolean("is_first").notNull().default(false),
  recording_required: boolean("recording_required")
    .notNull()
    .default(false),
  recording_url: text("recording_url"),
  teacher_reflection: text("teacher_reflection"),
  volunteer_reflection: text("volunteer_reflection"),
  ai_summary: text("ai_summary"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   session_participants
============================================================ */

export const session_participants = pgTable("session_participants", {
  session_id: uuid("session_id")
    .notNull()
    .references(() => volunteer_sessions.id),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),
  role_in_session: session_role.notNull(),
});

/* ============================================================
   volunteer_reviews
============================================================ */

export const volunteer_reviews = pgTable("volunteer_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_id: uuid("session_id")
    .notNull()
    .unique()
    .references(() => volunteer_sessions.id),
  volunteer_id: uuid("volunteer_id")
    .notNull()
    .references(() => users.id),
  rating: smallint("rating").notNull(),
  comment: text("comment"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   community_requests
============================================================ */

export const community_requests = pgTable("community_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  community_id: uuid("community_id")
    .notNull()
    .references(() => users.id),
  category: community_category.notNull(),
  target_school_id: uuid("target_school_id")
    .notNull()
    .references(() => schools.id),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  due_date: text("due_date"),
  status: community_status.notNull().default("pending"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   community_library
============================================================ */

export const community_library = pgTable("community_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  source_request_id: uuid("source_request_id")
    .notNull()
    .references(() => community_requests.id),
  school_id: uuid("school_id")
    .notNull()
    .references(() => schools.id),
  title: text("title").notNull(),
  category: community_category.notNull(),
  provider: text("provider"),
  drive_url: text("drive_url"),
  search_text: text("search_text"),
  embedding: text("embedding"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   chat_messages
============================================================ */

export const chat_messages = pgTable("chat_messages", {
  id: integer("id").primaryKey(),
  session_id: uuid("session_id")
    .notNull()
    .references(() => volunteer_sessions.id),
  sender_id: uuid("sender_id").references(() => users.id),
  body: text("body").notNull(),
  ai_checked: boolean("ai_checked").notNull().default(false),
  ai_risk_level: alert_level,
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   audit_logs
============================================================ */

export const audit_logs = pgTable("audit_logs", {
  id: integer("id").primaryKey(),
  event_type: text("event_type").notNull(),
  actor_type: actor_type.notNull().default("system"),
  actor_id: uuid("actor_id"),
  actor_label: text("actor_label"),
  session_id: uuid("session_id").references(() => volunteer_sessions.id),
  target_id: uuid("target_id"),
  alert_level: alert_level,
  detail: jsonb("detail"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   safety_alerts
============================================================ */

export const safety_alerts = pgTable("safety_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_id: uuid("session_id")
    .notNull()
    .references(() => volunteer_sessions.id),
  chat_message_id: integer("chat_message_id").references(
    () => chat_messages.id
  ),
  volunteer_id: uuid("volunteer_id")
    .notNull()
    .references(() => users.id),
  school_id: uuid("school_id")
    .notNull()
    .references(() => schools.id),
  level: alert_level.notNull(),
  status: alert_status.notNull().default("open"),
  handled_by: uuid("handled_by").references(() => users.id),
  acknowledged_at: timestamp("acknowledged_at", { withTimezone: true }),
  resolved_at: timestamp("resolved_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   block_list
============================================================ */

export const block_list = pgTable("block_list", {
  id: uuid("id").primaryKey().defaultRandom(),
  volunteer_id: uuid("volunteer_id")
    .notNull()
    .references(() => users.id),
  school_id: uuid("school_id")
    .notNull()
    .references(() => schools.id),
  requested_by: uuid("requested_by").references(() => users.id),
  reason: text("reason").notNull(),
  status: block_status.notNull().default("pending"),
  decided_by: uuid("decided_by").references(() => operators.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  decided_at: timestamp("decided_at", { withTimezone: true }),
});

/* ============================================================
   consent_records
============================================================ */

export const consent_records = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  parent_name: text("parent_name"),
  consent_items: jsonb("consent_items"),
  status: consent_status.notNull().default("pending"),
  signed_at: timestamp("signed_at", { withTimezone: true }),
  signer_ip: text("signer_ip"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   notification_prefs
============================================================ */

export const notification_prefs = pgTable("notification_prefs", {
  user_id: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  email_enabled: boolean("email_enabled").notNull().default(true),
  push_enabled: boolean("push_enabled").notNull().default(true),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   notification_categories
============================================================ */

export const notification_categories_table = pgTable(
  "notification_categories",
  {
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    category: notification_category.notNull(),
    enabled: boolean("enabled").notNull().default(true),
  }
);

/* ============================================================
   push_subscriptions
============================================================ */

export const push_subscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
});

/* ============================================================
   notification_logs
============================================================ */

export const notification_logs = pgTable("notification_logs", {
  id: integer("id").primaryKey(),
  user_id: uuid("user_id").references(() => users.id),
  channel: notification_channel.notNull(),
  category: notification_category.notNull(),
  status: notification_status.notNull(),
  attempts: integer("attempts").notNull().default(1),
  payload: jsonb("payload"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   inquiries
============================================================ */

export const inquiries = pgTable("inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id),
  contact_email: text("contact_email"),
  role_snapshot: text("role_snapshot"),
  category: inquiry_category.notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: inquiry_status.notNull().default("open"),
  handled_by: uuid("handled_by").references(() => operators.id),
  response: text("response"),
  responded_at: timestamp("responded_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   message_threads
============================================================ */

export const message_threads = pgTable("message_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  last_message_at: timestamp("last_message_at", { withTimezone: true }),
});

/* ============================================================
   message_thread_participants
============================================================ */

export const message_thread_participants = pgTable(
  "message_thread_participants",
  {
    thread_id: uuid("thread_id")
      .notNull()
      .references(() => message_threads.id),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
  }
);

/* ============================================================
   messages
============================================================ */

export const messages = pgTable("messages", {
  id: integer("id").primaryKey(),
  thread_id: uuid("thread_id")
    .notNull()
    .references(() => message_threads.id),
  sender_id: uuid("sender_id").references(() => users.id),
  body: text("body").notNull(),
  read_at: timestamp("read_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
