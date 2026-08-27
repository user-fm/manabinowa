import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { fmtDateTime, SESSION_STATUS_LABEL } from "@/lib/labels";
import { requireSessionAccess } from "@/lib/sessions";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import {
  endSession,
  enterSession,
  saveMeetUrl,
  saveRecordingUrl,
  saveReflection,
  saveVolunteerReview,
} from "./actions";
import { type ChatMessage, SessionChat } from "./session-chat";

const ERROR_MESSAGE: Record<string, string> = {
  forbidden: "この操作を行う権限がありません。",
  closed: "このセッションはすでに終了しています。",
  paused:
    "このセッションは中断中のため、操作できません。学校管理者が安全アラートに対応すると再開されます。",
  not_running: "実施中のセッションのみ終了できます。",
  empty_message: "メッセージを入力してください。",
  too_long: "メッセージが長すぎます（2000文字以内）。",
  invalid_url: "リンクは https:// で始まる URL を入力してください。",
  invalid_rating: "評価は1〜5から選んでください。",
  db: "処理に失敗しました。時間をおいて再度お試しください。",
};

const SAVED_MESSAGE: Record<string, string> = {
  reflection: "振り返りを保存しました。",
  recording: "録画リンクを保存しました。",
  review: "評価を登録しました。",
  meet: "会議リンクを保存しました。",
};

// 見出し横のステータスバッジ。状態が一目で分かるよう色で区別する。
const STATUS_BADGE: Record<string, string> = {
  scheduled: "border-gray-300 bg-white text-gray-600",
  in_progress: "border-emerald-300 bg-emerald-50 text-emerald-800",
  paused: "border-amber-300 bg-amber-50 text-amber-800",
  completed: "border-gray-300 bg-gray-100 text-gray-600",
  cancelled: "border-red-300 bg-red-50 text-red-700",
};

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const profile = await requireProfile();
  const { session, viewerRole } = await requireSessionAccess(id, profile);

  const req = session.volunteer_requests;
  const canOperate = viewerRole !== "admin";
  const isRunning = session.status === "in_progress";
  const isClosed = session.status === "completed" || session.status === "cancelled";

  // チャット(E-10)の初期表示ぶん。新着は Realtime で追記される。
  const admin = createAdminClient();
  const { data: messageRows } = await admin
    .from("chat_messages")
    .select("id, sender_id, body, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true })
    .limit(200);
  const messages = (messageRows ?? []) as ChatMessage[];

  // 表示名は当事者ぶんと過去の送信者ぶんをまとめて引く。
  const senderIds = Array.from(
    new Set(
      [session.teacher_id, session.volunteer_id, ...messages.map((m) => m.sender_id)].filter(
        (v): v is string => Boolean(v),
      ),
    ),
  );
  const { data: userRows } = await admin.from("users").select("id, full_name").in("id", senderIds);
  const senderNames = Object.fromEntries(
    (userRows ?? []).map((u) => [u.id as string, u.full_name as string]),
  );

  // E-16 の既存評価(あれば編集の初期値にする)。
  const { data: review } = await admin
    .from("volunteer_reviews")
    .select("rating, comment")
    .eq("session_id", id)
    .maybeSingle();

  const isTeacher = viewerRole === "teacher";
  const isVolunteer = viewerRole === "volunteer";
  const canReflect = (isTeacher || isVolunteer) && session.status !== "cancelled";
  const myReflection = isTeacher ? session.teacher_reflection : session.volunteer_reflection;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            オンライン指導：{req?.subject ?? "—"}（{req?.grade ?? "—"}）
          </h1>
          <p className="mt-1 text-sm text-gray-500">日時: {fmtDateTime(session.scheduled_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
              STATUS_BADGE[session.status] ?? "border-gray-300 bg-white text-gray-600",
            )}
          >
            {SESSION_STATUS_LABEL[session.status] ?? session.status}
          </span>
          {/* 入室はチャットの参加者行(session_participants)を作る起点でもある。 */}
          {canOperate && !isClosed ? (
            <>
              {!isRunning ? (
                <form action={enterSession}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <Button type="submit">入室して開始する</Button>
                </form>
              ) : null}
              {isRunning && viewerRole === "teacher" ? (
                <form action={endSession}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <Button type="submit" variant="outline">
                    セッションを終了する
                  </Button>
                </form>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3 empty:mt-0">
        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {ERROR_MESSAGE[error] ?? "エラーが発生しました。"}
          </p>
        ) : null}

        {saved && SAVED_MESSAGE[saved] ? (
          <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {SAVED_MESSAGE[saved]}
          </p>
        ) : null}

        {session.recording_required ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            このセッションは録画対象です（初回・録画対応校）。開始時に Meet
            の録画を開始してください。
          </p>
        ) : null}
      </div>

      {/* 左=操作するもの(会議・チャット・振り返り)、右=参照するもの(依頼内容・録画)。 */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3 lg:items-start">
        <div className="space-y-5 lg:col-span-2">
          <section className={cn(cardClass, "p-4")}>
            <h2 className="text-sm font-medium text-gray-500">ビデオ会議</h2>
            {session.meet_url ? (
              <a
                href={session.meet_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-blue-700 underline"
              >
                Meet に参加する
              </a>
            ) : (
              <p className="mt-2 text-sm text-gray-500">会議リンクは未設定です。</p>
            )}

            {/* E-04: Meet の URL は教師が手動で登録する(Calendar API 連携は今回対象外)。 */}
            {viewerRole === "teacher" && !isClosed ? (
              <form action={saveMeetUrl} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="sessionId" value={session.id} />
                <label className="flex-1" htmlFor="meetUrl">
                  <span className="text-xs text-gray-500">Meet のリンク</span>
                  <Input
                    id="meetUrl"
                    name="meetUrl"
                    type="url"
                    defaultValue={session.meet_url ?? ""}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    className="text-sm"
                  />
                </label>
                <Button type="submit" variant="outline">
                  保存
                </Button>
              </form>
            ) : null}
          </section>

          <SessionChat
            sessionId={session.id}
            currentUserId={profile.id}
            initialMessages={messages}
            senderNames={senderNames}
            canPost={canOperate && !isClosed}
          />

          <section className={cn(cardClass, "p-4")}>
            <h2 className="text-sm font-medium text-gray-500">振り返り</h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-medium text-gray-500">教師</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {session.teacher_reflection ?? (
                    <span className="text-gray-400">未入力です。</span>
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-medium text-gray-500">ボランティア</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {session.volunteer_reflection ?? (
                    <span className="text-gray-400">未入力です。</span>
                  )}
                </p>
              </div>
            </div>

            {canReflect ? (
              <form action={saveReflection} className="mt-4 border-t pt-4">
                <input type="hidden" name="sessionId" value={session.id} />
                <Field label="自分の振り返り" htmlFor="reflection">
                  <Textarea
                    id="reflection"
                    name="reflection"
                    rows={4}
                    defaultValue={myReflection ?? ""}
                    placeholder="うまくいった点や次回に向けた気づきを書いてください。"
                  />
                </Field>
                <Button type="submit" className="mt-2">
                  振り返りを保存する
                </Button>
              </form>
            ) : null}

            <div className="mt-4 border-t pt-3">
              <h3 className="text-xs font-medium text-gray-500">AI要約</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {session.ai_summary ?? (
                  <span className="text-gray-400">AI要約は未生成です（自動生成は準備中）。</span>
                )}
              </p>
            </div>
          </section>

          {isTeacher && session.status === "completed" ? (
            <section className={cn(cardClass, "p-4")}>
              <h2 className="text-sm font-medium text-gray-500">ボランティアの評価</h2>
              <form action={saveVolunteerReview} className="mt-3 space-y-3">
                <input type="hidden" name="sessionId" value={session.id} />
                <Field label="評価" htmlFor="rating">
                  <Select id="rating" name="rating" defaultValue={String(review?.rating ?? 5)}>
                    <option value="5">5（とても良かった）</option>
                    <option value="4">4（良かった）</option>
                    <option value="3">3（ふつう）</option>
                    <option value="2">2（あまり良くなかった）</option>
                    <option value="1">1（良くなかった）</option>
                  </Select>
                </Field>
                <Field label="コメント" htmlFor="comment" hint="(任意)">
                  <Textarea
                    id="comment"
                    name="comment"
                    rows={3}
                    defaultValue={review?.comment ?? ""}
                  />
                </Field>
                <Button type="submit">{review ? "評価を更新する" : "評価を登録する"}</Button>
              </form>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <section className={cn(cardClass, "p-4")}>
            <h2 className="text-sm font-medium text-gray-500">内容</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{req?.detail ?? "—"}</p>
          </section>

          <section className={cn(cardClass, "p-4")}>
            <h2 className="text-sm font-medium text-gray-500">録画</h2>
            {session.recording_url ? (
              <a
                href={session.recording_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-blue-700 underline"
              >
                録画を見る
              </a>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                {session.recording_required
                  ? "録画リンクは未登録です。セッション終了後に教師が登録してください。"
                  : "このセッションは録画対象ではありません。"}
              </p>
            )}

            {isTeacher && session.recording_required ? (
              <form action={saveRecordingUrl} className="mt-4">
                <input type="hidden" name="sessionId" value={session.id} />
                <Field label="録画リンク" htmlFor="recordingUrl" hint="(https:// のURL)">
                  <Input
                    id="recordingUrl"
                    name="recordingUrl"
                    type="url"
                    defaultValue={session.recording_url ?? ""}
                    placeholder="https://drive.google.com/..."
                  />
                </Field>
                <Button type="submit" className="mt-2">
                  録画リンクを保存する
                </Button>
              </form>
            ) : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
