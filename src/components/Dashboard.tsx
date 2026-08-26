import React, { useState, useEffect } from 'react';
import { GuildState, GuildEvent, Member } from '../types';
import { 
  TrendingUp, 
  Coins, 
  Users, 
  Award, 
  Activity, 
  ChevronRight, 
  Clock, 
  Gift, 
  Volume2,
  Calendar,
  CheckCircle,
  HelpCircle,
  Sparkles,
  BookOpen,
  Edit3,
  Save,
  Check,
  FileText,
  X
} from 'lucide-react';

interface DashboardProps {
  state: GuildState;
  currentUser?: Member | null;
  isAdmin?: boolean;
  onUpdateState?: (newState: GuildState) => void;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ state, currentUser, isAdmin, onUpdateState, onNavigate }: DashboardProps) {
  const [expandedDetails, setExpandedDetails] = useState<{[key: string]: boolean}>({});
  
  // Guild Guidelines Edit state
  const [isEditingGuidelines, setIsEditingGuidelines] = useState(false);
  const [editedGuidelines, setEditedGuidelines] = useState(state.guildGuidelines || '');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isEditingGuidelines) {
      setEditedGuidelines(state.guildGuidelines || '');
    }
  }, [state.guildGuidelines, isEditingGuidelines]);

  const handleSaveGuidelines = () => {
    if (!onUpdateState) return;
    const updatedState = {
      ...state,
      guildGuidelines: editedGuidelines,
      lastUpdated: new Date().toISOString()
    };
    onUpdateState(updatedState);
    setIsEditingGuidelines(false);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  // Safe array accesses
  const events = state.events || [];
  const members = state.members || [];
  const raffleResults = state.raffleResults || [];

  const activeEvents = events.filter(e => e.status === 'active');
  const completedEvents = events.filter(e => e.status === 'completed');
  
  // Calculate cycle progress dynamically from events
  const receivedIds = new Set<string>();
  events.forEach(e => {
    e.drops?.forEach(d => {
      if (d.assignedToMemberId && d.cycle === state.currentCycle) {
        receivedIds.add(d.assignedToMemberId);
      }
    });
  });
  const totalMembersCount = members.length;
  const receivedInCycleCount = members.filter(m => receivedIds.has(m.id)).length;
  const eligibleInCycleCount = totalMembersCount - receivedInCycleCount;

  // Calculate total drops distributed
  let totalDropsDistributed = 0;
  events.forEach(e => {
    e.drops.forEach(d => {
      if (d.assignedToMemberId) {
        totalDropsDistributed += d.quantity;
      }
    });
  });

  // Consolidate all activities (Completed Drops + Raffle Results) for the unified Activity Log
  const activityLogList: {
    id: string;
    type: 'auction' | 'raffle' | 'auto-raffle';
    itemName: string;
    winnerName: string;
    detail: string;
    eventTitle: string;
    timestamp: string;
  }[] = [];

  // 1. Gather all drops assigned to members
  events.forEach(e => {
    e.drops.forEach(d => {
      if (d.assignedToMemberId && d.assignedToMemberName) {
        activityLogList.push({
          id: `drop-${e.id}-${d.id}`,
          type: 'auction',
          itemName: d.itemName,
          winnerName: d.assignedToMemberName,
          detail: d.bidAmount > 0 ? `${d.bidAmount.toLocaleString()} Zeny` : 'สิทธิ์คิว Fair Play',
          eventTitle: e.title,
          timestamp: e.completedAt || `${e.date}T21:00:00.000Z`
        });
      }
    });
  });

  // 2. Gather all raffle results
  raffleResults.forEach(res => {
    activityLogList.push({
      id: `raffle-${res.id}`,
      type: res.itemType === 'raffle' ? 'raffle' : 'auto-raffle',
      itemName: res.prizeName,
      winnerName: res.winnerName,
      detail: res.itemType === 'raffle' ? 'หมุนวงล้อประมูล' : 'สุ่มออโต้สระเฉลี่ย',
      eventTitle: 'รางวัลโชคดีวงล้อกิลด์',
      timestamp: res.timestamp
    });
  });

  // Sort activities by timestamp descending and take the 10 most recent
  const sortedActivities = activityLogList
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // Simple participation average calculated dynamically from events
  const totalParticipation = members.reduce((sum, m) => {
    const count = events.filter(e => e.participants?.includes(m.id)).length;
    return sum + count;
  }, 0);
  const avgParticipation = totalMembersCount > 0 
    ? (totalParticipation / totalMembersCount).toFixed(1) 
    : '0';

  return (
    <div className="space-y-6" id="dashboard-tab">
      
      {/* RPG Style Headline Alert Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
        <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg shrink-0 border border-blue-500/30">
          <Volume2 className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">📢 ข่าวสาร & กิจกรรมล่าสุด</span>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            ระบบจัดสรรประมูลรูปแบบใหม่! ทุกรอบกิจกรรม <span className="text-blue-400 font-bold">"Guild League"</span> หรือ <span className="text-blue-400 font-bold">"OverRun"</span> จะมีรายการประมูลที่สิทธิ์กระจายเท่าเทียมอย่างโปร่งใส <span className="text-blue-400 font-bold">หากได้ประมูลไอเทมไปแล้ว จะไม่มีสิทธิ์ประมูลในรอบถัดไปจนกว่าสมาชิกทุกคนในคิวจะได้รับครบ</span> มั่นใจได้ในความโปร่งใสแบบ 100%!
          </p>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Total Active Events */}
        <div 
          onClick={() => onNavigate('auctions')}
          className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-300 group shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] hover:-translate-y-1"
          id="stat-active-events"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">กิจกรรมที่เปิดอยู่</span>
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl group-hover:scale-110 transition-transform border border-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono">
                {activeEvents.length}
              </span>
              <span className="text-xs text-slate-400">กิจกรรม</span>
            </div>
            <p className="text-[11px] text-blue-400 mt-1 flex items-center font-medium">
              คลิกไปเข้าร่วม <ChevronRight className="w-3 h-3 ml-0.5" />
            </p>
          </div>
        </div>

        {/* Stat 2: Rotation Cycle Progress */}
        <div 
          onClick={() => onNavigate('members')}
          className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-300 group shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] hover:-translate-y-1"
          id="stat-cycle-progress"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">คิวรับไอเทมปัจจุบัน</span>
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl group-hover:scale-110 transition-transform border border-yellow-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-extrabold text-yellow-400 font-mono">
                {receivedInCycleCount}/{totalMembersCount}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">ได้ของแล้ว</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-yellow-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${totalMembersCount > 0 ? (receivedInCycleCount / totalMembersCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Stat 3: Total Guild Members */}
        <div 
          onClick={() => onNavigate('members')}
          className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-300 group shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] hover:-translate-y-1"
          id="stat-members-count"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">สมาชิกในระบบ</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono">
                {totalMembersCount}
              </span>
              <span className="text-xs text-slate-400">คน</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center font-medium">
              เข้าวอร์เฉลี่ย {avgParticipation} ครั้ง <ChevronRight className="w-3 h-3 ml-0.5" />
            </p>
          </div>
        </div>

        {/* Stat 4: Raffle Results Count */}
        <div 
          onClick={() => onNavigate('raffle')}
          className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-300 group shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] hover:-translate-y-1"
          id="stat-raffle-count"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">ประวัติสุ่มของ</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-110 transition-transform border border-purple-500/20">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono">
                {raffleResults.length}
              </span>
              <span className="text-xs text-slate-400">รางวัล</span>
            </div>
            <p className="text-[11px] text-purple-400 mt-1 flex items-center font-medium">
              สุ่มแจกสิทธิ์วงล้อ <ChevronRight className="w-3 h-3 ml-0.5" />
            </p>
          </div>
        </div>

      </div>

      {/* Main Grid: Active Events & Rotation List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Live / Active Events and Drops (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* GUILD GUIDELINES SECTION */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-slate-700/50 transition-all duration-300 relative overflow-hidden" id="guild-guidelines-section">
            {/* Ambient decorative glowing line on left */}
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-amber-500 to-yellow-600"></div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-850/60 mb-4 pl-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                    📜 กฎเกณฑ์กิลด์ & ประกาศสำคัญ (Guild Guidelines)
                  </h3>
                  <p className="text-[10px] text-slate-500">ประกาศและระเบียบการปฏิบัติตนสำหรับสมาชิกกิลด์ทุกคน</p>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  {isEditingGuidelines ? (
                    <>
                      <button 
                        onClick={handleSaveGuidelines}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-emerald-950/20"
                        title="บันทึกข้อความ"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>บันทึก</span>
                      </button>
                      <button 
                        onClick={() => {
                          setIsEditingGuidelines(false);
                          setEditedGuidelines(state.guildGuidelines || '');
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                        title="ยกเลิกการแก้ไข"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ยกเลิก</span>
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setIsEditingGuidelines(true)}
                      className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-750 hover:border-slate-600 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                      <span>แก้ไขประกาศ</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="pl-2">
              {isEditingGuidelines ? (
                <div className="space-y-3">
                  <textarea
                    value={editedGuidelines}
                    onChange={(e) => setEditedGuidelines(e.target.value)}
                    rows={6}
                    placeholder="พิมพ์กฎเกณฑ์ ประกาศสำคัญ หรือลิ้งก์ที่สมาชิกควรรู้ (ขึ้นบรรทัดใหม่เพื่อแสดงเป็นแต่ละข้อ)..."
                    className="w-full bg-slate-950 text-slate-200 p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 text-xs leading-relaxed font-sans font-medium placeholder-slate-600"
                  />
                  <p className="text-[10px] text-slate-500">
                    💡 คำแนะนำ: คุณสามารถใช้การเว้นวรรคและขึ้นบรรทัดใหม่ในการจัดรูปแบบข้อความ โดยแต่ละบรรทัดจะแสดงเป็นหัวข้อข้อกำหนดแยกกันอย่างชัดเจน
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {showSaveSuccess && (
                    <div className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs p-2.5 rounded-lg flex items-center gap-2 font-bold mb-2">
                      <Check className="w-4 h-4" />
                      <span>บันทึกประกาศกิลด์สำเร็จแล้ว! ข้อมูลจะแสดงให้สมาชิกทุกคนเห็นทันที</span>
                    </div>
                  )}

                  {!(state.guildGuidelines || '').trim() ? (
                    <div className="text-center py-4 bg-slate-950/30 rounded-xl border border-slate-900">
                      <FileText className="w-8 h-8 text-slate-600 mx-auto mb-1 stroke-1" />
                      <p className="text-xs text-slate-500 italic">ยังไม่มีข้อกำหนดหรือประกาศกิลด์ถูกบันทึกในขณะนี้</p>
                      {isAdmin && (
                        <button
                          onClick={() => setIsEditingGuidelines(true)}
                          className="mt-2 text-[10px] bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 font-bold px-2.5 py-1 rounded-md border border-amber-500/20 transition-colors"
                        >
                          + เพิ่มประกาศแรก
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {(state.guildGuidelines || '').split('\n').map((line, idx) => {
                        if (!line.trim()) return null;
                        return (
                          <div key={idx} className="flex items-start gap-3 bg-slate-950/30 p-2.5 rounded-xl border border-slate-900/50 hover:border-slate-850 transition-colors">
                            <span className="text-amber-500 font-mono text-xs font-bold shrink-0 bg-amber-500/10 w-5 h-5 rounded-md flex items-center justify-center border border-amber-500/20">
                              ⚡
                            </span>
                            <p className="text-xs text-slate-300 font-semibold leading-relaxed whitespace-pre-wrap">{line}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-slate-100">กิจกรรมที่กำลังดำเนินการอยู่ (Active Events)</h2>
            </div>
            <button 
              onClick={() => onNavigate('auctions')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              จัดการกิจกรรมทั้งหมด
            </button>
          </div>

          {activeEvents.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-10 text-center text-slate-500 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <Coins className="w-10 h-10 mx-auto text-slate-600 mb-2 stroke-1" />
              <p className="text-sm text-slate-300 font-semibold">ขณะนี้ไม่มีกิจกรรมประมูลที่กำลังดำเนินอยู่</p>
              <p className="text-xs text-slate-500 mt-1">หัวหน้ากิลด์สามารถเพิ่มรอบกิจกรรม และกำหนดไอเทมดรอปได้ที่หน้า ไอเทมประมูล</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeEvents.map(event => {
                const isOverrun = event.type === 'overrun';
                return (
                  <div 
                    key={event.id} 
                    className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-blue-500/20 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className={`inline-block text-[9px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-2 ${
                          isOverrun ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {isOverrun ? '🔥 OverRun Boss' : '🛡️ Guild League Match'}
                        </span>
                        <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                          {event.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">วันที่ดรอป: {event.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 block font-bold">จำนวนผู้เข้าร่วม</span>
                        <span className="text-xs font-bold text-emerald-400">
                          {event.participants.length} คน
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setExpandedDetails(prev => ({
                          ...prev,
                          [event.id]: !prev[event.id]
                        }));
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-all duration-200 border border-slate-800 hover:border-slate-700 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{expandedDetails[event.id] ? '🔼 ปิดรายละเอียดกิจกรรม' : '📋 รายละเอียดและอาชีพผู้เข้าร่วม'}</span>
                    </button>

                    {/* Collapsible Details Area showing count and job classes */}
                    {expandedDetails[event.id] && (
                      <div className="border-t border-slate-800/60 pt-3.5 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-bold border-b border-slate-850 pb-2">
                          <span className="text-slate-300">📋 รายชื่อผู้ลงทะเบียนและอาชีพ ({event.participants.length} คน)</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Real-time Registration</span>
                        </div>

                        {event.participants.length === 0 ? (
                          <p className="text-xs text-slate-500 italic text-center py-2">ยังไม่มีผู้เข้าร่วมลงทะเบียนกิจกรรมนี้</p>
                        ) : (
                          <div className="space-y-3.5">
                            {(() => {
                              const participantMembers = members.filter(m => event.participants.includes(m.id));

                              return (
                                <div className="space-y-3">
                                  {/* Individual Participants List */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5">
                                    {participantMembers.map(m => (
                                      <div key={m.id} className="bg-slate-950/40 border border-slate-850/50 p-2.5 rounded-xl flex items-center justify-center text-[11px] gap-2">
                                        <span className="font-bold text-slate-300 truncate">👤 {m.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Fair Rotation Queue Board Visual */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                สถานะลำดับคิวผู้มีสิทธิ์ประมูลรับไอเทม (Fair Rotation Queue)
              </h3>
              <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full font-bold">
                มีสิทธิ์ {eligibleInCycleCount} คน / ได้รับแล้ว {receivedInCycleCount} คน
              </span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              * กฎการกระจายไอเทม: สมาชิกทุกคนในคิวจะต้องได้ของคนละ 1 ครั้งจนครบวงรอบ (วัฏจักร) ระบบจึงจะรีเซ็ตสิทธิ์ให้ผู้ที่เคยได้แล้วสามารถประมูลได้อีกครั้ง เพื่อความโปร่งใสและเท่าเทียมที่สุด!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              
              {/* Box 1: Eligible Members */}
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-850">
                <span className="text-xs font-bold text-blue-400 block mb-2 font-mono">🟢 ผู้ยังมีสิทธิ์ประมูล ({eligibleInCycleCount} คน)</span>
                {members.filter(m => !receivedIds.has(m.id)).length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-4 text-center italic">ทุกคนได้รับของประมูลครบแล้วในรอบนี้!</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {members.filter(m => !receivedIds.has(m.id)).map(m => (
                      <span key={m.id} className="text-[11px] bg-slate-900/80 border border-blue-500/10 hover:border-blue-500/30 text-slate-300 px-2.5 py-1 rounded-md font-semibold transition-colors">
                        👤 {m.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Box 2: Already Received Members */}
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-850">
                <span className="text-xs font-bold text-yellow-500 block mb-2 font-mono">🔴 ได้รับของประมูลไปแล้วในรอบปัจจุบัน ({receivedInCycleCount} คน)</span>
                {members.filter(m => receivedIds.has(m.id)).length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-4 text-center italic">ยังไม่มีใครได้รับของในรอบรอบนี้ (เริ่มคิวใหม่)</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {members.filter(m => receivedIds.has(m.id)).map(m => (
                      <span key={m.id} className="text-[11px] bg-slate-900/40 border border-slate-800 text-slate-400 line-through decoration-slate-700 px-2.5 py-1 rounded-md">
                        ✓ {m.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Right Col: Raffle Winners & Logs (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Unified Guild Activity Log (ประวัติการใช้งานกิลด์ล่าสุด) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="font-extrabold text-slate-100 text-sm">📜 ประวัติการใช้งาน & แจกของ (Activity Log)</h3>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold font-mono">
                LATEST {sortedActivities.length}
              </span>
            </div>

            {sortedActivities.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">ไม่มีบันทึกประวัติการเคลื่อนไหวกิจกรรมล่าสุด</p>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {sortedActivities.map((act) => {
                  const isAuction = act.type === 'auction';
                  const isRaffle = act.type === 'raffle';
                  return (
                    <div 
                      key={act.id} 
                      className="p-3 bg-slate-950/60 rounded-xl border border-slate-850/40 text-xs space-y-1.5 hover:border-slate-800 transition-colors animate-fade-in"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {isAuction ? (
                              <Coins className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                            ) : isRaffle ? (
                              <Gift className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            ) : (
                              <Award className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            )}
                            <span className="font-extrabold text-slate-200 truncate max-w-[150px]">{act.itemName}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 font-medium">
                            กิจกรรม: <span className="text-slate-400 font-semibold">{act.eventTitle}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-extrabold ${
                            isAuction 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : isRaffle 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {isAuction ? 'ประมูลไอเทม' : isRaffle ? 'หมุนวงล้อคิว' : 'สุ่มออโต้สระ'}
                          </span>
                          <span className="text-[9px] text-slate-600 block mt-1 font-mono">
                            {new Date(act.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] bg-slate-900/40 p-2 rounded-lg border border-slate-850/30">
                        <div className="flex items-center gap-1 text-slate-400">
                          <span>🏆 ผู้ได้รับ:</span>
                          <strong className="text-slate-100 font-bold">{act.winnerName}</strong>
                        </div>
                        <div className="text-right text-slate-400">
                          <span>รายละเอียด:</span> <strong className="text-yellow-500 font-mono font-bold">{act.detail}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>



        </div>
      </div>

    </div>
  );
}
