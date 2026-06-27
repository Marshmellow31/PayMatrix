import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  ArrowLeft,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wallet,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { db, auth } from '../config/firebase.js';
import { collection, getDocs, query, where, getDoc, doc, limit, orderBy } from 'firebase/firestore';
import friendService from '../services/friendService.js';
import groupService from '../services/groupService.js';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.5-flash';

const SUGGESTIONS = [
  { text: 'Summarize my net balances', icon: Wallet },
  { text: 'Do I have any pending friend requests?', icon: Users },
  { text: 'Show recent group activity logs', icon: TrendingUp },
  { text: 'Check my recent notifications', icon: Sparkles },
];

const parseMarkdown = (text) => {
  if (!text) return '';

  const lines = text.split('\n');
  let inTable = false;
  let inList = false;
  let listType = null; // 'ul' or 'ol'
  let tableHtml = '';
  let listHtml = '';
  const finalHtml = [];
  let tableRowIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Handle Table
    if (line.startsWith('|') && line.endsWith('|')) {
      if (inList) {
        inList = false;
        finalHtml.push(listType === 'ul' ? '</ul>' : '</ol>');
      }
      if (!inTable) {
        inTable = true;
        tableRowIdx = 0;
        tableHtml =
          '<div class="overflow-x-auto my-3 rounded-xl border border-white/10 shadow-lg"><table class="w-full border-collapse text-xs text-left">';
      }

      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cells.every((c) => c.startsWith('-') || c.startsWith(':'))) {
        continue;
      }

      if (tableRowIdx === 0) {
        tableHtml +=
          '<thead class="bg-white/[0.05] border-b border-white/10 font-bold text-white/90"><tr>';
        cells.forEach((cell) => {
          const cellText = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          tableHtml += `<th class="p-3 font-semibold uppercase tracking-wider text-[9px] border-r border-white/5 last:border-r-0">${cellText}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
      } else {
        tableHtml += `<tr class="border-b border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">`;
        cells.forEach((cell) => {
          const cellText = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          tableHtml += `<td class="p-3 border-r border-white/5 last:border-r-0 text-white/80">${cellText}</td>`;
        });
        tableHtml += '</tr>';
      }
      tableRowIdx++;
    }
    // Handle Bullet List
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inTable) {
        inTable = false;
        tableHtml += '</tbody></table></div>';
        finalHtml.push(tableHtml);
      }
      if (!inList || listType !== 'ul') {
        if (inList) {
          finalHtml.push(listType === 'ul' ? '</ul>' : '</ol>');
        }
        inList = true;
        listType = 'ul';
        listHtml = '<ul class="space-y-1 my-2 list-disc pl-5 text-white/80">';
      } else {
        listHtml = '';
      }
      let processedLine = line.substring(2).trim();
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processedLine = processedLine.replace(/`(.*?)`/g, (match, p1) => {
        const escaped = p1.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<code class="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">${escaped}</code>`;
      });
      finalHtml.push(`${listHtml}<li class="leading-relaxed py-0.5">${processedLine}</li>`);
    }
    // Handle Numbered List
    else if (/^\d+\.\s/.test(line)) {
      if (inTable) {
        inTable = false;
        tableHtml += '</tbody></table></div>';
        finalHtml.push(tableHtml);
      }
      if (!inList || listType !== 'ol') {
        if (inList) {
          finalHtml.push(listType === 'ul' ? '</ul>' : '</ol>');
        }
        inList = true;
        listType = 'ol';
        listHtml = '<ol class="space-y-1 my-2 list-decimal pl-5 text-white/80">';
      } else {
        listHtml = '';
      }
      let processedLine = line.replace(/^\d+\.\s/, '').trim();
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processedLine = processedLine.replace(/`(.*?)`/g, (match, p1) => {
        const escaped = p1.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<code class="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">${escaped}</code>`;
      });
      finalHtml.push(`${listHtml}<li class="leading-relaxed py-0.5">${processedLine}</li>`);
    }
    // Handle Regular Paragraph / Headers
    else {
      if (inTable) {
        inTable = false;
        tableHtml += '</tbody></table></div>';
        finalHtml.push(tableHtml);
      }
      if (inList) {
        inList = false;
        finalHtml.push(listType === 'ul' ? '</ul>' : '</ol>');
      }
      if (!line) {
        continue;
      }
      let processedLine = line;
      // Headers
      if (processedLine.startsWith('### ')) {
        processedLine = `<h3 class="text-xs font-bold text-white/95 mt-4 mb-2 uppercase tracking-wider font-manrope">${processedLine.substring(4)}</h3>`;
      } else if (processedLine.startsWith('## ')) {
        processedLine = `<h2 class="text-sm font-black text-white mt-5 mb-2.5 uppercase tracking-wide font-manrope">${processedLine.substring(3)}</h2>`;
      } else if (processedLine.startsWith('# ')) {
        processedLine = `<h1 class="text-base font-black text-white mt-6 mb-3 uppercase tracking-normal font-manrope">${processedLine.substring(2)}</h1>`;
      } else {
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processedLine = processedLine.replace(/`(.*?)`/g, (match, p1) => {
          const escaped = p1.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<code class="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">${escaped}</code>`;
        });
        processedLine = `<p class="mb-2 leading-relaxed text-white/80">${processedLine}</p>`;
      }
      finalHtml.push(processedLine);
    }
  }

  if (inTable) {
    tableHtml += '</tbody></table></div>';
    finalHtml.push(tableHtml);
  }
  if (inList) {
    finalHtml.push(listType === 'ul' ? '</ul>' : '</ol>');
  }

  return finalHtml.join('\n');
};

const Copilot = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'copilot',
      text: 'Hello! I am your PayMatrix AI Copilot. I have analyzed your cohorts, transaction ledger, and net balances. How can I help you optimize your shared finances today?',
      timestamp: new Date(),
    },
  ]);
  const messagesEndRef = useRef(null);

  const hydrateContext = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error('Authentication required');
        return;
      }
      const userId = user.uid;

      // 1. Fetch friends & shared balances
      const friendsRes = await friendService
        .getNetworkAnalytics()
        .catch(() => ({ data: { data: {} } }));
      const friendData = friendsRes.data.data?.networkAnalytics || [];

      // 2. Fetch friend requests (both directions to combine)
      const [reqsToSnap, reqsFromSnap] = await Promise.all([
        getDocs(query(collection(db, 'friendRequests'), where('to', '==', userId))),
        getDocs(query(collection(db, 'friendRequests'), where('from', '==', userId))),
      ]);
      const rawRequests = [...reqsToSnap.docs, ...reqsFromSnap.docs];
      const reqMap = new Map();
      rawRequests.forEach((d) => reqMap.set(d.id, { id: d.id, ...d.data() }));
      const friendRequests = Array.from(reqMap.values());

      // 3. Fetch notifications (recent 30, sorted efficiently by database)
      const notificationsSnap = await getDocs(
        query(
          collection(db, 'notifications'),
          where('to', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(30)
        )
      );
      const notifications = notificationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 4. Fetch AI receipt scanning history (recent 20, sorted efficiently by database)
      const aiRequestsSnap = await getDocs(
        query(
          collection(db, 'ai_requests'),
          where('uid', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(20)
        )
      );
      const aiRequests = aiRequestsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 5. Fetch system configurations/feature flags
      const configSnap = await getDoc(doc(db, 'config', 'featureFlags')).catch(() => null);
      const featureFlags = configSnap && configSnap.exists() ? configSnap.data() : {};

      // 6. Fetch groups/cohorts and their subcollections (including activity logs)
      const groupsSnap = await getDocs(
        query(collection(db, 'groups'), where('members', 'array-contains', userId))
      );
      const rawGroups = groupsSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((g) => g.status !== 'deleted');

      const groups = await Promise.all(
        rawGroups.map(async (g) => {
          const [expensesSnap, settlementsSnap, logsSnap, resolvedProfiles] = await Promise.all([
            getDocs(query(collection(db, `groups/${g.id}/expenses`), limit(50))),
            getDocs(query(collection(db, `groups/${g.id}/settlements`), limit(50))),
            getDocs(
              query(collection(db, `groups/${g.id}/logs`), orderBy('createdAt', 'desc'), limit(15))
            ),
            groupService.resolveMemberProfiles(g.id, g.members || []).catch(() => []),
          ]);
          return {
            id: g.id,
            name: g.name || g.title || 'Unnamed Cohort',
            category: g.category || 'Other',
            status: g.status || 'active',
            membersCount: g.members?.length || 0,
            members: resolvedProfiles.map((p) => ({
              uid: p.user?.uid || p.user?._id || '',
              name: p.user?.name || 'Member',
              email: p.user?.email || '',
            })),
            expenses: expensesSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((e) => e.status !== 'deleted')
              .map((data) => {
                const paidByProfile = resolvedProfiles.find(
                  (p) => (p.user?.uid || p.user?._id) === data.paidBy
                );
                const paidByName =
                  paidByProfile?.user?.name ||
                  (data.paidBy === userId ? currentUser?.name || 'Me' : 'Unknown');
                const splitWithNames = (data.splits || []).map((s) => {
                  const uid = s.user?._id || s.user?.uid || s.user || '';
                  const profile = resolvedProfiles.find(
                    (p) => (p.user?.uid || p.user?._id) === uid
                  );
                  return {
                    userId: uid,
                    userName:
                      profile?.user?.name ||
                      (uid === userId ? currentUser?.name || 'Me' : 'Unknown'),
                    amount: s.amount || 0,
                  };
                });
                return {
                  id: data.id || data._id || '',
                  title: data.title || 'Untitled',
                  amount: data.amount || 0,
                  paidBy: data.paidBy || '',
                  paidByName: paidByName,
                  date: data.date || '',
                  category: data.category || 'Other',
                  splits: splitWithNames,
                };
              }),
            settlements: settlementsSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((s) => s.status !== 'deleted')
              .map((data) => {
                const payerProfile = resolvedProfiles.find(
                  (p) => (p.user?.uid || p.user?._id) === data.payer
                );
                const payerName =
                  payerProfile?.user?.name ||
                  (data.payer === userId ? currentUser?.name || 'Me' : 'Unknown');
                const payeeProfile = resolvedProfiles.find(
                  (p) => (p.user?.uid || p.user?._id) === data.payee
                );
                const payeeName =
                  payeeProfile?.user?.name ||
                  (data.payee === userId ? currentUser?.name || 'Me' : 'Unknown');
                return {
                  amount: data.amount || 0,
                  payer: data.payer || '',
                  payerName: payerName,
                  payee: data.payee || '',
                  payeeName: payeeName,
                  notes: data.notes || '',
                  date: data.date || data.createdAt || '',
                };
              }),
            activityLogs: logsSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
              .map((data) => ({
                type: data.type || '',
                message: data.message || '',
                date: data.createdAt || '',
              })),
          };
        })
      );

      setContext({
        currentUser: {
          name: currentUser?.name || user.displayName || 'Me',
          email: user.email || '',
          uid: userId,
        },
        friends: friendData.map((f) => ({
          uid: f.friend?._id || f.friend?.uid || '',
          name: f.friend?.name || 'Friend',
          email: f.friend?.email || '',
          netBalance: f.netBalance || 0,
          mutualCohorts: f.mutualGroupsCount || 0,
        })),
        cohorts: groups,
        friendRequests,
        notifications,
        aiRequests,
        featureFlags,
      });
    } catch (err) {
      console.error('Failed to hydrate Copilot context:', err);
      toast.error('Failed to gather financial database context');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrateContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || sending) return;

    if (!context) {
      toast.error('Ledger context is not initialized yet.');
      return;
    }

    const userMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: queryText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      const systemPrompt = `
You are PayMatrix AI (Copilot), a precise financial intelligence and system assistant.
Your goal is to answer queries about the user's shared expenses, groups (cohorts), settlements, friend balances, pending friend requests, notifications, group activity logs, receipt scanning histories, and application configuration.
Always prioritize providing exact calculations when asked. Format numbers using Rupee symbol (₹).
Here is the current real-time dataset of the user's account:
${JSON.stringify(context, null, 2)}

Instructions:
1. Provide extremely accurate answers based ONLY on the provided dataset.
2. You can summarize recent notifications, pending friend requests, receipt scans, or group activity logs from the dataset.
3. If the user asks about something not in the dataset (or if data is missing), explain politely.
4. Keep answers concise, actionable, and formatted in clean markdown (with bold text, bullet points, or tables where appropriate).
5. Use the Rupee symbol (₹) for currency values.
6. Do not hallucinate or make up data, logs, or expenses that do not exist.
`;

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\nKeep in mind the instructions above. Let's start the chat.`,
            },
          ],
        },
        {
          role: 'model',
          parts: [
            {
              text: 'Understood. I have loaded your financial database. How can I help you today?',
            },
          ],
        },
        ...messages
          .filter((msg) => msg.id !== 'welcome' && !msg.isError)
          .map((msg) => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
          })),
        {
          role: 'user',
          parts: [{ text: queryText }],
        },
      ];

      const runRequestWithRetry = async () => {
        const attempts = 3;
        let delay = 1000;
        for (let i = 0; i < attempts; i++) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const resp = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents,
                generationConfig: {
                  temperature: 0.2,
                },
              }),
            });

            if (resp.ok) {
              return resp;
            }

            // eslint-disable-next-line no-await-in-loop
            const errDetails = await resp.text().catch(() => 'Unknown error');
            console.warn(`[Gemini REST Attempt ${i + 1} Failed]`, resp.status, errDetails);

            const shouldRetry = resp.status === 503 || resp.status === 429;
            if (!shouldRetry || i === attempts - 1) {
              throw new Error(`Gemini REST error ${resp.status}: ${errDetails}`);
            }
          } catch (err) {
            if (i === attempts - 1) throw err;
          }

          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        }
      };

      const resp = await runRequestWithRetry();

      const payload = await resp.json();
      const botText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!botText) {
        throw new Error('Empty response from AI engine');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'copilot',
          text: botText,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('[Copilot Error]', err);
      let friendlyText =
        'I encountered a brief connection issue. Please check your network and try asking again.';
      const errMsg = err.message || '';
      if (errMsg.includes('503') || errMsg.toLowerCase().includes('unavailable')) {
        friendlyText =
          'The AI intelligence engine is currently experiencing heavy load. Please try again in a few moments.';
      } else if (
        errMsg.includes('429') ||
        errMsg.toLowerCase().includes('quota') ||
        errMsg.toLowerCase().includes('rate limit')
      ) {
        friendlyText =
          'The intelligence engine is temporarily rate limited. Please hold on and try again shortly.';
      } else if (errMsg.includes('400') || errMsg.toLowerCase().includes('bad request')) {
        friendlyText =
          "I had difficulty formatting the shared ledger context. Let's try starting a fresh session.";
      } else if (errMsg.includes('404') || errMsg.toLowerCase().includes('not found')) {
        friendlyText =
          'The requested AI intelligence service endpoint was not found. Please verify the model configuration.';
      }
      toast.error(friendlyText);
      setInput(queryText);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'copilot',
          text: friendlyText,
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-4 h-[calc(100vh-212px)] lg:h-[calc(100vh-128px)] flex flex-col gap-3 min-w-0">
      {/* Sleek Instagram DM Contact Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 shrink-0 px-2 sm:px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-3">
            {/* Circular Avatar with Active Status Pulse */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#131313] shadow-sm animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold font-manrope text-white tracking-tight leading-tight">
                  AI Copilot
                </h1>
                <span className="text-[8px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90">
                  Beta
                </span>
              </div>
              <p className="text-[10px] text-emerald-400/90 font-medium font-inter flex items-center gap-1.5 mt-0.5">
                Active now
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {context && (
            <span className="text-[8px] font-bold font-manrope text-white/30 uppercase tracking-widest hidden md:inline-block pr-2">
              Sync: {context.cohorts?.length || 0} Cohorts • {context.friends?.length || 0} Friends
            </span>
          )}
          <button
            onClick={hydrateContext}
            disabled={loading}
            className="p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/55 hover:text-white transition-all disabled:opacity-30 active:scale-95"
            title="Refresh database sync"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/30">
          <Loader2 className="w-10 h-10 animate-spin text-primary" strokeWidth={1.5} />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-center animate-pulse">
            Hydrating Ledger context
          </p>
        </div>
      ) : (
        <>
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-hidden relative min-h-0">
            {/* Subtle background ambient glows inside the chat */}
            <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-500/[0.02] blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-purple-500/[0.02] blur-[120px] pointer-events-none" />

            <div className="absolute inset-0 overflow-y-auto no-scrollbar p-4 sm:p-5">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
                    >
                      {/* Bubble */}
                      <div
                        className={`max-w-[75%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-[13.5px] sm:text-[14px] font-inter leading-relaxed shadow-sm relative ${
                          isUser
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none'
                            : msg.isError
                              ? 'bg-red-950/20 border border-red-500/30 text-red-200 rounded-tl-none'
                              : 'bg-white/[0.06] border border-white/[0.04] text-zinc-100 rounded-tl-none'
                        }`}
                      >
                        <div
                          className="markdown-body select-text"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(isUser ? msg.text : parseMarkdown(msg.text)),
                          }}
                        />
                        <span
                          className={`block mt-1 text-[8px] select-none font-manrope font-medium ${isUser ? 'text-white/50 text-right' : 'text-white/30 text-left'}`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex justify-start w-full">
                    <div className="max-w-[75%] sm:max-w-[70%] rounded-2xl rounded-tl-none px-4 py-3 bg-white/[0.06] border border-white/[0.04] text-zinc-100 shadow-sm">
                      <div className="flex gap-1.5 items-center h-4 py-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-white/35 animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Horizontal scrollable quick suggestions */}
          {messages.length === 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 shrink-0 px-2 sm:px-4 w-full max-w-full">
              {SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.text)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.15] text-xs text-white/80 hover:text-white transition-all shrink-0 whitespace-nowrap shadow-sm active:scale-95"
                >
                  <item.icon size={12} className="text-indigo-400" />
                  <span className="font-semibold tracking-tight">{item.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Floating Pill Input Box */}
          <div className="px-2 sm:px-4 pb-2 shrink-0">
            <div className="flex gap-2 w-full items-center bg-[#18181b]/90 border border-white/[0.08] rounded-full p-1.5 pl-4 pr-1.5 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-lg backdrop-blur-md">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Copilot..."
                className="flex-1 bg-transparent outline-none py-2 text-xs sm:text-sm text-white placeholder:text-white/30 transition-all font-inter border-none"
                disabled={sending}
              />
              <button
                onClick={() => handleSend()}
                disabled={sending || !input.trim()}
                className="w-9 h-9 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Copilot;
