// Server-only — ne jamais importer depuis un composant client
// Client credentials flow (app-only) → accès aux boîtes partagées M365

const TENANT_ID     = process.env.GRAPH_TENANT_ID!;
const CLIENT_ID     = process.env.GRAPH_CLIENT_ID!;
const CLIENT_SECRET = process.env.GRAPH_CLIENT_SECRET!;

// Token cache par instance serverless (bénéfique sur instances chaudes)
let _cached: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (_cached && Date.now() < _cached.expiresAt - 60_000) return _cached.value;

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope:         "https://graph.microsoft.com/.default",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`[Graph] Token error ${res.status}: ${txt}`);
  }
  const json = await res.json();
  _cached = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return _cached.value;
}

async function gfetch(path: string, opts?: RequestInit): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
    cache: "no-store",
    signal: opts?.signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`[Graph] ${res.status} ${path}: ${txt}`);
  }
  if (res.status === 204 || res.status === 202) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

export type GraphMessage = {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  toRecipients?: { emailAddress: { name: string; address: string } }[];
  ccRecipients?: { emailAddress: { name: string; address: string } }[];
  replyTo?: { emailAddress: { name: string; address: string } }[];
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  body?: { contentType: "HTML" | "Text"; content: string };
  hasAttachments: boolean;
  importance: "normal" | "high" | "low";
};

type MessagesPage = { value: GraphMessage[]; "@odata.nextLink"?: string };

export async function listMessages(
  mailbox: string,
  folder = "inbox",
  top = 30,
  skip = 0,
): Promise<MessagesPage> {
  const sel = "id,subject,from,receivedDateTime,isRead,bodyPreview,hasAttachments,importance";
  return gfetch(
    `/users/${enc(mailbox)}/mailFolders/${folder}/messages` +
    `?$top=${top}&$skip=${skip}&$select=${sel}&$orderby=receivedDateTime desc`,
  ) as Promise<MessagesPage>;
}

export async function getMessage(mailbox: string, msgId: string): Promise<GraphMessage> {
  const sel = "id,subject,from,toRecipients,ccRecipients,replyTo,receivedDateTime,isRead,body,hasAttachments,importance";
  return gfetch(`/users/${enc(mailbox)}/messages/${msgId}?$select=${sel}`) as Promise<GraphMessage>;
}

export async function markAsRead(mailbox: string, msgId: string): Promise<void> {
  await gfetch(`/users/${enc(mailbox)}/messages/${msgId}`, {
    method: "PATCH",
    body: JSON.stringify({ isRead: true }),
  });
}

export async function replyToMessage(
  mailbox: string,
  msgId: string,
  comment: string,
  toRecipients?: { emailAddress: { address: string; name?: string } }[],
): Promise<void> {
  const payload: Record<string, unknown> = { comment };
  if (toRecipients && toRecipients.length > 0) {
    payload.message = { toRecipients };
  }
  await gfetch(`/users/${enc(mailbox)}/messages/${msgId}/reply`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function forwardMessage(
  mailbox: string,
  msgId: string,
  toAddresses: string[],
  comment: string,
): Promise<void> {
  await gfetch(`/users/${enc(mailbox)}/messages/${msgId}/forward`, {
    method: "POST",
    body: JSON.stringify({
      comment,
      toRecipients: toAddresses.map(a => ({ emailAddress: { address: a } })),
    }),
  });
}

export async function sendMail(opts: {
  from: string;
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  replyTo?: string;
}): Promise<void> {
  const message: Record<string, unknown> = {
    subject: opts.subject,
    body: { contentType: opts.isHtml ? "HTML" : "Text", content: opts.body },
    toRecipients: [{ emailAddress: { address: opts.to } }],
  };
  if (opts.replyTo) {
    message.replyTo = [{ emailAddress: { address: opts.replyTo } }];
  }
  await gfetch(`/users/${enc(opts.from)}/sendMail`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

function enc(s: string) { return encodeURIComponent(s); }
