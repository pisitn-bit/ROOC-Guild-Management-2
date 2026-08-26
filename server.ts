import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { GuildState, Member, DEFAULT_JOB_CLASSES, HistoryLog } from "./src/types.js";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  InteractionType,
  ChannelType
} from 'discord.js';

// Setup state filepath
const STATE_FILE = path.join(process.cwd(), "guild_state.json");

let discordClient: Client | null = null;

async function initDiscordBot(token: string, guildId: string) {
  if (discordClient) {
    try {
      console.log("Destroying previous Discord client...");
      discordClient.destroy();
    } catch (e) {
      console.error("Error destroying previous Discord client:", e);
    }
    discordClient = null;
  }

  if (!token || token === "••••••••" || !guildId) {
    console.log("Discord bot token or guild ID not configured. Skipping bot client startup.");
    return;
  }

  console.log("Initializing Discord Bot Client...");
  discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  discordClient.on('ready', () => {
    console.log(`Discord Bot logged in successfully as: ${discordClient?.user?.tag}`);
  });

  discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const cleanContent = message.content.trim();
    if (cleanContent.startsWith('/check ')) {
      const code = cleanContent.substring(7).trim();
      if (!code || code.length !== 6 || isNaN(Number(code))) {
        await message.reply("❌ รหัสเช็คอินต้องเป็นตัวเลข 6 หลัก เช่น `/check 556189`").catch(console.error);
        return;
      }

      try {
        const currentState = await loadStateFromFirestore();
        const activeEvent = (currentState.events || []).find(e => e.status === 'active');

        if (!activeEvent) {
          await message.reply("❌ ขณะนี้ไม่มีกิจกรรมกิลด์วอร์ที่กำลังเปิดเช็คอินอยู่").catch(console.error);
          return;
        }

        if (activeEvent.checkInCode !== code) {
          await message.reply("❌ รหัสเช็คอินไม่ถูกต้อง กรุณาตรวจสอบรหัสอีกครั้ง").catch(console.error);
          return;
        }

        const discordId = message.author.id;
        const member = (currentState.members || []).find(m => m.discordId === discordId);

        if (!member) {
          await message.reply("❌ ไม่พบรายชื่อ Discord ของท่านผูกกับตัวละครใดๆ ในระบบกิลด์ กรุณาแจ้งหัวหน้ากิลด์เพื่อซิงค์ข้อมูล").catch(console.error);
          return;
        }

        if (!activeEvent.participants.includes(member.id)) {
          activeEvent.participants.push(member.id);
          currentState.events = currentState.events.map(e => e.id === activeEvent.id ? activeEvent : e);
          await saveStateToFirestore(currentState);
          await message.reply(`✅ **${member.name}** เข้าร่วมกิจกรรม **${activeEvent.title}** เรียบร้อยแล้ว! (เข้าร่วมผ่านโค้ดแชท)`).catch(console.error);
        } else {
          await message.reply(`ℹ️ **${member.name}** ได้ลงทะเบียนเข้าร่วมกิจกรรมนี้อยู่แล้ว`).catch(console.error);
        }
      } catch (e: any) {
        console.error("Error processing message checkin:", e);
        await message.reply("❌ เกิดข้อผิดพลาดในการประมวลผลคำขอ").catch(console.error);
      }
    }
  });

  discordClient.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith('btn_attend_') || customId.startsWith('btn_excuse_')) {
        const eventId = customId.split('_')[2];
        const action = customId.split('_')[1];

        try {
          if (action === 'attend') {
            // Show attend code verification modal INSTANTLY
            const modal = new ModalBuilder()
              .setCustomId(`modal_attend_${eventId}`)
              .setTitle('เช็คอินเข้าร่วมกิจกรรมกิลด์');

            const codeInput = new TextInputBuilder()
              .setCustomId('attend_code')
              .setLabel('กรอกรหัสเช็คอิน 6 หลักที่โชว์บนหน้าเว็บ')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('ตัวเลข 6 หลัก เช่น 947510')
              .setRequired(true)
              .setMinLength(6)
              .setMaxLength(6);

            const row = new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput);
            modal.addComponents(row);

            await interaction.showModal(modal).catch(console.error);
          }
        } catch (e: any) {
          console.error("Button interaction error:", e);
          await interaction.reply({ content: "❌ เกิดข้อผิดพลาดในการเปิดหน้าต่างลงทะเบียน", ephemeral: true }).catch(console.error);
        }
      }
    } else if (interaction.type === InteractionType.ModalSubmit) {
      const customId = interaction.customId;
      if (customId.startsWith('modal_attend_')) {
        const eventId = customId.split('_')[2];
        const submittedCode = interaction.fields.getTextInputValue('attend_code').trim();

        // Defer response to handle Firestore network latency safely
        await interaction.deferReply({ ephemeral: true }).catch(console.error);

        try {
          const currentState = await loadStateFromFirestore();
          const event = (currentState.events || []).find(e => e.id === eventId);

          if (!event || event.status !== 'active') {
            await interaction.editReply({ content: "❌ กิจกรรมนี้สิ้นสุดแล้ว หรือไม่พบกิจกรรมในระบบ" }).catch(console.error);
            return;
          }

          if (event.checkInCode !== submittedCode) {
            await interaction.editReply({ content: "❌ รหัสเช็คอินไม่ถูกต้อง กรุณาตรวจสอบและกรอกรหัสใหม่อีกครั้ง" }).catch(console.error);
            return;
          }

          const discordId = interaction.user.id;
          const member = (currentState.members || []).find(m => m.discordId === discordId);

          if (!member) {
            await interaction.editReply({ content: "❌ ไม่พบรายชื่อ Discord ของท่านในระบบกิลด์ กรุณาแจ้งแอดมินเพื่อซิงค์ข้อมูลในหน้าจัดการ Member" }).catch(console.error);
            return;
          }

          if (!event.participants.includes(member.id)) {
            event.participants.push(member.id);
            event.member_array = event.participants;

            currentState.events = currentState.events.map(e => e.id === event.id ? event : e);
            await saveStateToFirestore(currentState);

            await interaction.editReply({ content: `✅ ยืนยันรหัสเช็คอินถูกต้อง! ลงทะเบียนเข้าร่วมกิจกรรม **${event.title}** สำเร็จ (เข้าเป็น: ${member.name})` }).catch(console.error);
          } else {
            await interaction.editReply({ content: `ℹ️ ตัวละคร **${member.name}** ได้ลงทะเบียนเข้าร่วมกิจกรรมนี้อยู่แล้ว` }).catch(console.error);
          }
        } catch (e: any) {
          console.error("Attend modal submission error:", e);
          await interaction.editReply({ content: "❌ เกิดข้อผิดพลาดในการตรวจสอบรหัสเช็คอิน" }).catch(console.error);
        }
      }
    }
  });

  try {
    await discordClient.login(token);
  } catch (err) {
    console.error("Failed to login to Discord bot client:", err);
  }
}

// Helper to seed initial data
const getInitialState = (): GuildState => {
  return {
    members: [
      { id: "1", name: "มหาเทพพริ้ง", del_flag: true },
      { id: "2", name: "บอสใหญ่ใจดี", del_flag: true },
      { id: "3", name: "ZenyCollector", del_flag: true },
      { id: "4", name: "SniperNo1", del_flag: true },
      { id: "5", name: "HealMePls", del_flag: true },
      { id: "6", name: "AssassinCross", del_flag: true },
      { id: "7", name: "LordKnight", del_flag: true },
      { id: "8", name: "HighPriest", del_flag: true },
    ],
    masterItems: [
      { id: "mi-1", name: "ขนนกขาว (White Feather)", itemType: "material" },
      { id: "mi-2", name: "ขนนกแดงดำ (Red-Black Feather)", itemType: "material" },
      { id: "mi-3", name: "เศษสมุด (Book Shard)", itemType: "material" },
      { id: "mi-4", name: "Puppet Card", itemType: "card" },
    ],
    events: [
      {
        id: "ev-1",
        title: "Guild League ประจำวันที่ 16/07/2026",
        type: "league",
        date: "2026-07-16",
        participants: ["1", "2", "3", "4", "5"],
        status: "active",
        drops: [
          {
            id: "dr-1",
            itemName: "ขนนกขาว (White Feather)",
            quantity: 3,
            assignedToMemberId: null,
            assignedToMemberName: null,
            bidAmount: 0
          },
          {
            id: "dr-2",
            itemName: "เศษสมุด (Book Shard)",
            quantity: 2,
            assignedToMemberId: null,
            assignedToMemberName: null,
            bidAmount: 0
          }
        ]
      },
      {
        id: "ev-2",
        title: "OverRun ประจำวันที่ 15/07/2026",
        type: "overrun",
        date: "2026-07-15",
        participants: ["2", "4", "6", "7", "8"],
        status: "completed",
        drops: [
          {
            id: "dr-3",
            itemName: "ขนนกแดงดำ (Red-Black Feather)",
            quantity: 2,
            assignedToMemberId: "2",
            assignedToMemberName: "บอสใหญ่ใจดี",
            bidAmount: 4500
          },
          {
            id: "dr-4",
            itemName: "Puppet Card",
            quantity: 1,
            assignedToMemberId: "4",
            assignedToMemberName: "SniperNo1",
            bidAmount: 12000
          }
        ]
      }
    ],
    rafflePrizes: [
      { id: "p-1", name: "Oridecon Box", quantity: 5 },
      { id: "p-2", name: "Elunium Box", quantity: 5 },
    ],
    raffleResults: [
      { id: "r-1", prizeName: "Oridecon Box", winnerName: "AssassinCross", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), itemType: "material" },
    ],
    discordConfig: {
      webhookUrl: "",
      botName: "บอทกิลด์ RO Classic",
      enabled: false,
    },
    systemPIN: "ro-classic-1234",
    adminPIN: "ro-admin-5678",
    guildGuidelines: "1. เข้าร่วมกิลด์วอทุกวันอังคารและเสาร์ เวลา 20.00 - 22.00 น. กรุณามาสแตนด์บายก่อนเวลา 15 นาที\n2. ลงทะเบียนเข้าร่วมกิจกรรมหรือแจ้งลาล่วงหน้าในระบบทุกครั้งก่อนกิจกรรมเริ่ม 1 ชั่วโมง\n3. การจัดสรรไอเทมดรอปจะใช้ระบบคิววนรอบ (Cycle Allocation) และแต้มสงครามเพื่อความโปร่งใสและเป็นธรรมที่สุด\n4. ห้ามลักลอบหรือแอบดีลไอเทมกิจกรรมโดยไม่ผ่านการจัดสรรจากผู้ดูแลระบบ\n5. สมาชิกทุกคนต้องมีส่วนร่วมในการช่วยเหลือเพื่อนร่วมกิลด์ และร่วมกิจกรรมต่าง ๆ ด้วยความเคารพซึ่งกันและกัน",
    lastUpdated: new Date().toISOString(),
    historyLogs: []
  };
};

// Initialize Firebase Admin
const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), "firebase-service-account.json");
let db: any = null;

try {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully using process.env.FIREBASE_SERVICE_ACCOUNT.");
    } else if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, "utf-8"));
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully using service account file.");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT) {
      // If running in Google Cloud or environment with default credentials
      initializeApp({
        projectId: "rooc-guild-management-c360c"
      });
      console.log("Firebase Admin initialized with project ID: rooc-guild-management-c360c");
    } else {
      console.warn("⚠️ [Warning]: Firebase service account not found in env or file. Firestore is disabled; falling back to local file storage.");
    }
  }

  if (getApps().length > 0) {
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

function sanitizeEventForFirestore(event: any): any {
  if (!event) return event;
  const clean: any = {
    id: event.id,
    event_name: event.event_name || event.title || "",
    event_date: event.event_date || event.date || new Date().toISOString().split('T')[0],
    member_array: event.member_array || event.participants || [],
    item_id: event.item_id || "",
    item_Qty: event.item_Qty || 0,
    details: event.details || "",
    del_flag: event.del_flag ?? (event.status === 'completed' ? false : true),
  };

  // Keep Discord Bot integration fields that are saved in the document
  if (event.checkInCode !== undefined) clean.checkInCode = event.checkInCode;
  if (event.checkInMessageId !== undefined) clean.checkInMessageId = event.checkInMessageId;
  if (event.checkInThreadId !== undefined) clean.checkInThreadId = event.checkInThreadId;
  if (event.status !== undefined) clean.status = event.status;
  if (event.type !== undefined) clean.type = event.type;
  if (event.drops !== undefined) clean.drops = event.drops;
  if (event.excuses !== undefined) clean.excuses = event.excuses;
  if (event.completedAt !== undefined) clean.completedAt = event.completedAt;
  if (event.participantClasses !== undefined) clean.participantClasses = event.participantClasses;

  return clean;
}

function mapEventFromFirestore(docData: any): any {
  if (!docData) return docData;
  return {
    ...docData,
    title: docData.title || docData.event_name || "",
    date: docData.date || docData.event_date || "",
    participants: docData.participants || docData.member_array || [],
    member_array: docData.member_array || docData.participants || [],
    event_name: docData.event_name || docData.title || "",
    event_date: docData.event_date || docData.date || "",
    item_id: docData.item_id || "",
    item_Qty: docData.item_Qty || 0,
    details: docData.details || "",
    del_flag: docData.del_flag ?? (docData.status === 'completed' ? false : true),
  };
}

// Global state variable
let state: GuildState;

function loadLocalState(): GuildState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      const localState = JSON.parse(raw);
      if (!localState.adminPIN) {
        localState.adminPIN = "ro-admin-5678";
      }
      if (localState.guildGuidelines === undefined) {
        localState.guildGuidelines = "1. เข้าร่วมกิลด์วอทุกวันอังคารและเสาร์ เวลา 20.00 - 22.00 น. กรุณามาสแตนด์บายก่อนเวลา 15 นาที\n2. ลงทะเบียนเข้าร่วมกิจกรรมหรือแจ้งลาล่วงหน้าในระบบทุกครั้งก่อนกิจกรรมเริ่ม 1 ชั่วโมง\n3. การจัดสรรไอเทมดรอปจะใช้ระบบคิววนรอบ (Cycle Allocation) และแต้มสงครามเพื่อความโปร่งใสและเป็นธรรมที่สุด\n4. ห้ามลักลอบหรือแอบดีลไอเทมกิจกรรมโดยไม่ผ่านการจัดสรรจากผู้ดูแลระบบ\n5. สมาชิกทุกคนต้องมีส่วนร่วมในการช่วยเหลือเพื่อนร่วมกิลด์ และร่วมกิจกรรมต่าง ๆ ด้วยความเคารพซึ่งกันและกัน";
      }
      if (!localState.jobClasses) {
        localState.jobClasses = DEFAULT_JOB_CLASSES;
      }
      if (!localState.historyLogs) {
        localState.historyLogs = [];
      }
      return localState;
    }
  } catch (e) {
    console.error("Error reading local state file:", e);
  }
  return getInitialState();
}

// Load state from Firestore or local fallback
async function loadStateFromFirestore(): Promise<GuildState> {
  if (db) {
    try {
      // Load members
      const membersSnap = await db.collection("members").get();
      const members = membersSnap.docs.map((doc: any) => doc.data() as Member);

      // If no members are found in Firestore, we seed from local JSON
      if (members.length === 0) {
        console.log("Firestore members collection is empty, seeding collections from local JSON...");
        state = loadLocalState();
        await saveStateToFirestore(state);
        return state;
      }

      const settingsDoc = await db.collection("config").doc("settings").get();
      const settingsData = settingsDoc.exists ? settingsDoc.data() : {};
      
      // Load masterItems
      const itemsSnap = await db.collection("masterItems").get();
      const masterItems = itemsSnap.docs.map((doc: any) => doc.data());
      
      // Load events
      const eventsSnap = await db.collection("events").get();
      const events = eventsSnap.docs.map((doc: any) => mapEventFromFirestore(doc.data()));
      
      // Load rafflePrizes
      const prizesSnap = await db.collection("rafflePrizes").get();
      const rafflePrizes = prizesSnap.docs.map((doc: any) => doc.data());
      
      // Load raffleResults
      const resultsSnap = await db.collection("raffleResults").get();
      const raffleResults = resultsSnap.docs.map((doc: any) => doc.data());

      // Load historyLogs
      const historyLogsSnap = await db.collection("historyLogs").get();
      const historyLogs = historyLogsSnap.docs.map((doc: any) => doc.data() as HistoryLog);

      state = {
        members,
        masterItems,
        events,
        rafflePrizes,
        raffleResults,
        historyLogs,
        discordConfig: settingsData.discordConfig || { webhookUrl: "", botName: "บอทกิลด์ RO Classic", enabled: false },
        systemPIN: settingsData.systemPIN || "ro-classic-1234",
        adminPIN: settingsData.adminPIN || "ro-admin-5678",
        guildGuidelines: settingsData.guildGuidelines || "",
        guildName: settingsData.guildName || "",
        lastUpdated: settingsData.lastUpdated || new Date().toISOString()
      };

      console.log("Loaded state from Firestore collections successfully.");
      return state;
    } catch (e) {
      console.error("Error reading from Firestore collections, falling back to local file:", e);
    }
  }
  state = loadLocalState();
  return state;
}

// Save state to Firestore and backup to local file
async function saveStateToFirestore(newState: GuildState) {
  newState.lastUpdated = new Date().toISOString();

  // Synchronize new migration field names in state events
  if (newState.events) {
    newState.events = newState.events.map(event => {
      event.event_name = event.event_name || event.title;
      event.title = event.title || event.event_name;
      event.event_date = event.event_date || event.date;
      event.date = event.date || event.event_date;
      event.member_array = event.member_array || event.participants;
      event.participants = event.participants || event.member_array;
      if (event.del_flag === undefined) {
        event.del_flag = event.status !== 'completed';
      }
      return event;
    });
  }
  
  // Check if we need to disable buttons on any completed check-in messages
  for (const event of (newState.events || [])) {
    if (event.status === 'completed' && event.checkInMessageId && newState.discordConfig?.checkInChannelId && discordClient) {
      try {
        let targetChannel: any = null;
        if (event.checkInThreadId) {
          targetChannel = await discordClient.channels.fetch(event.checkInThreadId).catch(() => null);
        } else {
          targetChannel = await discordClient.channels.fetch(newState.discordConfig.checkInChannelId).catch(() => null);
        }

        if (targetChannel && targetChannel.isTextBased()) {
          const msg = await targetChannel.messages.fetch(event.checkInMessageId).catch(() => null);
          if (msg && msg.components && msg.components.length > 0) {
            const updatedRow = ActionRowBuilder.from(msg.components[0] as any);
            updatedRow.components.forEach((c: any) => c.setDisabled(true));
            await msg.edit({ components: [updatedRow as any] }).catch(console.error);
            
            // If it is a thread, we also archive it to tidy up the forum
            if (targetChannel.isThread && targetChannel.isThread()) {
              await targetChannel.setArchived(true).catch(console.error);
            }
            
            event.checkInMessageId = undefined; // Clear so we don't fetch again
            event.checkInThreadId = undefined;
          }
        }
      } catch (err) {
        console.error("Failed to disable completed check-in buttons:", err);
      }
    }
  }

  state = newState;
  
  // Try saving to Firestore
  if (db) {
    try {
      const batch = db.batch();

      // 1. Sync members
      const existingMembersSnap = await db.collection("members").get();
      const existingMemberIds = existingMembersSnap.docs.map((doc: any) => doc.id);
      const newMemberIds = newState.members.map(m => m.id);
      for (const id of existingMemberIds) {
        if (!newMemberIds.includes(id)) {
          batch.delete(db.collection("members").doc(id));
        }
      }
      for (const member of newState.members) {
        if (member.del_flag === undefined) {
          member.del_flag = true;
        }
        batch.set(db.collection("members").doc(member.id), member);
      }

      // 2. Sync masterItems
      const existingItemsSnap = await db.collection("masterItems").get();
      const existingItemIds = existingItemsSnap.docs.map((doc: any) => doc.id);
      const newItemIds = (newState.masterItems || []).map(item => item.id);
      for (const id of existingItemIds) {
        if (!newItemIds.includes(id)) {
          batch.delete(db.collection("masterItems").doc(id));
        }
      }
      for (const item of (newState.masterItems || [])) {
        if (item.del_flag === undefined) {
          item.del_flag = true;
        }
        batch.set(db.collection("masterItems").doc(item.id), item);
      }

      // 3. Sync events
      const existingEventsSnap = await db.collection("events").get();
      const existingEventIds = existingEventsSnap.docs.map((doc: any) => doc.id);
      const newEventIds = (newState.events || []).map(e => e.id);
      for (const id of existingEventIds) {
        if (!newEventIds.includes(id)) {
          batch.delete(db.collection("events").doc(id));
        }
      }
      for (const event of (newState.events || [])) {
        batch.set(db.collection("events").doc(event.id), sanitizeEventForFirestore(event));
      }

      // 4. Sync rafflePrizes
      const existingPrizesSnap = await db.collection("rafflePrizes").get();
      const existingPrizeIds = existingPrizesSnap.docs.map((doc: any) => doc.id);
      const newPrizeIds = (newState.rafflePrizes || []).map(p => p.id);
      for (const id of existingPrizeIds) {
        if (!newPrizeIds.includes(id)) {
          batch.delete(db.collection("rafflePrizes").doc(id));
        }
      }
      for (const prize of (newState.rafflePrizes || [])) {
        batch.set(db.collection("rafflePrizes").doc(prize.id), prize);
      }

      // 5. Sync raffleResults
      const existingResultsSnap = await db.collection("raffleResults").get();
      const existingResultIds = existingResultsSnap.docs.map((doc: any) => doc.id);
      const newResultIds = (newState.raffleResults || []).map(r => r.id);
      for (const id of existingResultIds) {
        if (!newResultIds.includes(id)) {
          batch.delete(db.collection("raffleResults").doc(id));
        }
      }
      for (const result of (newState.raffleResults || [])) {
        batch.set(db.collection("raffleResults").doc(result.id), result);
      }

      // 5.5. Sync historyLogs
      const existingHistorySnap = await db.collection("historyLogs").get();
      const existingHistoryIds = existingHistorySnap.docs.map((doc: any) => doc.id);
      const newHistoryIds = (newState.historyLogs || []).map(h => h.id);
      for (const id of existingHistoryIds) {
        if (!newHistoryIds.includes(id)) {
          batch.delete(db.collection("historyLogs").doc(id));
        }
      }
      for (const history of (newState.historyLogs || [])) {
        batch.set(db.collection("historyLogs").doc(history.id), history);
      }

      // 6. Settings doc
      const settingsDocRef = db.collection("config").doc("settings");
      batch.set(settingsDocRef, {
        discordConfig: newState.discordConfig || { webhookUrl: "", botName: "บอทกิลด์ RO Classic", enabled: false },
        systemPIN: newState.systemPIN || "ro-classic-1234",
        adminPIN: newState.adminPIN || "ro-admin-5678",
        guildGuidelines: newState.guildGuidelines || "",
        guildName: newState.guildName || "",
        lastUpdated: newState.lastUpdated
      });

      await batch.commit();
      console.log("Saved state to Firestore collections successfully.");
    } catch (e) {
      console.error("Failed to save state to Firestore collections:", e);
    }
  }

  // Always backup locally
  saveLocalBackup();
}

function saveLocalBackup() {
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write local backup state file:", e);
  }
}

const app = express();

// Lazy database state initialization (essential for Serverless environment like Vercel)
let initPromise: Promise<GuildState> | null = null;
app.use(async (req, res, next) => {
  if (!initPromise) {
    initPromise = loadStateFromFirestore().catch((err) => {
      console.error("Database state initialization failed:", err);
      initPromise = null; // Reset to allow retry on next request
      throw err;
    });
  }
  try {
    await initPromise;
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: "Database initialization failed",
      message: err?.message || String(err),
      stack: err?.stack
    });
  }
  next();
});

// Middleware
app.use(express.json());

  // API 1: Get complete state
  app.get("/api/state", async (req, res) => {
    try {
      const currentState = await loadStateFromFirestore();
      const sanitizedState = {
        ...currentState,
        discordConfig: {
          ...(currentState.discordConfig || {}),
          botToken: currentState.discordConfig?.botToken ? "••••••••" : ""
        }
      };
      res.json(sanitizedState);
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: "Failed to load state" });
    }
  });

  // API 2: Update complete state
  app.post("/api/state", async (req, res) => {
    try {
      const incoming = req.body as GuildState;
      if (incoming && typeof incoming === "object") {
        const currentState = await loadStateFromFirestore();
        
        // Handle botToken preservation if masked
        let incomingBotToken = incoming.discordConfig?.botToken;
        if (incomingBotToken === "••••••••") {
          incomingBotToken = currentState.discordConfig?.botToken || "";
        }
        
        const updatedState: GuildState = {
          ...currentState,
          ...incoming,
          historyLogs: incoming.historyLogs ?? currentState.historyLogs ?? [],
          discordConfig: {
            webhookUrl: incoming.discordConfig?.webhookUrl ?? currentState.discordConfig?.webhookUrl ?? "",
            botName: incoming.discordConfig?.botName ?? currentState.discordConfig?.botName ?? "บอทกิลด์ RO Classic",
            enabled: incoming.discordConfig?.enabled ?? currentState.discordConfig?.enabled ?? false,
            webhookUrlLeaves: incoming.discordConfig?.webhookUrlLeaves ?? currentState.discordConfig?.webhookUrlLeaves,
            webhookUrlEvents: incoming.discordConfig?.webhookUrlEvents ?? currentState.discordConfig?.webhookUrlEvents,
            webhookUrlRaffles: incoming.discordConfig?.webhookUrlRaffles ?? currentState.discordConfig?.webhookUrlRaffles,
            guildId: incoming.discordConfig?.guildId ?? currentState.discordConfig?.guildId,
            autoSync: incoming.discordConfig?.autoSync ?? currentState.discordConfig?.autoSync,
            lastSyncTime: incoming.discordConfig?.lastSyncTime ?? currentState.discordConfig?.lastSyncTime,
            checkInChannelId: incoming.discordConfig?.checkInChannelId ?? currentState.discordConfig?.checkInChannelId,
            botToken: incomingBotToken
          }
        };
        await saveStateToFirestore(updatedState);
        
        // Re-initialize bot client if token or guild changed
        if (incomingBotToken && updatedState.discordConfig?.guildId) {
          const tokenChanged = incomingBotToken !== currentState.discordConfig?.botToken;
          const guildChanged = updatedState.discordConfig.guildId !== currentState.discordConfig?.guildId;
          if (tokenChanged || guildChanged) {
            initDiscordBot(incomingBotToken, updatedState.discordConfig.guildId);
          }
        }
        
        const sanitizedState: GuildState = {
          ...updatedState,
          discordConfig: {
            ...updatedState.discordConfig,
            botToken: updatedState.discordConfig?.botToken ? "••••••••" : ""
          }
        };
        return res.json({ success: true, message: "State updated successfully", state: sanitizedState });
      }
      return res.status(400).json({ success: false, message: "Invalid payload format" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // --- CRUD API for Members ---
  app.get("/api/members", async (req, res) => {
    if (!db) return res.json(state.members || []);
    try {
      const snap = await db.collection("members").get();
      const members = snap.docs.map((doc: any) => doc.data() as Member);
      res.json(members);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/members", async (req, res) => {
    const member = req.body as Member;
    if (!member || !member.id) return res.status(400).json({ error: "Invalid member data" });
    state.members = (state.members || []).filter(m => m.id !== member.id);
    state.members.push(member);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("members").doc(member.id).set(member);
        return res.json({ success: true, member });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save member" });
      }
    }
    res.json({ success: true, member });
  });

  app.put("/api/members/:id", async (req, res) => {
    const { id } = req.params;
    const member = req.body as Member;
    if (!member) return res.status(400).json({ error: "Invalid member data" });
    member.id = id;
    state.members = (state.members || []).map(m => m.id === id ? member : m);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("members").doc(id).set(member, { merge: true });
        return res.json({ success: true, member });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update member" });
      }
    }
    res.json({ success: true, member });
  });

  app.delete("/api/members/:id", async (req, res) => {
    const { id } = req.params;
    state.members = (state.members || []).filter(m => m.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("members").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete member" });
      }
    }
    res.json({ success: true });
  });

  // --- CRUD API for MasterItems ---
  app.get("/api/masterItems", async (req, res) => {
    if (!db) return res.json(state.masterItems || []);
    try {
      const snap = await db.collection("masterItems").get();
      const items = snap.docs.map((doc: any) => doc.data());
      res.json(items);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch masterItems" });
    }
  });

  app.post("/api/masterItems", async (req, res) => {
    const item = req.body;
    if (!item || !item.id) return res.status(400).json({ error: "Invalid item data" });
    state.masterItems = (state.masterItems || []).filter(i => i.id !== item.id);
    state.masterItems.push(item);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("masterItems").doc(item.id).set(item);
        return res.json({ success: true, item });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save item" });
      }
    }
    res.json({ success: true, item });
  });

  app.put("/api/masterItems/:id", async (req, res) => {
    const { id } = req.params;
    const item = req.body;
    if (!item) return res.status(400).json({ error: "Invalid item data" });
    item.id = id;
    state.masterItems = (state.masterItems || []).map(i => i.id === id ? item : i);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("masterItems").doc(id).set(item, { merge: true });
        return res.json({ success: true, item });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update item" });
      }
    }
    res.json({ success: true, item });
  });

  app.delete("/api/masterItems/:id", async (req, res) => {
    const { id } = req.params;
    state.masterItems = (state.masterItems || []).filter(i => i.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("masterItems").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete item" });
      }
    }
    res.json({ success: true });
  });

  // --- CRUD API for Events ---
  app.get("/api/events", async (req, res) => {
    if (!db) return res.json(state.events || []);
    try {
      const snap = await db.collection("events").get();
      const events = snap.docs.map((doc: any) => mapEventFromFirestore(doc.data()));
      res.json(events);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", async (req, res) => {
    const event = req.body;
    if (!event || !event.id) return res.status(400).json({ error: "Invalid event data" });
    state.events = (state.events || []).filter(e => e.id !== event.id);
    state.events.push(event);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("events").doc(event.id).set(sanitizeEventForFirestore(event));
        return res.json({ success: true, event });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save event" });
      }
    }
    res.json({ success: true, event });
  });

  app.put("/api/events/:id", async (req, res) => {
    const { id } = req.params;
    const event = req.body;
    if (!event) return res.status(400).json({ error: "Invalid event data" });
    event.id = id;
    state.events = (state.events || []).map(e => e.id === id ? event : e);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("events").doc(id).set(sanitizeEventForFirestore(event), { merge: true });
        return res.json({ success: true, event });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update event" });
      }
    }
    res.json({ success: true, event });
  });

  app.delete("/api/events/:id", async (req, res) => {
    const { id } = req.params;
    state.events = (state.events || []).filter(e => e.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("events").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete event" });
      }
    }
    res.json({ success: true });
  });

  // --- CRUD API for HistoryLogs (Migration support) ---
  app.get("/api/historyLogs", async (req, res) => {
    if (!db) return res.json(state.historyLogs || []);
    try {
      const snap = await db.collection("historyLogs").get();
      const logs = snap.docs.map((doc: any) => doc.data() as HistoryLog);
      res.json(logs);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch history logs" });
    }
  });

  app.post("/api/historyLogs", async (req, res) => {
    const log = req.body as HistoryLog;
    if (!log || !log.id) return res.status(400).json({ error: "Invalid log data" });
    state.historyLogs = (state.historyLogs || []).filter(l => l.id !== log.id);
    state.historyLogs.push(log);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("historyLogs").doc(log.id).set(log);
        return res.json({ success: true, log });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save log" });
      }
    }
    res.json({ success: true, log });
  });

  app.put("/api/historyLogs/:id", async (req, res) => {
    const { id } = req.params;
    const log = req.body as HistoryLog;
    if (!log) return res.status(400).json({ error: "Invalid log data" });
    log.id = id;
    state.historyLogs = (state.historyLogs || []).map(l => l.id === id ? log : l);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("historyLogs").doc(id).set(log, { merge: true });
        return res.json({ success: true, log });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update log" });
      }
    }
    res.json({ success: true, log });
  });

  app.delete("/api/historyLogs/:id", async (req, res) => {
    const { id } = req.params;
    state.historyLogs = (state.historyLogs || []).filter(l => l.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("historyLogs").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete log" });
      }
    }
    res.json({ success: true });
  });

  // --- CRUD API for RafflePrizes ---
  app.get("/api/rafflePrizes", async (req, res) => {
    if (!db) return res.json(state.rafflePrizes || []);
    try {
      const snap = await db.collection("rafflePrizes").get();
      const prizes = snap.docs.map((doc: any) => doc.data());
      res.json(prizes);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch rafflePrizes" });
    }
  });

  app.post("/api/rafflePrizes", async (req, res) => {
    const prize = req.body;
    if (!prize || !prize.id) return res.status(400).json({ error: "Invalid prize data" });
    state.rafflePrizes = (state.rafflePrizes || []).filter(p => p.id !== prize.id);
    state.rafflePrizes.push(prize);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("rafflePrizes").doc(prize.id).set(prize);
        return res.json({ success: true, prize });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save prize" });
      }
    }
    res.json({ success: true, prize });
  });

  app.put("/api/rafflePrizes/:id", async (req, res) => {
    const { id } = req.params;
    const prize = req.body;
    if (!prize) return res.status(400).json({ error: "Invalid prize data" });
    prize.id = id;
    state.rafflePrizes = (state.rafflePrizes || []).map(p => p.id === id ? prize : p);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("rafflePrizes").doc(id).set(prize, { merge: true });
        return res.json({ success: true, prize });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update prize" });
      }
    }
    res.json({ success: true, prize });
  });

  app.delete("/api/rafflePrizes/:id", async (req, res) => {
    const { id } = req.params;
    state.rafflePrizes = (state.rafflePrizes || []).filter(p => p.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("rafflePrizes").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete prize" });
      }
    }
    res.json({ success: true });
  });

  // --- CRUD API for RaffleResults ---
  app.get("/api/raffleResults", async (req, res) => {
    if (!db) return res.json(state.raffleResults || []);
    try {
      const snap = await db.collection("raffleResults").get();
      const results = snap.docs.map((doc: any) => doc.data());
      res.json(results);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch raffleResults" });
    }
  });

  app.post("/api/raffleResults", async (req, res) => {
    const result = req.body;
    if (!result || !result.id) return res.status(400).json({ error: "Invalid result data" });
    state.raffleResults = (state.raffleResults || []).filter(r => r.id !== result.id);
    state.raffleResults.push(result);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("raffleResults").doc(result.id).set(result);
        return res.json({ success: true, result });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save result" });
      }
    }
    res.json({ success: true, result });
  });

  app.put("/api/raffleResults/:id", async (req, res) => {
    const { id } = req.params;
    const result = req.body;
    if (!result) return res.status(400).json({ error: "Invalid result data" });
    result.id = id;
    state.raffleResults = (state.raffleResults || []).map(r => r.id === id ? result : r);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("raffleResults").doc(id).set(result, { merge: true });
        return res.json({ success: true, result });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update result" });
      }
    }
    res.json({ success: true, result });
  });

  // --- CRUD API for Config ---
  app.get("/api/config", async (req, res) => {
    const sanitizeDiscordConfig = (cfg: any) => ({
      ...(cfg || {}),
      botToken: cfg?.botToken ? "••••••••" : ""
    });

    if (!db) {
      return res.json({
        discordConfig: sanitizeDiscordConfig(state.discordConfig),
        systemPIN: state.systemPIN,
        adminPIN: state.adminPIN,
        guildGuidelines: state.guildGuidelines,
        guildName: state.guildName,
        lastUpdated: state.lastUpdated
      });
    }
    try {
      const doc = await db.collection("config").doc("settings").get();
      if (doc.exists) {
        const data = doc.data();
        if (data && data.discordConfig) {
          data.discordConfig = sanitizeDiscordConfig(data.discordConfig);
        }
        res.json(data);
      } else {
        res.status(404).json({ error: "Config settings not found" });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch config settings" });
    }
  });

  app.post("/api/config", async (req, res) => {
    const incoming = req.body;
    if (!incoming) return res.status(400).json({ error: "Invalid config data" });

    const currentState = await loadStateFromFirestore();
    let incomingBotToken = incoming.discordConfig?.botToken;
    if (incomingBotToken === "••••••••") {
      incomingBotToken = currentState.discordConfig?.botToken || "";
    }

    state.discordConfig = incoming.discordConfig || state.discordConfig;
    if (incoming.discordConfig) {
      state.discordConfig.botToken = incomingBotToken;
      
      // Re-initialize bot client if token or guild changed
      if (incomingBotToken && incoming.discordConfig.guildId) {
        initDiscordBot(incomingBotToken, incoming.discordConfig.guildId);
      }
    }
    state.systemPIN = incoming.systemPIN || state.systemPIN;
    state.adminPIN = incoming.adminPIN || state.adminPIN;
    state.guildGuidelines = incoming.guildGuidelines || state.guildGuidelines;
    state.guildName = incoming.guildName || state.guildName;
    saveLocalBackup();

    const configToSave = {
      ...incoming
    };
    if (configToSave.discordConfig) {
      configToSave.discordConfig.botToken = incomingBotToken;
    }

    if (db) {
      try {
        await db.collection("config").doc("settings").set(configToSave, { merge: true });
        
        const sanitizedConfig = {
          ...incoming,
          discordConfig: {
            ...(incoming.discordConfig || {}),
            botToken: incomingBotToken ? "••••••••" : ""
          }
        };
        return res.json({ success: true, config: sanitizedConfig });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update config settings" });
      }
    }

    const sanitizedConfig = {
      ...incoming,
      discordConfig: {
        ...(incoming.discordConfig || {}),
        botToken: incomingBotToken ? "••••••••" : ""
      }
    };
    res.json({ success: true, config: sanitizedConfig });
  });

  app.delete("/api/raffleResults/:id", async (req, res) => {
    const { id } = req.params;
    state.raffleResults = (state.raffleResults || []).filter(r => r.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("raffleResults").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete result" });
      }
    }
    res.json({ success: true });
  });


  // API 3: Dispatch notification to Discord webhook
  app.post("/api/discord-notify", async (req, res) => {
    const { title, message, fields, color, webhookUrlOverride, webhookType, eventId } = req.body;
    
    let webhookUrl = webhookUrlOverride;
    if (!webhookUrl) {
      if (webhookType === "leaves") {
        webhookUrl = state.discordConfig.webhookUrlLeaves || state.discordConfig.webhookUrl;
      } else if (webhookType === "events") {
        webhookUrl = state.discordConfig.webhookUrlEvents || state.discordConfig.webhookUrl;
      } else if (webhookType === "raffles") {
        webhookUrl = state.discordConfig.webhookUrlRaffles || state.discordConfig.webhookUrl;
      } else {
        webhookUrl = state.discordConfig.webhookUrl;
      }
    }

    let botSent = false;

    // Try sending interactive Check-in message using Discord Bot Client if channel is configured
    if (webhookType === "events" && eventId && discordClient && state.discordConfig.checkInChannelId) {
      try {
        const channel = await discordClient.channels.fetch(state.discordConfig.checkInChannelId).catch(() => null);
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle(title || "📢 ประกาศกิจกรรมกิลด์")
            .setDescription(message || "มีการอัปเดตกิจกรรมใหม่ในระบบ")
            .setColor(color || 3066993)
            .setTimestamp()
            .setFooter({ text: "ระบบจัดการกิลด์ RO Classic - โปร่งใส ตรวจสอบได้" });

          if (fields && fields.length > 0) {
            embed.addFields(fields);
          }

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`btn_attend_${eventId}`)
              .setLabel('มาวอร์ ⚔️')
              .setStyle(ButtonStyle.Success)
          );

          if (channel.type === ChannelType.GuildForum) {
            // Channel is a Forum! Create a new thread/post
            const thread = await (channel as any).threads.create({
              name: `⚔️ ${title || "กิจกรรมกิลด์วอร์"}`,
              message: {
                embeds: [embed],
                components: [row]
              }
            }).catch(console.error);

            if (thread) {
              const threadMsg = await thread.messages.fetch({ limit: 1 })
                .then(msgs => msgs.first())
                .catch(() => null);

              if (threadMsg) {
                console.log(`Successfully created check-in forum thread: ${thread.id}, message: ${threadMsg.id}`);
                const currentState = await loadStateFromFirestore();
                currentState.events = (currentState.events || []).map(e => {
                  if (e.id === eventId) {
                    return { ...e, checkInMessageId: threadMsg.id, checkInThreadId: thread.id };
                  }
                  return e;
                });
                await saveStateToFirestore(currentState);
                botSent = true;
              }
            }
          } else if (channel.isTextBased()) {
            // Normal text channel
            const checkInMsg = await (channel as any).send({ embeds: [embed], components: [row] }).catch(console.error);
            
            if (checkInMsg) {
              console.log(`Successfully sent check-in message to Discord: ${checkInMsg.id}`);
              const currentState = await loadStateFromFirestore();
              currentState.events = (currentState.events || []).map(e => {
                if (e.id === eventId) {
                  return { ...e, checkInMessageId: checkInMsg.id };
                }
                return e;
              });
              await saveStateToFirestore(currentState);
              botSent = true;
            }
          }
        }
      } catch (err) {
        console.error("Failed to send check-in message via Discord bot client:", err);
      }
    }
    
    if (botSent) {
      return res.json({ success: true, message: "ส่งประกาศผ่านบอทเรียบร้อยแล้ว!" });
    }
    
    const enabled = (webhookUrlOverride || webhookType) ? true : state.discordConfig.enabled;
    const botName = state.discordConfig.botName || "RO Classic Guild Bot";

    console.log(`[Discord Bot Log]: "${title}" - ${message}`);

    const discordPayload: any = {
      username: botName,
      avatar_url: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/shield.png",
    };

    if (webhookType === "events" && title) {
      discordPayload.thread_name = `⚔️ ${title}`;
    }

    if (req.body.content) {
      discordPayload.content = req.body.content;
    } else {
      discordPayload.embeds = [
        {
          title: title || "📣 แจ้งเตือนจากกิลด์ RO Classic",
          description: message || "มีการอัปเดตใหม่ในระบบกิลด์",
          color: color || 15844367, // Default Gold-ish color (hex: #F1C40F)
          fields: fields || [],
          timestamp: new Date().toISOString(),
          footer: {
            text: "ระบบจัดการกิลด์ RO Classic - โปร่งใส ตรวจสอบได้",
          }
        }
      ];
    }

    // If webhook is disabled or empty, we simulate it
    if (!enabled || !webhookUrl) {
      return res.json({
        success: true,
        simulated: true,
        message: "จำลองการส่งข้อมูลเรียบร้อย (เนื่องจากยังไม่ได้ตั้งค่า Webhook URL หรือปิดการใช้งาน)",
        payload: discordPayload
      });
    }

    try {
      // Real fetch request to Discord Webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(discordPayload)
      });

      if (response.ok) {
        return res.json({ success: true, message: "ส่งข้อความไปยัง Discord เรียบร้อยแล้ว!" });
      } else {
        const errText = await response.text();
        console.error(`Webhook Error response: ${response.status} ${errText}`);
        if (botSent) {
          return res.json({ success: true, message: "ส่งประกาศบอทสำเร็จ แต่ Webhook ขัดข้อง: " + errText });
        }
        return res.status(400).json({
          success: false,
          message: `Discord Webhook Error: ${response.status} ${errText}`
        });
      }
    } catch (e: any) {
      console.error(`Webhook connection exception:`, e);
      if (botSent) {
        return res.json({ success: true, message: "ส่งประกาศบอทสำเร็จ แต่การเชื่อมต่อ Webhook ล้มเหลว: " + e?.message });
      }
      return res.status(500).json({
        success: false,
        message: `ล้มเหลวในการเชื่อมต่อ Discord: ${e?.message || e}`
      });
    }
  });

  // API 4: Sync members from Discord Server
  app.post("/api/discord/sync", async (req, res) => {
    try {
      const currentState = await loadStateFromFirestore();
      
      const botToken = process.env.DISCORD_BOT_TOKEN || currentState.discordConfig.botToken;
      const guildId = process.env.DISCORD_GUILD_ID || currentState.discordConfig.guildId;

      if (!botToken || botToken === "••••••••") {
        return res.status(400).json({ success: false, message: "กรุณาตั้งค่า Discord Bot Token ก่อนการซิงค์" });
      }
      if (!guildId) {
        return res.status(400).json({ success: false, message: "กรุณาตั้งค่า Discord Guild ID ก่อนการซิงค์" });
      }

      // 1. Fetch Members from Discord API
      const membersRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
        headers: { Authorization: `Bot ${botToken}` }
      });

      if (!membersRes.ok) {
        const errText = await membersRes.text();
        let friendlyMessage = `ล้มเหลวในการดึงข้อมูลจาก Discord: ${membersRes.status} ${errText}`;
        if (membersRes.status === 401) {
          friendlyMessage = "Bot Token ไม่ถูกต้อง หรือไม่ได้รับอนุญาต (401 Unauthorized)";
        } else if (membersRes.status === 403) {
          friendlyMessage = "ไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิก (403 Forbidden) กรุณาตรวจสอบว่าได้เปิดใช้งาน Server Members Intent ใน Developer Portal แล้ว";
        } else if (membersRes.status === 404) {
          friendlyMessage = "ไม่พบเซิร์ฟเวอร์ Discord ตาม Server ID ที่ระบุ (404 Not Found)";
        }
        return res.status(membersRes.status).json({ success: false, message: friendlyMessage });
      }

      const discordMembers = await membersRes.json() as any[];
      const existingMembers = currentState.members || [];
      const newMemberList: Member[] = [];

      let newCount = 0;
      let updateCount = 0;

      for (const dMember of discordMembers) {
        if (dMember.user.bot) continue;

        const discordId = dMember.user.id;
        const charName = dMember.nick || dMember.user.global_name || dMember.user.username;

        const existing = existingMembers.find(m => 
          m.id === discordId || 
          m.discordId === discordId || 
          m.name.toLowerCase() === charName.toLowerCase()
        );
        if (existing) {
          updateCount++;
        } else {
          newCount++;
        }

        newMemberList.push({
          id: existing ? existing.id : discordId,
          name: charName,
          del_flag: existing ? (existing.del_flag ?? true) : true,
          discordId
        });
      }

      currentState.members = newMemberList;
      if (!currentState.discordConfig) {
        currentState.discordConfig = { webhookUrl: "", botName: "บอทกิลด์ RO Classic", enabled: false };
      }
      currentState.discordConfig.lastSyncTime = new Date().toISOString();
      
      await saveStateToFirestore(currentState);

      res.json({
        success: true,
        message: `ซิงค์ข้อมูลจาก Discord สำเร็จ! เพิ่มสมาชิกใหม่ ${newCount} คน, อัปเดตข้อมูลเดิม ${updateCount} คน`,
        members: newMemberList,
        lastSyncTime: currentState.discordConfig.lastSyncTime
      });

    } catch (err: any) {
      console.error("Discord sync error:", err);
      res.status(500).json({ success: false, message: `เกิดข้อผิดพลาดในการซิงค์ข้อมูล: ${err?.message || err}` });
    }
  });

// Global error handler middleware to catch and print production errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Express Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: err?.message || String(err),
    stack: err?.stack
  });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const viteModuleName = "vite";
    const { createServer } = await import(viteModuleName);
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })().catch(err => {
    console.error("Failed to initialize Vite development server:", err);
  });
} else if (!process.env.VERCEL) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Start local listener if not running in a Serverless environment like Vercel
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Auto start Discord Bot Client on server boot
    try {
      const startState = await loadStateFromFirestore();
      const botToken = process.env.DISCORD_BOT_TOKEN || startState.discordConfig?.botToken;
      const guildId = process.env.DISCORD_GUILD_ID || startState.discordConfig?.guildId;
      if (botToken && botToken !== "••••••••" && guildId) {
        initDiscordBot(botToken, guildId);
      }
    } catch (e) {
      console.error("Failed to auto-start Discord Bot on server boot:", e);
    }
  });
}

export default app;
