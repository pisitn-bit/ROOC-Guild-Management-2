import React, { useState, useEffect, useRef } from 'react';
import { GuildState, Member, RafflePrize, RaffleResult, GuildEvent, EventDrop } from '../types';
import { 
  Gift, 
  Users, 
  Play, 
  HelpCircle, 
  Dices, 
  CheckCircle, 
  RotateCcw, 
  ChevronRight, 
  Volume2, 
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Award,
  Package,
  Info,
  Shield,
  X,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SpinWheelProps {
  state: GuildState;
  currentUser: Member | null;
  isAdmin: boolean;
  onUpdateState: (newState: GuildState) => void;
  onSendDiscordNotification: (title: string, message: string, fields: any[], color: number, content?: string, webhookType?: 'leaves' | 'events' | 'raffles') => void;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function SpinWheel({ 
  state, 
  currentUser, 
  isAdmin, 
  onUpdateState, 
  onSendDiscordNotification,
  showAlert,
  showConfirm
}: SpinWheelProps) {
  
  const [eventLimit, setEventLimit] = useState<number>(1);

  // Whitelist modal states
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [whitelistTargetDrop, setWhitelistTargetDrop] = useState<{ eventId: string; dropId: string } | null>(null);
  const [selectedWhitelistClasses, setSelectedWhitelistClasses] = useState<string[]>([]);
  const [selectedWhitelistMembers, setSelectedWhitelistMembers] = useState<string[]>([]);

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

  // Selected event to pull participants from
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    const active = state.events?.find(e => e.status === 'active');
    return active ? active.id : (state.events?.[0]?.id || 'all');
  });

  const [excludeReceived, setExcludeReceived] = useState(true);

  // Local state of who is checked for the raffle
  const [participants, setParticipants] = useState<string[]>([]);

  // Prize configuration
  const [customPrizeName, setCustomPrizeName] = useState<string>('สิทธิ์เลือกของประมูล (Priority Choice)');

  // Helper to add drop to specific event
  const handleAddDropToEvent = (eventId: string, itemName: string, quantity: number) => {
    const masterItem = (state.masterItems || []).find(mi => mi.name === itemName);
    const updatedEvents = (state.events || []).map(ev => {
      if (ev.id === eventId) {
        const newDrop = {
          id: 'drop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          itemName,
          quantity,
          assignedToMemberId: null,
          assignedToMemberName: null,
          bidAmount: 0,
                    whitelistMemberIds: masterItem?.whitelistMemberIds || []
        };
        return {
          ...ev,
          drops: [...(ev.drops || []), newDrop]
        };
      }
      return ev;
    });

    onUpdateState({
      ...state,
      events: updatedEvents
    });
  };

  // Helper to delete drop from event
  const handleDeleteDropFromEvent = (eventId: string, dropId: string) => {
    const updatedEvents = (state.events || []).map(ev => {
      if (ev.id === eventId) {
        return {
          ...ev,
          drops: (ev.drops || []).filter(d => d.id !== dropId)
        };
      }
      return ev;
    });

    onUpdateState({
      ...state,
      events: updatedEvents
    });
  };

  // Open whitelist setup for a drop
  const handleOpenWhitelistModal = (eventId: string, dropId: string) => {
    const event = (state.events || []).find(e => e.id === eventId);
    const drop = event?.drops?.find(d => d.id === dropId);
    if (drop) {
      setWhitelistTargetDrop({ eventId, dropId });
            setSelectedWhitelistMembers(drop.whitelistMemberIds || []);
      setIsWhitelistModalOpen(true);
    }
  };

  // Save whitelist settings for a drop
  const handleSaveWhitelist = () => {
    if (!whitelistTargetDrop) return;
    const { eventId, dropId } = whitelistTargetDrop;
    const updatedEvents = (state.events || []).map(ev => {
      if (ev.id === eventId) {
        return {
          ...ev,
          drops: (ev.drops || []).map(d => {
            if (d.id === dropId) {
              return {
                ...d,
                                whitelistMemberIds: selectedWhitelistMembers
              };
            }
            return d;
          })
        };
      }
      return ev;
    });

    onUpdateState({
      ...state,
      events: updatedEvents
    });
    setIsWhitelistModalOpen(false);
    setWhitelistTargetDrop(null);
  };

  // Reset all auction results for the current selected event
  const handleResetAuction = () => {
    if (selectedEventId === 'all') return;
    const activeEvent = events.find(e => e.id === selectedEventId);
    if (!activeEvent) return;

    triggerConfirm(
      'ยืนยันการล้างผลการประมูลทั้งหมด',
      'คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการล้างผลการประมูลและการจัดสรรของรางวัลทั้งหมดในกิจกรรมรอบนี้? ข้อมูลการจัดสรรและไอเทมที่ถูกเฉลี่ยจะถูกกู้คืนเป็นค่าเริ่มต้นก่อนจัดสรร',
      () => {
        // Reconstruct the original drops (re-merging any split drops)
        const originalDropsMap = new Map<string, EventDrop>();
        const assignedMemberIdsToReset = new Set<string>();

        activeEvent.drops.forEach(drop => {
          if (drop.assignedToMemberId) {
            assignedMemberIdsToReset.add(drop.assignedToMemberId);
          }

          if (drop.isSplit && drop.originalDropId) {
            const existing = originalDropsMap.get(drop.originalDropId);
            if (existing) {
              existing.quantity += drop.quantity;
            } else {
              originalDropsMap.set(drop.originalDropId, {
                ...drop,
                id: drop.originalDropId,
                assignedToMemberId: null,
                assignedToMemberName: null,
                bidAmount: 0,
                isSplit: false,
                originalDropId: undefined
              });
            }
          } else {
            originalDropsMap.set(drop.id, {
              ...drop,
              assignedToMemberId: null,
              assignedToMemberName: null,
              bidAmount: 0,
              isSplit: false,
              originalDropId: undefined,
              cycle: undefined
            });
          }
        });

        const resetDrops = Array.from(originalDropsMap.values());

        // Update the event in the events list
        const updatedEvents = events.map(ev => {
          if (ev.id === selectedEventId) {
            return {
              ...ev,
              drops: resetDrops
            };
          }
          return ev;
        });

        // Reset the members' hasReceivedInCycle status
        const updatedMembers = members.map(m => {
          if (assignedMemberIdsToReset.has(m.id)) {
            return {
              ...m,
              hasReceivedInCycle: false
            };
          }
          return m;
        });

        // Clean up raffle results associated with this event
        const updatedRaffleResults = raffleResults.filter(res => {
          // If the result is linked to this event, filter it out
          if (res.eventId === selectedEventId) return false;

          // Fallback: check if the prizeName contains any drop item names from the current event
          const isRelatedToEventDrop = activeEvent.drops.some(drop => {
            const nameToMatch = drop.itemName.replace(/\s+/g, '').toLowerCase();
            const prizeToMatch = res.prizeName.replace(/\s+/g, '').toLowerCase();
            return prizeToMatch.includes(nameToMatch) || nameToMatch.includes(prizeToMatch);
          });
          if (isRelatedToEventDrop) return false;

          return true;
        });

        onUpdateState({
          ...state,
          events: updatedEvents,
          members: updatedMembers,
          raffleResults: updatedRaffleResults
        });

        onSendDiscordNotification(
          `🔄 รีเซ็ตและล้างผลการประมูลกิลด์รอบนี้`,
          `ผู้ดูแลระบบได้ทำการล้างผลการจัดสรรและประมูลของรางวัลทั้งหมดประจำรอบกิจกรรม **${activeEvent.title}** เรียบร้อยแล้ว เพื่อเตรียมการจัดสรรใหม่`,
          [],
          15158332, // Red-ish
          undefined,
          'events'
        );

        triggerAlert('สำเร็จ', 'ล้างผลการประมูลและการจัดสรรของรางวัลรอบนี้ทั้งหมดเรียบร้อยแล้ว');
      }
    );
  };

  // Manually delete a single raffle result from the audit trail
  const handleDeleteRaffleResult = (resultId: string) => {
    const resultToDelete = raffleResults.find(res => res.id === resultId);
    if (!resultToDelete) return;

    triggerConfirm(
      'ลบประวัติการรับรางวัล',
      `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการรับรางวัลของ "${resultToDelete.winnerName}" รายการนี้ออกจากตาราง? ระบบจะคืนสิทธิ์คิวประมูลให้สมาชิกท่านนี้ด้วย`,
      () => {
        const updatedResults = raffleResults.filter(res => res.id !== resultId);

        // Find the member by name and set hasReceivedInCycle to false
        const updatedMembers = members.map(m => {
          if (m.name === resultToDelete.winnerName) {
            return {
              ...m,
              hasReceivedInCycle: false
            };
          }
          return m;
        });

        // Also check if this raffle result matches any drop in the active event, and if so, unassign it!
        let updatedEvents = [...events];
        if (selectedEventId !== 'all') {
          updatedEvents = events.map(ev => {
            if (ev.id === selectedEventId) {
              return {
                ...ev,
                drops: ev.drops.map(d => {
                  const nameToMatch = d.itemName.replace(/\s+/g, '').toLowerCase();
                  const prizeToMatch = resultToDelete.prizeName.replace(/\s+/g, '').toLowerCase();
                  const isMatchingPrize = prizeToMatch.includes(nameToMatch) || nameToMatch.includes(prizeToMatch);
                  
                  const member = members.find(m => m.name === resultToDelete.winnerName);
                  const isMatchingWinner = d.assignedToMemberId === member?.id;

                  if (isMatchingPrize && isMatchingWinner) {
                    return {
                      ...d,
                      assignedToMemberId: null,
                      assignedToMemberName: null,
                      bidAmount: 0
                    };
                  }
                  return d;
                })
              };
            }
            return ev;
          });
        }

        onUpdateState({
          ...state,
          raffleResults: updatedResults,
          members: updatedMembers,
          events: updatedEvents
        });

        triggerAlert('สำเร็จ', `ลบประวัติและคืนสิทธิ์คิวของ "${resultToDelete.winnerName}" เรียบร้อยแล้ว`);
      }
    );
  };

  // Send event summary announcement to Discord
  const handleSendDiscordSummary = () => {
    if (selectedEventId === 'all') return;
    const activeEvent = events.find(e => e.id === selectedEventId);
    if (!activeEvent) return;

    // Gather assigned drops
    const assignedDrops = activeEvent.drops.filter(d => d.assignedToMemberId);
    if (assignedDrops.length === 0) {
      triggerAlert('ไม่มีข้อมูลจัดสรร', 'ไม่พบรายชื่อผู้ได้รับไอเทมดรอปที่จัดสรรแล้วในรอบกิจกรรมนี้');
      return;
    }

    // Thai Date formatting helper
    const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    let dayName = 'วันจัดกิจกรรม';
    let formattedDate = activeEvent.date;

    try {
      const date = new Date(activeEvent.date);
      dayName = days[date.getDay()];
      const dayOfMonth = date.getDate();
      const monthName = months[date.getMonth()];
      const buddhistYear = date.getFullYear() + 543;
      formattedDate = `${dayOfMonth} ${monthName} ${buddhistYear}`;
    } catch (e) {
      console.error(e);
    }

    // Group by itemName and calculate unassigned (remainder) quantities
    const assignedGroups: { [itemName: string]: { memberName: string; quantity: number }[] } = {};
    const unassignedQuantities: { [itemName: string]: number } = {};

    activeEvent.drops.forEach(d => {
      if (d.assignedToMemberId && d.assignedToMemberName) {
        if (!assignedGroups[d.itemName]) {
          assignedGroups[d.itemName] = [];
        }
        assignedGroups[d.itemName].push({
          memberName: d.assignedToMemberName,
          quantity: d.quantity
        });
      } else {
        unassignedQuantities[d.itemName] = (unassignedQuantities[d.itemName] || 0) + d.quantity;
      }
    });

    // Build raw content string
    const lines: string[] = [
      `📢 **ประกาศ กิจกรรม ${activeEvent.title}**`,
      `ประจำ${dayName} ที่ ${formattedDate}`,
      ``
    ];

    // Gather all drop item names in this event
    const itemNames = Array.from(new Set(activeEvent.drops.map(d => d.itemName)));

    itemNames.forEach(itemName => {
      const recipients = assignedGroups[itemName] || [];
      const leftQty = unassignedQuantities[itemName] || 0;

      // Only list if there are either recipients OR remaining quantity
      if (recipients.length > 0 || leftQty > 0) {
        lines.push(`รายชื่อที่ได้ประมูล ${itemName} มี`);
        recipients.forEach((rec, idx) => {
          lines.push(`${idx + 1} . ${rec.memberName} จำนวน ${rec.quantity} ชิ้น`);
        });
        if (leftQty > 0) {
          lines.push(`คงเหลือ ${leftQty} ชิ้น`);
        }
        lines.push(``); // Empty line after each group
      }
    });

    // Remove the trailing empty line if present
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }

    const rawContent = lines.join('\n');

    // Send it!
    onSendDiscordNotification(
      `ประกาศผลการจัดสรร`,
      `ประกาศผลกิจกรรม ${activeEvent.title}`,
      [],
      3066993, // Teal/Green
      rawContent, // Content parameter!
      'events'
    );

    triggerAlert('สำเร็จ', 'ส่งประกาศสรุปผลกิจกรรมไปยัง Discord เรียบร้อยแล้วครับ!');
  };

  // Wheel Physics & Animation state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState<Member | null>(null);
  const currentAngleRef = useRef(0);
  const spinSpeedRef = useRef(0);
  const requestRef = useRef<number | null>(null);

  const events = state.events || [];
  const members = state.members || [];
  const rafflePrizes = state.rafflePrizes || [];
  const raffleResults = state.raffleResults || [];

  // Dynamically calculate which members have received an item in this cycle
  const receivedIds = new Set<string>();
  events.forEach(e => {
    e.drops?.forEach(d => {
      if (d.assignedToMemberId && d.cycle === state.currentCycle) {
        receivedIds.add(d.assignedToMemberId);
      }
    });
  });

  // Update selected participants when selectedEventId or events change
  useEffect(() => {
    if (selectedEventId === 'all') {
      // Pull all members
      setParticipants(members.map(m => m.id));
    } else {
      const event = events.find(e => e.id === selectedEventId);
      if (event) {
        setParticipants(event.participants);
      } else {
        setParticipants([]);
      }
    }
  }, [selectedEventId, events, members]);



  // Helper to count how many items a member has been assigned in the selected event (or cycle)
  const getAssignedCount = (memberId: string) => {
    if (selectedEventId === 'all') {
      return receivedIds.has(memberId) ? 1 : 0;
    }
    const currentEvent = events.find(e => e.id === selectedEventId);
    if (!currentEvent) return 0;
    return (currentEvent.drops || []).filter(d => d.assignedToMemberId === memberId).length;
  };

  // Find minimum assigned count among selected participants to determine eligibility
  const eligibleAssignedCount = (() => {
    const selectedParticipants = members.filter(m => participants.includes(m.id));
    if (selectedParticipants.length === 0) return 0;
    const counts = selectedParticipants.map(m => getAssignedCount(m.id));
    return Math.min(...counts);
  })();

  // Active member structures representing the slices
  const activeParticipants = (() => {
    // 1. Get all checked participants who have not exceeded the event limit
    const candidates = members.filter(m => {
      const isMatched = participants.includes(m.id);
      if (!isMatched) return false;
      if (selectedEventId !== 'all') {
        const assignedInEvent = getAssignedCount(m.id);
        if (assignedInEvent >= eventLimit) {
          return false;
        }
      }
      return true;
    });

    if (!excludeReceived) return candidates;

    // 2. Filter candidates by hasReceivedInCycle priority
    // Priority 1: members who have NOT received in cycle
    const priority1 = candidates.filter(m => !receivedIds.has(m.id));
    if (priority1.length > 0) {
      return priority1;
    }

    // Priority 2: members who have received in cycle
    return candidates;
  })();

  // Redraw Wheel whenever participants, members, events, settings or limit change
  useEffect(() => {
    drawWheel();
  }, [participants, members, selectedEventId, events, excludeReceived, eventLimit]);

  // Color palette for professional RPG-style wheel slices
  const sliceColors = [
    '#1e1b4b', // Deep indigo
    '#0f172a', // Dark slate
    '#312e81', // Blue indigo
    '#020617', // Pitch black
    '#1e293b', // Medium slate
    '#4338ca', // Royal blue
  ];

  const getSliceColor = (index: number) => {
    return sliceColors[index % sliceColors.length];
  };

  // Draw RPG-style high-quality Spin Wheel on Canvas
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2;
    ctx.clearRect(0, 0, size, size);

    if (activeParticipants.length === 0) {
      // Draw premium dark void placeholder
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
      ctx.fillText('กรุณาเลือกหรือเพิ่มผู้เข้าร่วมวอร์', radius, radius);
      return;
    }

    const sliceAngle = (2 * Math.PI) / activeParticipants.length;

    // Draw slices
    activeParticipants.forEach((member, i) => {
      const angle = currentAngleRef.current + i * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius - 12, angle, angle + sliceAngle);
      ctx.fillStyle = getSliceColor(i);
      ctx.fill();
      
      // Draw slice separator line
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#3b82f630'; // subtle glowing blue border
      ctx.stroke();

      // Write member name
      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';

      // Draw subtle text shadow
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      
      const text = member.name.length > 12 ? member.name.substring(0, 10) + '..' : member.name;
      ctx.fillText(text, radius - 25, 4);
      ctx.restore();
    });

    // Draw Wheel Outer Ring
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 12, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3b82f6'; // Neon blue border
    ctx.stroke();

    // Draw outer golden dots around the ring for decoration
    const totalDots = 16;
    for (let d = 0; d < totalDots; d++) {
      const dotAngle = d * (2 * Math.PI / totalDots);
      const dotX = radius + (radius - 12) * Math.cos(dotAngle);
      const dotY = radius + (radius - 12) * Math.sin(dotAngle);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#fbbf24'; // Gold light dot
      ctx.fill();
    }

    // Draw Gold Center Pin Button
    ctx.beginPath();
    ctx.arc(radius, radius, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#d97706'; // gold
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fbbf24'; // yellow gold
    ctx.stroke();

    // Core glass bubble effect
    const gradient = ctx.createRadialGradient(radius - 5, radius - 5, 2, radius, radius, 22);
    gradient.addColorStop(0, '#fef08a');
    gradient.addColorStop(1, '#b45309');
    ctx.beginPath();
    ctx.arc(radius, radius, 16, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
  };

  // 1. Premium Wheel Spin deceleration physics
  const spinWheel = () => {
    if (isSpinning || activeParticipants.length === 0) return;

    setIsSpinning(true);
    setWheelWinner(null);
    
    // Set dynamic initial velocity
    spinSpeedRef.current = Math.random() * 0.45 + 0.35; // Random initial speed
    const friction = 0.988; // Deceleration rate

    const animate = () => {
      currentAngleRef.current += spinSpeedRef.current;
      currentAngleRef.current = currentAngleRef.current % (2 * Math.PI);
      spinSpeedRef.current *= friction;

      drawWheel();

      if (spinSpeedRef.current < 0.0015) {
        setIsSpinning(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        calculateWinner();
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
  };

  // Instant spin draw bypassing the animation
  const spinWheelInstantly = () => {
    if (isSpinning || activeParticipants.length === 0) return;

    setWheelWinner(null);
    
    // Choose a random winner from activeParticipants
    const winnerIndex = Math.floor(Math.random() * activeParticipants.length);
    const winner = activeParticipants[winnerIndex];
    setWheelWinner(winner);

    // Set canvas to a random angle and redraw
    currentAngleRef.current = Math.random() * 2 * Math.PI;
    drawWheel();

    // Fire confetti on winning!
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 }
    });
  };

  // Pointer pointing down at 270 degrees (1.5 * Math.PI)
  const calculateWinner = () => {
    if (activeParticipants.length === 0) return;

    const sliceAngle = (2 * Math.PI) / activeParticipants.length;
    const normalizedAngle = (1.5 * Math.PI - currentAngleRef.current) % (2 * Math.PI);
    const positiveAngle = normalizedAngle < 0 ? normalizedAngle + 2 * Math.PI : normalizedAngle;
    
    const winnerIndex = Math.floor(positiveAngle / sliceAngle) % activeParticipants.length;
    const winner = activeParticipants[winnerIndex];

    setWheelWinner(winner);

    // Fire confetti on winning!
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 }
    });
  };

  // Save lucky wheel winner
  const handleSaveWheelWinner = () => {
    if (!wheelWinner) return;

    let prizeNameStr = customPrizeName || 'รางวัลสุ่มวงล้อ';
    let updatedEvents = [...events];

    const shouldAverageDrop = (itemName: string) => {
      const name = itemName.toLowerCase();
      return name.includes('เศษสมุด') || name.includes('ขนนก') || name.includes('feather') || name.includes('fragment');
    };

    if (selectedEventId !== 'all') {
      const currentSelectedEvent = events.find(e => e.id === selectedEventId);
      const unassignedDrop = currentSelectedEvent?.drops?.find(d => !d.assignedToMemberId);
      
      if (currentSelectedEvent && unassignedDrop) {
        const isMaterial = shouldAverageDrop(unassignedDrop.itemName);
        
        let spinQty = unassignedDrop.quantity;
        if (isMaterial) {
          const originalQty = unassignedDrop.originalQuantity || unassignedDrop.quantity;
          const P = participants.length;
          const base = P <= 0 ? 1 : Math.max(1, Math.floor(originalQty / P));
          spinQty = Math.min(base, unassignedDrop.quantity);
        }

        prizeNameStr = `ไอเทม: ${unassignedDrop.itemName} (x${spinQty} ชิ้น)`;
        
        // Update the drop in the event
        updatedEvents = events.map(ev => {
          if (ev.id === selectedEventId) {
            const newDrops: EventDrop[] = [];
            
            ev.drops.forEach(d => {
              if (d.id === unassignedDrop.id) {
                if (spinQty === d.quantity) {
                  // Assign the whole drop
                  newDrops.push({
                    ...d,
                    assignedToMemberId: wheelWinner.id,
                    assignedToMemberName: wheelWinner.name,
                    originalQuantity: d.originalQuantity || d.quantity,
                    cycle: state.currentCycle || 1
                  });
                } else {
                  // Split it!
                  newDrops.push({
                    ...d,
                    id: `drop-split-${d.id}-${wheelWinner.id}-${Date.now()}`,
                    quantity: spinQty,
                    assignedToMemberId: wheelWinner.id,
                    assignedToMemberName: wheelWinner.name,
                    originalDropId: d.originalDropId || d.id,
                    isSplit: true,
                    originalQuantity: d.originalQuantity || d.quantity,
                    cycle: state.currentCycle || 1
                  });
                  newDrops.push({
                    ...d,
                    id: `drop-remainder-${d.id}-${Date.now()}`,
                    quantity: d.quantity - spinQty,
                    assignedToMemberId: null,
                    assignedToMemberName: null,
                    bidAmount: 0,
                    originalDropId: d.originalDropId || d.id,
                    isSplit: true,
                    originalQuantity: d.originalQuantity || d.quantity
                  });
                }
              } else {
                newDrops.push(d);
              }
            });

            return {
              ...ev,
              drops: newDrops
            };
          }
          return ev;
        });
      }
    }

    const newResult: RaffleResult = {
      id: `ref-${Date.now()}`,
      prizeName: prizeNameStr,
      winnerName: wheelWinner.name,
      timestamp: new Date().toISOString(),
      itemType: 'raffle',
      eventId: selectedEventId
    };

    onUpdateState({
      ...state,
      raffleResults: [newResult, ...raffleResults],
      events: updatedEvents
    });

    // Notify Discord
    onSendDiscordNotification(
      `🎉 มีผู้โชคดีหมุนวงล้อนำโชคสำเร็จ!`,
      `ขอแสดงความยินดีกับผู้โชคดีประจำรอบกิจกรรมกิลด์`,
      [
        { name: "🏆 ผู้ได้รับรางวัล", value: `**${wheelWinner.name}**`, inline: true },
        { name: "🎁 ของรางวัลที่สุ่มได้", value: prizeNameStr, inline: true },
        { name: "📌 แหล่งรายชื่อที่ดึงมา", value: selectedEventId === 'all' ? "สมาชิกกิลด์ทั้งหมด" : events.find(e => e.id === selectedEventId)?.title || 'กิจกรรมสมาคม', inline: false }
      ],
      9442302, // Purple/Pink
      undefined,
      'raffles'
    );

    setWheelWinner(null);
  };



  return (
    <div className="space-y-6" id="wheel-tab">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Gift className="text-yellow-400 w-6 h-6 animate-bounce" />
            วงล้อสุ่มคิวและจัดการยอดประมูลกิลด์ (Guild Auction Priority Wheel)
          </h2>
          <p className="text-xs text-slate-400">
            ระบบสุ่มหมุนหาคิวรับสิทธิ์และเฉลี่ยจัดสรรไอเทมประมูลหลัก เช่น การ์ด ขนนก เพื่อให้กระจายสู่สมาชิกผู้ร่วมกิจกรรมในรอบนั้น ๆ อย่างโปร่งใสที่สุด
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-300">
        <Info className="w-5 h-5 shrink-0 text-blue-400" />
        <div>
          <span className="font-bold block text-blue-400">🎯 หลักการทำงานของคิวคัดกรอง:</span>
          ระบบจะอ้างอิงรายชื่อและดรอปตามวันที่มีกิจกรรม <span className="text-yellow-500 font-bold">แอดมินหรือหัวหน้ากิลด์สามารถหมุนคิวเพื่อเลือกผู้ชนะสิทธิ์รับของ</span> โดยคิวการหมุนจะคัดกรองสมาชิกตามความเท่าเทียม (คนที่ยังไม่ได้ของจะมีสิทธิ์ลุ้นก่อน) เพื่อไม่ให้เกิดปัญหารับของซ้ำซ้อน
        </div>
      </div>


      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Source Settings & Slices Selector */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Data Source Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-300 block">⚡ ผูกกับรอบกิจกรรมวันที่:</label>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none text-xs font-bold text-yellow-500"
              >
                <option value="all">👥 สมาชิกกิลด์ทั้งหมดในคลังระบบ ({members.length} คน)</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.type === 'league' ? '🛡️' : '🔥'} {ev.title} ({ev.participants.length} คนลงชื่อ)
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Filter Checkbox & Limit */}
            <div className="pt-1 space-y-2">
              <label className="flex items-center gap-2 p-2.5 bg-blue-950/20 border border-blue-500/20 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeReceived}
                  onChange={e => setExcludeReceived(e.target.checked)}
                  className="accent-blue-500 rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] font-bold text-blue-300">กรองคนที่เคยได้รับของในไซเคิลนี้ออกแล้ว (คิวเท่าเทียม)</span>
              </label>

              <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800 rounded-xl">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  🎯 จำกัดการรับไอเทมสูงสุดในกิจกรรมนี้:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={eventLimit}
                    onChange={e => setEventLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2 py-1 text-center focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase">ชิ้น</span>
                </div>
              </div>
            </div>

            {/* Displaying Current Registered Members & Classes before Wheel spin */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>รายชื่อผู้ร่วมกิจกรรม ({activeParticipants.length} คน):</span>
                <div className="flex gap-2 text-blue-400">
                  <button onClick={() => setParticipants(members.map(m => m.id))}>ทั้งหมด</button>
                  <button onClick={() => setParticipants([])} className="text-slate-500">ล้าง</button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-950 p-2 rounded-xl bg-slate-950/50">
                {members.map(member => {
                  const isChecked = participants.includes(member.id);
                  const meetsFilter = !excludeReceived || !receivedIds.has(member.id);
                  
                  if (selectedEventId !== 'all' && !events.find(e => e.id === selectedEventId)?.participants.includes(member.id)) {
                    return null; // Only show event participants if an event is selected
                  }

                  return (
                    <label 
                      key={member.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-xs ${
                        isChecked && meetsFilter
                          ? 'bg-blue-500/10 border border-blue-500/25 text-blue-300 font-bold' 
                          : 'bg-transparent border border-transparent text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setParticipants(participants.filter(id => id !== member.id));
                            } else {
                              setParticipants([...participants, member.id]);
                            }
                          }}
                          className="accent-blue-500 w-3.5 h-3.5"
                        />
                        <span>{member.name}</span>
                      </div>
                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold font-mono ${
                        receivedIds.has(member.id) ? 'bg-red-950/40 text-red-400' : 'bg-emerald-950/40 text-emerald-400'
                      }`}>
                        {receivedIds.has(member.id) ? 'ได้ของแล้ว' : 'มีสิทธิ์คิว'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* หน้าจัดการไอเทมประมูล (Item Management Interface) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <h3 className="font-extrabold text-slate-100 text-sm">📦 จัดการไอเทมประมูลประจำกิจกรรม</h3>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-extrabold uppercase font-mono">
                Admin Panel
              </span>
            </div>

            {isAdmin ? (
              <div className="space-y-4 text-xs">
                {/* 1. เลือกกิจกรรม */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">1. เลือกกิจกรรมที่ต้องการลงไอเทม:</label>
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none font-semibold text-xs text-yellow-500"
                  >
                    <option value="all">-- กรุณาเลือกกิจกรรมเพื่อเพิ่มของ --</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.type === 'league' ? '🛡️' : '🔥'} {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEventId !== 'all' ? (
                  (() => {
                    const activeEvent = events.find(e => e.id === selectedEventId);
                    if (!activeEvent) return null;

                    return (
                      <div className="space-y-4 pt-1">
                        {/* 2. กรอกจำนวน และ เลือกไอเทมตาม Master Data */}
                        <div className="grid grid-cols-12 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                          <div className="col-span-8 space-y-1">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">2. เลือกไอเทมจาก Master:</label>
                            <select
                              id="drop-master-select"
                              className="w-full bg-slate-900 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-800 text-xs"
                            >
                              <option value="">-- เลือกไอเทม --</option>
                              {state.masterItems?.map(item => (
                                <option key={item.id} value={item.name}>
                                  {item.name} ({item.itemType === 'material' ? 'วัตถุดิบ' : item.itemType === 'card' ? 'การ์ด' : item.itemType === 'equip' ? 'อุปกรณ์' : 'ของบริโภค'})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-4 space-y-1">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">จำนวน:</label>
                            <input
                              id="drop-qty-input"
                              type="number"
                              min={1}
                              defaultValue={1}
                              className="w-full bg-slate-900 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-800 font-mono text-center text-xs"
                            />
                          </div>

                          <div className="col-span-12 pt-2 border-t border-slate-900 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const selectEl = document.getElementById('drop-master-select') as HTMLSelectElement;
                                const qtyEl = document.getElementById('drop-qty-input') as HTMLInputElement;
                                if (!selectEl || !qtyEl) return;
                                const itemName = selectEl.value;
                                const quantity = parseInt(qtyEl.value, 10) || 1;
                                if (!itemName) {
                                  triggerAlert('ไม่ได้เลือกไอเทม', 'กรุณาเลือกไอเทมประมูลก่อน');
                                  return;
                                }
                                handleAddDropToEvent(activeEvent.id, itemName, quantity);
                                selectEl.value = '';
                                qtyEl.value = '1';
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>บันทึกและเพิ่มไอเทม</span>
                            </button>
                          </div>
                        </div>

                        {/* List of current drops for this event */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">รายการไอเทมในรอบกิจกรรมนี้:</span>
                          {activeEvent.drops?.length === 0 ? (
                            <p className="text-xs text-slate-600 italic py-2 text-center bg-slate-950/20 rounded-xl border border-slate-850/50">ยังไม่มีไอเทมดรอปในกิจกรรมนี้</p>
                          ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {activeEvent.drops.map(drop => {
                                const totalWhitelistCount = drop.whitelistMemberIds?.length || 0;
                                return (
                                  <div key={drop.id} className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-850/60 text-[11px] space-y-1.5 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                      <div className="space-y-0.5">
                                        <span className="font-extrabold text-slate-200 block">🎮 {drop.itemName}</span>
                                        <span className="text-[10px] text-slate-500 font-mono block">จำนวน: x{drop.quantity} ชิ้น</span>
                                        {drop.assignedToMemberName && (
                                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold mt-1 inline-block">
                                            ผู้ได้รับ: {drop.assignedToMemberName}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenWhitelistModal(activeEvent.id, drop.id)}
                                          className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                                            totalWhitelistCount > 0 
                                              ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20' 
                                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                                          }`}
                                          title="ตั้งค่า Whitelist ให้ไอเทมนี้"
                                        >
                                          <Shield className="w-3.5 h-3.5 fill-current opacity-70" />
                                          <span className="text-[9.5px] font-bold">
                                            {totalWhitelistCount > 0 ? `Whitelist (${totalWhitelistCount})` : 'Whitelist'}
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteDropFromEvent(activeEvent.id, drop.id)}
                                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                                          title="ลบไอเทมนี้ออกจากกิจกรรม"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    {totalWhitelistCount > 0 && (
                                      <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-850/30">
                                        
                                        {drop.whitelistMemberIds?.map(mId => {
                                          const mName = state.members.find(m => m.id === mId)?.name || 'Unknown';
                                          return (
                                            <span key={mId} className="bg-blue-950/20 border border-blue-500/10 text-[9px] text-blue-400 font-semibold px-1.5 py-0.5 rounded">
                                              👤 {mName}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {(() => {
                            const hasAssigned = activeEvent.drops?.some(d => d.assignedToMemberId);
                            if (!hasAssigned) return null;
                            return (
                              <div className="pt-2 space-y-2">
                                <button
                                  type="button"
                                  onClick={handleSendDiscordSummary}
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                                >
                                  📢 ส่งประกาศผลเข้า Discord
                                </button>
                                <button
                                  type="button"
                                  onClick={handleResetAuction}
                                  className="w-full bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 font-extrabold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  🔄 ล้างผลการประมูลรอบนี้ทั้งหมด
                                </button>
                              </div>
                            );
                          })()}
                        </div>

                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 text-center text-slate-500 text-[11px] italic">
                    โปรดเลือกกิจกรรมด้านบนเพื่อเริ่มบันทึกและจัดการไอเทม
                  </div>
                )}
              </div>
            ) : (
              /* Non-admin read-only view of selected event drops */
              <div className="space-y-3 text-xs">
                {selectedEventId !== 'all' ? (
                  (() => {
                    const activeEvent = events.find(e => e.id === selectedEventId);
                    if (!activeEvent) return null;

                    return (
                      <div className="space-y-3">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">📋 รายการไอเทมประมูลในกิจกรรมนี้:</span>
                        {activeEvent.drops?.length === 0 ? (
                          <p className="text-xs text-slate-600 italic py-4 text-center bg-slate-950/20 border border-slate-850/50 rounded-xl">ยังไม่มีไอเทมประมูลในรอบนี้</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto">
                            {activeEvent.drops.map(drop => {
                              const totalWhitelistCount = drop.whitelistMemberIds?.length || 0;
                              return (
                                <div key={drop.id} className="p-2.5 bg-slate-950/30 rounded-xl border border-slate-850/40 space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                      <span className="font-extrabold text-slate-300 block">💎 {drop.itemName}</span>
                                      {drop.assignedToMemberName && (
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold mt-0.5 inline-block font-sans">
                                          ผู้ได้รับ: {drop.assignedToMemberName}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono text-yellow-500 font-bold bg-slate-950 px-2 py-0.5 rounded text-[10px]">x{drop.quantity} ชิ้น</span>
                                  </div>
                                  {totalWhitelistCount > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-850/30">
                                      
                                      {drop.whitelistMemberIds?.map(mId => {
                                        const mName = state.members.find(m => m.id === mId)?.name || 'Unknown';
                                        return (
                                          <span key={mId} className="bg-blue-950/20 border border-blue-500/10 text-[9px] text-blue-400 font-semibold px-1.5 py-0.2 rounded">
                                            👤 {mName}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center bg-slate-950/20 border border-slate-850/50 rounded-xl">โปรดเลือกกิจกรรมในช่อง "ผูกกับรอบกิจกรรมวันที่" ด้านบนเพื่อดูรายการไอเทม</p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right Col: Spinning wheel or Fair auto allocation */}
        <div className="lg:col-span-7 space-y-6">
          
            /* CLASSIC GLOSSY WHEEL VIEW */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
              
              {/* Blue glowing ambient ring */}
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>

              {/* Active Prize Info Banner (Replaced prize selector with clean display of next target item) */}
              {selectedEventId !== 'all' && (() => {
                const currentSelectedEvent = events.find(e => e.id === selectedEventId);
                const unassignedDrop = currentSelectedEvent?.drops?.find(d => !d.assignedToMemberId);
                if (!unassignedDrop) return null;

                const shouldAverageDropLocal = (itemName: string) => {
                  const name = itemName.toLowerCase();
                  return name.includes('เศษสมุด') || name.includes('ขนนก') || name.includes('feather') || name.includes('fragment');
                };

                let spinQty = unassignedDrop.quantity;
                if (shouldAverageDropLocal(unassignedDrop.itemName)) {
                  const originalQty = unassignedDrop.originalQuantity || unassignedDrop.quantity;
                  const P = participants.length;
                  const base = P <= 0 ? 1 : Math.max(1, Math.floor(originalQty / P));
                  spinQty = Math.min(base, unassignedDrop.quantity);
                }

                return (
                  <div className="w-full max-w-xs text-center p-3 bg-blue-950/20 border border-blue-500/25 rounded-2xl z-10 animate-fade-in">
                    <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest block mb-1">🎁 ไอเทมถัดไปที่จะได้รับการจับสปินสุ่ม:</span>
                    <strong className="text-yellow-500 text-sm font-extrabold flex items-center justify-center gap-1">
                      🎮 {unassignedDrop.itemName} (x{spinQty} ชิ้น)
                    </strong>
                  </div>
                );
              })()}

              {/* Interactive Wheel & Pin container */}
              <div className="relative p-2 bg-slate-950 rounded-full border-4 border-slate-800/80 shadow-[0_0_35px_rgba(59,130,246,0.15)]">
                
                {/* Pointer pointer downward at 270 degrees (Top) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                  <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-yellow-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] animate-bounce"></div>
                </div>

                {/* Main canvas */}
                <canvas 
                  ref={canvasRef} 
                  width={300} 
                  height={300} 
                  className="rounded-full bg-slate-950"
                />
              </div>

              {/* Trigger Button */}
              {(() => {
                const currentEvent = selectedEventId === 'all' ? null : events.find(e => e.id === selectedEventId);
                const totalDrops = currentEvent?.drops?.length || 0;
                const unassignedDropsCount = currentEvent?.drops?.filter(d => !d.assignedToMemberId).length || 0;
                const isEventOutofStock = selectedEventId !== 'all' && totalDrops > 0 && unassignedDropsCount === 0;
                const noDropsAvailable = selectedEventId !== 'all' && totalDrops === 0;

                return (
                  <div className="w-full max-w-xs space-y-3 z-10">
                    <div className="flex gap-2">
                      <button
                        onClick={spinWheel}
                        disabled={isSpinning || activeParticipants.length === 0 || isEventOutofStock || noDropsAvailable}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-xl text-[11px] transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 uppercase tracking-widest font-mono"
                        id="spin-wheel-btn"
                      >
                        <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                        {isSpinning 
                          ? 'กำลังหมุน...' 
                          : isEventOutofStock 
                            ? 'ของหมด!' 
                            : noDropsAvailable 
                              ? 'ไม่มีของดรอป' 
                              : activeParticipants.length === 0 
                                ? 'ไม่มีคนสิทธิ์ลุ้น' 
                                : 'สปินวงล้อ'
                        }
                      </button>

                      <button
                        type="button"
                        onClick={spinWheelInstantly}
                        disabled={isSpinning || activeParticipants.length === 0 || isEventOutofStock || noDropsAvailable}
                        className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-black px-4 py-4 rounded-xl text-[11px] transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-lg uppercase tracking-widest font-mono"
                        title="สุ่มผลลัพธ์ทันที (Skip)"
                      >
                        <Zap className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                        Skip
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Winner presentation block */}
              {wheelWinner && (
                <div className="w-full bg-slate-950 p-4 border border-yellow-500/30 rounded-2xl text-center space-y-3 animate-fade-in z-10 shadow-2xl">
                  <div className="space-y-1">
                    <span className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-widest block">🎉 ขอแสดงความยินดีกับผู้โชคดี! 🎉</span>
                    <h3 className="text-xl font-extrabold text-slate-100 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      {wheelWinner.name}
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                    </h3>
                    <p className="text-xs text-slate-400">
                      ดวงสมพงศ์ ได้รับรางวัล: <strong className="text-blue-400 text-sm">
                        {customPrizeName || 'รางวัลสุ่มวงล้อ'}
                      </strong>
                    </p>
                  </div>
                  
                  {isAdmin && (
                    <button
                      onClick={handleSaveWheelWinner}
                      className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-yellow-500/10"
                      id="save-winner-btn"
                    >
                      อนุมัติรางวัล & ส่งประวัติลง Discord
                    </button>
                  )}
                </div>
              )}

            </div>

          {/* Audit Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4 shadow-md">
            <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-blue-400" />
              บันทึกประวัติการจับรางวัลกิลด์ (Raffle Audit Trail)
            </h3>

            {raffleResults.length === 0 ? (
              <p className="text-xs text-slate-600 italic py-4 text-center">ยังไม่มีบันทึกการสุ่มรางวัลในรอบนี้</p>
            ) : (
              <div className="max-h-52 overflow-y-auto border border-slate-950 rounded-xl bg-slate-950/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-500 font-bold border-b border-slate-850">
                      <th className="p-2.5">ผู้ได้รับรางวัล</th>
                      <th className="p-2.5">ของรางวัล</th>
                      <th className="p-2.5">เวลาที่บันทึก</th>
                      <th className="p-2.5">วิธีแจก</th>
                      {isAdmin && <th className="p-2.5 text-right">จัดการ</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {raffleResults.map(res => (
                      <tr key={res.id} className="hover:bg-slate-850/20">
                        <td className="p-2.5 font-bold text-slate-200">🏆 {res.winnerName}</td>
                        <td className="p-2.5 font-extrabold text-blue-400">{res.prizeName}</td>
                        <td className="p-2.5 text-[10px] text-slate-500">
                          {new Date(res.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                            res.itemType === 'raffle' ? 'bg-purple-950 text-purple-400 border border-purple-500/10' : 'bg-blue-950 text-blue-400 border border-blue-500/10'
                          }`}>
                            {res.itemType === 'raffle' ? 'หมุนวงล้อสด' : 'เฉลี่ยแบ่งแจก'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRaffleResult(res.id)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                              title="ลบบันทึกประวัตินี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* WHITELIST SETUP MODAL */}
        {isWhitelistModalOpen && whitelistTargetDrop && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-scale-in text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-sm">ตั้งค่าระบบ Whitelist ไอเทม</h3>
                    <p className="text-[10px] text-slate-400">
                      เฉพาะผู้มีรายชื่ออาชีพหรือรหัสสมาชิกที่เลือกจะมีสิทธิ์ในการลุ้นสุ่มหรือจัดสรรไอเทมนี้
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsWhitelistModalOpen(false);
                    setWhitelistTargetDrop(null);
                  }}
                  className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Drop Info */}
              {(() => {
                const event = state.events.find(e => e.id === whitelistTargetDrop.eventId);
                const drop = event?.drops?.find(d => d.id === whitelistTargetDrop.dropId);
                if (!drop) return null;

                
                return (
                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex justify-between items-center">
                      <span className="font-extrabold text-blue-400 text-[13px]">💎 {drop.itemName}</span>
                      <span className="bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded text-[10px] font-mono">จำนวน {drop.quantity} ชิ้น</span>
                    </div>

                    {/* 2. Specific Member Whitelist */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">2. ระบุตัวสมาชิกเฉพาะเจาะจง (Member Whitelist):</span>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        *หากเลือกรายชื่อสมาชิก ระบบจะบังคับให้สิทธิ์เฉพาะเจาะจงแก่สมาชิกที่ถูกเลือกกลุ่มนี้เท่านั้น
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-950/60 rounded-xl border border-slate-850">
                        {state.members.length === 0 ? (
                          <p className="col-span-2 text-xs text-slate-600 italic text-center py-4">ไม่มีรายชื่อสมาชิกในระบบ</p>
                        ) : (
                          state.members.map(m => {
                            const isSelected = selectedWhitelistMembers.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedWhitelistMembers(selectedWhitelistMembers.filter(id => id !== m.id));
                                  } else {
                                    setSelectedWhitelistMembers([...selectedWhitelistMembers, m.id]);
                                  }
                                }}
                                className={`p-1.5 rounded-lg border text-left font-semibold transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                                    : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800'
                                }`}
                              >
                                <div className="truncate flex flex-col">
                                  <span className="font-bold text-[10.5px] text-slate-200 leading-tight">{m.name}</span>
                                </div>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected} 
                                  readOnly 
                                  className="w-2.5 h-2.5 rounded text-indigo-600 accent-indigo-500" 
                                />
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsWhitelistModalOpen(false);
                    setWhitelistTargetDrop(null);
                  }}
                  className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveWhitelist}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  บันทึกตั้งค่า Whitelist
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
