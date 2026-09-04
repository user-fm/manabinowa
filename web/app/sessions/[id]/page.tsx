import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireProfile } from "@/lib/auth";
import { fmtDateTime, SESSION_STATUS_LABEL } from "@/lib/labels";
import { requireSessionAccess } from "@/lib/sessions";
import { createAdminClient } from "@/lib/supabase/admin";
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
  invalid_url: "録画リンクは https:// で始まる URL を入力してください。",
  invalid_rating: "評価は1〜5から選んでください。",
  db: "処理に失敗しました。時間をおいて再度お試しください。",
};

const SAVED_MESSAGE: Record<string, string> = {
  reflection: "振り返りを保存しました。",
  recording: "録画リンクを保存しました。",
  review: "評価を登録しました。",
  meet: "会議リンクを保存しました。",
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="オンライン指導"
        title={`${req?.subject ?? "—"}（${req?.grade ?? "—"}）`}
        lead={`日時: ${fmtDateTime(session.scheduled_at)} ／ 状態: ${SESSION_STATUS_LABEL[session.status] ?? session.status}`}
      />

      {error ? (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {ERROR_MESSAGE[error] ?? "エラーが発生しました。"}
        </p>
      ) : null}

      {saved && SAVED_MESSAGE[saved] ? (
        <p className="mb-4 rounded-md border border-brand/40 bg-brand-soft p-4 text-sm font-bold text-brand-dark">
          {SAVED_MESSAGE[saved]}
        </p>
      ) : null}

      {session.recording_required ? (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
          このセッションは録画対象です（初回・録画対応校）。開始時に Meet の録画を開始してください。
        </p>
      ) : null}

      <Card>
        <h2 className="text-xs font-bold text-muted">内容</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7">
          {req?.detail ?? "—"}
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="text-xs font-bold text-muted">ビデオ会議</h2>
        {session.meet_url ? (
          <a href={session.meet_url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
            <Button>
              <Icon name="video" className="mr-2 size-4" />
              Meet に参加する
            </Button>
          </a>
        ) : (
          <p className="mt-3 text-sm font-medium text-muted">会議リンクは未設定です。</p>
        )}

        {viewerRole === "teacher" && !isClosed ? (
          <form action={saveMeetUrl} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="sessionId" value={session.id} />
            <label className="min-w-56 flex-1">
              <span className="text-xs font-bold text-muted">Meet のリンク</span>
              <Input
                name="meetUrl"
                type="url"
                defaultValue={session.meet_url ?? ""}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
              />
            </label>
            <Button type="submit" variant="outline">
              保存
            </Button>
          </form>
        ) : null}

        {canOperate && !isClosed ? (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
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
          </div>
        ) : null}
      </Card>

      <div className="mt-4">
        <SessionChat
          sessionId={session.id}
          currentUserId={profile.id}
          initialMessages={messages}
          senderNames={senderNames}
          canPost={canOperate && !isClosed}
        />
      </div>

      <Card className="mt-4">
        <h2 className="text-xs font-bold text-muted">振り返り</h2>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-xs font-bold">教師</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-7">
              {session.teacher_reflection ?? (
                <span className="font-normal text-muted">未入力です。</span>
              )}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold">ボランティア</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-7">
              {session.volunteer_reflection ?? (
                <span className="font-normal text-muted">未入力です。</span>
              )}
            </p>
          </div>
        </div>

        {canReflect ? (
          <form action={saveReflection} className="mt-5 border-t border-line pt-5">
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
            <Button type="submit" className="mt-4">
              振り返りを保存する
            </Button>
          </form>
        ) : null}

        <div className="mt-5 border-t border-line pt-5">
          <h3 className="text-xs font-bold text-muted">AI要約</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-7">
            {session.ai_summary ?? (
              <span className="font-normal text-muted">
                AI要約は未生成です（自動生成は準備中）。
              </span>
            )}
          </p>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-xs font-bold text-muted">録画</h2>
        {session.recording_url ? (
          <a
            href={session.recording_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block"
          >
            <Button variant="outline">録画を見る</Button>
          </a>
        ) : (
          <p className="mt-3 text-sm font-medium leading-7 text-muted">
            {session.recording_required
              ? "録画リンクは未登録です。セッション終了後に教師が登録してください。"
              : "このセッションは録画対象ではありません。"}
          </p>
        )}

        {isTeacher && session.recording_required ? (
          <form action={saveRecordingUrl} className="mt-5 border-t border-line pt-5">
            <input type="hidden" name="sessionId" value={session.id} />
            <Field label="録画リンク" htmlFor="recordingUrl" hint="https:// のURL">
              <Input
                id="recordingUrl"
                name="recordingUrl"
                type="url"
                defaultValue={session.recording_url ?? ""}
                placeholder="https://drive.google.com/..."
              />
            </Field>
            <Button type="submit" className="mt-4">
              録画リンクを保存する
            </Button>
          </form>
        ) : null}
      </Card>

      {isTeacher && session.status === "completed" ? (
        <Card className="mt-4">
          <h2 className="text-xs font-bold text-muted">ボランティアの評価</h2>
          <form action={saveVolunteerReview} className="mt-4 space-y-5">
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
            <Field label="コメント" htmlFor="comment" hint="任意">
              <Textarea
                id="comment"
                name="comment"
                rows={3}
                defaultValue={review?.comment ?? ""}
                placeholder="良かった点や、次回お願いしたいことなど"
              />
            </Field>
            <Button type="submit">{review ? "評価を更新する" : "評価を登録する"}</Button>
          </form>
        </Card>
      ) : null}

      <Card className="mt-4 border-dashed py-10 text-center text-sm font-medium text-muted">
        ホワイトボード（準備中）
      </Card>
    </main>
  );
}
