import React, { useState } from 'react';
import { GuildState, DiscordConfig } from '../types';
import { 
  Bell, 
  Settings, 
  Send, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';

interface DiscordSettingsProps {
  state: GuildState;
  isAdmin: boolean;
  onUpdateState: (newState: GuildState) => void;
  onSendDiscordNotification: (title: string, message: string, fields: any[], color: number) => void;
  showAlert?: (title: string, message: string) => void;
}

export default function DiscordSettings({ 
  state, 
  isAdmin, 
  onUpdateState, 
  onSendDiscordNotification,
  showAlert 
}: DiscordSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState(state.discordConfig.webhookUrl || '');
  const [webhookUrlLeaves, setWebhookUrlLeaves] = useState(state.discordConfig.webhookUrlLeaves || '');
  const [webhookUrlEvents, setWebhookUrlEvents] = useState(state.discordConfig.webhookUrlEvents || '');
  const [webhookUrlRaffles, setWebhookUrlRaffles] = useState(state.discordConfig.webhookUrlRaffles || '');
  const [botName, setBotName] = useState(state.discordConfig.botName || '');
  const [enabled, setEnabled] = useState(state.discordConfig.enabled);
  const [botToken, setBotToken] = useState(state.discordConfig.botToken || '');
  const [guildId, setGuildId] = useState(state.discordConfig.guildId || '');
  const [autoSync, setAutoSync] = useState(state.discordConfig.autoSync || false);
  const [checkInChannelId, setCheckInChannelId] = useState(state.discordConfig.checkInChannelId || '');

  const [showWebhook, setShowWebhook] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isTesting, setIsTesting] = useState(false);

  const triggerAlert = (title: string, message: string) => {
    if (showAlert) {
      showAlert(title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  };

  const handleSaveConfig = () => {
    onUpdateState({
      ...state,
      discordConfig: {
        webhookUrl: webhookUrl.trim(),
        webhookUrlLeaves: webhookUrlLeaves.trim(),
        webhookUrlEvents: webhookUrlEvents.trim(),
        webhookUrlRaffles: webhookUrlRaffles.trim(),
        botName: botName.trim(),
        enabled,
        botToken: botToken.trim(),
        guildId: guildId.trim(),
        autoSync,
        checkInChannelId: checkInChannelId.trim()
      }
    });
    triggerAlert('สำเร็จ', 'บันทึกการตั้งค่า Discord สำเร็จแล้ว !');
  };

  // 2. Test sending notification
  const handleTestNotification = async () => {
    const urlsToTest = [
      { name: 'ประกาศทั่วไป/ดีฟอลต์ (Default)', url: webhookUrl, type: 'default' },
      { name: 'การแจ้งเตือนขอแจ้งลา (Leaves)', url: webhookUrlLeaves, type: 'leaves' },
      { name: 'การประกาศกิจกรรม (Events)', url: webhookUrlEvents, type: 'events' },
      { name: 'ผลการสุ่มวงล้อ/ประมูล (Raffles)', url: webhookUrlRaffles, type: 'raffles' }
    ].filter(item => item.url.trim() !== '');

    if (urlsToTest.length === 0) {
      triggerAlert('คำเตือน', 'กรุณากรอก Webhook URL อย่างน้อยหนึ่งช่องทางก่อนทดสอบส่ง');
      return;
    }

    setIsTesting(true);
    setTestStatus({ type: null, message: '' });

    let successCount = 0;
    const errors: string[] = [];

    for (const test of urlsToTest) {
      try {
        const response = await fetch("/api/discord-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `🧪 ทดสอบการเชื่อมต่อ: ${test.name}`,
            message: `บอทกิลด์ RO Classic เชื่อมต่อผ่าน Webhook สำเร็จเรียบร้อยดี! ข้อความนี้ส่งไปยังช่อง ${test.name}`,
            fields: [
              { name: "📡 ประเภทช่องทาง", value: `ห้อง ${test.name}`, inline: true },
              { name: "🛠️ ผู้รับสิทธิ์ทดสอบ", value: botName || "บอทกิลด์", inline: true }
            ],
            color: 3066993, // Green
            webhookUrlOverride: test.url.trim()
          })
        });

        const data = await response.json();
        if (data.success) {
          successCount++;
        } else {
          errors.push(`${test.name}: ${data.message}`);
        }
      } catch (e: any) {
        errors.push(`${test.name}: ${e?.message || e}`);
      }
    }

    if (errors.length === 0) {
      setTestStatus({
        type: 'success',
        message: `ส่งข้อความทดสอบไปยัง Discord (${successCount} ช่องทาง) สำเร็จเรียบร้อยดี!`
      });
    } else {
      setTestStatus({
        type: 'error',
        message: `ส่งสำเร็จ ${successCount} ช่องทาง, ล้มเหลว ${errors.length} ช่องทาง:\n${errors.join('\n')}`
      });
    }
    setIsTesting(false);
  };

  return (
    <div className="space-y-6" id="discord-tab">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
          <Bell className="text-blue-400 w-6 h-6" />
          ระบบเชื่อมต่อการแจ้งเตือน Discord (Discord Bot Integration)
        </h2>
        <p className="text-xs text-slate-400">
          แจ้งผลสรุปการประมูล และผู้โชคดีวงล้อสุ่มไอเทมตรงเข้าดิสคอร์ดกิลด์ทันทีเพื่อความโปร่งใสในกลุ่มสมาชิก
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Settings Form Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-300 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-400" />
              การตั้งค่าบอท Discord Webhook
            </h3>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-850">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200 block">เปิดใช้งานการแจ้งเตือนอัตโนมัติ</span>
                <span className="text-[10px] text-slate-500 block">ส่งข้อความลง Discord อัตโนมัติเมื่อจบประมูลหรือสุ่มวงล้อ</span>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="w-10 h-5 bg-slate-800 checked:bg-blue-500 rounded-full cursor-pointer accent-blue-500"
              />
            </div>

            {/* Webhook URLs Input Block */}
            <div className="space-y-3.5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 flex items-center gap-1">
                  🌐 Webhook URL หลัก (Default / Fallback ช่องทางหลัก)
                </label>
                <div className="relative">
                  <input
                    type={showWebhook ? "text" : "password"}
                    disabled={!isAdmin}
                    placeholder="https://discord.com/api/webhooks/..."
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 pl-3 pr-10 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhook(!showWebhook)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 flex items-center gap-1">
                  🚗 Webhook URL สำหรับการแจ้งขอลา (Leaves Channel)
                </label>
                <input
                  type={showWebhook ? "text" : "password"}
                  disabled={!isAdmin}
                  placeholder="หากเว้นว่างไว้จะส่งเข้าช่องทางหลัก"
                  value={webhookUrlLeaves}
                  onChange={e => setWebhookUrlLeaves(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 flex items-center gap-1">
                  📢 Webhook URL สำหรับการประกาศกิจกรรมกิลด์ (Events Channel)
                </label>
                <input
                  type={showWebhook ? "text" : "password"}
                  disabled={!isAdmin}
                  placeholder="หากเว้นว่างไว้จะส่งเข้าช่องทางหลัก"
                  value={webhookUrlEvents}
                  onChange={e => setWebhookUrlEvents(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 flex items-center gap-1">
                  🏆 Webhook URL สำหรับผลการสุ่ม/ประมูล (Raffle & Spin Wheel Results)
                </label>
                <input
                  type={showWebhook ? "text" : "password"}
                  disabled={!isAdmin}
                  placeholder="หากเว้นว่างไว้จะส่งเข้าช่องทางหลัก"
                  value={webhookUrlRaffles}
                  onChange={e => setWebhookUrlRaffles(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

            </div>

            {/* Bot Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block">ชื่อแสดงผลของบอท (Bot Display Name)</label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="เช่น บอทกิลด์ RO Classic"
                value={botName}
                onChange={e => setBotName(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold"
              />
            </div>

            {/* Discord Bot Member Sync Settings Block */}
            <div className="border-t border-slate-800 pt-4 mt-4 space-y-3.5">
              <h3 className="font-bold text-xs text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Users className="w-4 h-4 text-emerald-400" />
                ตั้งค่าระบบซิงค์รายชื่อสมาชิก (Discord Member Sync Bot)
              </h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 flex items-center gap-1">
                  🔑 Discord Bot Token
                </label>
                <input
                  type={showWebhook ? "text" : "password"}
                  disabled={!isAdmin}
                  placeholder={isAdmin ? "ใส่ Bot Token ของดิสคอร์ดบอทที่นี่" : "มีโทเค็นบอทบันทึกในระบบแล้ว"}
                  value={botToken}
                  onChange={e => setBotToken(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-500">
                  โทเค็นบอทจาก Discord Developer Portal (จำเป็นต้องเปิดใช้ Server Members Intent)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 flex items-center gap-1">
                  🆔 Server ID (Guild ID)
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  placeholder="เช่น 123456789012345678"
                  value={guildId}
                  onChange={e => setGuildId(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-500">
                  ไอดีของดิสคอร์ดเซิร์ฟเวอร์ (คลิกขวาที่ชื่อเซิร์ฟเวอร์ดิสคอร์ดแล้วเลือก Copy Server ID)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 flex items-center gap-1">
                  💬 ช่องสำหรับเช็คอินกิลด์วอร์ (Check-In Channel ID)
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  placeholder="เช่น 123456789012345678"
                  value={checkInChannelId}
                  onChange={e => setCheckInChannelId(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-500">
                  ไอดีช่องสำหรับให้บอทส่งปุ่ม มาวอร์/ลา และรับการพิมพ์คำสั่งเช็คอิน `/check` เพื่อนำรายชื่อเข้าคิว
                </p>
              </div>

              {/* Toggles for Bot Sync */}
              <div className="grid grid-cols-1 gap-3.5">
                <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-850">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">อัปเดตสมาชิกอัตโนมัติ</span>
                    <span className="text-[9px] text-slate-500 block">ซิงค์อัตโนมัติเมื่อเปิดหน้าทำเนียบ</span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={autoSync}
                    onChange={e => setAutoSync(e.target.checked)}
                    className="w-9 h-4 bg-slate-800 checked:bg-emerald-500 rounded-full cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Save & Test Buttons */}
            {isAdmin ? (
              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold py-3 rounded-xl text-xs transition-all border border-blue-500/20 shadow-lg"
                  id="save-discord-btn"
                >
                  บันทึกการตั้งค่าบอท
                </button>
                <button
                  onClick={handleTestNotification}
                  disabled={isTesting}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750 font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  id="test-discord-btn"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isTesting ? 'กำลังทดสอบ...' : 'ทดสอบส่งข้อความ'}
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-red-400 italic font-semibold">
                * เฉพาะหัวหน้ากิลด์ (Admin) เท่านั้นที่สามารถแก้ไขและทดสอบการตั้งค่าบอท Discord Webhook ได้
              </p>
            )}

            {/* Test Status feedback */}
            {testStatus.type && (
              <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border ${
                testStatus.type === 'success' 
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20' 
                  : 'bg-red-950/40 text-red-300 border-red-500/20'
              }`}>
                {testStatus.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
                <p className="font-semibold leading-normal">{testStatus.message}</p>
              </div>
            )}

          </div>
        </div>

        {/* Instructions Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-3.5 text-xs text-slate-300 leading-relaxed">
            <h3 className="font-bold text-slate-200 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-yellow-500" />
              วิธีขอ Webhook URL เพื่อนำมาเชื่อมต่อ
            </h3>
            
            <ol className="list-decimal pl-4 space-y-2 text-slate-400">
              <li>
                เปิดแอปพลิเคชัน <strong>Discord</strong> บนคอมพิวเตอร์ของคุณ
              </li>
              <li>
                ไปที่ห้องแชท (Text Channel) ที่ต้องการรับข่าวสารของกิลด์ เช่น ห้อง <span className="text-yellow-400 font-bold">#ประมูลกิลด์</span>
              </li>
              <li>
                คลิกขวาที่ชื่อห้องแชทแล้วเลือก <strong>"แก้ไขช่องแชท" (Edit Channel)</strong>
              </li>
              <li>
                ไปที่หัวข้อ <strong>"การเชื่อมต่อภายนอก" (Integrations)</strong> ทางด้านซ้าย
              </li>
              <li>
                คลิกที่ปุ่ม <strong>"ดูเว็บฮุค" (Webhooks)</strong> จากนั้นกดปุ่ม <strong>"เว็บฮุคใหม่" (New Webhook)</strong>
              </li>
              <li>
                ตั้งชื่อบอทตามต้องการ และเลือกห้องรับข่าวสารให้ถูกต้อง
              </li>
              <li>
                คลิกที่ปุ่ม <strong>"คัดลอก URL ของเว็บฮุค" (Copy Webhook URL)</strong> แล้วนำมาวางลงในช่องซ้ายมือในแอปนี้ !
              </li>
            </ol>

            <div className="bg-blue-950/30 border border-blue-500/20 p-3 rounded-xl mt-4">
              <p className="text-[11px] text-blue-400 font-medium">
                💡 ข้อดี: สมาชิกในห้องแชทจะเห็นภาพรวมการประมูล ราคาปิด และคนชนะทันทีโดยไม่ต้องเข้าแอปตลอดเวลา ช่วยเพิ่มความโปร่งใสและกระตุ้นการร่วมสงครามอย่างยิ่งยวด !
              </p>
            </div>
          </div>

          {/* Sync Bot Instructions */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-3.5 text-xs text-slate-300 leading-relaxed">
            <h3 className="font-bold text-slate-250 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-emerald-500" />
              วิธีติดตั้ง Discord Bot สำหรับซิงค์รายชื่อสมาชิก
            </h3>
            
            <ol className="list-decimal pl-4 space-y-2 text-slate-400">
              <li>
                ไปที่เว็บ <strong>Discord Developer Portal</strong> (discord.com/developers/applications)
              </li>
              <li>
                กด <strong>"New Application"</strong> และตั้งชื่อ เช่น <code>RO Guild Sync Bot</code>
              </li>
              <li>
                ไปที่แถบ <strong>"Bot"</strong> จากนั้นกดปุ่ม <strong>"Reset Token"</strong> เพื่อคัดลอกโทเค็น (Bot Token) มาใส่ในระบบจัดการ
              </li>
              <li>
                เลื่อนลงมาด้านล่างในหัวข้อ <strong>"Privileged Gateway Intents"</strong> แล้วเปิดใช้งานสิทธิ์ <strong>"Server Members Intent"</strong> (จำเป็นมาก ⚠️) จากนั้นบันทึกการตั้งค่า
              </li>
              <li>
                ไปที่แถบ <strong>"OAuth2"</strong> &gt; <strong>"URL Generator"</strong>
              </li>
              <li>
                ในช่อง Scope เลือก <code>bot</code> และใน Bot Permissions เลือก <code>Manage Roles</code> หรือ <code>Read Members</code> จากนั้นคัดลอกลิงก์ด้านล่างเพื่อเปิดเบราว์เซอร์เชิญบอทเข้าสู่เซิร์ฟเวอร์ดิสคอร์ดกิลด์
              </li>
              <li>
                คัดลอก <strong>Server ID (Guild ID)</strong> มาใส่ในระบบจัดการและกดบันทึกการตั้งค่า !
              </li>
            </ol>
          </div>
        </div>

      </div>

    </div>
  );
}
