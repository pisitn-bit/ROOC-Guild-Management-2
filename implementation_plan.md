# Implementation Plan: ระบบเช็คอินกิลด์วอร์ผ่านบอท Discord (ปุ่มลงทะเบียน & รหัสยืนยัน)

แผนงานนี้ครอบคลุมการเพิ่มระบบลงทะเบียนเข้าร่วมกิจกรรมกิลด์ (มาวอร์ / ลา) ผ่านปุ่มใน Discord และการเช็คอินด้วยรหัสสุ่ม 6 หลักผ่านช่องแชท

## User Review Required

> [!IMPORTANT]
> ระบบนี้จำเป็นต้องติดตั้งแพ็คเกจ `discord.js` เพิ่มเติม เพื่อใช้งานบอท Discord ในการรับเหตุการณ์ (Events) การกดปุ่ม และตอบรับคำสั่งแชทแบบเรียลไทม์
> นอกจากนี้ Discord Bot Token ที่ใช้ต้องมีสิทธิ์ **Guild Members Intent** และ **Message Content Intent** เปิดใช้งานใน Discord Developer Portal

## Proposed Changes

### 1. Backend Integration (Dependencies & Server Configuration)

#### [MODIFY] [`package.json`](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/package.json)
* เพิ่ม `"discord.js": "^14.18.0"` ในส่วนของ dependencies

#### [MODIFY] [`src/types.ts`](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/src/types.ts)
* เพิ่มฟิลด์ในโครงสร้างอินเทอร์เฟซดังนี้:
  * `DiscordConfig`: เพิ่ม `checkInChannelId?: string;` (ไอดีช่องแชทสำหรับเช็คอินและประกาศปุ่ม)
  * `GuildEvent`: เพิ่ม `checkInCode?: string;` (รหัสเช็คอิน 6 หลักที่ระบบสุ่มขึ้นมา)
  * `GuildEvent`: เพิ่ม `checkInMessageId?: string;` (ไอดีข้อความปุ่มกดที่บอทส่งไป เพื่อใช้ในการปิดใช้งานปุ่มเมื่อจบกิจกรรม)

#### [MODIFY] [`server.ts`](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/server.ts)
* นำเข้า `discord.js` และเริ่มต้นระบบบอท Discord Gateway client เมื่อมีการตั้งค่า `botToken`
* สร้างระบบบอทรับฟังคำสั่ง (Message & Interaction Listeners):
  * **Event `ready`**: ล็อกอินบอทและแจ้งเตือนสถานะออนไลน์
  * **Event `messageCreate`**:
    * รับคำสั่งเช็คอิน เช่น `/check 556189` หรือ `!check 556189` หรือรับคำสั่งที่พิมพ์ตรงๆ:
      * ค้นหากิจกรรมสถานะ `active` ที่มีรหัสเช็คอินตรงกัน
      * เชื่อมโยงผู้ส่งข้อความจาก Discord ID เข้ากับสมาชิกในกิลด์
      * เพิ่มสมาชิกเข้าร่วมกิจกรรม (`event.participants`) และบันทึกลงฐานข้อมูลแบบเรียลไทม์
      * ตอบกลับผลลัพธ์ในช่องแชททันที
  * **Event `interactionCreate` (Buttons & Modal)**:
    * **ปุ่ม `btn_attend` (มาวอร์)**: ค้นหาผู้ใช้จาก Discord ID และลงทะเบียนเข้าร่วมกิจกรรม ส่งข้อความยืนยันกลับแบบ Ephemeral (เห็นเฉพาะผู้นั้น)
    * **ปุ่ม `btn_excuse` (ขอลา)**: แสดงกล่องข้อความ (Modal) สำหรับกรอกเหตุผลการลา เมื่อผู้ใช้กดตกลง ระบบจะทำการลงทะเบียนลาในกิจกรรม (`event.excuses`) ทันที
* เชื่อมโยงเหตุการณ์ตอนหัวหน้ากิลด์สร้างหรือเริ่มกิจกรรมใหม่:
  * บอทจะทำการสร้างรหัสสุ่ม 6 หลักให้กับกิจกรรม
  * ส่ง Embed ข้อความประกาศลงช่องเช็คอิน Discord พร้อมปุ่ม **"มาวอร์ ⚔️"** และ **"แจ้งลา 🚩"**
  * บันทึกไอดีข้อความไว้เพื่อยกเลิกปุ่มเมื่อแอดมินปิดกิจกรรม (Status -> Completed)

---

### 2. Frontend Interface (UI Updates)

#### [MODIFY] [`src/components/Auctions.tsx`](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/src/components/Auctions.tsx)
* เมื่อสร้างหรือมีกิจกรรมที่ `active`:
  * แสดงข้อมูล **"รหัสเช็คอิน Discord"** (6 หลัก) เด่นชัดบนหน้าจอแอดมินและผู้เล่นทั่วไป เพื่อให้นำไปประกาศในกิลด์ได้ง่าย
  * แสดงสถานะการส่งการแจ้งเตือนและการผูกปุ่ม Discord
* เมื่อกดปิดกิจกรรม (Complete Event):
  * ระบบส่งคำขอแจ้งให้เซิร์ฟเวอร์แก้ไขโพสต์ปุ่มบน Discord เพื่อเปลี่ยนเป็นสถานะปิดปุ่ม (Disabled Buttons) ป้องกันการกดลงทะเบียนย้อนหลัง

#### [MODIFY] [`src/components/DiscordSettings.tsx`](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/src/components/DiscordSettings.tsx)
* เพิ่มช่องกรอกข้อมูล **"ช่องสำหรับเช็คอินกิลด์วอร์ (Check-In Channel ID)"**
* แสดงคู่มือการตั้งค่าบอท Discord Step-by-Step สำหรับผู้ดูแลระบบอย่างละเอียด

---

## Verification Plan

### Automated / Manual Tests
1. รัน `npm install` เพื่อตรวจสอบว่าพึ่งพาอัปเดตอย่างสมบูรณ์
2. ตรวจสอบการคอมไพล์ TypeScript ด้วย `npm run lint`
3. ทดสอบการทำงานของบอท Discord:
   * ตั้งค่า Bot Token และ Channel ID ในแท็บ Discord Settings
   * แอดมินกดเปิดกิจกรรมวอร์ใหม่ ตรวจสอบข้อความบอทแจ้งเตือนเด้งเข้าดิสคอร์ดพร้อมปุ่มกด
   * ทดสอบสมาชิกในดิสคอร์ดกดปุ่ม **"มาวอร์ ⚔️"** ตรวจสอบรายชื่อขึ้นบนหน้าเว็บเรียลไทม์
   * ทดสอบสมาชิกกดปุ่ม **"แจ้งลา 🚩"** กรอกเหตุผลลาในกล่องข้อความและยืนยัน ตรวจสอบประวัติการลาบนหน้าเว็บ
   * ทดสอบสมาชิกพิมพ์รหัสเช็คอิน `/check <รหัส>` ตรวจสอบระบบดึงผู้เล่นเข้าคิวสำเร็จ
   * ตรวจสอบเมื่อปิดกิจกรรม ปุ่มกดในดิสคอร์ดจะกลายเป็นสีเทาและปิดการใช้งาน
