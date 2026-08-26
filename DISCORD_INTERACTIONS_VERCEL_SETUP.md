# คู่มือตั้งค่า Discord Interactions Endpoint + Deploy บน Vercel (แบบ Step-by-Step)

คู่มือนี้จะอธิบายขั้นตอนการตั้งค่าระบบจัดการกิลด์ Ragnarok Origin ให้ใช้ Discord แบบ **Interactions Endpoint URL (HTTP Webhook)** เพื่อรันบน Vercel Serverless Environment ได้ โดยไม่ต้องมี Bot Worker 24/7 คอยรันแยก

---

## 📋 Prerequisites (สิ่งที่ต้องมีก่อนเริ่ม)

| สิ่งที่ต้องมี | รายละเอียด |
|---|---|
| ✅ GitHub Repository | โปรเจกต์ `ROOC-Guild-Management-2` (ถูก push ขึ้นแล้ว) |
| ✅ บัญชี [Vercel](https://vercel.com/) | สำหรับ Deploy Serverless Function |
| ✅ บัญชี [Discord Developers](https://discord.com/developers/applications) | สำหรับสร้าง Discord Application + Bot |
| ✅ Firebase Project | สำหรับ Firestore Database (มีไฟล์ Service Account JSON) |
| ✅ Google AI Studio API Key | สำหรับ `GEMINI_API_KEY` (ถ้าจะใช้ AI features) |

---

## ขั้นตอนที่ 1: เตรียม Environment Variables บนเครื่องคุณ

ก่อน Deploy ต้องตรวจสอบว่าเรามีค่าทั้งหมดครบแล้วหรือไม่ สามารถดูตัวอย่างได้จากไฟล์ [.env.example](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/.env.example)

ตัวแปรที่ต้องเตรียม **สำหรับโหมด Interactions Endpoint** (ใช้บน Vercel):

| ชื่อตัวแปร | วิธีหาค่า / จำเป็นไหม |
|---|---|
| `GEMINI_API_KEY` | จาก Google AI Studio → API Keys (ไม่บังคับถ้าไม่ใช้ AI) |
| `APP_URL` | URL Production ของ Vercel หลัง Deploy เสร็จ (เช่น `https://rooc-guild-2.vercel.app`) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON String ทั้งหมดของไฟล์ Firebase Service Account (`firebase-service-account.json`) |
| `DISCORD_BOT_TOKEN` | Discord Dev Portal → **Bot** → หัวข้อ Token → กด **Reset Token** |
| `DISCORD_GUILD_ID` | เปิด Dev Mode บน Discord → คลิกขวาที่ชื่อ Server → **Copy Server ID** |
| `DISCORD_PUBLIC_KEY` | ⭐ Discord Dev Portal → **General Information** → Public Key |
| `DISCORD_APPLICATION_ID` | ⭐ Discord Dev Portal → **General Information** → Application ID / Client ID |

> 💡 **คำแนะนำ**: เปิดหน้า Discord Dev Portal ไว้พร้อมกัน จะได้ไม่ต้องเปิดปิดสลับไปมา

---

## ขั้นตอนที่ 2: Deploy โปรเจกต์ขึ้น Vercel

### 2.1 เชื่อมต่อ Repo กับ Vercel

1. เข้าไปที่ [vercel.com](https://vercel.com/) และ Login ด้วย GitHub
2. กด **Add New...** → **Project**
3. ค้นหา repo ชื่อ `ROOC-Guild-Management-2` จากนั้นกด **Import**
4. ในหน้า **Configure Project** ปล่อยค่า Default ทุกอย่าง (Vercel จะอ่าน config จากไฟล์ [vercel.json](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/vercel.json) ให้เอง):
   - **Framework Preset**: `Other` (ปล่อยตามนั้น)
   - **Build Command**: `npm run build` (จะถูกเติมให้อัตโนมัติ)
   - **Output Directory**: `dist` (จะถูกเติมให้อัตโนมัติ)

### 2.2 เติม Environment Variables (ส่วนใหญ่ในขั้นตอนนี้)

ในหน้าเดียวกัน (Configure Project) → เลื่อนลงมาที่ส่วน **Environment Variables**:

เติมตัวแปร **ทั้งหมด 7 ตัว** ที่เตรียมไว้ (เว้น `APP_URL` ไว้ก่อน เพราะเรายังไม่รู้ URL จริง):

| Name | Value | Environment |
|---|---|---|
| `GEMINI_API_KEY` | ค่าจาก Google AI Studio | Production, Preview, Development |
| `FIREBASE_SERVICE_ACCOUNT` | ข้อความ JSON ทั้งหมดของไฟล์ credential (คลุมทั้งหมดด้วย single quote หรือไม่ก็ได้ Vercel เก็บเป็น plaintext) | ทุกอัน |
| `DISCORD_BOT_TOKEN` | Bot Token จาก Discord Dev Portal | ทุกอัน |
| `DISCORD_GUILD_ID` | Server ID ของ Discord | ทุกอัน |
| `DISCORD_PUBLIC_KEY` | Public Key จาก Discord Dev Portal | ทุกอัน |
| `DISCORD_APPLICATION_ID` | Application ID จาก Discord Dev Portal | ทุกอัน |

> ⚠️ **สำคัญมาก**: `FIREBASE_SERVICE_ACCOUNT` ต้องเป็น **ทั้งก้อน JSON** ไม่ใช่แค่ชื่อไฟล์ ตัวอย่าง:
> ```
> {"type":"service_account","project_id":"xxx","private_key_id":"yyy","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"xxx@xxx.iam.gserviceaccount.com","client_id":"12345","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
> ```

### 2.3 เริ่ม Deploy

1. กดปุ่ม **Deploy** (สีฟ้า)
2. รอจนกว่าจะเห็น **Congratulations!** หน้า Vercel จะโชว์หน้า Landing page ตัวอย่าง
3. จด URL Production ของคุณไว้ (อยู่บริเวณมุมขวาบนของหน้า Dashboard หรือที่ปุ่ม **Visit**) ตัวอย่าง URL:
   ```
   https://rooc-guild-management-2.vercel.app
   ```

### 2.4 อัพเดต `APP_URL` Environment Variable

ตอนนี้เรามี URL แล้ว ให้กลับไปตั้งค่าเพิ่ม:

1. ใน Vercel Project → เมนู **Settings** → **Environment Variables**
2. กด **Add New**
3. ชื่อ: `APP_URL`
4. Value: URL Production ที่ได้จากข้างบน (**ห้ามมี / ปิดท้าย** เช่น `https://rooc-guild-management-2.vercel.app`)
5. เลือก Environment: **Production, Preview, Development** → กด Save
6. ไปที่เมนู **Deployments** → กดจุด 3 ทางขวาของ Build ล่าสุด → **Redeploy** เพื่อให้ ENV ใหม่生效 (ไม่ต้องเลือก "Build with Cache" ก็ได้)

รอจน Redeploy เสร็จ ก่อนจะไปตั้งค่า Discord ต่อ

---

## ขั้นตอนที่ 3: ตั้งค่า Interactions Endpoint URL บน Discord Dev Portal

ขั้นตอนนี้จะบอก Discord ให้ส่ง Event ที่เกี่ยวกับการกดปุ่ม / กด Slash Command / Submit Modal มาที่ Vercel ของเราแทนการใช้ WebSocket

1. ไปที่ [Discord Developers](https://discord.com/developers/applications) → เลือก Application ของคุณ
2. เมนูด้านซ้าย → **General Information**
3. เลื่อนลงมาหาช่อง **Interactions Endpoint URL**
4. ใส่ URL ดังนี้ (**เปลี่ยน domain เป็นของคุณ**):
   ```
   https://your-domain.vercel.app/api/discord/interactions
   ```
   ตัวอย่างถ้า URL ของคุณคือ `rooc-guild-management-2.vercel.app` → ใส่:
   ```
   https://rooc-guild-management-2.vercel.app/api/discord/interactions
   ```

5. กด **Save Changes** (อยู่ด้านล่างสุดของหน้า)

### ✅ การตรวจสอบว่า Endpoint ทำงานถูกต้อง

ถ้า Save สำเร็จ แปลว่า:
- Discord ส่ง `PING` (Interaction type=1) มาที่เราแล้ว
- โค้ดใน [server.ts L758-L770](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/server.ts#L758-L770) ตอบ `PONG` กลับไปสำเร็จ
- Ed25519 Signature (ฟังก์ชัน `verifyDiscordSignature` ใน [discord.ts](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/src/utils/discord.ts#L23-L42)) ผ่านตรวจสอบ

ถ้า Save ไม่สำเร็จ มักจะเป็นเพราะ:
| อาการ | สาเหตุที่พบบ่อยที่สุด | วิธีแก้ไข |
|---|---|---|
| Invalid interactions endpoint URL | พิมพ์ URL ผิด หรือ Vercel Deploy ยังไม่เสร็จ | ตรวจ URL / รอ Vercel Deploy เสร็จ |
| Validation Error: invalid signature | ตั้ง `DISCORD_PUBLIC_KEY` ผิดค่า หรือ ยังไม่ได้ Redeploy หลังเพิ่ม ENV | ไป Vercel → Redeploy |
| 500 Internal Server Error | บาง ENV ขาดหาย หรือ Express เปิด error | ดู Vercel Function Logs ว่า error อะไร |

---

## ขั้นตอนที่ 4: เชิญบอทเข้า Discord Server (ถ้ายังไม่เคยเชิญ)

บอทจำเป็นต้องอยู่ในเซิร์ฟเวอร์ ถึงจะสามารถ:
- ส่งข้อความ Check-in + ปุ่มกดไปที่ Channel
- ซิงค์สมาชิก (ดูว่าใครอยู่เซิร์ฟเวอร์บ้าง)
- ตอบกลับ Interactions (ปุ่ม/Modal/Slash)

### วิธีเชิญ

1. Discord Dev Portal → เมนู **OAuth2** → **URL Generator**
2. **Scopes** ให้ติ๊ก:
   - [x] `bot`
   - [x] `applications.commands` (สำหรับ Slash Commands `/check`)
3. **Bot Permissions** ให้ติ๊กอย่างน้อยที่สุด:
   - [x] **View Channels** (ดูห้องทั่วไป)
   - [x] **Send Messages** (ส่งข้อความไปห้อง)
   - [x] **Create Public Threads** (ถ้าใช้ Forum Channel สำหรับประกาศกิจกรรม)
   - [x] **Send Messages in Threads** (ถ้าใช้ Forum Channel)
   - [x] **Embed Links** (Embed สวยๆ สำหรับ Check-in Card)
   - [x] **Read Message History** (สำหรับ edit/disable ปุ่มกดเก่า)
   - [x] **Manage Messages** (สามารถ PATCH ปุ่มกดในข้อความเก่า)
   - [x] **Manage Threads** (สามารถ Archive Thread เมื่อกิจกรรมจบ)

4. คัดลอก URL ที่ Generate แล้วไปเปิดใน Browser ใหม่ → เลือก Server ของเรา → กด **Continue** → **Authorize**

---

## ขั้นตอนที่ 5: สร้าง Slash Command `/check`

Interactions Endpoint URL **ไม่รองรับ Text Command แบบพิมพ์ `/check 123456` ในช่องแชทได้** (เพราะไม่มี `messageCreate` event ผ่านทาง HTTP) ดังนั้นต้องใช้ **Slash Command** แทน

เรามี API สร้าง Slash Command ไว้แล้วที่ [server.ts L937-L986](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/server.ts#L937-L986) ให้เรียกผ่านหน้าเว็บ

### 5.1 วิธีเรียก API Register Command

**เปิดหน้าเว็บ App ของเรา** แล้วเปิด DevTools ของ Browser (F12 หรือ คลิกขวา → Inspect → แท็บ **Console**) จากนั้นพิมพ์โค้ดด้านล่าง แล้ว Enter:

```javascript
// วิธี A: สร้างแค่ใน Server ที่เราเลือก (GUILD) → ใช้งานได้ทันที ไม่ต้องรอ
fetch('/api/discord/register-commands', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    adminPin: 'ro-admin-5678',  // เปลี่ยนเป็น Admin PIN จริงของคุณถ้าแก้ไขไว้
    scope: 'guild'              // guild = เฉพาะเซิร์ฟเวอร์นี้ (ใช้งานได้ทันที)
  })
}).then(r => r.json()).then(console.log);

/* ===========================================================
   หรือถ้าต้องการสร้าง GLOBAL (ใช้ได้ทุกเซิร์ฟเวอร์) 
   ⚠️ แต่ Global จะใช้เวลา propagate ได้ถึง 1 ชั่วโมง
   =========================================================== */
/*
fetch('/api/discord/register-commands', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    adminPin: 'ro-admin-5678',
    scope: 'global'
  })
}).then(r => r.json()).then(console.log);
*/
```

### 5.2 ผลลัพธ์ที่คาดหวัง

ถ้าสำเร็จ Console จะแสดงประมาณนี้:
```json
{
  "success": true,
  "message": "✅ Register Slash Commands สำเร็จ! (Guild: 123456789012345678)",
  "scope": "guild",
  "commands": [ { "name": "check", "type": 1, "description": "เช็คอินเข้าร่วมกิจกรรมด้วยรหัส 6 หลัก" } ]
}
```

กลับไปที่ Discord Server พิมพ์ `/` แล้วพิมพ์ `check` จะเห็น Slash Command ปรากฏพร้อม Description ได้เลย (ถ้า scope=guild)

---

## ขั้นตอนที่ 6: ตั้งค่า Channel สำหรับส่งประกาศ Check-in

ในขั้นตอนนี้เราจะบอกระบบว่า **เมื่อกดส่งประกาศ กิจกรรม ให้ส่งปุ่ม Check-in ไปที่ห้องไหน**

### 6.1 หา Channel ID ที่จะใช้

1. เปิด Discord Dev Mode (ตั้งค่า → ขั้นสูง → Developer Mode เปิด ON)
2. ไปที่ห้องที่เราต้องการจะส่งข้อความไป (ห้องข่าวสาร หรือห้อง Forum สำหรับกิจกรรม)
3. คลิกขวาที่ชื่อห้อง → **Copy Channel ID**

### 6.2 บันทึกค่าในระบบ

1. เปิดหน้าเว็บเรา → เข้าสู่ระบบ Admin
2. ไปเมนู **Config** (หรือ **ตั้งค่า Discord**)
3. ค้นหาช่อง **Check-in Channel ID** → วาง Channel ID ที่ Copy มา
4. (ถ้ายังไม่ได้ใส่) เติม **Discord Bot Token** และ **Discord Server ID** (Guild ID)
5. กด **บันทึกการตั้งค่า**

### 6.3 (Optional) ทดสอบ Sync สมาชิก

กดปุ่ม **Sync Members with Discord** เพื่อดึงรายชื่อสมาชิกในเซิร์ฟเวอร์ มาเก็บ Mapping กับ Discord User ID เพื่อให้ระบบสามารถจับคู่ "คนที่กดปุ่ม Check-in" กับ "สมาชิกในระบบ" ได้

---

## ขั้นตอนที่ 7: 🧪 ทดสอบว่าทุกอย่างใช้งานได้จริง

มาลองทดสอบ Flow ทั้งหมดครบวงจรครับ

### Flow A: สร้างกิจกรรม + ส่งประกาศ + กดปุ่มเช็คอิน (แบบปกติ)

1. หน้าเว็บ → ไปเมนู **Create Event** (หรือ Events → สร้างใหม่)
2. ตั้งชื่อกิจกรรม (เช่น "ทดสอบระบบเช็คอิน")
3. กำหนด **Check-in Code 6 หลัก** (อิสระ เช่น `445566`) → ระยะเวลา valid ไปตามค่าที่เราตั้ง
4. สถานะเริ่มต้นให้เป็น **Active**
5. บันทึก กิจกรรม
6. เปิดหน้ารายการ กิจกรรม → กดปุ่ม **📢 ส่งประกาศ Discord**
7. ✅ เปิดไปดูห้อง Discord ที่เราตั้งไว้ จะเห็นข้อความ Embed สวยๆ พร้อมปุ่มสีเขียว **มาเกิด 🗡️**

### Flow B: กดปุ่ม เช็คอิน ผ่าน Discord (ทดสอบ Interactions)

กดปุ่มสีเขียว **มาเกิด 🗡️** ที่เพิ่งส่งไป จะเกิดอะไรขึ้นตามลำดับนี้:

1. Discord ส่ง HTTP POST ไปที่ `/api/discord/interactions` ใช้ MESSAGE_COMPONENT type=3
2. Server ตรวจ Signature → ตอบกลับด้วย **Type 9 (Modal)** ชื่อ modal_attend_<event_id>
3. ป๊อปอัป Modal ขึ้นมาถามรหัสเช็คอิน 6 หลัก
4. พิมพ์รหัส `445566` (หรือรหัสที่ตั้งไว้) แล้วกด Submit
5. Discord ส่ง MODAL_SUBMIT (type=5) มา
6. Server เรียก `performCheckInByEventId` → ตรวจรหัส → บันทึก Firestore → แจ้งผล EPHEMERAL
7. ✅ จะเห็นข้อความสีเขียวแจ้ง "เช็คอินสำเร็จ! ยินดีต้อนรับสมาชิก xxx เข้าร่วมกิจกรรม"

> 💡 EPHEMERAL = ข้อความแชทสีเทาที่ **มีแต่คุณเองเห็น** เหมาะกับข้อความส่วนตัวมากๆ เช่น ผลตรวจสอบรหัส ไม่ทำให้ห้องรก

### Flow C: ทดสอบ Slash Command `/check` (แทนข้อความธรรมดา)

ในช่องแชท Discord พิมพ์:
```
/check code:445566
```
แล้ว Enter → ได้ผลลัพธ์เดียวกันกับกรอก Modal

### Flow D: เปลี่ยนสถานะกิจกรรมจบ → ทดสอบปิดปุ่ม

1. หน้าเว็บ → Events → เปิดกิจกรรมเดิม
2. เปลี่ยนสถานะเป็น **Completed** → บันทึก
3. ✅ กลับไปดูข้อความเดิมบน Discord → ปุ่มสีเขียว **จะถูก disable อัตโนมัติ** (สีเทา ไม่กดได้)
4. ถ้าเป็นห้อง Forum → Thread จะถูก Archive อัตโนมัติ

---

## 🔍 Troubleshooting (ปัญหาที่พบบ่อย + วิธีแก้)

### ❌ กดปุ่มแล้วขึ้น "This interaction failed" (สีแดง)
**สาเหตุหลัก 3 อย่าง**:
1. Vercel Function timeout (Firestore อาจดึก)
   - ✅ วิธีแก้: ระบบมี Defer Reply อยู่แล้ว แต่ถ้า Function โชว์ Error 504 → อัพเกรด Vercel Plan หรือปรับ Timeout ใน `vercel.json`
2. Signature ผิด
   - ✅ ตรวจ `DISCORD_PUBLIC_KEY` ใน Vercel ENV ใหม่ → Redeploy
3. Crash ภายใน (รหัสกิจกรรมหมดอายุ / รหัสผิดประเภท)
   - ✅ ดู Vercel Function Logs (Vercel → Project → Functions → เลือก `/api/index.ts`)

### ❌ Slash Command `/check` ไม่ปรากฏหลัง Register
- ถ้า scope=`guild` → อาจจะต้องรีเฟรช Discord (Ctrl+R / Cmd+K) หรือ Logout/Login เล็กน้อย
- ถ้า scope=`global` → รอสักครู่ ถึง 1 ชั่วโมงได้

### ❌ ข้อความ Check-in ไม่ถูกส่งไปที่ห้อง
ตรวจสอบ:
1. บอทถูกเชิญเข้าเซิร์ฟเวอร์จริงไหม
2. Check-in Channel ID ถูกต้องไหม
3. บอทมีสิทธิ์ `Send Messages` และ `Embed Links` ในห้องนั้นไหม
4. ดู Vercel Function Logs ตอนเรียก `/api/discord-notify`

### ❌ พิมพ์ Modal Submit แล้วแจ้ง "ไม่พบสมาชิกนี้ในระบบ"
**สาเหตุ**: Discord User ID ของคนกดยังไม่ได้ถูก Sync เข้าระบบ
✅ วิธีแก้: กด **Sync Members with Discord** ในหน้า Discord Config ใหม่ หรือ เพิ่มสมาชิกคนนั้นเข้าระบบพร้อมระบุ Discord ID

### ❌ ปุ่ม Check-in ไม่ถูกปิดหลังจากกิจกรรมจบ
ตรวจ:
1. `DISCORD_BOT_TOKEN` ถูกไหม
2. บอทมีสิทธิ์ `Manage Messages` ไหม
3. ระบบบันทึก `checkInMessageId` และ `checkInChannelId` ใน Firestore Event เหล่านั้นถูกต้องไหม

---

## 🏃 วิธีรันบนเครื่อง Local (สำหรับ Develop)

ถ้าต้องการทดสอบบนเครื่องก่อน Deploy ขึ้น Vercel:

### ขั้นตอน
1. Clone repo มาเครื่อง → `npm install`
2. สร้างไฟล์ `.env` (copy จาก .env.example) แล้วเติมค่าทั้งหมด
3. สำหรับทดสอบ Interactions Endpoint ในเครื่อง ต้อง **expose localhost ออกมา** ผ่าน tunneling service เช่น [ngrok](https://ngrok.com/)
   - ดาวน์โหลด ngrok → รัน:
     ```
     ngrok http 3000
     ```
   - จะได้ URL เช่น `https://abcd-1234.ap.ngrok.io`
4. ไปที่ Discord Dev Portal → Interactions Endpoint URL → เปลี่ยนชั่วคราวเป็น:
   ```
   https://abcd-1234.ap.ngrok.io/api/discord/interactions
   ```
5. รันเซิร์ฟเวอร์ในอีก Terminal หนึ่ง:
   ```
   npm run dev
   ```
6. ทดสอบทุก Flow เหมือนบน Production ได้เลย

> 💡 อย่าลืมกด **Save Changes** ใน Discord Portal ทุกครั้งที่เปลี่ยน URL ngrok (ngrok URL จะเปลี่ยนทุกครั้งที่รัน)

---

## 🗂️ ไฟล์ที่เกี่ยวข้องทั้งหมด (Code References)

สำหรับผู้ที่ต้องการศึกษาโค้ดเพิ่มเติม:

| ไฟล์ | สิ่งที่เกี่ยวข้อง |
|---|---|
| [src/utils/discord.ts](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/src/utils/discord.ts) | **Core Module** ทุกฟังก์ชันสำหรับ Interactions + REST API: Verify Signature, สร้าง Embed/ปุ่ม/Modal, ส่งข้อความ, Edit Reply, Register Command |
| [server.ts L648-L728](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/server.ts#L648-L728) | Shared Helpers: `performCheckInByEventId()` (Logic เช็คอิน) + `disableCompletedCheckInMessageRest()` (ปิดปุ่มแบบ REST) |
| [server.ts L735-L934](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/server.ts#L735-L934) | **Route หลัก**: `POST /api/discord/interactions` handlers PING/Button/Modal/Slash |
| [server.ts L937-L986](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/server.ts#L937-L986) | Route: `POST /api/discord/register-commands` สำหรับสร้าง Slash Commands |
| [server.ts L485-L526](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/server.ts#L485-L526) | Block ใน `saveStateToFirestore()`: ปิดปุ่มกดเมื่อกิจกรรมจบ (ใช้ discord.js หรือ REST fallback) |
| [server.ts L1610-L1727](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/server.ts#L1610-L1727) | Route: `/api/discord-notify`: ส่งข้อความ Check-in + ปุ่ม (ใช้ discord.js หรือ REST fallback) |
| [.env.example](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/.env.example) | ตัวอย่าง Environment Variables |
| [vercel.json](file:///c:/Users/PC/Desktop/project/ragnarok-origin-guild-manager/vercel.json) | Config Vercel Serverless (Build, Output, Rewrite, includeFiles) |

---

## ✨ สรุป (Checklist ให้ติ๊กอีกครั้งก่อน Live)

- [ ] Vercel Deploy สำเร็จ → มี URL Production
- [ ] 6 Environment Variables บน Vercel ถูกต้อง (GEMINI, FIREBASE, DISCORD_BOT_TOKEN, GUILD_ID, PUBLIC_KEY, APPLICATION_ID, APP_URL)
- [ ] Discord Dev Portal ตั้ง **Interactions Endpoint URL** แล้ว (Save ผ่าน)
- [ ] เชิญบอทเข้าเซิร์ฟเวอร์พร้อมสิทธิ์ที่จำเป็น (Send, Embed, Manage Messages, Create Threads, Manage Threads, applications.commands)
- [ ] เรียก `POST /api/discord/register-commands` สำเร็จ → `/check` โชว์ใน Discord
- [ ] ตั้งค่า **Check-in Channel ID** ในหน้า Config ของเว็บ
- [ ] Sync Discord Members
- [ ] ทดสอบสร้างกิจกรรม → ส่งประกาศ → ปรากฏบน Discord ✅
- [ ] ทดสอบกดปุ่ม → Modal → เช็คอินสำเร็จ ✅
- [ ] ทดสอบ Slash `/check code:123456` ✅
- [ ] ทดสอบจบกิจกรรม → ปุ่มถูกปิดอัตโนมัติ ✅

ครบทุกข้อแล้ว = ใช้งานได้จริง บน Vercel 100% ไม่ต้องมีเครื่องค้างเลย! 🎉
