import { verifyKey } from 'discord.js';

const API_BASE = 'https://discord.com/api/v10';

export const INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

export const INTERACTION_RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
  PREMIUM_REQUIRED: 10,
} as const;

export const COMPONENT_TYPE = {
  ACTION_ROW: 1,
  BUTTON: 2,
  STRING_SELECT: 3,
  TEXT_INPUT: 4,
  USER_SELECT: 5,
  ROLE_SELECT: 6,
  MENTIONABLE_SELECT: 7,
  CHANNEL_SELECT: 8,
} as const;

export const BUTTON_STYLE = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5,
} as const;

export const TEXT_INPUT_STYLE = {
  SHORT: 1,
  PARAGRAPH: 2,
} as const;

export const CHANNEL_TYPE = {
  GUILD_TEXT: 0,
  GUILD_FORUM: 15,
} as const;

function hexToInt(hex: string): number {
  if (!hex) return 0;
  const clean = hex.replace('#', '');
  return parseInt(clean, 16);
}

function getTokenFromStateOrEnv(stateBotToken?: string): string {
  return (process.env.DISCORD_BOT_TOKEN || stateBotToken || '').replace(/•/g, '');
}

function getBotToken(configBotToken?: string): string {
  return getTokenFromStateOrEnv(configBotToken);
}

export interface DiscordRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
  contentType?: string;
  raw?: boolean;
}

export async function discordApi(
  path: string,
  opts: DiscordRequestOptions = {}
): Promise<any> {
  const {
    method = 'GET',
    body,
    token,
    contentType = 'application/json',
    raw = false,
  } = opts;

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bot ${token}`;
  }
  if (body && contentType === 'application/json') {
    headers['Content-Type'] = contentType;
  } else if (contentType) {
    headers['Content-Type'] = contentType;
  }
  headers['User-Agent'] = 'ROOC-Guild-Manager (1.0.0)';

  const url = `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;

  const init: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    init.body = contentType === 'application/json' ? JSON.stringify(body) : (body as any);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = text;
  if (!raw && text && text[0] === '{') {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const err = new Error(`Discord API ${method} ${path} failed: ${res.status} ${res.statusText} — ${text}`);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data;
}

export function verifyDiscordSignature(
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
  publicKey: string
): boolean {
  if (!signature || !timestamp || !publicKey) return false;
  try {
    return verifyKey(rawBody, signature, timestamp, publicKey);
  } catch (e) {
    console.error('Discord signature verification error:', e);
    return false;
  }
}

export function makeEmbed(payload: {
  title?: string;
  description?: string;
  color?: string | number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footerText?: string;
  timestamp?: string | Date;
}): any {
  const colorNum =
    typeof payload.color === 'number'
      ? payload.color
      : typeof payload.color === 'string' && payload.color.startsWith('#')
      ? hexToInt(payload.color)
      : payload.color
      ? (payload.color as any)
      : 0x2ecc71;

  const footer = payload.footerText ? { text: payload.footerText } : undefined;
  const ts = payload.timestamp
    ? typeof payload.timestamp === 'string'
      ? payload.timestamp
      : payload.timestamp.toISOString()
    : new Date().toISOString();

  return {
    title: payload.title,
    description: payload.description,
    color: colorNum,
    fields: payload.fields ?? [],
    footer,
    timestamp: ts,
  };
}

export function makeAttendButtonRow(eventId: string, disabled = false): any[] {
  return [
    {
      type: COMPONENT_TYPE.ACTION_ROW,
      components: [
        {
          type: COMPONENT_TYPE.BUTTON,
          custom_id: `btn_attend_${eventId}`,
          label: 'มาวอร์ ⚔️',
          style: BUTTON_STYLE.SUCCESS,
          disabled,
        },
      ],
    },
  ];
}

export function makeAttendModal(eventId: string): any {
  return {
    custom_id: `modal_attend_${eventId}`,
    title: 'เช็คอินเข้าร่วมกิจกรรมกิลด์',
    components: [
      {
        type: COMPONENT_TYPE.ACTION_ROW,
        components: [
          {
            type: COMPONENT_TYPE.TEXT_INPUT,
            custom_id: 'attend_code',
            label: 'กรอกรหัสเช็คอิน 6 หลักที่โชว์บนหน้าเว็บ',
            style: TEXT_INPUT_STYLE.SHORT,
            placeholder: 'ตัวเลข 6 หลัก เช่น 947510',
            required: true,
            min_length: 6,
            max_length: 6,
          },
        ],
      },
    ],
  };
}

export function disabledActionRows(rows: any[]): any[] {
  return (rows || []).map((row) => {
    if (row && row.type === COMPONENT_TYPE.ACTION_ROW) {
      return {
        ...row,
        components: (row.components || []).map((c: any) => ({ ...c, disabled: true })),
      };
    }
    return row;
  });
}

export async function sendCheckInMessage(params: {
  channelId: string;
  channelType?: number;
  eventId: string;
  embed: any;
  fields?: any[];
  color?: number | string;
  threadName?: string;
  configBotToken?: string;
}): Promise<{ messageId: string; threadId?: string }> {
  const { channelId, channelType, eventId, embed, threadName, configBotToken } = params;
  const token = getBotToken(configBotToken);
  if (!token) throw new Error('Discord bot token is not configured');

  const components = makeAttendButtonRow(eventId);
  const messageBody: any = {
    embeds: [embed],
    components,
  };

  if (channelType === CHANNEL_TYPE.GUILD_FORUM) {
    const createRes: any = await discordApi(`/channels/${channelId}/threads`, {
      method: 'POST',
      token,
      body: {
        name: threadName || `⚔️ กิจกรรมกิลด์วอร์`,
        auto_archive_duration: 1440,
        message: messageBody,
      },
    });
    const threadId: string = createRes.id;
    const messagesRes: any = await discordApi(`/channels/${threadId}/messages?limit=1`, {
      token,
    });
    const msgList: any[] = messagesRes;
    const first = Array.isArray(msgList) ? msgList[0] : undefined;
    return {
      threadId,
      messageId: first?.id || (createRes?.owner_id ? createRes.id : (msgList as any)?.first_message_id || ''),
    };
  }

  const res: any = await discordApi(`/channels/${channelId}/messages`, {
    method: 'POST',
    token,
    body: messageBody,
  });
  return { messageId: res.id as string };
}

export async function disableCompletedMessage(params: {
  channelId?: string;
  messageId?: string;
  threadId?: string;
  configBotToken?: string;
}): Promise<void> {
  const { channelId, messageId, threadId, configBotToken } = params;
  const token = getBotToken(configBotToken);
  if (!token) return;
  if (!messageId) return;

  const targetChannel = threadId || channelId;
  if (!targetChannel) return;

  try {
    const msg: any = await discordApi(`/channels/${targetChannel}/messages/${messageId}`, {
      token,
    });
    const components = disabledActionRows(msg.components || []);
    await discordApi(`/channels/${targetChannel}/messages/${messageId}`, {
      method: 'PATCH',
      token,
      body: { components },
    });
    if (threadId) {
      try {
        await discordApi(`/channels/${threadId}`, {
          method: 'PATCH',
          token,
          body: { archived: true },
        });
      } catch {}
    }
  } catch (err) {
    console.error('Failed to disable buttons on check-in message:', err);
  }
}

export async function createInteractionResponse(
  interactionId: string,
  interactionToken: string,
  responseType: number,
  data?: any
): Promise<void> {
  await discordApi(`/interactions/${interactionId}/${interactionToken}/callback`, {
    method: 'POST',
    body: { type: responseType, data },
  });
}

export async function editOriginalInteractionResponse(
  applicationId: string,
  interactionToken: string,
  data: any
): Promise<any> {
  return await discordApi(`/webhooks/${applicationId}/${interactionToken}/messages/@original`, {
    method: 'PATCH',
    body: data,
  });
}

export interface RegisterCommandOptions {
  name: string;
  description: string;
  options?: Array<{
    type: number;
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export async function registerGuildSlashCommands(
  applicationId: string,
  commands: RegisterCommandOptions[],
  configBotToken?: string,
  guildId?: string
): Promise<any> {
  const token = getBotToken(configBotToken);
  if (!token) throw new Error('Discord bot token is not configured');
  if (!applicationId) throw new Error('Discord Application ID is required');

  const path = guildId
    ? `/applications/${applicationId}/guilds/${guildId}/commands`
    : `/applications/${applicationId}/commands`;

  return await discordApi(path, {
    method: 'PUT',
    token,
    body: commands,
  });
}

export async function followupMessage(
  applicationId: string,
  interactionToken: string,
  data: any
): Promise<any> {
  return await discordApi(`/webhooks/${applicationId}/${interactionToken}`, {
    method: 'POST',
    body: data,
  });
}

export function getTextInputFromModal(components: any[], customId: string): string {
  for (const row of components || []) {
    if (row.type === COMPONENT_TYPE.ACTION_ROW) {
      for (const comp of row.components || []) {
        if (comp && comp.custom_id === customId) {
          return (comp.value ?? '').trim();
        }
      }
    }
  }
  return '';
}
