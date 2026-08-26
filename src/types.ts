export interface Member {
  id: string;
  name: string;
  del_flag: boolean;
  discordId?: string;
  participatedWarsCount?: number;
  hasReceivedInCycle?: boolean;
}

export interface MasterItem {
  id: string;
  name: string;
  itemType: 'material' | 'card' | 'equip' | 'consumable';
  whitelistMemberIds?: string[]; // สมาชิกที่ได้รับสิทธิ์ Whitelist
  del_flag?: boolean; // สถานะการใช้งาน (เปิด=true / ปิด=false)
}

export interface EventDrop {
  id: string;
  itemName: string;
  quantity: number; // จำนวนไอเทม
  assignedToMemberId: string | null; // สมาชิกที่ประมูลได้/จัดสรรให้
  assignedToMemberName: string | null;
  bidAmount: number; // ราคาประมูล
  whitelistMemberIds?: string[]; // สมาชิกที่ได้รับสิทธิ์ Whitelist
  originalDropId?: string; // ไอดีไอเทมดั้งเดิมก่อนแบ่งเฉลี่ย
  isSplit?: boolean; // ระบุว่าเป็นไอเทมที่ถูกเฉลี่ยแบ่งมาจากชิ้นใหญ่
  originalQuantity?: number; // จำนวนดั้งเดิมก่อนการแบ่ง
  cycle?: number; // รอบวัฏจักรที่ได้รับรางวัลนี้
}

export interface GuildEvent {
  id: string;
  title: string; // เช่น Guild League ประจำวันที่ 16/07/2026
  type: 'league' | 'overrun';
  date: string;
  participants: string[]; // รายชื่อ Member.id ที่เข้าร่วมกิจกรรมนี้
  drops: EventDrop[]; // รายการของที่ดรอปและถูกประมูลในรอบนี้
  status: 'active' | 'completed';
  completedAt?: string; // เวลาสิ้นสุดกิจกรรม
  checkInCode?: string; // รหัสเช็คอินสุ่ม 6 หลักสำหรับบอท Discord
  checkInMessageId?: string; // ไอดีข้อความปุ่มกดที่บอทส่งไปใน Discord
  checkInThreadId?: string; // ไอดี Thread/Post สำหรับ Discord Forum
  
  // โครงสร้างที่ 2 สำหรับการย้ายฐานข้อมูล (Migration):
  event_name?: string;
  event_date?: string;
  member_array?: string[];
  item_id?: string;
  item_Qty?: number;
  details?: string;
  del_flag?: boolean;
}

export interface RafflePrize {
  id: string;
  name: string;
  quantity: number;
}

export interface HistoryLog {
  id: string;
  id_member: string; // ID ของสมาชิกกิลด์
  id_event: string;  // ID ของกิจกรรมกิลด์วอร์
  count_Receive: number; // จำนวนของที่ได้รับ (แต้มรับ/จำนวนชิ้น)
  del_flag: boolean; // สถานะการล็อกอินประวัติ
}

export interface RaffleResult {
  id: string;
  prizeName: string;
  winnerName: string;
  timestamp: string;
  itemType: string;
  eventId?: string; // ไอดีกิจกรรมที่เกี่ยวข้องกับการสุ่ม/แจก
}

export interface DiscordConfig {
  webhookUrl: string;
  botName: string;
  enabled: boolean;
  webhookUrlLeaves?: string;
  webhookUrlEvents?: string;
  webhookUrlRaffles?: string;
  botToken?: string;
  guildId?: string;
  autoSync?: boolean;
  lastSyncTime?: string;
  checkInChannelId?: string; // ไอดีช่องแชทสำหรับส่งปุ่มเช็คอินและรับโค้ดสุ่ม
}

export interface GuildState {
  guildName?: string; // ชื่อกิลด์กำหนดเอง
  members: Member[];
  events: GuildEvent[];
  masterItems: MasterItem[];
  rafflePrizes: RafflePrize[];
  raffleResults: RaffleResult[];
  discordConfig: DiscordConfig;
  systemPIN: string;
  adminPIN?: string;
  guildGuidelines?: string; // กฎเกณฑ์และข้อตกลงกิลด์
  lastUpdated: string;
  historyLogs?: HistoryLog[]; // ตารางประวัติและจัดสรร (อิงตามรูปโครงสร้างที่ 2)
  currentCycle?: number; // รอบวัฏจักรประมูลปัจจุบัน
}

export const DEFAULT_JOB_CLASSES = [
  'Lord Knight',
  'High Priest',
  'Sniper',
  'Assassin Cross',
  'High Wizard',
  'Whitesmith',
  'Paladin',
  'Scholar',
  'Creator',
  'Stalker',
  'Clown',
  'Gypsy',
  'Champion',
  'Ninja',
  'Gunslinger',
  'Super Novice'
];

