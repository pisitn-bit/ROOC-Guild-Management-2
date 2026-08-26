import React, { useState, useEffect } from 'react';
import { GuildState, Member, DEFAULT_JOB_CLASSES } from '../types';
import { 
  Users, 
  Plus, 
  UserPlus, 
  Trash2, 
  Coins, 
  ShieldAlert, 
  Calendar, 
  Check, 
  Key,
  Shield,
  ShieldCheck,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Info,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface MembersProps {
  state: GuildState;
  currentUser: Member | null;
  isAdmin: boolean;
  onUpdateState: (newState: GuildState) => void;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function Members({ state, currentUser, isAdmin, onUpdateState, showAlert, showConfirm }: MembersProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [tempPIN, setTempPIN] = useState(state.systemPIN);
  const [tempAdminPIN, setTempAdminPIN] = useState(state.adminPIN || 'ro-admin-5678');
  const [showPINSuccess, setShowPINSuccess] = useState(false);
  const [showAdminPINSuccess, setShowAdminPINSuccess] = useState(false);
  const [isSyncingDiscord, setIsSyncingDiscord] = useState(false);

  const handleSyncDiscord = async () => {
    if (!state.discordConfig.botToken || !state.discordConfig.guildId) {
      triggerAlert(
        'ไม่ได้ตั้งค่าการซิงค์', 
        'กรุณาเข้าไปตั้งค่า Discord Bot Token และ Server ID (Guild ID) ในแท็บ "ตั้งค่า Discord บอท" ก่อนใช้งานระบบซิงค์สมาชิก'
      );
      return;
    }

    setIsSyncingDiscord(true);
    try {
      const response = await fetch("/api/discord/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success) {
        onUpdateState({
          ...state,
          members: data.members,
          discordConfig: {
            ...state.discordConfig,
            lastSyncTime: data.lastSyncTime
          }
        });
        triggerAlert('สำเร็จ', data.message);
      } else {
        triggerAlert('ล้มเหลว', data.message || 'ไม่สามารถซิงค์ข้อมูลจาก Discord ได้');
      }
    } catch (e: any) {
      triggerAlert('ข้อผิดพลาด', `ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์: ${e?.message || e}`);
    } finally {
      setIsSyncingDiscord(false);
    }
  };

  const handleAutoSyncDiscord = async () => {
    try {
      const response = await fetch("/api/discord/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success) {
        onUpdateState({
          ...state,
          members: data.members,
          discordConfig: {
            ...state.discordConfig,
            lastSyncTime: data.lastSyncTime
          }
        });
        console.log("Auto-sync with Discord completed successfully");
      }
    } catch (e) {
      console.warn("Failed auto-sync with Discord:", e);
    }
  };

  useEffect(() => {
    if (isAdmin && state.discordConfig.botToken && state.discordConfig.guildId && state.discordConfig.autoSync) {
      const lastSync = state.discordConfig.lastSyncTime;
      const oneHour = 60 * 60 * 1000;
      const shouldSync = !lastSync || (Date.now() - new Date(lastSync).getTime() > oneHour);
      if (shouldSync) {
        handleAutoSyncDiscord();
      }
    }
  }, []);

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
      if (confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    }
  };

  // Editing state for members
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDelFlag, setEditDelFlag] = useState(true);

  // Helper to start editing a member
  const startEditing = (member: Member) => {
    setEditingMemberId(member.id);
    setEditName(member.name);
    setEditDelFlag(member.del_flag ?? true);
  };

  // Helper to save member edit
  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      triggerAlert('ผิดพลาด', 'ชื่อตัวละครไม่สามารถเป็นค่าว่างได้');
      return;
    }

    // Check duplicate name
    const exists = state.members.some(m => m.id !== id && m.name.toLowerCase() === editName.trim().toLowerCase());
    if (exists) {
      triggerAlert('ผิดพลาด', 'มีชื่อสมาชิกนี้อยู่ในกิลด์แล้ว');
      return;
    }

    const updatedMembers = state.members.map(m => {
      if (m.id === id) {
        return {
          id: m.id,
          name: editName.trim(),
          del_flag: editDelFlag
        } as Member;
      }
      return m;
    });

    onUpdateState({
      ...state,
      members: updatedMembers
    });

    setEditingMemberId(null);
  };

  // 1. Add new guild member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    // Check if name already exists
    const exists = state.members.some(m => m.name.toLowerCase() === newMemberName.trim().toLowerCase());
    if (exists) {
      triggerAlert('ผิดพลาด', 'มีชื่อสมาชิกนี้อยู่ในกิลด์แล้ว');
      return;
    }

    const createdMember: Member = {
      id: `mem-${Date.now()}`,
      name: newMemberName.trim(),
      del_flag: true
    };

    onUpdateState({
      ...state,
      members: [...state.members, createdMember]
    });

    setNewMemberName('');
    setShowAddForm(false);
  };

  // 2. Delete member
  const handleDeleteMember = (id: string) => {
    if (id === currentUser?.id) {
      triggerAlert('ปฏิเสธการเข้าถึง', 'คุณไม่สามารถลบตัวเองออกจากระบบได้ขณะล็อกอินอยู่');
      return;
    }

    triggerConfirm(
      'ยืนยันการนำสมาชิกออก',
      'คุณแน่ใจหรือไม่ว่าต้องการนำสมาชิกท่านนี้ออกจากระบบกิลด์? สถิติเดิมทั้งหมดจะสูญหาย',
      () => {
        onUpdateState({
          ...state,
          members: state.members.filter(m => m.id !== id)
        });
      }
    );
  };

  // 4. Reset entire rotation cycle
  const handleResetCycle = () => {
    if (!isAdmin) return;
    triggerConfirm(
      'ยืนยันการรีเซ็ตสิทธิ์',
      'คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตสิทธิ์การรับไอเทมของสมาชิกทุกคนกลับมา "ยังมีสิทธิ์" ทั้งหมด เพื่อเริ่มต้นรอบใหม่?',
      () => {
        onUpdateState({
          ...state,
          currentCycle: (state.currentCycle || 1) + 1
        });
      }
    );
  };

  const handleEnableAllMembers = () => {
    if (!isAdmin) return;
    triggerConfirm(
      'ยืนยันการเปิดใช้งานทั้งหมด',
      'คุณแน่ใจหรือไม่ว่าต้องการเปิดใช้งานสมาชิกทุกคนในกิลด์?',
      () => {
        const updatedMembers = state.members.map(m => ({
          ...m,
          del_flag: true
        }));
        onUpdateState({
          ...state,
          members: updatedMembers
        });
      }
    );
  };

  const handleDisableAllMembers = () => {
    if (!isAdmin) return;
    triggerConfirm(
      'ยืนยันการปิดใช้งานทั้งหมด',
      'คุณแน่ใจหรือไม่ว่าต้องการปิดใช้งานสมาชิกทุกคนในกิลด์? (สมาชิกที่ปิดใช้งานจะไม่ถูกสุ่มในวงล้อหรือรับไอเทม)',
      () => {
        const updatedMembers = state.members.map(m => ({
          ...m,
          del_flag: false
        }));
        onUpdateState({
          ...state,
          members: updatedMembers
        });
      }
    );
  };

  // 5. Update Guild security PIN
  const handleUpdatePIN = () => {
    if (!tempPIN.trim()) {
      triggerAlert('ผิดพลาด', 'รหัสผ่าน PIN ไม่สามารถเป็นค่าว่างได้');
      return;
    }

    onUpdateState({
      ...state,
      systemPIN: tempPIN.trim()
    });

    setShowPINSuccess(true);
    setTimeout(() => setShowPINSuccess(false), 3000);
  };

  // Update Guild admin security PIN
  const handleUpdateAdminPIN = () => {
    if (!tempAdminPIN.trim()) {
      triggerAlert('ผิดพลาด', 'รหัสผ่าน Admin PIN ไม่สามารถเป็นค่าว่างได้');
      return;
    }

    onUpdateState({
      ...state,
      adminPIN: tempAdminPIN.trim()
    });

    setShowAdminPINSuccess(true);
    setTimeout(() => setShowAdminPINSuccess(false), 3000);
  };

  return (
    <div className="space-y-6" id="members-tab">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Users className="text-blue-400 w-6 h-6" />
            ทำเนียบและคิวรับไอเทมกิลด์ (Ragnarok Classic Guild Registry)
          </h2>
          <p className="text-xs text-slate-400">
            รายชื่อสมาชิก และลำดับสิทธิ์ในการประมูลไอเทมดรอปจากกิจกรรมกิลด์วอร์แบบแชร์เท่าเทียม
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleResetCycle}
                className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl transition-all font-bold text-xs"
                id="reset-cycle-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                รีเซ็ตวัฏจักรเริ่มรอบใหม่
              </button>
              <button
                onClick={handleEnableAllMembers}
                className="flex items-center gap-1.5 bg-emerald-950/45 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl transition-all font-bold text-xs"
                id="enable-all-members-btn"
              >
                🟢 เปิดใช้งานทั้งหมด
              </button>
              <button
                onClick={handleDisableAllMembers}
                className="flex items-center gap-1.5 bg-amber-950/45 hover:bg-amber-900/30 text-amber-400 border border-amber-500/20 px-3 py-2 rounded-xl transition-all font-bold text-xs"
                id="disable-all-members-btn"
              >
                🔴 ปิดใช้งานทั้งหมด
              </button>
              <button
                onClick={handleSyncDiscord}
                disabled={isSyncingDiscord}
                className="flex items-center gap-1.5 bg-indigo-950/40 hover:bg-indigo-900/30 text-indigo-400 border border-indigo-500/20 px-3 py-2 rounded-xl transition-all font-bold text-xs disabled:opacity-50"
                id="sync-discord-members-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDiscord ? 'animate-spin' : ''}`} />
                ซิงค์จาก Discord
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                id="toggle-add-member-btn"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {showAddForm ? 'ซ่อนฟอร์ม' : 'เพิ่มรายชื่อสมาชิกกิลด์'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info Warning */}
      <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-blue-300">
        <Info className="w-5 h-5 shrink-0 text-blue-400" />
        <div>
          <p className="font-bold">💡 คำแนะนำเกี่ยวกับกฎความโปร่งใส (Fair Play Rules):</p>
          <p className="mt-0.5">ในรอบกิจกรรมเมื่อจัดสรรไอเทมให้สมาชิกแล้ว สมาชิกคนดังกล่าวจะถูกตั้งสถานะว่า <span className="text-yellow-400 font-bold">"ได้รับไอเทมแล้ว (หมดสิทธิ์ประมูล)"</span> ทันที เพื่อเก็บสิทธิ์ที่เหลือไว้ให้ผู้เล่นคนอื่นที่ยังไม่ได้ของ เมื่อทุกคนในกิลด์ได้รับครบ 1 รอบแล้ว หัวหน้ากิลด์จึงค่อยกด <span className="text-blue-400 font-bold">"รีเซ็ตวัฏจักรเริ่มรอบใหม่"</span> เพื่อเปิดให้ประมูลได้ทุกคนอีกครั้ง</p>
        </div>
      </div>

      {/* Admin Quick PIN Settings */}
      {isAdmin && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-400" />
                รหัสผ่านสำหรับ Member ปกติ (Member Access PIN)
              </h3>
              <p className="text-[10px] text-slate-500">
                สมาชิกใหม่จำเป็นต้องกรอกรหัสผ่านนี้เพื่อยืนยันการลงทะเบียนหรือล็อกอินเพื่อดูข้อมูลทั่วไป
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={tempPIN}
                onChange={e => setTempPIN(e.target.value)}
                className="bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs w-full sm:w-44 text-center font-bold"
              />
              <button
                onClick={handleUpdatePIN}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 transition-all active:scale-95 animate-pulse-once"
                id="update-pin-btn"
              >
                {showPINSuccess ? <Check className="w-3.5 h-3.5" /> : 'บันทึก Member PIN'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-500" />
                รหัสผ่านสำหรับผู้ดูแลระบบ (Admin Access PIN)
              </h3>
              <p className="text-[10px] text-slate-500">
                แอดมินจำเป็นต้องกรอกรหัสผ่านนี้เพื่อเข้าสู่ระบบในฐานะ Admin และจัดการกิจกรรมประมูลกิลด์
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={tempAdminPIN}
                onChange={e => setTempAdminPIN(e.target.value)}
                className="bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 font-mono text-xs w-full sm:w-44 text-center font-bold"
              />
              <button
                onClick={handleUpdateAdminPIN}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 transition-all active:scale-95"
                id="update-admin-pin-btn"
              >
                {showAdminPINSuccess ? <Check className="w-3.5 h-3.5" /> : 'บันทึก Admin PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {showAddForm && (
        <form onSubmit={handleAddMember} className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 animate-fade-in">
          <div className="sm:col-span-10">
            <label className="text-xs font-bold text-slate-400 block mb-1">ชื่อตัวละครในกิลด์ (ตรงตามในเกม)</label>
            <input
              type="text"
              required
              placeholder="เช่น เทพซ่า999"
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold"
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2 rounded-xl text-xs transition-colors animate-pulse"
            >
              ยืนยันการเพิ่ม
            </button>
          </div>
        </form>
      )}

      {/* Members Registry Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs font-bold border-b border-slate-850">
                <th className="p-4">ชื่อตัวละครในกิลด์</th>
                <th className="p-4">สถานะการใช้งาน</th>
                {isAdmin && <th className="p-4 text-center">การจัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-xs sm:text-sm">
              {state.members.map(member => {
                const isEditing = editingMemberId === member.id;

                return (
                  <tr key={member.id} className={`hover:bg-slate-850/20 transition-colors ${(member.del_flag ?? true) ? '' : 'opacity-50'}`}>
                    {/* Character Name */}
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded border border-slate-800 text-xs font-bold w-full max-w-[150px] focus:outline-none focus:border-blue-500"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-850 text-slate-400 flex items-center justify-center font-bold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-200">{member.name}</span>
                            {member.id === currentUser?.id && (
                              <span className="ml-1.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold px-1.5 py-0.2 border border-blue-500/20 rounded">
                                ตัวคุณ
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status (del_flag) */}
                    <td className="p-4">
                      {isEditing ? (
                        <select
                          value={editDelFlag ? 'true' : 'false'}
                          onChange={e => setEditDelFlag(e.target.value === 'true')}
                          className="bg-slate-950 text-slate-200 px-2 py-1.5 rounded border border-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                        >
                          <option value="true">🟢 ใช้งานปกติ (Active)</option>
                          <option value="false">🔴 ปิดการใช้งาน (Inactive)</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                          (member.del_flag ?? true)
                            ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/20'
                            : 'bg-red-950/20 text-red-400 border border-red-900/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${(member.del_flag ?? true) ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          <span>{(member.del_flag ?? true) ? 'ใช้งานปกติ' : 'ปิดการใช้งาน'}</span>
                        </span>
                      )}
                    </td>

                    {/* Admin Actions column */}
                    {isAdmin && (
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(member.id)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-md"
                              title="บันทึก"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMemberId(null)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition-colors"
                              title="ยกเลิก"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditing(member)}
                              className="p-1.5 bg-blue-950/40 hover:bg-blue-900/30 text-blue-400 rounded-lg border border-blue-500/10 transition-all hover:scale-105"
                              title="แก้ไขข้อมูลสมาชิก"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-1.5 bg-red-950/40 hover:bg-red-900/30 text-red-400 rounded-lg border border-red-500/10 transition-all hover:scale-105"
                              title="ลบสมาชิกกิลด์"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
