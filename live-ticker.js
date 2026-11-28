(function() {
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

  var dayOffset = 0;
  var activeLeague = 'all';
  var liveOnly = false;
  var allEvents = [];

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function(m) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function getDateParam(offset) {
    var d = new Date();
    d.setDate(d.getDate() + offset);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return '' + y + m + day;
  }

  function fmtLocalTime(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return '--:--';
    }
  }

  async function fetchTicker() {
    var box = document.getElementById('kt-live-ticker');
    if (!box) return;
    var dateStr = getDateParam(dayOffset);
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
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        merged = merged.concat(r.value);
      }
    });

    // Sort: LIVE first, then upcoming by time, then finished
    var order = { 'in': 0, 'pre': 1, 'post': 2 };
    merged.sort(function(a, b) {
      var oa = order[a.state] !== undefined ? order[a.state] : 3;
      var ob = order[b.state] !== undefined ? order[b.state] : 3;
      if (oa !== ob) return oa - ob;
      return new Date(a.date) - new Date(b.date);
    });

    allEvents = merged;
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
      var cardBorder = m.state === 'in' ? 'border-red-500/60 bg-slate-900' : 'border-slate-800 bg-slate-900/90 hover:border-sky-500/50';

      return '<a href="index.html" title="' + esc(m.homeName + ' vs ' + m.awayName + ' (' + m.leagueName + ')') + '" class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ' + cardBorder + ' shrink-0 transition">' +
        '<div class="flex items-center gap-1.5">' + hImg + '<span class="text-[11px] font-bold text-slate-200 max-w-[68px] truncate hidden md:inline">' + esc(m.homeName) + '</span></div>' +
        centerBadge +
        '<div class="flex items-center gap-1.5"><span class="text-[11px] font-bold text-slate-200 max-w-[68px] truncate hidden md:inline">' + esc(m.awayName) + '</span>' + aImg + '</div>' +
      '</a>';
    }).join('');
  }

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
    if (lp) lp.classList.toggle('ring-2', liveOnly);
    if (lp) lp.classList.toggle('ring-red-400', liveOnly);
    renderTicker();
  };

  fetchTicker();
  setInterval(function() {
    if (dayOffset === 0) fetchTicker();
  }, 60000);
})();
