import React, { useState } from 'react';
import { GuildState, GuildEvent, EventDrop, MasterItem, Member } from '../types';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Users, 
  Check, 
  Sparkles, 
  Coins, 
  Cpu, 
  RefreshCw, 
  UserCheck, 
  FileText, 
  Flame, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Clock,
  Package,
  Play,
  Gift,
  RotateCcw,
  Edit2,
  Save,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuctionsProps {
  state: GuildState;
  currentUser: Member | null;
  isAdmin: boolean;
  onUpdateState: (newState: GuildState) => void;
  onSendDiscordNotification: (title: string, message: string, fields: any[], color?: number, content?: string, webhookType?: 'leaves' | 'events' | 'raffles') => void;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function Auctions({ 
  state, 
  currentUser, 
  isAdmin, 
  onUpdateState,
  onSendDiscordNotification,
  showAlert,
  showConfirm
}: AuctionsProps) {
  
  const [activeSubTab, setActiveSubTab] = useState<'events' | 'master_items'>('events');

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

  // Event creation form state
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<'league' | 'overrun'>('league');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDrops, setSelectedDrops] = useState<{ masterItemId: string; quantity: number }[]>([]);
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);

  // Excuse/absence local states
  const [excuseEventId, setExcuseEventId] = useState<string | null>(null);
  const [excuseReason, setExcuseReason] = useState<string>('');
  const [selectedRegClasses, setSelectedRegClasses] = useState<{ [eventId: string]: string }>({});

  // Master Item creation state
  const [newMasterName, setNewMasterName] = useState('');
  const [newMasterType, setNewMasterType] = useState<'material' | 'card' | 'equip' | 'consumable'>('material');

  // Master Item edit state
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [editMasterName, setEditMasterName] = useState('');
  const [editMasterType, setEditMasterType] = useState<'material' | 'card' | 'equip' | 'consumable'>('material');

  // Participant list toggle UI
  const [editingParticipantsEventId, setEditingParticipantsEventId] = useState<string | null>(null);

  // Dedicated Drop Spin Wheel State
  const [isDropWheelOpen, setIsDropWheelOpen] = useState(false);
  const [activeWheelEventId, setActiveWheelEventId] = useState<string>('');
  const [activeWheelDropId, setActiveWheelDropId] = useState<string>('');
  const [activeWheelDropName, setActiveWheelDropName] = useState<string>('');
  const [wheelCandidates, setWheelCandidates] = useState<Member[]>([]);
  const [isDropWheelSpinning, setIsDropWheelSpinning] = useState(false);
  const [dropWheelWinner, setDropWheelWinner] = useState<Member | null>(null);

  const dropWheelCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const dropWheelAngleRef = React.useRef(0);
  const dropWheelSpeedRef = React.useRef(0);
  const dropWheelAnimRef = React.useRef<number | null>(null);

  const drawDropWheel = () => {
    const canvas = dropWheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2;
    ctx.clearRect(0, 0, size, size);

    if (wheelCandidates.length === 0) {
      ctx.beginPath();
      ctx.arc(radius, radius, radius - 15, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#3b82f6';
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ไม่มีสมาชิกผู้เข้าร่วมที่มีสิทธิ์สุ่ม', radius, radius);
      return;
    }

    const sliceAngle = (2 * Math.PI) / wheelCandidates.length;
    const colors = ['#1e1b4b', '#0f172a', '#312e81', '#020617', '#1e293b', '#4338ca'];

    wheelCandidates.forEach((cand, i) => {
      const angle = dropWheelAngleRef.current + i * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius - 12, angle, angle + sliceAngle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#3b82f630';
      ctx.stroke();

      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';

      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;

      const text = cand.name.length > 12 ? cand.name.substring(0, 10) + '..' : cand.name;
      ctx.fillText(text, radius - 25, 4);
      ctx.restore();
    });

    // Outer Ring
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 12, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3b82f6';
    ctx.stroke();

    // Gold dots
    const totalDots = 16;
    for (let d = 0; d < totalDots; d++) {
      const dotAngle = d * (2 * Math.PI / totalDots);
      const dotX = radius + (radius - 12) * Math.cos(dotAngle);
      const dotY = radius + (radius - 12) * Math.sin(dotAngle);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    }

    // Center button
    ctx.beginPath();
    ctx.arc(radius, radius, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#d97706';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    const gradient = ctx.createRadialGradient(radius - 5, radius - 5, 2, radius, radius, 22);
    gradient.addColorStop(0, '#fef08a');
    gradient.addColorStop(1, '#b45309');
    ctx.beginPath();
    ctx.arc(radius, radius, 16, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
  };

  React.useEffect(() => {
    if (isDropWheelOpen) {
      const timer = setTimeout(() => {
        drawDropWheel();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isDropWheelOpen, wheelCandidates]);

  const spinDropWheel = () => {
    if (isDropWheelSpinning || wheelCandidates.length === 0) return;

    setIsDropWheelSpinning(true);
    setDropWheelWinner(null);

    dropWheelSpeedRef.current = Math.random() * 0.45 + 0.35;
    const friction = 0.988;

    const animate = () => {
      dropWheelAngleRef.current += dropWheelSpeedRef.current;
      dropWheelAngleRef.current = dropWheelAngleRef.current % (2 * Math.PI);
      dropWheelSpeedRef.current *= friction;

      drawDropWheel();

      if (dropWheelSpeedRef.current < 0.0015) {
        setIsDropWheelSpinning(false);
        if (dropWheelAnimRef.current) cancelAnimationFrame(dropWheelAnimRef.current);
        
        const sliceAngle = (2 * Math.PI) / wheelCandidates.length;
        const normalizedAngle = (1.5 * Math.PI - dropWheelAngleRef.current) % (2 * Math.PI);
        const positiveAngle = normalizedAngle < 0 ? normalizedAngle + 2 * Math.PI : normalizedAngle;
        const winnerIndex = Math.floor(positiveAngle / sliceAngle) % wheelCandidates.length;
        const winner = wheelCandidates[winnerIndex];

        setDropWheelWinner(winner);

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        dropWheelAnimRef.current = requestAnimationFrame(animate);
      }
    };

    dropWheelAnimRef.current = requestAnimationFrame(animate);
  };

  const handleOpenWheelForDrop = (eventId: string, dropId: string, itemName: string, eventParticipants: string[]) => {
    let candidates = members.filter(m => 
      eventParticipants.includes(m.id) && !m.hasReceivedInCycle
    );

    if (candidates.length === 0) {
      candidates = members.filter(m => eventParticipants.includes(m.id));
    }

    if (candidates.length === 0) {
      triggerAlert('ไม่สามารถสุ่มวงล้อได้', 'ไม่มีผู้ร่วมกิจกรรมในรอบนี้ จึงไม่สามารถสุ่มวงล้อได้ กรุณาเพิ่มรายชื่อผู้เข้าร่วมกิจกรรมก่อน');
      return;
    }

    candidates.sort((a, b) => b.participatedWarsCount - a.participatedWarsCount);

    setActiveWheelEventId(eventId);
    setActiveWheelDropId(dropId);
    setActiveWheelDropName(itemName);
    setWheelCandidates(candidates);
    setDropWheelWinner(null);
    setIsDropWheelSpinning(false);
    setIsDropWheelOpen(true);
  };

  const handleSaveDropWheelWinner = () => {
    if (!dropWheelWinner || !activeWheelEventId || !activeWheelDropId) return;

    handleAssignDropManually(activeWheelEventId, activeWheelDropId, dropWheelWinner.id);

    const updatedMembers = members.map(m => {
      if (m.id === dropWheelWinner.id) {
        return { ...m, hasReceivedInCycle: true };
      }
      return m;
    });

    onUpdateState({
      ...state,
      members: updatedMembers
    });

    onSendDiscordNotification(
      `🎡 หมุนวงล้อสิทธิ์ไอเทมสำเร็จ!`,
      `สรุปผลผู้ได้รับสิทธิ์ประมูลจากการหมุนวงล้อนำโชค`,
      [
        { name: "🎁 ไอเทมดรอป", value: `**${activeWheelDropName}**`, inline: true },
        { name: "🌟 ผู้ชนะสิทธิ์", value: `**${dropWheelWinner.name}** (${dropWheelWinner.participatedWarsCount} วอร์)`, inline: true },
        { name: "📌 กิจกรรม", value: events.find(e => e.id === activeWheelEventId)?.title || 'กิจกรรมสมาคม', inline: false }
      ],
      15105570,
      undefined,
      'raffles'
    );

    setIsDropWheelOpen(false);
    setDropWheelWinner(null);
  };

  // Safe Fallbacks
  const events = state.events || [];
  const masterItems = state.masterItems || [];
  const members = state.members || [];

  // 1. Create a New Event
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    // Convert selected drops into EventDrop objects
    const drops: EventDrop[] = selectedDrops.map((sd, index) => {
      const item = masterItems.find(mi => mi.id === sd.masterItemId);
      return {
        id: `drop-${Date.now()}-${index}`,
        itemName: item ? item.name : 'Unknown Item',
        quantity: sd.quantity,
        assignedToMemberId: null,
        assignedToMemberName: null,
        bidAmount: 0
      };
    });

    const newEvent: GuildEvent = {
      id: `ev-${Date.now()}`,
      title: newEventTitle.trim(),
      type: newEventType,
      date: newEventDate,
      participants: [], // starts empty, users join or admin checks
      drops,
      status: 'active'
    };

    onUpdateState({
      ...state,
      events: [newEvent, ...events]
    });

    // Notify Discord
    onSendDiscordNotification(
      `📢 ประกาศกิจกรรมกิลด์ใหม่: ${newEvent.title}`,
      `กิจกรรม: ${newEvent.type === 'league' ? '🛡️ Guild League' : '🔥 OverRun'}\nวันที่: ${newEvent.date}\n\nขอเชิญชวนสมาชิกกิลด์ทุกคนล็อกอินเข้ามากด "เข้าร่วมกิจกรรม" เพื่อรักษาสิทธิ์ของตนเองในวงล้อและคิวประมูลไอเทม!\n🔗 ลิงก์ระบบจัดการกิลด์: https://rooc-guild-management-ebon.vercel.app/`,
      drops.length > 0
        ? drops.map(d => ({ name: d.itemName, value: `จำนวน: ${d.quantity} ชิ้น (รอประมูล)`, inline: true }))
        : [{ name: "💎 ไอเทมดรอป", value: "ไม่มีรายการไอเทมประมูลในรอบนี้", inline: false }],
      3066993, // Teal color
      undefined,
      'events'
    );

    // Reset Form
    setNewEventTitle('');
    setSelectedDrops([]);
    setShowCreateEventForm(false);
  };

  // 2. Add drop input to event draft
  const handleAddDropToDraft = (masterItemId: string) => {
    if (!masterItemId) return;
    const exists = selectedDrops.find(d => d.masterItemId === masterItemId);
    if (exists) {
      setSelectedDrops(selectedDrops.map(d => d.masterItemId === masterItemId ? { ...d, quantity: d.quantity + 1 } : d));
    } else {
      setSelectedDrops([...selectedDrops, { masterItemId, quantity: 1 }]);
    }
  };

  const handleRemoveDropFromDraft = (masterItemId: string) => {
    setSelectedDrops(selectedDrops.filter(d => d.masterItemId !== masterItemId));
  };

  // 3. User registers/joins an active event
  const handleUserJoinEvent = (eventId: string) => {
    if (!currentUser) return;
    
    const updatedEvents = events.map(e => {
      if (e.id === eventId) {
        const hasJoined = e.participants.includes(currentUser.id);
        const participants = hasJoined ? e.participants : [...e.participants, currentUser.id];
        return {
          ...e,
          participants
        };
      }
      return e;
    });

    onUpdateState({
      ...state,
      events: updatedEvents
    });
  };

  // 4. Admin toggles participants manually
  const handleAdminToggleParticipant = (eventId: string, memberId: string) => {
    const updatedEvents = events.map(e => {
      if (e.id === eventId) {
        const hasJoined = e.participants.includes(memberId);
        const updatedParticipants = hasJoined 
          ? e.participants.filter(pid => pid !== memberId)
          : [...e.participants, memberId];
        
        return { 
          ...e, 
          participants: updatedParticipants
        };
      }
      return e;
    });

    onUpdateState({
      ...state,
      events: updatedEvents
    });
  };

  // 5. Admin assigns drop to a member manually
  const handleAssignDropManually = (eventId: string, dropId: string, memberId: string | null) => {
    const updatedEvents = events.map(e => {
      if (e.id === eventId) {
        const updatedDrops = e.drops.map(d => {
          if (d.id === dropId) {
            const member = members.find(m => m.id === memberId);
            return {
              ...d,
              assignedToMemberId: memberId,
              assignedToMemberName: member ? member.name : null,
              cycle: memberId ? (state.currentCycle || 1) : undefined
            };
          }
          return d;
        });
        return { ...e, drops: updatedDrops };
      }
      return e;
    });

    // Update state
    onUpdateState({
      ...state,
      events: updatedEvents
    });
  };

  // 6. Admin sets bid amount for a drop
  const handleSetBidAmount = (eventId: string, dropId: string, amount: number) => {
    const updatedEvents = events.map(e => {
      if (e.id === eventId) {
        const updatedDrops = e.drops.map(d => {
          if (d.id === dropId) {
            return { ...d, bidAmount: amount };
          }
          return d;
        });
        return { ...e, drops: updatedDrops };
      }
      return e;
    });

    onUpdateState({
      ...state,
      events: updatedEvents
    });
  };

  // 7. Auto-allocation Algorithm ("ระบบคำนวณอัตโนมัติ")
  // Picks eligible participants for unassigned drops based on rotation queue status
  const handleAutoAllocateDrops = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    if (event.participants.length === 0) {
      triggerAlert('ไม่สามารถจัดสรรได้', 'ไม่สามารถจัดสรรอัตโนมัติได้ เนื่องจากรอบนี้ยังไม่มีรายชื่อผู้เข้าร่วมกิจกรรม');
      return;
    }

    let tempMembers = JSON.parse(JSON.stringify(members)) as Member[];
    const originalDrops = event.drops || [];
    const finalDrops: EventDrop[] = [];
    let changed = false;

    // Helper to check if a drop should be averaged/split
    const shouldAverageDrop = (itemName: string) => {
      const name = itemName.toLowerCase();
      return name.includes('เศษสมุด') || name.includes('ขนนก') || name.includes('feather') || name.includes('fragment');
    };

    // Helper to distribute a quantity Q among P participants as evenly as possible.
    const distributeEvenly = (quantity: number, numParticipants: number): number[] => {
      if (numParticipants <= 0) return [];
      const base = Math.floor(quantity / numParticipants);
      const remainder = quantity % numParticipants;
      const result: number[] = [];
      for (let i = 0; i < numParticipants; i++) {
        result.push(base + (i < remainder ? 1 : 0));
      }
      return result;
    };

    for (let d of originalDrops) {
      if (d.assignedToMemberId) {
        finalDrops.push(d);
        continue; // Skip already assigned drops
      }

      if (shouldAverageDrop(d.itemName)) {
        // Find participants of this event matching whitelist
        const eventParticipantIds = event.participants;
        const eligibleParticipants = tempMembers.filter(m => {
          const isParticipant = eventParticipantIds.includes(m.id);
          const matchesMember = !d.whitelistMemberIds || d.whitelistMemberIds.length === 0 || d.whitelistMemberIds.includes(m.id);
          return isParticipant && matchesMember;
        });

        const targets = eligibleParticipants.length > 0 
          ? eligibleParticipants 
          : tempMembers.filter(m => eventParticipantIds.includes(m.id));

        if (targets.length > 0) {
          const P = targets.length;
          const base = Math.floor(d.quantity / P);
          const remainder = d.quantity % P;

          if (base > 0) {
            targets.forEach(participant => {
              const splitDropId = `drop-split-${d.id}-${participant.id}`;
              finalDrops.push({
                ...d,
                id: splitDropId,
                quantity: base,
                assignedToMemberId: participant.id,
                assignedToMemberName: participant.name,
                bidAmount: 5000, // default initial/average bid
                originalDropId: d.id,
                isSplit: true
              });
              // Mark them as having received an item in this cycle
              tempMembers = tempMembers.map(m => m.id === participant.id ? { ...m, hasReceivedInCycle: true } : m);
            });
          }

          if (remainder > 0) {
            finalDrops.push({
              ...d,
              id: `drop-remainder-${d.id}`,
              quantity: remainder,
              assignedToMemberId: null,
              assignedToMemberName: null,
              bidAmount: 0,
              originalDropId: d.id,
              isSplit: true
            });
          }

          changed = true;
        } else {
          finalDrops.push(d);
        }
      } else {
        // Normal drop logic
        // Find participants of this event
        const eventParticipantIds = event.participants;

        // Count unassigned drops
        const unassignedDropsCount = originalDrops.filter(dr => !dr.assignedToMemberId).length;

        // Count clean participants (participants who haven't received items in this cycle and match filters)
        const cleanParticipantsCount = tempMembers.filter(m => {
          const isParticipant = eventParticipantIds.includes(m.id);
          const hasNotReceived = !m.hasReceivedInCycle;
          const matchesMember = !d.whitelistMemberIds || d.whitelistMemberIds.length === 0 || d.whitelistMemberIds.includes(m.id);
          return isParticipant && hasNotReceived && matchesMember;
        }).length;

        // Rule: If remaining items is greater than clean participants, we allow those who already received items in this cycle to participate
        const allowAlreadyReceived = unassignedDropsCount > cleanParticipantsCount;

        // Filter to find eligible participants
        let eligibleParticipants = tempMembers.filter(m => {
          const isParticipant = eventParticipantIds.includes(m.id);
          const hasNotReceived = !m.hasReceivedInCycle;
          const matchesMember = !d.whitelistMemberIds || d.whitelistMemberIds.length === 0 || d.whitelistMemberIds.includes(m.id);
          return isParticipant && (hasNotReceived || allowAlreadyReceived) && matchesMember;
        });

        // What if all whitelisted participants of this event have already received items? (fallback fallback)
        if (eligibleParticipants.length === 0) {
          // Reset hasReceivedInCycle for whitelisted event participants to continue fairly
          tempMembers = tempMembers.map(m => {
            if (eventParticipantIds.includes(m.id)) {
              const matchesMember = !d.whitelistMemberIds || d.whitelistMemberIds.length === 0 || d.whitelistMemberIds.includes(m.id);
              if (matchesMember) {
                return { ...m, hasReceivedInCycle: false };
              }
            }
            return m;
          });
          eligibleParticipants = tempMembers.filter(m => {
            const isParticipant = eventParticipantIds.includes(m.id);
            const hasNotReceived = !m.hasReceivedInCycle;
            const matchesMember = !d.whitelistMemberIds || d.whitelistMemberIds.length === 0 || d.whitelistMemberIds.includes(m.id);
            return isParticipant && hasNotReceived && matchesMember;
          });
        }

        // If still no match, allow any whitelisted participant who is present in this event
        if (eligibleParticipants.length === 0) {
          eligibleParticipants = tempMembers.filter(m => {
            const isParticipant = eventParticipantIds.includes(m.id);
            const matchesMember = !d.whitelistMemberIds || d.whitelistMemberIds.length === 0 || d.whitelistMemberIds.includes(m.id);
            return isParticipant && matchesMember;
          });
        }

        // Absolute fallback: pick any participant who hasn't received anything in this cycle
        if (eligibleParticipants.length === 0) {
          eligibleParticipants = tempMembers.filter(m => 
            eventParticipantIds.includes(m.id) && !m.hasReceivedInCycle
          );
        }

        if (eligibleParticipants.length > 0) {
          // Sort:
          // 1. Those who have NOT received yet in this cycle come first
          // 2. High war participation count descending
          eligibleParticipants.sort((a, b) => {
            if (a.hasReceivedInCycle !== b.hasReceivedInCycle) {
              return a.hasReceivedInCycle ? 1 : -1;
            }
            return b.participatedWarsCount - a.participatedWarsCount;
          });
          const selectedWinner = eligibleParticipants[0];

          // Assign drop
          d.assignedToMemberId = selectedWinner.id;
          d.assignedToMemberName = selectedWinner.name;
          d.bidAmount = 5000; // default initial/average bid

          // Mark them as having received an item in this cycle
          tempMembers = tempMembers.map(m => m.id === selectedWinner.id ? { ...m, hasReceivedInCycle: true } : m);
          
          finalDrops.push(d);
          changed = true;
        } else {
          finalDrops.push(d);
        }
      }
    }

    if (changed) {
      // Check if ALL guild members have now received items. If yes, auto-reset the cycle!
      const totalCount = tempMembers.length;
      const receivedCount = tempMembers.filter(m => m.hasReceivedInCycle).length;
      if (totalCount > 0 && receivedCount === totalCount) {
        // Auto reset
        tempMembers = tempMembers.map(m => ({ ...m, hasReceivedInCycle: false }));
      }

      const updatedEvents = events.map(e => e.id === eventId ? { ...e, drops: finalDrops } : e);

      onUpdateState({
        ...state,
        members: tempMembers,
        events: updatedEvents
      });
    }
  };

  // 8. Complete Event and Save State Permanently
  const handleCompleteEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Helper to check if a drop is a material/fragment
    const shouldAverageDrop = (itemName: string) => {
      const name = itemName.toLowerCase();
      return name.includes('เศษสมุด') || name.includes('ขนนก') || name.includes('feather') || name.includes('fragment');
    };

    // Helper to perform the actual saving & state updating
    const executeCompletion = () => {
      // Mark event as completed
      const updatedEvents = events.map(e => {
        if (e.id === eventId) {
          return { ...e, status: 'completed' as const, completedAt: new Date().toISOString() };
        }
        return e;
      });

      // We must permanently lock the winners' cycle status as 'true' for those who got items!
      // Let's gather winners of this event
      let updatedMembers = [...members];
      
      // To avoid multiple increments of participatedWarsCount for members getting multiple drops,
      // we track who got incremented.
      const incrementedMembers = new Set<string>();

      event.drops.forEach(d => {
        if (d.assignedToMemberId) {
          updatedMembers = updatedMembers.map(m => {
            if (m.id === d.assignedToMemberId) {
              const alreadyIncremented = incrementedMembers.has(m.id);
              if (!alreadyIncremented) {
                incrementedMembers.add(m.id);
              }
              return { 
                ...m, 
                hasReceivedInCycle: true,
                participatedWarsCount: m.participatedWarsCount + (alreadyIncremented ? 0 : 1)
              };
            }
            return m;
          });
        }
      });

      // Check if all guild members received items. If yes, reset everyone back to false!
      const totalCount = updatedMembers.length;
      const receivedCount = updatedMembers.filter(m => m.hasReceivedInCycle).length;
      if (totalCount > 0 && receivedCount === totalCount) {
        updatedMembers = updatedMembers.map(m => ({ ...m, hasReceivedInCycle: false }));
      }

      onUpdateState({
        ...state,
        members: updatedMembers,
        events: updatedEvents
      });

      // Send Discord webhook log
      const assignedDrops = event.drops.filter(d => d.assignedToMemberId);
      onSendDiscordNotification(
        `🏆 สรุปผลการจัดสรรและประมูลไอเทม: ${event.title}`,
        `สถานะ: ปิดรอบกิจกรรมสำเร็จ\nจำนวนผู้เข้าร่วม: ${event.participants.length} คน\n\nสรุปรายชื่อผู้ประมูลได้สิทธิ์:`,
        assignedDrops.map(d => ({
          name: `🎁 ${d.itemName}`,
          value: `ผู้ได้รับ: **${d.assignedToMemberName}**\nราคาประมูล: \`${d.bidAmount.toLocaleString()} Zeny\``,
          inline: false
        })),
        4081152, // Green color
        undefined,
        'raffles'
      );
    };

    // Check if there are unassigned drops
    const hasUnassigned = event.drops.some(d => !d.assignedToMemberId);
    if (hasUnassigned) {
      triggerConfirm(
        'ยังมีของรางวัลค้างอยู่',
        'คำเตือน: ยังมีไอเทมบางชิ้นที่ยังไม่ได้รับการจัดสรร คุณต้องการปิดกิจกรรมนี้เลยใช่หรือไม่?',
        executeCompletion
      );
    } else {
      executeCompletion();
    }
  };

  // 9. Delete Event
  const handleDeleteEvent = (eventId: string) => {
    triggerConfirm(
      'ลบกิจกรรม',
      'คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมรอบนี้ออกจากฐานข้อมูลอย่างถาวร?',
      () => {
        onUpdateState({
          ...state,
          events: events.filter(e => e.id !== eventId)
        });
      }
    );
  };

  // 10. Add Master Item Data
  const handleAddMasterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterName.trim()) return;

    const exists = masterItems.some(mi => mi.name.toLowerCase() === newMasterName.trim().toLowerCase());
    if (exists) {
      triggerAlert('ผิดพลาด', 'ไอเทมนี้มีอยู่ในระบบฐานข้อมูลหลักแล้ว');
      return;
    }

    const newItem: MasterItem = {
      id: `mi-${Date.now()}`,
      name: newMasterName.trim(),
      itemType: newMasterType
    };

    onUpdateState({
      ...state,
      masterItems: [...masterItems, newItem]
    });

    setNewMasterName('');
  };

  // 11. Delete Master Item
  const handleDeleteMasterItem = (itemId: string) => {
    triggerConfirm(
      'ลบไอเทมฐานข้อมูล',
      'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลไอเทมนี้ออกจากระบบฐานข้อมูลหลัก?',
      () => {
        onUpdateState({
          ...state,
          masterItems: masterItems.filter(mi => mi.id !== itemId)
        });
      }
    );
  };

  // 12. Save Edited Master Item
  const handleSaveMasterItemEdit = (id: string) => {
    if (!editMasterName.trim()) {
      triggerAlert('ผิดพลาด', 'ชื่อไอเทมไม่สามารถเป็นค่าว่างได้');
      return;
    }

    const exists = masterItems.some(mi => mi.id !== id && mi.name.toLowerCase() === editMasterName.trim().toLowerCase());
    if (exists) {
      triggerAlert('ผิดพลาด', 'ชื่อไอเทมนี้มีอยู่ในระบบฐานข้อมูลหลักแล้ว');
      return;
    }

    const updatedMasterItems = masterItems.map(mi => {
      if (mi.id === id) {
        return {
          ...mi,
          name: editMasterName.trim(),
          itemType: editMasterType
        };
      }
      return mi;
    });

    onUpdateState({
      ...state,
      masterItems: updatedMasterItems
    });

    setEditingMasterId(null);
  };

  return (
    <div className="space-y-6" id="auctions-tab">
      
      {/* Sub tabs */}
      <div className="flex border-b border-slate-850 gap-2">
        <button
          onClick={() => setActiveSubTab('events')}
          className={`pb-3 px-4 text-sm font-extrabold transition-all border-b-2 ${
            activeSubTab === 'events'
              ? 'text-blue-400 border-blue-500'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          รอบกิจกรรม & ไอเทมประมูล
        </button>
        <button
          onClick={() => setActiveSubTab('master_items')}
          className={`pb-3 px-4 text-sm font-extrabold transition-all border-b-2 ${
            activeSubTab === 'master_items'
              ? 'text-blue-400 border-blue-500'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          จัดการฐานข้อมูลหลักไอเทม (Master Data)
        </button>
      </div>

      {activeSubTab === 'events' ? (
        <div className="space-y-6">
          
          {/* Header Action block */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                <Calendar className="text-blue-500 w-6 h-6" />
                รอบกิจกรรม (Guild Match & Boss OverRun)
              </h2>
              <p className="text-xs text-slate-400">
                รายชื่อรอบวอร์ บอส และสถิติผู้ดรอปประมูลไอเทมต่างๆ ผูกกับกิจกรรมรายวันของกิลด์
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowCreateEventForm(!showCreateEventForm)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <Plus className="w-4 h-4" />
                ตั้งรอบกิจกรรม / ดรอปไอเทมใหม่
              </button>
            )}
          </div>

          {/* Create Event Dialog / Form */}
          {showCreateEventForm && (
            <form onSubmit={handleCreateEvent} className="bg-slate-900 border border-blue-500/20 rounded-3xl p-6 space-y-4 animate-fade-in">
              <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-1.5 border-b border-slate-850 pb-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                ตั้งค่ากิจกรรมรอบประมูลใหม่
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 space-y-1">
                  <label className="text-xs font-bold text-slate-400">หัวข้อกิจกรรม</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Guild League ประจำวันที่ 16 กรกฎาคม 2026"
                    value={newEventTitle}
                    onChange={e => setNewEventTitle(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-400">ประเภท</label>
                  <select
                    value={newEventType}
                    onChange={e => setNewEventType(e.target.value as any)}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                  >
                    <option value="league">🛡️ Guild League</option>
                    <option value="overrun">🔥 OverRun Boss</option>
                  </select>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-400">วันที่ทำกิจกรรม</label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={e => setNewEventDate(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Drops drafting area */}
              <div className="border border-slate-850 bg-slate-950/60 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-300">📦 เลือกไอเทมดรอปจากกิจกรรมนี้:</label>
                  <span className="text-[10px] text-slate-500">เลือกจากคลังฐานข้อมูลหลักด้านล่าง</span>
                </div>

                {masterItems.length === 0 ? (
                  <p className="text-xs text-amber-500 font-semibold bg-slate-950 p-3 rounded-lg border border-slate-850">
                    * โปรดเพิ่มฐานข้อมูลไอเทมก่อนที่แท็บ "จัดการฐานข้อมูลหลักไอเทม"
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {masterItems.map(item => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleAddDropToDraft(item.id)}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] px-3 py-1.5 rounded-lg text-slate-300 transition-colors font-semibold"
                      >
                        + {item.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Draft list table */}
                {selectedDrops.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-3">
                    <div className="p-2 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-400">รายการดรอปที่จะดรอปรอบนี้</div>
                    <div className="divide-y divide-slate-850">
                      {selectedDrops.map((sd, i) => {
                        const item = masterItems.find(mi => mi.id === sd.masterItemId);
                        return (
                          <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200">{item ? item.name : 'Unknown Item'}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">จำนวน:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={sd.quantity}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 1;
                                    setSelectedDrops(selectedDrops.map(d => d.masterItemId === sd.masterItemId ? { ...d, quantity: val } : d));
                                  }}
                                  className="w-12 bg-slate-950 border border-slate-800 text-center rounded text-xs font-bold py-0.5 text-yellow-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveDropFromDraft(sd.masterItemId)}
                                className="text-red-400 hover:text-red-300 font-bold px-1"
                              >
                                ลบ
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowCreateEventForm(false)}
                  className="bg-slate-950 hover:bg-slate-900 text-slate-400 font-bold px-4 py-2 rounded-xl text-xs border border-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2 rounded-xl text-xs"
                >
                  ยืนยันและประกาศลง Discord
                </button>
              </div>
            </form>
          )}

          {/* Events List Display */}
          {events.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 shadow-md">
              <Calendar className="w-12 h-12 mx-auto text-slate-700 mb-2 stroke-1" />
              <p className="text-sm text-slate-300 font-semibold">ไม่พบรอบกิจกรรมในขณะนี้</p>
              <p className="text-xs text-slate-500 mt-1">หัวหน้ากิลด์สามารถกดเพิ่มรอบกิจกรรมเพื่อเริ่มจัดคิวสิทธิ์รับของได้ทันที</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Events list */}
              <div className="lg:col-span-8 space-y-6">
                {events.map(event => {
                const isOverrun = event.type === 'overrun';
                const isActive = event.status === 'active';
                const hasJoined = currentUser ? event.participants.includes(currentUser.id) : false;

                                 // Event participant members list
                 const participantMembers = members
                   .filter(m => event.participants.includes(m.id));

                return (
                  <div 
                    key={event.id}
                    className={`bg-slate-900 border rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden transition-all duration-300 ${
                      isActive ? 'border-slate-800 shadow-blue-500/5' : 'border-slate-850/50 opacity-90'
                    }`}
                  >
                    
                    {/* Event Status Badging */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                            isOverrun ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' : 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                          }`}>
                            {isOverrun ? '🔥 OverRun Boss' : '🛡️ Guild League'}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-slate-950 text-slate-500 border border-slate-850'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                            <span>{isActive ? 'กำลังเปิดลงทะเบียน/ประมูล' : 'สรุปยอดแล้ว'}</span>
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-100">{event.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">วันที่ดรอปกิจกรรม: {event.date}</p>
                      </div>

                      {/* Header Actions */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        {isAdmin && (
                          <button
                            onClick={() => {
                              onSendDiscordNotification(
                                `📢 ประกาศกิจกรรมกิลด์: ${event.title}`,
                                `กิจกรรม: ${event.type === 'league' ? '🛡️ Guild League' : '🔥 OverRun'}\nวันที่: ${event.date}\n\nขอเชิญชวนสมาชิกกิลด์ทุกคนล็อกอินเข้ามากด "เข้าร่วมกิจกรรม" เพื่อรักษาสิทธิ์ของตนเองในวงล้อและคิวประมูลไอเทม!\n🔗 ลิงก์ระบบจัดการกิลด์: https://rooc-guild-management-ebon.vercel.app/`,
                                event.drops && event.drops.length > 0
                                  ? event.drops.map(d => ({ name: d.itemName, value: `จำนวน: ${d.quantity} ชิ้น (รอประมูล)`, inline: true }))
                                  : [{ name: "💎 ไอเทมดรอป", value: "ไม่มีรายการไอเทมประมูลในรอบนี้", inline: false }],
                                3066993, // Teal color
                                undefined,
                                'events'
                              );
                              showAlert?.('สำเร็จ', 'ส่งประกาศความเคลื่อนไหวกิจกรรมกิลด์ไปยังห้องประกาศบอท Discord เรียบร้อยแล้ว!');
                            }}
                            className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                            title="ประกาศกิจกรรมไปยัง Discord"
                          >
                            📢 ประกาศห้องบอร์ดกิลด์
                          </button>
                        )}
                        {isActive && currentUser && (() => {
                          return (
                            <>
                              {/* NOT JOINED */}
                              {!hasJoined && (
                                <button
                                  onClick={() => handleUserJoinEvent(event.id)}
                                  className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all duration-200 flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:scale-102 active:scale-98"
                                >
                                  📝 ร่วมลงทะเบียนเข้าร่วมกิจกรรม
                                </button>
                              )}

                              {/* JOINED */}
                              {hasJoined && (
                                <span className="bg-slate-950 border border-emerald-500/20 text-emerald-400 font-extrabold px-3 py-2.5 rounded-xl text-xs flex items-center gap-1 shrink-0">
                                  ✓ เข้าร่วมแล้ว
                                </span>
                              )}
                            </>
                          );
                        })()}

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-slate-950 transition-colors shrink-0"
                            title="ลบกิจกรรมนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Participants Section */}
                    <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-850/60 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-slate-400" />
                          รายชื่อผู้เข้าร่วมกิจกรรมนี้ ({event.participants.length} คน)
                        </h4>
                        {isAdmin && isActive && (
                          <button
                            onClick={() => setEditingParticipantsEventId(editingParticipantsEventId === event.id ? null : event.id)}
                            className="text-[11px] font-bold text-blue-400 hover:text-blue-300"
                          >
                            {editingParticipantsEventId === event.id ? 'เสร็จสิ้นการเลือก' : '⚙️ จัดการรายชื่อเอง'}
                          </button>
                        )}
                      </div>

                      {editingParticipantsEventId === event.id ? (
                        /* Admin Selection Matrix */
                        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2">
                          <p className="text-[10px] text-slate-400">* ติ๊กเลือกสมาชิกที่เข้ากิจกรรมในรอบนี้เพื่อดรอปวงล้อหรือรับสิทธิ์ประมูล:</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {members.map(member => {
                              const checked = event.participants.includes(member.id);
                              return (
                                <label 
                                  key={member.id} 
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                    checked 
                                      ? 'bg-blue-950/20 border-blue-500/30 text-blue-300' 
                                      : 'bg-slate-950/40 border-transparent text-slate-500 hover:text-slate-400'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleAdminToggleParticipant(event.id, member.id)}
                                    className="rounded border-slate-800 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                  />
                                  <span className="font-semibold truncate">{member.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Simple display of participant tags */
                        event.participants.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-1">ยังไม่มีรายชื่อผู้เข้าร่วมกิจกรรมรอบนี้</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {participantMembers.map(m => (
                              <span 
                                key={m.id} 
                                className={`text-[10.5px] px-2.5 py-1 rounded-md border font-semibold ${
                                  m.hasReceivedInCycle 
                                    ? 'bg-slate-900 border-slate-800 text-slate-500' 
                                    : 'bg-blue-950/20 border-blue-500/10 text-slate-300'
                                }`}
                              >
                                {m.hasReceivedInCycle ? `✓ ${m.name}` : `🌟 ${m.name}`}
                              </span>
                            ))}
                          </div>
                        )
                      )}
                    </div>



                    {/* Visual Queue Board */}
                    {event.participants.length > 0 && (
                      <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-850/70 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                            ลำดับคิวและสิทธิ์รับสิทธิ์ตามกฎความเท่าเทียม (Fair-Play Priority Queue)
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                            *จัดลำดับตามสถิติการเข้ากิจกรรมสะสม
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* First Priority (Has Not Received) */}
                          <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/20 space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[11px] font-extrabold text-emerald-400">กลุ่ม 1: มีสิทธิ์สูงสุด (ยังไม่ได้ของรอบนี้)</span>
                              </div>
                              <span className="text-[10px] text-emerald-500 font-bold">
                                {participantMembers.filter(m => !m.hasReceivedInCycle).length} คน
                              </span>
                            </div>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {participantMembers.filter(m => !m.hasReceivedInCycle).length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic py-2 text-center">
                                  ✓ สมาชิกผู้เข้าร่วมทุกคนได้รับของครบถ้วนแล้ว!
                                </p>
                              ) : (
                                [...participantMembers]
                                  .filter(m => !m.hasReceivedInCycle)
                                  .sort((a, b) => b.participatedWarsCount - a.participatedWarsCount)
                                  .map((m, idx) => (
                                    <div key={m.id} className="flex justify-between items-center text-xs p-1.5 bg-slate-950/40 hover:bg-slate-950 rounded border border-slate-850/40">
                                      <span className="font-bold text-slate-300">
                                        {idx + 1}. {m.name}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9.5px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850 font-mono font-extrabold">
                                          ⚔️ {m.participatedWarsCount} ครั้ง
                                        </span>
                                        <span className="text-[9.5px] text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-500/10 font-bold">
                                          มีสิทธิ์
                                        </span>
                                      </div>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>

                          {/* Waiting for Next Cycle (Already Received) */}
                          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                                <span className="text-[11px] font-extrabold text-slate-400">กลุ่ม 2: คิวรอรอบถัดไป (ได้ของรอบนี้แล้ว)</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold">
                                {participantMembers.filter(m => m.hasReceivedInCycle).length} คน
                              </span>
                            </div>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {participantMembers.filter(m => m.hasReceivedInCycle).length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic py-2 text-center">
                                  ยังไม่มีใครได้รับของในรอบปันผลนี้
                                </p>
                              ) : (
                                [...participantMembers]
                                  .filter(m => m.hasReceivedInCycle)
                                  .sort((a, b) => b.participatedWarsCount - a.participatedWarsCount)
                                  .map((m, idx) => (
                                    <div key={m.id} className="flex justify-between items-center text-xs p-1.5 bg-slate-950/20 rounded border border-transparent text-slate-500">
                                      <span className="font-semibold text-slate-500 line-through">
                                        {m.name}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-slate-500 font-mono">
                                          ⚔️ {m.participatedWarsCount} ครั้ง
                                        </span>
                                        <span className="text-[9px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">
                                          ✓ ได้รับแล้ว
                                        </span>
                                      </div>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}



                  </div>
                );
              })}
              </div>

              {/* ข้อมูลสรุปและวิเคราะห์ฝั่งขวา */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl lg:sticky lg:top-4">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                    วิเคราะห์ผู้เข้าร่วมกิจกรรมกิลด์
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">วิเคราะห์เชิงลึกของยอดลงชื่อ อาชีพ และความพร้อมรบของรอบกิจกรรมล่าสุด</p>
                </div>

                {(() => {
                  const activeEvent = events.find(e => e.status === 'active') || events[0];
                  if (!activeEvent) return <p className="text-xs text-slate-500 italic text-center py-4">ไม่มีข้อมูลสำหรับวิเคราะห์</p>;

                  const activeParticipants = members.filter(m => activeEvent.participants.includes(m.id));
                  const totalCount = activeParticipants.length;

                  // Job class system removed

                  return (
                    <div className="space-y-5">
                      <div className="bg-slate-950/60 p-3.5 border border-slate-850 rounded-2xl space-y-1">
                        <span className="text-[9px] text-yellow-500 font-extrabold block uppercase tracking-wider">กำลังสรุปรอบกิจกรรม</span>
                        <span className="text-xs font-bold text-slate-200 block truncate">{activeEvent.title}</span>
                        <div className="flex justify-between items-center pt-2 text-xs font-bold">
                          <span className="text-slate-400">ผู้เข้าร่วมทั้งหมด:</span>
                          <span className="text-blue-400 font-mono text-sm">{totalCount} คน</span>
                        </div>
                      </div>

                      <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-2xl text-[10.5px] leading-relaxed text-slate-400 space-y-1">
                        <span className="font-bold text-slate-300 block">💡 ข้อมูลการจัดสรร:</span>
                        <p className="text-emerald-400">ระบบคิวจัดสรรจะทำงานสอดคล้องกับกฎความเท่าเทียม (Fair-Play Priority Queue) โดยจัดลำดับคิวและสิทธิ์ปันผลให้กับสมาชิกที่เข้าร่วมสม่ำเสมอที่สุดเพื่อความโปร่งใสในกิลด์</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Tab B: Master Item Manager */
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <Package className="text-blue-500 w-6 h-6" />
              จัดการฐานข้อมูลหลักไอเทม (Master Items Configuration)
            </h2>
            <p className="text-xs text-slate-400">
              ฐานข้อมูลรายการไอเทมเริ่มต้นที่จะนำมาใช้ระบุในแต่ละรอบกิจกรรม
            </p>
          </div>

          {/* Add Item Form */}
          {isAdmin && (
            <form onSubmit={handleAddMasterItem} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-6">
                <label className="text-xs font-bold text-slate-400 block mb-1">ชื่อไอเทมดรอปหลัก (เช่น ขนนกขาว, Puppet Card)</label>
                <input
                  type="text"
                  required
                  placeholder="ตัวอย่าง ขนนกแดงดำ, เศษสมุด"
                  value={newMasterName}
                  onChange={e => setNewMasterName(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-bold text-slate-400 block mb-1">ประเภทไอเทม</label>
                <select
                  value={newMasterType}
                  onChange={e => setNewMasterType(e.target.value as any)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                >
                  <option value="material">วัตถุดิบ (Material)</option>
                  <option value="card">การ์ด (Card)</option>
                  <option value="equip">อุปกรณ์ (Equip)</option>
                  <option value="consumable">ของบริโภค (Consumable)</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors"
                >
                  เพิ่มเข้าฐานข้อมูลมาสเตอร์
                </button>
              </div>
            </form>
          )}

          {/* Item List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-950 border-b border-slate-850 text-xs font-bold text-slate-400">
              รายชื่อสินค้ามาสเตอร์ทั้งหมด ({masterItems.length} ไอเทม)
            </div>
            
            {masterItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">ไม่มีไอเทมในฐานข้อมูล</p>
            ) : (
              <div className="divide-y divide-slate-850 max-h-[400px] overflow-y-auto">
                {masterItems.map(item => {
                  const isEditingItem = editingMasterId === item.id;
                  return (
                    <div key={item.id} className="p-3 flex justify-between items-center hover:bg-slate-850/10 transition-colors text-xs gap-4">
                      {isEditingItem ? (
                        <div className="flex-grow flex items-center gap-2">
                          <input
                            type="text"
                            value={editMasterName}
                            onChange={e => setEditMasterName(e.target.value)}
                            className="bg-slate-950 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500 w-1/2"
                          />
                          <select
                            value={editMasterType}
                            onChange={e => setEditMasterType(e.target.value as any)}
                            className="bg-slate-950 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500"
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
                          <span className="ml-2 px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                            {item.itemType}
                          </span>
                        </div>
                      )}
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEditingItem ? (
                            <>
                              <button
                                onClick={() => handleSaveMasterItemEdit(item.id)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-md"
                                title="บันทึก"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingMasterId(null)}
                                className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                                title="ยกเลิก"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMasterId(item.id);
                                  setEditMasterName(item.name);
                                  setEditMasterType(item.itemType);
                                }}
                                className="text-slate-400 hover:text-blue-400 p-1.5 rounded hover:bg-slate-950 transition-colors"
                                title="แก้ไขข้อมูลไอเทม"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMasterItem(item.id)}
                                className="text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-slate-950 transition-colors"
                                title="ลบไอเทม"
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
      )}

      {/* 5. INTERACTIVE SPIN WHEEL MODAL FOR SPECIFIC DROP */}
      {isDropWheelOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>
            
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block">🎡 RO Classic Lucky Wheel</span>
                <h3 className="text-base font-black text-slate-100">วงล้อสุ่มสิทธิ์ไอเทม</h3>
                <p className="text-[11px] text-slate-400">ไอเทม: <strong className="text-yellow-400 font-extrabold">{activeWheelDropName}</strong></p>
              </div>
              <button 
                onClick={() => setIsDropWheelOpen(false)}
                className="text-slate-500 hover:text-slate-200 text-lg font-bold px-2 py-1 bg-slate-950/40 rounded-xl"
                disabled={isDropWheelSpinning}
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950/50 p-2 rounded-2xl text-[10px] text-slate-400 flex items-center gap-1.5 border border-slate-850/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>สุ่มจากผู้เข้าร่วมกิจกรรม {wheelCandidates.length} คนที่ยังไม่ได้ของรอบนี้</span>
            </div>

            {/* Interactive Wheel Canvas */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative p-2.5 bg-slate-950 rounded-full border-4 border-slate-800/80 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
                {/* Needle pointer pointing down */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2.5 z-20">
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[15px] border-t-yellow-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] animate-bounce"></div>
                </div>

                <canvas 
                  ref={dropWheelCanvasRef} 
                  width={280} 
                  height={280} 
                  className="rounded-full bg-slate-950"
                />
              </div>
            </div>

            {/* Spin Trigger / Result screen */}
            <div className="space-y-3">
              {!dropWheelWinner ? (
                <button
                  type="button"
                  onClick={spinDropWheel}
                  disabled={isDropWheelSpinning || wheelCandidates.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3.5 rounded-2xl text-xs transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 uppercase tracking-widest"
                >
                  <Play className="w-4 h-4 fill-white animate-pulse" />
                  {isDropWheelSpinning ? 'วงล้อกำลังหมุนด้วยพลัง...' : 'กดปุ่มเพื่อหมุนวงล้อสุ่ม!'}
                </button>
              ) : (
                <div className="bg-slate-950 border border-yellow-500/30 p-3 rounded-2xl text-center space-y-3 animate-fade-in">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-yellow-500 font-bold uppercase tracking-widest block">🎉 ยินดีด้วยกับผู้ได้สิทธิ์! 🎉</span>
                    <h4 className="text-lg font-black text-slate-100 flex items-center justify-center gap-1">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      {dropWheelWinner.name}
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      สถิติสะสม: <strong>⚔️ {dropWheelWinner.participatedWarsCount} วอร์</strong>
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDropWheelWinner(null)}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-extrabold py-2 rounded-xl text-xs border border-slate-800 transition-colors"
                    >
                      สปินใหม่
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDropWheelWinner}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-2 rounded-xl text-xs shadow-md transition-colors"
                    >
                      มอบสิทธิ์ให้คนนี้ ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
