(function() {
  if (!document.getElementById('kt-mobile-scroll-css')) {
    var ms = document.createElement('style');
    ms.id = 'kt-mobile-scroll-css';
    ms.textContent =
      'html,body{max-width:100%;overflow-x:clip;}' +
      '#kt-live-ticker,#league-tabs,#team-chips{min-width:0!important;max-width:100%;-webkit-overflow-scrolling:touch;touch-action:pan-x;scrollbar-width:none;}' +
      '#kt-live-ticker::-webkit-scrollbar,#league-tabs::-webkit-scrollbar,#team-chips::-webkit-scrollbar{display:none;}';
    document.head.appendChild(ms);
  }
  var LEAGUES = [
    { id: 'eng.1', name: 'الدوري الإنجليزي' },
    { id: 'esp.1', name: 'الدوري الإسباني' },
    { id: 'uefa.champions', name: 'دوري الأبطال' },
    { id: 'ita.1', name: 'الدوري الإيطالي' },
    { id: 'ger.1', name: 'الدوري الألماني' },
    { id: 'fra.1', name: 'الدوري الفرنسي' },
    { id: 'ksa.1', name: 'الدوري السعودي' },
    { id: 'caf.champions', name: 'أبطال إفريقيا' }
  ];

  var STAT_LABELS = {
    possessionPct: 'الاستحواذ %',
    totalShots: 'إجمالي التسديدات',
    shotsOnTarget: 'تسديدات على المرمى',
    wonCorners: 'الركنيات',
    foulsCommitted: 'الأخطاء',
    yellowCards: 'بطاقات صفراء',
    redCards: 'بطاقات حمراء',
    offsides: 'التسلل',
    saves: 'التصديات',
    accuratePasses: 'تمريرات صحيحة',
    passPct: 'دقة التمرير %'
  };

  var dayOffset = 0;
  var activeLeague = 'all';
  var liveOnly = false;
  var allEvents = [];
  var modalSummary = null;
  var modalTab = 'events';

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function(m) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function getDateParam(offset) {
    var d = new Date();
    d.setDate(d.getDate() + offset);
    return '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  function fmtLocalTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return '--:--';
    }
  }

  async function fetchTicker() {
    var box = document.getElementById('kt-live-ticker');
    if (!box) return;
    var dateStr = getDateParam(dayOffset);
    var cacheKey = 'kt_ticker_cache_' + dateStr;

    try {
      var cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if (cached && (Date.now() - cached.ts) < 55000) {
        allEvents = cached.data || [];
        if (dayOffset === 0) {
          window.ktTodayEvents = allEvents;
          window.dispatchEvent(new CustomEvent('kt-ticker-updated', { detail: allEvents }));
        }
        updateLiveBadge();
        renderTicker();
        return;
      }
    } catch (e) {}

    var results = await Promise.allSettled(LEAGUES.map(async function(lg) {
      var url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/' + lg.id + '/scoreboard?dates=' + dateStr;
      var res = await fetch(url);
      if (!res.ok) return [];
      var data = await res.json();
      return (data.events || []).map(function(ev) {
        var comp = (ev.competitions && ev.competitions[0]) || {};
        var comps = comp.competitors || [];
        var home = comps.find(function(c) { return c.homeAway === 'home'; }) || comps[0] || {};
        var away = comps.find(function(c) { return c.homeAway === 'away'; }) || comps[1] || {};
        var st = (ev.status && ev.status.type) || {};
        return {
          id: ev.id,
          leagueId: lg.id,
          leagueName: lg.name,
          date: ev.date,
          state: st.state || 'pre',
          clock: (ev.status && ev.status.displayClock) || '',
          detail: st.shortDetail || '',
          homeName: (home.team && (home.team.shortDisplayName || home.team.displayName)) || '',
          homeLogo: (home.team && home.team.logo) || '',
          homeScore: home.score || '0',
          awayName: (away.team && (away.team.shortDisplayName || away.team.displayName)) || '',
          awayLogo: (away.team && away.team.logo) || '',
          awayScore: away.score || '0'
        };
      });
    }));

    var merged = [];
    results.forEach(function(r) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) merged = merged.concat(r.value);
    });

    var order = { 'in': 0, 'pre': 1, 'post': 2 };
    merged.sort(function(a, b) {
      var oa = order[a.state] !== undefined ? order[a.state] : 3;
      var ob = order[b.state] !== undefined ? order[b.state] : 3;
      if (oa !== ob) return oa - ob;
      return new Date(a.date) - new Date(b.date);
    });

    allEvents = merged;
    if (dayOffset === 0) {
      window.ktTodayEvents = merged;
      window.dispatchEvent(new CustomEvent('kt-ticker-updated', { detail: merged }));
    }
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: merged })); } catch (e) {}
    updateLiveBadge();
    renderTicker();
  }

  function updateLiveBadge() {
    var liveCount = allEvents.filter(function(e) { return e.state === 'in'; }).length;
    var numEl = document.getElementById('kt-live-num');
    if (numEl) {
      numEl.textContent = liveCount;
      numEl.classList.toggle('hidden', liveCount === 0);
    }
  }

  function renderTicker() {
    var box = document.getElementById('kt-live-ticker');
    if (!box) return;
    var list = allEvents.filter(function(e) {
      if (activeLeague !== 'all' && e.leagueId !== activeLeague) return false;
      if (liveOnly && e.state !== 'in') return false;
      return true;
    });

    if (!list.length) {
      var msg = liveOnly
        ? 'لا توجد مباريات جارية الآن في الدوريات الكبرى.'
        : 'لا توجد مباريات مبرمجة في هذا اليوم لهذا التصنيف.';
      box.innerHTML = '<div class="text-xs text-slate-400 py-1.5 px-2 whitespace-nowrap">' + msg + '</div>';
      return;
    }

    box.innerHTML = list.map(function(m) {
      var centerBadge = '';
      if (m.state === 'in') {
        var min = m.detail || m.clock || 'LIVE';
        centerBadge = '<div class="flex flex-col items-center px-2 py-0.5 rounded-lg bg-red-600 text-white min-w-[58px]">' +
          '<span class="text-xs font-black leading-tight">' + esc(m.homeScore) + ' - ' + esc(m.awayScore) + '</span>' +
          '<span class="text-[9px] font-bold opacity-95 animate-pulse">' + esc(min) + '</span>' +
        '</div>';
      } else if (m.state === 'post') {
        centerBadge = '<div class="flex flex-col items-center px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 min-w-[54px]">' +
          '<span class="text-xs font-black leading-tight">' + esc(m.homeScore) + ' - ' + esc(m.awayScore) + '</span>' +
          '<span class="text-[9px] text-slate-400">انتهت</span>' +
        '</div>';
      } else {
        centerBadge = '<div class="px-2.5 py-1 rounded-lg bg-sky-500 text-white text-xs font-black min-w-[52px] text-center">' + esc(fmtLocalTime(m.date)) + '</div>';
      }

      var hImg = m.homeLogo ? '<img src="' + esc(m.homeLogo) + '" alt="' + esc(m.homeName) + '" class="w-6 h-6 object-contain shrink-0" loading="lazy" />' : '';
      var aImg = m.awayLogo ? '<img src="' + esc(m.awayLogo) + '" alt="' + esc(m.awayName) + '" class="w-6 h-6 object-contain shrink-0" loading="lazy" />' : '';
      var cardBorder = m.state === 'in' ? 'border-red-500/60 bg-slate-900' : 'border-slate-800 bg-slate-900/90 hover:border-sky-500/60';

      return '<button type="button" onclick="ktOpenMatch(\'' + esc(m.leagueId) + '\',\'' + esc(m.id) + '\')" title="تفاصيل وإحصائيات: ' + esc(m.homeName + ' vs ' + m.awayName) + '" class="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ' + cardBorder + ' shrink-0 transition">' +
        '<div class="flex items-center gap-1.5">' + hImg + '<span class="text-[11px] font-bold text-slate-200 max-w-[68px] truncate hidden md:inline">' + esc(m.homeName) + '</span></div>' +
        centerBadge +
        '<div class="flex items-center gap-1.5"><span class="text-[11px] font-bold text-slate-200 max-w-[68px] truncate hidden md:inline">' + esc(m.awayName) + '</span>' + aImg + '</div>' +
      '</button>';
    }).join('');
  }

  // --- Match Details Modal (Goals, Stats, Lineups) ---
  function ensureModal() {
    if (document.getElementById('kt-match-modal')) return;
    var wrap = document.createElement('div');
    wrap.id = 'kt-match-modal';
    wrap.dir = 'rtl';
    wrap.className = 'hidden fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4';
    wrap.onclick = function(e) { if (e.target === wrap) ktCloseMatch(); };
    wrap.innerHTML =
      '<div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl text-slate-100">' +
        '<div class="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2">' +
          '<span id="ktm-league" class="text-xs font-black text-sky-400">تفاصيل المباراة</span>' +
          '<button type="button" onclick="ktCloseMatch()" class="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1 rounded-lg font-bold">إغلاق ✕</button>' +
        '</div>' +
        '<div id="ktm-score" class="px-4 py-4 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800"></div>' +
        '<div class="px-3 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">' +
          '<div class="flex items-center gap-1.5">' +
            '<button type="button" onclick="ktModalTab(\'events\')" id="ktmt-events" class="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-500 text-slate-950">⚽ الأحداث</button>' +
            '<button type="button" onclick="ktModalTab(\'stats\')" id="ktmt-stats" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700">📊 الإحصائيات</button>' +
            '<button type="button" onclick="ktModalTab(\'lineups\')" id="ktmt-lineups" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700">👕 التشكيلة</button>' +
          '</div>' +
          '<a href="index.html" onclick="ktCloseMatch()" class="px-3 py-1.5 rounded-lg text-xs font-black bg-red-600 hover:bg-red-500 text-white whitespace-nowrap">📺 البث المباشر</a>' +
        '</div>' +
        '<div id="ktm-body" class="p-4 overflow-y-auto space-y-3 flex-1 text-xs"></div>' +
      '</div>';
    document.body.appendChild(wrap);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') ktCloseMatch();
    });
  }

  window.ktCloseMatch = function() {
    var m = document.getElementById('kt-match-modal');
    if (m) m.classList.add('hidden');
  };

  window.ktModalTab = function(tab) {
    modalTab = tab;
    ['events', 'stats', 'lineups'].forEach(function(t) {
      var b = document.getElementById('ktmt-' + t);
      if (b) b.className = (t === tab)
        ? 'px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-500 text-slate-950'
        : 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700';
    });
    renderModalBody();
  };

  function renderModalBody() {
    var body = document.getElementById('ktm-body');
    if (!body || !modalSummary) return;

    if (modalTab === 'events') {
      var evs = modalSummary.keyEvents || [];
      if (!evs.length) {
        body.innerHTML = '<div class="text-center py-8 text-slate-400">لا توجد أحداث مسجلة حالياً (ستظهر الأهداف والبطاقات فور انطلاق المباراة).</div>';
        return;
      }
      body.innerHTML = evs.map(function(ev) {
        var icon = '🔹';
        var tName = (ev.type && ev.type.text) || '';
        if (ev.scoringPlay || /goal/i.test(tName)) icon = '⚽';
        else if (ev.redCard || /red card/i.test(tName)) icon = '🟥';
        else if (ev.yellowCard || /yellow card/i.test(tName)) icon = '🟨';
        else if (/substitution/i.test(tName)) icon = '🔄';
        var min = (ev.clock && ev.clock.displayValue) || '';
        var pName = (ev.participants && ev.participants[0] && ev.participants[0].athlete && ev.participants[0].athlete.displayName) || '';
        var teamN = (ev.team && ev.team.displayName) || '';
        var desc = ev.text || (pName ? (pName + (teamN ? ' (' + teamN + ')' : '')) : tName);
        return '<div class="flex items-start gap-2.5 bg-slate-950/70 border border-slate-800 rounded-xl p-3">' +
          '<span class="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono font-bold shrink-0">' + esc(min || '--') + '</span>' +
          '<span class="text-sm leading-none mt-0.5">' + icon + '</span>' +
          '<div class="flex-1 text-slate-200 leading-relaxed">' + esc(desc) + '</div>' +
        '</div>';
      }).join('');
      return;
    }

    if (modalTab === 'stats') {
      var teams = (modalSummary.boxscore && modalSummary.boxscore.teams) || [];
      if (teams.length < 2 || !teams[0].statistics || !teams[0].statistics.length) {
        body.innerHTML = '<div class="text-center py-8 text-slate-400">الإحصائيات المباشرة غير متوفرة قبل بداية المباراة.</div>';
        return;
      }
      var s0 = teams[0].statistics || [];
      var s1 = teams[1].statistics || [];
      var wanted = ['possessionPct', 'totalShots', 'shotsOnTarget', 'wonCorners', 'foulsCommitted', 'yellowCards', 'redCards', 'offsides', 'saves', 'passPct'];
      var rows = wanted.map(function(k) {
        var a = s0.find(function(x) { return x.name === k; });
        var b = s1.find(function(x) { return x.name === k; });
        if (!a && !b) return '';
        var v0 = a ? a.displayValue : '0';
        var v1 = b ? b.displayValue : '0';
        var n0 = parseFloat(v0) || 0;
        var n1 = parseFloat(v1) || 0;
        var tot = (n0 + n1) || 1;
        var p0 = Math.round((n0 / tot) * 100);
        var p1 = 100 - p0;
        return '<div class="space-y-1">' +
          '<div class="flex items-center justify-between font-bold text-xs">' +
            '<span class="text-emerald-400">' + esc(v0) + '</span>' +
            '<span class="text-slate-300">' + esc(STAT_LABELS[k] || k) + '</span>' +
            '<span class="text-sky-400">' + esc(v1) + '</span>' +
          '</div>' +
          '<div class="h-2 rounded-full bg-slate-800 overflow-hidden flex">' +
            '<div style="width:' + p0 + '%" class="bg-emerald-500 h-full"></div>' +
            '<div style="width:' + p1 + '%" class="bg-sky-500 h-full"></div>' +
          '</div>' +
        '</div>';
      }).filter(Boolean).join('');
      body.innerHTML = rows || '<div class="text-center py-8 text-slate-400">لا توجد إحصائيات متاحة حالياً.</div>';
      return;
    }

    if (modalTab === 'lineups') {
      var rosters = modalSummary.rosters || [];
      if (!rosters.length) {
        body.innerHTML = '<div class="text-center py-8 text-slate-400">التشكيلة الرسمية تُنشر عادةً قبل بداية المباراة بساعة.</div>';
        return;
      }
      body.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + rosters.map(function(r) {
        var starters = (r.roster || []).filter(function(p) { return p.starter; });
        var list = starters.length ? starters : (r.roster || []).slice(0, 11);
        var tName = (r.team && r.team.displayName) || '';
        var form = r.formation ? ' (' + r.formation + ')' : '';
        return '<div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">' +
          '<div class="font-black text-emerald-400 border-b border-slate-800 pb-1.5">' + esc(tName + form) + '</div>' +
          '<div class="space-y-1.5">' + list.map(function(p) {
            var nm = (p.athlete && p.athlete.displayName) || '';
            var num = p.jersey || '-';
            var pos = (p.position && p.position.abbreviation) || '';
            return '<div class="flex items-center justify-between gap-2 text-slate-200">' +
              '<div class="flex items-center gap-2 min-w-0"><span class="w-5 h-5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">' + esc(num) + '</span><span class="truncate">' + esc(nm) + '</span></div>' +
              '<span class="text-[10px] text-slate-500 shrink-0">' + esc(pos) + '</span>' +
            '</div>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
    }
  }

  window.ktOpenMatch = async function(leagueId, eventId) {
    if (typeof window.ktOpenPreMatch === "function") return window.ktOpenPreMatch(leagueId, eventId);
    ensureModal();
    var modal = document.getElementById('kt-match-modal');
    var scoreEl = document.getElementById('ktm-score');
    var bodyEl = document.getElementById('ktm-body');
    var lgEl = document.getElementById('ktm-league');
    modal.classList.remove('hidden');

    var ev = allEvents.find(function(x) { return String(x.id) === String(eventId); });
    if (ev) {
      lgEl.textContent = ev.leagueName;
      var mid = ev.state === 'pre'
        ? '<div class="text-lg font-black text-sky-400">' + esc(fmtLocalTime(ev.date)) + '</div><div class="text-[11px] text-slate-400">لم تبدأ بعد</div>'
        : '<div class="text-2xl font-black text-white">' + esc(ev.homeScore) + ' - ' + esc(ev.awayScore) + '</div><div class="text-[11px] font-bold ' + (ev.state === 'in' ? 'text-red-400 animate-pulse' : 'text-slate-400') + '">' + esc(ev.state === 'in' ? ('● ' + (ev.detail || ev.clock || 'مباشر')) : 'انتهت المباراة') + '</div>';
      scoreEl.innerHTML =
        '<div class="grid grid-cols-3 items-center text-center gap-2">' +
          '<div class="flex flex-col items-center gap-1.5">' + (ev.homeLogo ? '<img src="' + esc(ev.homeLogo) + '" class="w-11 h-11 object-contain" />' : '') + '<span class="font-bold text-xs sm:text-sm text-white">' + esc(ev.homeName) + '</span></div>' +
          '<div>' + mid + '</div>' +
          '<div class="flex flex-col items-center gap-1.5">' + (ev.awayLogo ? '<img src="' + esc(ev.awayLogo) + '" class="w-11 h-11 object-contain" />' : '') + '<span class="font-bold text-xs sm:text-sm text-white">' + esc(ev.awayName) + '</span></div>' +
        '</div>';
    } else {
      scoreEl.innerHTML = '';
    }

    bodyEl.innerHTML = '<div class="text-center py-8 text-slate-400">جاري تحميل تفاصيل وإحصائيات المباراة...</div>';
    modalSummary = null;

    try {
      var res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/' + encodeURIComponent(leagueId) + '/summary?event=' + encodeURIComponent(eventId));
      modalSummary = await res.json();
      ktModalTab('events');
    } catch (e) {
      bodyEl.innerHTML = '<div class="text-center py-8 text-red-400">تعذر جلب تفاصيل المباراة حالياً.</div>';
    }
  };

  window.ktSetDay = function(offset) {
    dayOffset = offset;
    liveOnly = false;
    var lp = document.getElementById('kt-live-pill');
    if (lp) lp.classList.remove('ring-2', 'ring-red-400');
    document.querySelectorAll('.kt-day-btn').forEach(function(b) {
      b.className = 'kt-day-btn px-2.5 py-1 rounded-full text-white/90 hover:bg-white/15 font-bold whitespace-nowrap transition';
    });
    var activeBtn = document.getElementById('kt-day-' + offset);
    if (activeBtn) activeBtn.className = 'kt-day-btn px-3 py-1 rounded-full bg-white text-slate-950 font-black whitespace-nowrap transition';
    var box = document.getElementById('kt-live-ticker');
    if (box) box.innerHTML = '<div class="text-xs text-slate-400 py-1.5 px-2 whitespace-nowrap">جاري التحديث...</div>';
    fetchTicker();
  };

  window.ktFilterLeague = function(lg) {
    activeLeague = lg;
    document.querySelectorAll('.kt-flag-btn').forEach(function(b) {
      var isAct = b.getAttribute('data-lg') === lg;
      b.className = isAct
        ? 'kt-flag-btn w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-sm border-2 border-emerald-400 shrink-0'
        : 'kt-flag-btn w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-sm border border-slate-700 shrink-0';
    });
    renderTicker();
  };

  window.ktToggleLiveOnly = function() {
    liveOnly = !liveOnly;
    var lp = document.getElementById('kt-live-pill');
    if (lp) {
      lp.classList.toggle('ring-2', liveOnly);
      lp.classList.toggle('ring-red-400', liveOnly);
    }
    renderTicker();
  };

  fetchTicker();
  setInterval(function() {
    if (dayOffset === 0) fetchTicker();
  }, 60000);
})();
