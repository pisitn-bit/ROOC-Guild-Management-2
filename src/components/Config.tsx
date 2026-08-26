import React, { useState } from 'react';
import { GuildState, Member, GuildEvent, MasterItem, DEFAULT_JOB_CLASSES } from '../types';
import { 
  Shield, 
  Settings, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Search, 
  Calendar, 
  AlertTriangle, 
  Lock, 
  Package, 
  CheckCircle2, 
  Database,
  RefreshCw,
  Bell
} from 'lucide-react';

interface ConfigProps {
  state: GuildState;
  currentUser: Member | null;
  isAdmin: boolean;
  onUpdateState: (newState: GuildState) => Promise<void>;
  onSendDiscordNotification?: (title: string, message: string, fields?: any[], color?: number) => Promise<void>;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function Config({ 
  state, 
  currentUser, 
  isAdmin, 
  onUpdateState, 
  onSendDiscordNotification,
  showAlert,
  showConfirm
}: ConfigProps) {
  const guildName = state.guildName || 'RO CLASSIC GUILD';
  const masterItems = state.masterItems || [];
  const events = state.events || [];

  // Fallback safe triggers for sandboxed iframe
  const triggerAlert = (title: string, message: string) => {
    if (showAlert) {
      showAlert(title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    if (showConfirm) {
      showConfirm(title, message, onConfirm);
    } else {
      // Fallback
      if (confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    }
  };

  // Guild Name state
  const [newGuildName, setNewGuildName] = useState(guildName);
  const [showGuildNameSuccess, setShowGuildNameSuccess] = useState(false);

  // Master Item search/filter states
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  
  // New Master Item form states
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<'material' | 'card' | 'equip' | 'consumable'>('material');

  // Master Item editing states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemType, setEditItemType] = useState<'material' | 'card' | 'equip' | 'consumable'>('material');

  // Event search/filter states
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  // Event editing states
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventType, setEditEventType] = useState<'league' | 'overrun'>('league');
  const [editEventStatus, setEditEventStatus] = useState<'active' | 'completed'>('active');

  // System PIN states
  const [newPIN, setNewPIN] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPINSuccess, setShowPINSuccess] = useState(false);

  // Admin PIN states
  const [newAdminPIN, setNewAdminPIN] = useState('');
  const [adminPinConfirm, setAdminPinConfirm] = useState('');
  const [showAdminPINSuccess, setShowAdminPINSuccess] = useState(false);



  // 1. Save Guild Name
  const handleSaveGuildName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newGuildName.trim()) {
      triggerAlert('ผิดพลาด', 'ชื่อกิลด์ไม่สามารถเป็นค่าว่างได้');
      return;
    }

    const updatedState = {
      ...state,
      guildName: newGuildName.trim(),
      lastUpdated: new Date().toISOString()
    };

    await onUpdateState(updatedState);
    setShowGuildNameSuccess(true);
    setTimeout(() => setShowGuildNameSuccess(false), 3000);

    if (onSendDiscordNotification) {
      onSendDiscordNotification(
        '⚙️ อัปเดตข้อมูลกิลด์สมาคม',
        `ชื่อกิลด์ได้รับการอัปเดตใหม่เป็น: **${newGuildName.trim()}**\nโดยผู้จัดการ: \`${currentUser?.name}\``,
        [],
        3447003
      );
    }
  };



  // 2. Add Master Item
  const handleAddMasterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!addName.trim()) return;

    const exists = masterItems.some(item => item.name.toLowerCase() === addName.trim().toLowerCase());
    if (exists) {
      triggerAlert('ผิดพลาด', 'ไอเทมนี้มีอยู่ในระบบฐานข้อมูลหลักแล้ว');
      return;
    }

    const newItem: MasterItem = {
      id: `item-${Date.now()}`,
      name: addName.trim(),
      itemType: addType
    };

    const updatedState = {
      ...state,
      masterItems: [...masterItems, newItem],
      lastUpdated: new Date().toISOString()
    };

    await onUpdateState(updatedState);
    setAddName('');
  };

  // 3. Edit Master Item
  const startEditingItem = (item: MasterItem) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemType(item.itemType);
  };

  const handleSaveItemEdit = async (id: string) => {
    if (!isAdmin) return;
    if (!editItemName.trim()) {
      triggerAlert('ผิดพลาด', 'ชื่อไอเทมไม่สามารถเป็นค่าว่างได้');
      return;
    }

    const exists = masterItems.some(item => item.id !== id && item.name.toLowerCase() === editItemName.trim().toLowerCase());
    if (exists) {
      triggerAlert('ผิดพลาด', 'มีไอเทมอื่นที่ใช้ชื่อนี้ในระบบฐานข้อมูลหลักแล้ว');
      return;
    }

    const updatedItems = masterItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          name: editItemName.trim(),
          itemType: editItemType
        };
      }
      return item;
    });

    const updatedState = {
      ...state,
      masterItems: updatedItems,
      lastUpdated: new Date().toISOString()
    };

    await onUpdateState(updatedState);
    setEditingItemId(null);
  };

  // 4. Delete Master Item
  const handleDeleteMasterItem = async (id: string) => {
    if (!isAdmin) return;
    const item = masterItems.find(mi => mi.id === id);
    if (!item) return;

    triggerConfirm(
      'ยืนยันการลบไอเทมคลัง',
      `คุณแน่ใจหรือไม่ว่าต้องการลบไอเทม "${item.name}" ออกจากระบบ?\n\nคำเตือน: การลบอาจทำให้ข้อมูลของกิจกรรมเก่าอ้างอิงชื่อเดิมเท่านั้น`,
      async () => {
        const updatedState = {
          ...state,
          masterItems: masterItems.filter(mi => mi.id !== id),
          lastUpdated: new Date().toISOString()
        };
        await onUpdateState(updatedState);
      }
    );
  };

  // 5. Edit Event Details
  const startEditingEvent = (ev: GuildEvent) => {
    setEditingEventId(ev.id);
    setEditEventTitle(ev.title);
    setEditEventDate(ev.date);
    setEditEventType(ev.type);
    setEditEventStatus(ev.status);
  };

  const handleSaveEventEdit = async (id: string) => {
    if (!isAdmin) return;
    if (!editEventTitle.trim()) {
      triggerAlert('ผิดพลาด', 'ชื่อกิจกรรมไม่สามารถเป็นค่าว่างได้');
      return;
    }

    const updatedEvents = events.map(ev => {
      if (ev.id === id) {
        return {
          ...ev,
          title: editEventTitle.trim(),
          date: editEventDate,
          type: editEventType,
          status: editEventStatus
        };
      }
      return ev;
    });

    const updatedState = {
      ...state,
      events: updatedEvents,
      lastUpdated: new Date().toISOString()
    };

    await onUpdateState(updatedState);
    setEditingEventId(null);
  };

  // 6. Delete Event
  const handleDeleteEvent = async (id: string) => {
    if (!isAdmin) return;
    const ev = events.find(e => e.id === id);
    if (!ev) return;

    triggerConfirm(
      'ยืนยันการลบกิจกรรม',
      `คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรม "${ev.title}" อย่างถาวร?\n\nข้อมูลผู้เข้าร่วมและผลการจับสรรประมูลในกิจกรรมรอบนี้จะหายไปทั้งหมด!`,
      async () => {
        const updatedState = {
          ...state,
          events: events.filter(e => e.id !== id),
          lastUpdated: new Date().toISOString()
        };
        await onUpdateState(updatedState);
      }
    );
  };

  // 7. Bulk Action: Clear Completed Events
  const handleClearCompletedEvents = async () => {
    if (!isAdmin) return;
    const completedCount = events.filter(e => e.status === 'completed').length;
    if (completedCount === 0) {
      triggerAlert('แจ้งเตือน', 'ไม่มีกิจกรรมที่ปิดรอบแล้วในระบบ');
      return;
    }

    triggerConfirm(
      'ยืนยันการล้างกิจกรรม',
      `ต้องการลบกิจกรรมที่บันทึกเสร็จสิ้นไปแล้วทั้งหมดจำนวน ${completedCount} รายการ ใช่หรือไม่?\n\nการกระทำนี้จะล้างประวัติการประมูลและผู้ร่วมกิจกรรมเก่า แต่เก็บไอเทมและผู้ร่วมปัจจุบันไว้`,
      async () => {
        const updatedState = {
          ...state,
          events: events.filter(e => e.status !== 'completed'),
          lastUpdated: new Date().toISOString()
        };
        await onUpdateState(updatedState);
        triggerAlert('สำเร็จ', `ล้างกิจกรรมที่บันทึกแล้ว ${completedCount} รายการสำเร็จ!`);
      }
    );
  };

  // 8. Bulk Action: Reset All Events (Fresh Season)
  const handleResetAllEvents = async () => {
    if (!isAdmin) return;
    if (events.length === 0) return;

    triggerConfirm(
      '🔥 ยืนยันการรีเซ็ตระบบขั้นวิกฤต',
      'คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมทั้งหมดในระบบ?\n\nการดำเนินการนี้จะลบกิจกรรมทั้งสถานะที่เปิดใช้งานอยู่และบันทึกเสร็จแล้วทิ้งทั้งหมดเพื่อเริ่มฤดูกาลใหม่!',
      async () => {
        const updatedState = {
          ...state,
          events: [],
          lastUpdated: new Date().toISOString()
        };
        await onUpdateState(updatedState);
        triggerAlert('สำเร็จ', 'ล้างข้อมูลกิจกรรมทั้งหมดเรียบร้อยแล้ว!');
      }
    );
  };

  // 9. Save System PIN
  const handleSavePIN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (newPIN.length < 4) {
      triggerAlert('ผิดพลาด', 'รหัส PIN ของกิลด์ควรมีความยาวอย่างน้อย 4 ตัวอักษรหรือตัวเลข');
      return;
    }

    if (newPIN !== pinConfirm) {
      triggerAlert('ผิดพลาด', 'รหัสผ่านและการยืนยันรหัสไม่ตรงกัน');
      return;
    }

    const updatedState = {
      ...state,
      systemPIN: newPIN,
      lastUpdated: new Date().toISOString()
    };

    await onUpdateState(updatedState);
    setNewPIN('');
    setPinConfirm('');
    setShowPINSuccess(true);
    setTimeout(() => setShowPINSuccess(false), 3000);
  };

  // Save Admin PIN
  const handleSaveAdminPIN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (newAdminPIN.length < 4) {
      triggerAlert('ผิดพลาด', 'รหัสผ่าน Admin PIN ควรมีความยาวอย่างน้อย 4 ตัวอักษรหรือตัวเลข');
      return;
    }

    if (newAdminPIN !== adminPinConfirm) {
      triggerAlert('ผิดพลาด', 'รหัสผ่านและการยืนยันรหัสไม่ตรงกัน');
      return;
    }

    const updatedState = {
      ...state,
      adminPIN: newAdminPIN,
      lastUpdated: new Date().toISOString()
    };

    await onUpdateState(updatedState);
    setNewAdminPIN('');
    setAdminPinConfirm('');
    setShowAdminPINSuccess(true);
    setTimeout(() => setShowAdminPINSuccess(false), 3000);
  };

  // Filtering lists
  const filteredItems = masterItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(itemSearchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'all' || item.itemType === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.title.toLowerCase().includes(eventSearchQuery.toLowerCase());
    const matchesType = eventTypeFilter === 'all' || ev.type === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6" id="config-tab">
      
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-black text-white tracking-tight">แผงตั้งค่าและควบคุมฐานข้อมูลระบบ (Config Tab)</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              จัดการชื่อกิลด์, รายชื่อคลังไอเทมฐานข้อมูลหลัก (Master Items), จัดการแก้ไขข้อมูลกิจกรรมย้อนหลัง, ปลดล็อกสลับสถานะ หรือล้างรีเซ็ตซีซั่นใหม่
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 px-4.5 py-2.5 rounded-2xl flex items-center gap-3">
            <Database className="w-5 h-5 text-amber-500" />
            <div className="text-left font-mono">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">ฐานข้อมูลหลัก</div>
              <div className="text-xs font-bold text-slate-300 mt-0.5">
                ไอเทม: {masterItems.length} ชิ้น | กิจกรรม: {events.length} รอบ
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-950/40 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="font-extrabold">คุณล็อกอินด้วยสิทธิ์ "สมาชิกทั่วไป"</p>
            <p className="font-medium text-slate-400">
              หน้าจัดการตั้งค่าระบบถูกสงวนไว้สำหรับ "หัวหน้ากิลด์ (Admin)" เท่านั้น ในสถานะสมาชิกทั่วไป คุณสามารถดูรายชื่อคลังไอเทมหลักและประวัติรายการกิจกรรมที่มีอยู่เท่านั้น แต่ไม่สามารถทำรายการเพิ่ม ลบ หรือแก้ไขข้อมูลได้
            </p>
          </div>
        </div>
      )}

      {/* Grid Layout for Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Guild Info & Security PIN */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. GUILD NAME EDIT */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
              <Shield className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-black text-slate-200">แก้ไขข้อมูลสมาคม (Guild Identity)</h3>
            </div>

            <form onSubmit={handleSaveGuildName} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-400 block">ชื่อกิลด์หลักประจำระบบ</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={newGuildName}
                  onChange={e => setNewGuildName(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  placeholder="ตัวอย่างเช่น RO CLASSIC GUILD"
                />
                <p className="text-[10px] text-slate-500">ชื่อกิลด์จะแสดงที่ส่วนหัวของแอปพลิเคชันและในสรุปรายงานของ Discord Webhook</p>
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  บันทึกชื่อกิลด์ใหม่
                </button>
              )}
            </form>

            {showGuildNameSuccess && (
              <div className="bg-emerald-950/50 border border-emerald-500/25 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-pulse">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>บันทึกชื่อกิลด์สำเร็จและรีเฟรชระบบแล้ว !</span>
              </div>
            )}
          </div>

          {/* 2. SYSTEM SECURITY PIN MANAGEMENT */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
              <Lock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black text-slate-200">แก้ไขรหัสลับประจำกิลด์ (Security PINs)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Member PIN Section */}
              <div className="space-y-3.5 border-r border-slate-800/50 pr-0 md:pr-6">
                <h4 className="text-xs font-black text-blue-400">สำหรับสมาชิกทั่วไป (Member PIN)</h4>
                <form onSubmit={handleSavePIN} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-400 block font-sans">รหัส PIN สมาชิกใหม่ (New Member PIN)</label>
                    <input
                      type="password"
                      disabled={!isAdmin}
                      value={newPIN}
                      onChange={e => setNewPIN(e.target.value)}
                      className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 text-xs text-center font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50 font-bold"
                      placeholder="กรอกรหัสผ่านใหม่"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-400 block font-sans">ยืนยันรหัส PIN (Confirm PIN)</label>
                    <input
                      type="password"
                      disabled={!isAdmin}
                      value={pinConfirm}
                      onChange={e => setPinConfirm(e.target.value)}
                      className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 text-xs text-center font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50 font-bold"
                      placeholder="กรอกเพื่อยืนยันอีกครั้ง"
                    />
                  </div>

                  {isAdmin ? (
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      เปลี่ยนรหัสผ่าน Member PIN
                    </button>
                  ) : (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-center">
                      <span className="text-[11px] font-mono font-bold text-slate-500">PIN ปัจจุบัน: **** (ซ่อนไว้)</span>
                    </div>
                  )}
                </form>

                {showPINSuccess && (
                  <div className="bg-emerald-950/50 border border-emerald-500/25 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-pulse">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>เปลี่ยนรหัส Member PIN สำเร็จ!</span>
                  </div>
                )}
              </div>

              {/* Admin PIN Section */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-black text-amber-500">สำหรับผู้ดูแลระบบ (Admin PIN)</h4>
                <form onSubmit={handleSaveAdminPIN} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-400 block font-sans">รหัส PIN แอดมินใหม่ (New Admin PIN)</label>
                    <input
                      type="password"
                      disabled={!isAdmin}
                      value={newAdminPIN}
                      onChange={e => setNewAdminPIN(e.target.value)}
                      className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 text-xs text-center font-mono focus:outline-none focus:border-amber-500 disabled:opacity-50 font-bold"
                      placeholder="กรอกรหัสผ่านใหม่"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-400 block font-sans">ยืนยันรหัส PIN (Confirm PIN)</label>
                    <input
                      type="password"
                      disabled={!isAdmin}
                      value={adminPinConfirm}
                      onChange={e => setAdminPinConfirm(e.target.value)}
                      className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 text-xs text-center font-mono focus:outline-none focus:border-amber-500 disabled:opacity-50 font-bold"
                      placeholder="กรอกเพื่อยืนยันอีกครั้ง"
                    />
                  </div>

                  {isAdmin ? (
                    <button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      เปลี่ยนรหัสผ่าน Admin PIN
                    </button>
                  ) : (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-center">
                      <span className="text-[11px] font-mono font-bold text-slate-500">PIN ปัจจุบัน: **** (ซ่อนไว้)</span>
                    </div>
                  )}
                </form>

                {showAdminPINSuccess && (
                  <div className="bg-emerald-950/50 border border-emerald-500/25 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-pulse">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>เปลี่ยนรหัส Admin PIN สำเร็จ!</span>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* 3. QUICK DISCORD BOT STATUS AND BULK CLEANUP */}
          {isAdmin && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-black text-red-400">ควบคุมข้อมูลฤดูกาล (Season Cleanup)</h3>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={handleClearCompletedEvents}
                  className="w-full bg-slate-950 hover:bg-red-950/20 text-red-400 hover:text-red-300 font-bold py-2.5 rounded-xl text-xs transition-colors border border-red-900/30 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบกิจกรรมที่เสร็จสิ้นแล้วทั้งหมด
                </button>

                <button
                  onClick={handleResetAllEvents}
                  className="w-full bg-red-950/40 hover:bg-red-900/40 text-red-200 font-extrabold py-3 rounded-xl text-xs transition-colors border border-red-500/20 flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ล้างข้อมูลกิจกรรมทั้งหมด (Fresh Reset)
                </button>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Master Items and Activities Manager */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SECTION 4: MASTER ITEMS MANAGER */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black text-slate-200">จัดการคลังของรางวัล/ไอเทมหลัก (Master Data Items)</h3>
              </div>
              <span className="text-[10px] bg-blue-950 text-blue-400 px-2.5 py-1 rounded-full font-bold border border-blue-500/10 shrink-0 self-start sm:self-auto">
                จำนวนทั้งหมด: {masterItems.length} ไอเทม
              </span>
            </div>

            {/* ADD MASTER ITEM FORM */}
            {isAdmin && (
              <form onSubmit={handleAddMasterItem} className="bg-slate-950 p-3 rounded-2xl border border-slate-850 flex flex-col sm:flex-row gap-3">
                <div className="flex-grow flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    className="bg-slate-900 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500 flex-grow"
                    placeholder="กรอกชื่อไอเทมใหม่ (เช่น การ์ดแมงทอง, ขวานยักษ์ [2])"
                  />
                  <select
                    value={addType}
                    onChange={e => setAddType(e.target.value as any)}
                    className="bg-slate-900 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500 min-w-[130px]"
                  >
                    <option value="material">วัตถุดิบ (Material)</option>
                    <option value="card">การ์ด (Card)</option>
                    <option value="equip">อุปกรณ์ (Equip)</option>
                    <option value="consumable">ของบริโภค (Consumable)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มไอเทมเข้าระบบ
                </button>
              </form>
            )}

            {/* MASTER ITEMS FILTER & SEARCH */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อไอเทมหลัก..."
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-850 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 whitespace-nowrap scrollbar-none">
                {['all', 'material', 'card', 'equip', 'consumable'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedTypeFilter === type
                        ? 'bg-blue-950 text-blue-400 border-blue-500/20 shadow-inner font-extrabold'
                        : 'bg-slate-950 text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                  >
                    {type === 'all' && 'ทั้งหมด'}
                    {type === 'material' && 'วัตถุดิบ'}
                    {type === 'card' && 'การ์ด'}
                    {type === 'equip' && 'อุปกรณ์'}
                    {type === 'consumable' && 'บริโภค'}
                  </button>
                ))}
              </div>
            </div>

            {/* MASTER ITEMS LIST TABLE/LIST */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center italic">ไม่พบไอเทมที่ค้นหา</p>
              ) : (
                <div className="divide-y divide-slate-850">
                  {filteredItems.map(item => {
                    const isEditingItem = editingItemId === item.id;
                    return (
                      <div key={item.id} className="p-3 flex justify-between items-center hover:bg-slate-850/10 transition-colors text-xs gap-3">
                        {isEditingItem ? (
                          <div className="flex-grow flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={editItemName}
                              onChange={e => setEditItemName(e.target.value)}
                              className="bg-slate-900 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500 flex-grow"
                            />
                            <select
                              value={editItemType}
                              onChange={e => setEditItemType(e.target.value as any)}
                              className="bg-slate-900 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                            >
                              <option value="material">วัตถุดิบ (Material)</option>
                              <option value="card">การ์ด (Card)</option>
                              <option value="equip">อุปกรณ์ (Equip)</option>
                              <option value="consumable">ของบริโภค (Consumable)</option>
                            </select>
                          </div>
                        ) : (
                          <div>
                            <span className="font-extrabold text-slate-200">{item.name}</span>
                            <span className={`ml-2 px-1.5 py-0.2 rounded font-bold text-[8.5px] uppercase tracking-wider ${
                              item.itemType === 'card' ? 'bg-purple-950/60 text-purple-400 border border-purple-500/15' :
                              item.itemType === 'equip' ? 'bg-amber-950/60 text-amber-400 border border-amber-500/15' :
                              item.itemType === 'consumable' ? 'bg-blue-950/60 text-blue-400 border border-blue-500/15' :
                              'bg-slate-950 text-slate-400'
                            }`}>
                              {item.itemType === 'material' ? 'วัตถุดิบ' :
                               item.itemType === 'card' ? 'การ์ด' :
                               item.itemType === 'equip' ? 'อุปกรณ์' : 'บริโภค'}
                            </span>
                          </div>
                        )}

                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            {isEditingItem ? (
                              <>
                                <button
                                  onClick={() => handleSaveItemEdit(item.id)}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-md"
                                  title="บันทึก"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingItemId(null)}
                                  className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                                  title="ยกเลิก"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditingItem(item)}
                                  className="text-slate-400 hover:text-blue-400 p-1.5 rounded hover:bg-slate-900 transition-colors"
                                  title="แก้ไขไอเทมหลัก"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMasterItem(item.id)}
                                  className="text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-slate-900 transition-colors"
                                  title="ลบไอเทม"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: ACTIVITIES / EVENTS CONFIGURATION */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black text-slate-200">แก้ไขข้อมูลกิจกรรมย้อนหลัง (Guild Activities Master)</h3>
              </div>
              <span className="text-[10px] bg-blue-950 text-blue-400 px-2.5 py-1 rounded-full font-bold border border-blue-500/10 shrink-0 self-start sm:self-auto">
                จำนวนกิจกรรมทั้งหมด: {events.length} กิจกรรม
              </span>
            </div>

            {/* EVENT SEARCH / FILTER */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อกิจกรรมรอบนี้..."
                  value={eventSearchQuery}
                  onChange={e => setEventSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-850 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
                {['all', 'league', 'overrun'].map(type => (
                  <button
                    key={type}
                    onClick={() => setEventTypeFilter(type)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      eventTypeFilter === type
                        ? 'bg-blue-950 text-blue-400 border-blue-500/20 shadow-inner font-extrabold'
                        : 'bg-slate-950 text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                  >
                    {type === 'all' && 'ทั้งหมด'}
                    {type === 'league' && '🛡️ Guild League'}
                    {type === 'overrun' && '🔥 OverRun'}
                  </button>
                ))}
              </div>
            </div>

            {/* ACTIVITIES TABLE LIST */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-10 text-center italic">ไม่มีข้อมูลกิจกรรมตรงตามที่ค้นหา</p>
              ) : (
                <div className="divide-y divide-slate-850">
                  {filteredEvents.map(ev => {
                    const isEditingEvent = editingEventId === ev.id;
                    const assignedDropsCount = ev.drops.filter(d => d.assignedToMemberId).length;
                    
                    return (
                      <div key={ev.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-850/10 transition-colors text-xs gap-3">
                        {isEditingEvent ? (
                          <div className="flex-grow space-y-2 max-w-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold block">ชื่อหัวข้อกิจกรรม</label>
                                <input
                                  type="text"
                                  value={editEventTitle}
                                  onChange={e => setEditEventTitle(e.target.value)}
                                  className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-800 font-bold focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold block">วันที่ทำกิจกรรม</label>
                                <input
                                  type="date"
                                  value={editEventDate}
                                  onChange={e => setEditEventDate(e.target.value)}
                                  className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-800 font-semibold focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold block">ประเภทกิจกรรม</label>
                                <select
                                  value={editEventType}
                                  onChange={e => setEditEventType(e.target.value as any)}
                                  className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-800 focus:outline-none"
                                >
                                  <option value="league">🛡️ Guild League</option>
                                  <option value="overrun">🔥 OverRun</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold block">สถานะรอบกิจกรรม</label>
                                <select
                                  value={editEventStatus}
                                  onChange={e => setEditEventStatus(e.target.value as any)}
                                  className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-800 focus:outline-none"
                                >
                                  <option value="active">🟢 กำลังรันประมูล (Active)</option>
                                  <option value="completed">🔴 ปิดยอด/ส่ง Discord (Completed)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-200 text-sm">{ev.title}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                ev.type === 'league' ? 'bg-blue-950/65 text-blue-400 border border-blue-500/15' : 'bg-orange-950/65 text-orange-400 border border-orange-500/15'
                              }`}>
                                {ev.type === 'league' ? 'Guild League' : 'OverRun'}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                ev.status === 'completed' ? 'bg-red-950 text-red-400 border border-red-500/15' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/15 animate-pulse'
                              }`}>
                                {ev.status === 'completed' ? 'ปิดรอบแล้ว' : 'กำลังประมูล'}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {ev.date}
                              </span>
                              <span>•</span>
                              <span>ผู้เข้าร่วมรอบนี้: <strong className="text-slate-300 font-extrabold">{ev.participants?.length || 0} คน</strong></span>
                              <span>•</span>
                              <span>ของรางวัลดรอป: <strong className="text-blue-400 font-extrabold">{ev.drops?.length || 0} ชิ้น</strong> (จับสรรได้ {assignedDropsCount} ชิ้น)</span>
                            </div>
                          </div>
                        )}

                        {isAdmin && (
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            {isEditingEvent ? (
                              <>
                                <button
                                  onClick={() => handleSaveEventEdit(ev.id)}
                                  className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors shadow-md flex items-center gap-1 font-bold"
                                  title="บันทึกข้อมูล"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>บันทึก</span>
                                </button>
                                <button
                                  onClick={() => setEditingEventId(null)}
                                  className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors"
                                  title="ยกเลิก"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditingEvent(ev)}
                                  className="text-slate-400 hover:text-blue-400 p-2 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
                                  title="แก้ไขข้อมูลกิจกรรม"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(ev.id)}
                                  className="text-slate-400 hover:text-red-400 p-2 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
                                  title="ลบกิจกรรมออกถาวร"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
