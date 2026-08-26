import React, { useState, useEffect } from 'react';
import { GuildState, Member, DEFAULT_JOB_CLASSES } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Auctions from './components/Auctions';
import SpinWheel from './components/SpinWheel';
import Members from './components/Members';
import DiscordSettings from './components/DiscordSettings';
import Config from './components/Config';
import { 
  Shield, 
  Coins, 
  Users, 
  Gift, 
  Bell, 
  Lock, 
  UserPlus, 
  Sparkles,
  RefreshCw,
  Settings,
  AlertTriangle
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ro_guild_manager_state';
const USER_SESSION_KEY = 'ro_guild_manager_user';

export default function App() {
  const [state, setState] = useState<GuildState>({
    members: [],
    events: [],
    masterItems: [],
    rafflePrizes: [],
    raffleResults: [],
    discordConfig: { webhookUrl: '', botName: 'บอทกิลด์ RO Classic', enabled: false },
    systemPIN: 'ro-classic-1234',
    lastUpdated: new Date().toISOString()
  });

  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('is_admin_session') === 'true';
  });
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);

  // Custom alert and confirmation modal dialog state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showAlert = (title: string, message: string) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type: 'alert'
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      }
    });
  };

  // Authentication State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [authPIN, setAuthPIN] = useState('');
  const [regName, setRegName] = useState('');
  const [authError, setAuthError] = useState('');

  // 1. Initial State Fetch on Mount
  useEffect(() => {
    fetchState();
    
    // Attempt to restore user session
    const savedUser = localStorage.getItem(USER_SESSION_KEY);
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user session', e);
      }
    }
  }, []);

  const fetchState = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/state');
      if (response.ok) {
        let cloudState = await response.json() as GuildState;
        
        // Auto-restore current user to state.members if missing (to prevent ghost user bugs on data clears)
        const savedUserStr = localStorage.getItem(USER_SESSION_KEY);
        if (savedUserStr) {
          try {
            const parsedUser = JSON.parse(savedUserStr) as Member;
            const userExists = cloudState.members.some(m => m.id === parsedUser.id);
            if (!userExists) {
              console.log("Restoring ghost currentUser into members");
              cloudState = {
                ...cloudState,
                members: [...cloudState.members, parsedUser]
              };
              // Sync back to server
              await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cloudState)
              });
            }
          } catch (e) {
            console.error('Failed to parse or restore user session', e);
          }
        }

        setState(cloudState);
        setIsOffline(false);
        // Cache to local storage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudState));
      } else {
        throw new Error('Server returned non-200 status');
      }
    } catch (e) {
      console.warn('Sync failed, falling back to local cache:', e);
      setIsOffline(true);
      
      // Load local cache or seed default if none
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        try {
          let cachedState = JSON.parse(localData) as GuildState;

          // Check currentUser for cached state as well
          const savedUserStr = localStorage.getItem(USER_SESSION_KEY);
          if (savedUserStr) {
            const parsedUser = JSON.parse(savedUserStr) as Member;
            const userExists = cachedState.members.some(m => m.id === parsedUser.id);
            if (!userExists) {
              cachedState = {
                ...cachedState,
                members: [...cachedState.members, parsedUser]
              };
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cachedState));
            }
          }

          setState(cachedState);
        } catch (err) {
          console.error(err);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. State Mutation and Syncing Function
  const updateState = async (newState: GuildState) => {
    const syncedState = { ...newState };
    
    // Ensure currentCycle is initialized
    if (syncedState.currentCycle === undefined || syncedState.currentCycle === null) {
      syncedState.currentCycle = 1;
    }
    
    // 1. Gather all member IDs who have received an item in the current cycle
    const receivedIds = new Set<string>();
    syncedState.events?.forEach(e => {
      e.drops?.forEach(d => {
        if (d.assignedToMemberId && d.cycle === syncedState.currentCycle) {
          receivedIds.add(d.assignedToMemberId);
        }
      });
    });
    
    // 2. Filter active members (del_flag !== false)
    const activeMembers = syncedState.members.filter(m => m.del_flag !== false);
    const totalCount = activeMembers.length;
    const receivedCount = activeMembers.filter(m => receivedIds.has(m.id)).length;
    
    if (totalCount > 0 && receivedCount === totalCount) {
      // Cycle complete! Increment cycle
      syncedState.currentCycle += 1;
    }

    // Update react state
    setState(syncedState);
    // Cache to local storage immediately (guarantees offline persistence!)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(syncedState));

    // Update session user state if they changed their own profile details
    if (currentUser) {
      const refreshedUser = syncedState.members.find(m => m.id === currentUser.id);
      if (refreshedUser) {
        setCurrentUser(refreshedUser);
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(refreshedUser));
      }
    }

    // Attempt to sync to backend if online
    try {
      const response = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState)
      });
      if (response.ok) {
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch (e) {
      console.warn('Failed to sync changes, working offline', e);
      setIsOffline(true);
    }
  };

  // 3. Helper to dispatch Discord Notification
  const sendDiscordNotification = async (
    title: string, 
    message: string, 
    fields: any[] = [], 
    color = 15844367, 
    content?: string,
    webhookType?: 'leaves' | 'events' | 'raffles',
    eventId?: string
  ) => {
    try {
      const response = await fetch('/api/discord-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, fields, color, content, webhookType, eventId })
      });
      const data = await response.json();
      console.log('Discord notify result:', data);
    } catch (e) {
      console.error('Failed to notify Discord', e);
    }
  };

  // 4. Verification & Authentication Logic
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!selectedMemberId) {
      setAuthError('กรุณาเลือกชื่อตัวละครของคุณ');
      return;
    }

    const member = state.members.find(m => m.id === selectedMemberId);
    if (!member) {
      setAuthError('ไม่พบรายชื่อตัวละครในฐานข้อมูล');
      return;
    }

    const inputPIN = authPIN.trim();
    const systemPIN = state.systemPIN;
    const adminPIN = state.adminPIN || 'ro-admin-5678';

    if (inputPIN !== systemPIN && inputPIN !== adminPIN) {
      setAuthError('รหัสผ่าน PIN ไม่ถูกต้อง กรุณากรอกรหัสผ่าน Member PIN หรือ Admin PIN');
      return;
    }

    const isSessionAdmin = inputPIN === adminPIN;

    setCurrentUser(member);
    setIsAdmin(isSessionAdmin);
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(member));
    localStorage.setItem('is_admin_session', isSessionAdmin ? 'true' : 'false');
    setAuthPIN('');
    setAuthError('');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const trimmedName = regName.trim();
    if (!trimmedName) {
      setAuthError('กรุณากรอกชื่อตัวละคร');
      return;
    }

    if (authPIN.trim() !== state.systemPIN) {
      setAuthError('รหัสผ่านกิลด์ (PIN) สำหรับสมาชิกใหม่ไม่ถูกต้อง');
      return;
    }

    // Check if name is already registered
    const exists = state.members.some(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      setAuthError('ชื่อตัวละครนี้ได้รับการลงทะเบียนเข้ากิลด์แล้ว');
      return;
    }

    const newMember: Member = {
      id: `mem-${Date.now()}`,
      name: trimmedName,
      del_flag: true
    };

    const updatedState = {
      ...state,
      members: [...state.members, newMember]
    };

    updateState(updatedState);
    setCurrentUser(newMember);
    setIsAdmin(false);
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newMember));
    localStorage.setItem('is_admin_session', 'false');
    setRegName('');
    setAuthPIN('');
    setAuthError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    localStorage.removeItem(USER_SESSION_KEY);
    localStorage.removeItem('is_admin_session');
    setActiveTab('dashboard');
  };

  // Render Login page if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative" id="auth-screen">
        
        {/* Abstract design elements to look like classic RO login screen */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-slate-950 to-slate-950 pointer-events-none"></div>
        <div className="absolute top-12 left-12 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-12 right-12 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Logo Container */}
        <div className="text-center space-y-2 mb-8 z-10 max-w-sm">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center border border-yellow-400/40 shadow-xl shadow-yellow-500/10">
            <Sparkles className="w-8 h-8 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-amber-500 tracking-tight">
            RO CLASSIC GUILD MANAGER
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            ระบบจัดการประมูลไอเทมลีก & วงล้อนำโชค
          </p>
        </div>

        {/* Login/Register Form Card */}
        <div className="bg-slate-900 border border-yellow-600/30 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl shadow-black relative z-10 overflow-hidden">
          
          {/* Subtle gold top border */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600"></div>

          {/* Toggle Tab */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl mb-6">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                authMode === 'login' 
                  ? 'bg-yellow-500 text-slate-950 font-extrabold shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              เลือกชื่อกิลด์เข้าสู่ระบบ
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                authMode === 'register' 
                  ? 'bg-yellow-500 text-slate-950 font-extrabold shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ลงทะเบียนใหม่ (New Member)
            </button>
          </div>

          {authError && (
            <div className="bg-red-950/40 border border-red-500/20 text-red-300 text-xs p-3.5 rounded-xl mb-4 leading-relaxed font-semibold">
              ⚠️ {authError}
            </div>
          )}

          {authMode === 'login' ? (
            /* Member Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-400 block">เลือกชื่อของคุณในกิลด์</label>
                {state.members.length === 0 ? (
                  <p className="text-xs text-amber-400 font-semibold bg-slate-950 p-3 rounded-xl border border-slate-800">
                    ไม่มีรายชื่อในฐานข้อมูล กรุณาคลิกแท็บลงทะเบียนใหม่เพื่อเริ่มเข้ากิลด์ !
                  </p>
                ) : (
                  <select
                    value={selectedMemberId}
                    onChange={e => setSelectedMemberId(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-3.5 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-yellow-500 text-xs font-semibold"
                  >
                    <option value="">-- โปรดเลือกชื่อตัวละครของคุณ --</option>
                    {state.members.filter(m => m.del_flag !== false).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.admin ? 'Admin' : 'Member'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-400 block">รหัสผ่านลับกิลด์ (PIN)</label>
                  <span className="text-[10px] text-slate-500 italic">สอบถามแอดมิน</span>
                </div>
                <input
                  type="password"
                  placeholder="กรอกตัวเลขรหัส PIN ประจำกิลด์"
                  value={authPIN}
                  onChange={e => setAuthPIN(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3.5 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-yellow-500 font-mono text-xs text-center"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-450 hover:to-amber-550 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all border border-yellow-400/40 shadow-xl shadow-yellow-500/10 uppercase tracking-wider"
              >
                ยืนยันเพื่อเข้าสู่ระบบกิลด์
              </button>
            </form>
          ) : (
            /* Register Member Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-400 block">ชื่อตัวละครในเกม (ตรงตามจริง)</label>
                <input
                  type="text"
                  required
                  placeholder="ตัวอย่างเช่น SniperNo1, เทพทรู"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3.5 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-yellow-500 text-xs"
                />
              </div>



              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-400 block">รหัสผ่านลับกิลด์ (PIN)</label>
                  <span className="text-[10px] text-slate-500 italic">สอบถามจากแอดมินผู้ดูแล</span>
                </div>
                <input
                  type="password"
                  placeholder="กรอกตัวเลขรหัส PIN ประจำกิลด์"
                  value={authPIN}
                  onChange={e => setAuthPIN(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3.5 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-yellow-500 font-mono text-xs text-center"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-450 hover:to-amber-550 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all border border-yellow-400/40 shadow-xl shadow-yellow-500/10 uppercase tracking-wider"
              >
                ลงทะเบียน & ล็อกอินสมาชิกกิลด์ใหม่
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-850 text-center text-[10px] text-slate-500 font-medium">
            โปรแกรมรันระบบด้วย Express Node.js & React 19 ประสิทธิภาพสูง
          </div>
        </div>
      </div>
    );
  }

  // Render Dashboard Workspace
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex flex-col font-sans" id="main-layout">
      
      {/* 1. Header Integration */}
      <Header 
        currentUser={currentUser}
        isAdmin={isAdmin}
        isOffline={isOffline}
        onLogout={handleLogout}
        guildName={state.guildName}
      />

      {/* 2. Primary Navigation Bars (Responsive) */}
      <nav className="bg-slate-950/60 border-b border-blue-900/30 sticky top-[57px] z-35 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between sm:justify-start items-center overflow-x-auto whitespace-nowrap gap-1 sm:gap-2 py-2.5 select-none scrollbar-none">
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''} text-blue-400`} />
              แดชบอร์ด
            </button>

            <button
              onClick={() => setActiveTab('auctions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                activeTab === 'auctions'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-blue-400" />
              กิจกรรมกิลด์
            </button>

            <button
              onClick={() => setActiveTab('raffle')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                activeTab === 'raffle'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-purple-400" />
              วงล้อประมูล
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                activeTab === 'members'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              สมาชิกกิลด์
            </button>

            <button
              onClick={() => setActiveTab('discord')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                activeTab === 'discord'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-blue-400" />
              ตั้งค่า Discord บอท
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                activeTab === 'config'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              ตั้งค่าระบบ
            </button>

          </div>
        </div>
      </nav>

      {/* 3. Main Workspace Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8">
        
        {activeTab === 'dashboard' && (
          <Dashboard 
            state={state}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onUpdateState={updateState}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'auctions' && (
          <Auctions 
            state={state}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onUpdateState={updateState}
            onSendDiscordNotification={sendDiscordNotification}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}

        {activeTab === 'raffle' && (
          <SpinWheel 
            state={state}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onUpdateState={updateState}
            onSendDiscordNotification={sendDiscordNotification}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}

        {activeTab === 'members' && (
          <Members 
            state={state}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onUpdateState={updateState}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}

        {activeTab === 'discord' && (
          <DiscordSettings 
            state={state}
            isAdmin={isAdmin}
            onUpdateState={updateState}
            onSendDiscordNotification={sendDiscordNotification}
            showAlert={showAlert}
          />
        )}

        {activeTab === 'config' && (
          <Config 
            state={state}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onUpdateState={updateState}
            onSendDiscordNotification={sendDiscordNotification}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}

      </main>

      {/* 4. Footer */}
      <footer className="bg-slate-900 border-t border-slate-900/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 Ragnarok Origin Classic - Guild Manager Platform. All rights reserved.</p>
          <p className="font-mono text-[10px] text-slate-600">
            Version 1.0.0 (Node.js & React SPA)
          </p>
        </div>
      </footer>

      {/* Custom Alert/Confirm Dialog Modal */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in" id="custom-dialog-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                dialog.type === 'confirm' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
              }`}>
                {dialog.type === 'confirm' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1.5 flex-grow">
                <h3 className="text-base font-black text-white leading-tight">
                  {dialog.title}
                </h3>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-semibold">
                  {dialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {dialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDialog(prev => ({ ...prev, isOpen: false }));
                  if (dialog.type === 'confirm' && dialog.onConfirm) {
                    dialog.onConfirm();
                  }
                }}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all shadow-md ${
                  dialog.type === 'confirm'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
