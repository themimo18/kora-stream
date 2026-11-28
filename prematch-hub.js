(function() {
  if (window.__ktPreMatchLoaded) return;
  window.__ktPreMatchLoaded = true;

  if (!document.getElementById('kt-pm-css')) {
    var st = document.createElement('style');
    st.id = 'kt-pm-css';
    st.textContent =
      '.kt-pm-wrap{margin-top:6px;display:flex;justify-content:center;}' +
      '.kt-pm-card-btn{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;background:rgba(14,165,233,.14);color:#38bdf8;border:1px solid rgba(56,189,248,.35);cursor:pointer;transition:all .15s;white-space:nowrap;}' +
      '.kt-pm-card-btn:hover{background:rgba(14,165,233,.28);color:#fff;}' +
      '.kt-pitch{position:relative;border-radius:14px;overflow:hidden;border:2px solid rgba(255,255,255,.22);padding:16px 8px;min-height:330px;display:flex;flex-direction:column;justify-content:space-between;gap:12px;' +
        'background:repeating-linear-gradient(180deg,#14532d 0px,#14532d 34px,#166534 34px,#166534 68px);}' +
      '.kt-pitch::before{content:"";position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(255,255,255,.22);pointer-events:none;}' +
      '.kt-pitch::after{content:"";position:absolute;top:50%;left:50%;width:68px;height:68px;transform:translate(-50%,-50%);border-radius:9999px;border:1px solid rgba(255,255,255,.22);pointer-events:none;}' +
      '.kt-pitch-box-top{position:absolute;top:0;left:50%;transform:translateX(-50%);width:48%;height:42px;border:1px solid rgba(255,255,255,.22);border-top:none;pointer-events:none;}' +
      '.kt-pitch-box-bot{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:48%;height:42px;border:1px solid rgba(255,255,255,.22);border-bottom:none;pointer-events:none;}' +
      '.kt-pitch-row{position:relative;z-index:2;display:flex;justify-content:space-around;align-items:center;gap:4px;}' +
      '.kt-player{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:44px;max-width:68px;}' +
      '.kt-jersey{width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.45);}' +
      '.kt-pname{background:rgba(2,6,23,.82);color:#f8fafc;font-size:10px;font-weight:700;padding:1px 6px;border-radius:6px;max-width:66px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;}' +
      '.kt-form-pill{width:22px;height:22px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;}';
    document.head.appendChild(st);
  }

  var STOP_WORDS = {
    fc:1, cf:1, sc:1, ac:1, afc:1, city:1, united:1, utd:1, town:1, club:1,
    real:1, athletic:1, sporting:1, de:1, la:1, el:1, al:1, saint:1, st:1,
    calcio:1, as:1, ss:1, us:1, rc:1, cd:1, ud:1, sd:1, vs:1, wanderers:1, rovers:1, albion:1
  };

  var ALIASES = {
    'man united': 'manchester united',
    'man utd': 'manchester united',
    'man city': 'manchester city',
    'spurs': 'tottenham',
    'wolves': 'wolverhampton',
    'nottm forest': 'nottingham forest',
    'nott forest': 'nottingham forest',
    'psg': 'paris saint germain',
    'inter': 'inter milan',
    'atletico': 'atletico madrid',
    'ath bilbao': 'athletic club',
    'betis': 'real betis',
    'rayo': 'rayo vallecano',
    'ريال مدريد': 'real madrid',
    'برشلونة': 'barcelona',
    'ليفربول': 'liverpool',
    'ارسنال': 'arsenal',
    'آرسنال': 'arsenal',
    'أرسنال': 'arsenal',
    'مانشستر سيتي': 'manchester city',
    'مانشستر يونايتد': 'manchester united',
    'تشيلسي': 'chelsea',
    'تشلسي': 'chelsea',
    'توتنهام': 'tottenham',
    'استون فيلا': 'aston villa',
    'أستون فيلا': 'aston villa',
    'نيوكاسل': 'newcastle',
    'بايرن': 'bayern munich',
    'باريس': 'paris saint germain',
    'اتلتيكو': 'atletico madrid',
    'أتلتيكو': 'atletico madrid',
    'انتر': 'inter milan',
    'إنتر': 'inter milan',
    'ميلان': 'ac milan',
    'يوفنتوس': 'juventus',
    'نابولي': 'napoli',
    'روما': 'roma',
    'الهلال': 'al hilal',
    'النصر': 'al nassr',
    'الاتحاد': 'al ittihad',
    'الاهلي': 'al ahli',
    'الأهلي': 'al ahli'
  };

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
    passPct: 'دقة التمرير %'
  };

  var summaryCache = {};
  var countdownTargets = [];
  var isAddingBtns = false;
  var btnDebounce = null;
  var lastInlineTitle = '';

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function(m) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function norm(s) {
    var txt = String(s || '').toLowerCase();
    Object.keys(ALIASES).forEach(function(k) {
      if (txt.indexOf(k) !== -1) txt += ' ' + ALIASES[k];
    });
    return txt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function teamMatches(hayNorm, espnName) {
    var t = norm(espnName);
    if (!t) return false;
    if (hayNorm.indexOf(t) !== -1) return true;
    var words = t.split(' ').filter(function(w) { return w.length >= 4 && !STOP_WORDS[w]; });
    for (var i = 0; i < words.length; i++) {
      if (hayNorm.indexOf(words[i]) !== -1) return true;
    }
    return false;
  }

  function findEventByText(rawText) {
    var events = window.ktTodayEvents || [];
    var hay = norm(rawText);
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (teamMatches(hay, ev.homeName) && teamMatches(hay, ev.awayName)) return ev;
    }
    return null;
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtCountdown(sec) {
    return pad2(Math.floor(sec / 3600)) + ':' + pad2(Math.floor((sec % 3600) / 60)) + ':' + pad2(sec % 60);
  }
  function fmtLocalTime(iso) {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); }
    catch (e) { return '--:--'; }
  }
  function fmtDateShort(iso) {
    try { return new Date(iso).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function shortPlayerName(full) {
    var parts = String(full || '').trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : (parts[0] || '');
  }

  async function fetchSummary(leagueId, eventId, force) {
    var key = leagueId + ':' + eventId;
    if (!force && summaryCache[key] && (Date.now() - summaryCache[key].ts) < 45000) {
      return summaryCache[key].data;
    }
    var url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/' + encodeURIComponent(leagueId) + '/summary?event=' + encodeURIComponent(eventId);
    var res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    summaryCache[key] = { ts: Date.now(), data: data };
    return data;
  }

  function buildPitchRows(starters, formationStr) {
    if (!starters || !starters.length) return [];
    var sorted = starters.slice().sort(function(a, b) {
      return (parseInt(a.formationPlace, 10) || 99) - (parseInt(b.formationPlace, 10) || 99);
    });
    var nums = String(formationStr || '').split('-').map(function(n) { return parseInt(n, 10); }).filter(function(n) { return n > 0; });
    var sum = nums.reduce(function(a, b) { return a + b; }, 0);
    if (nums.length >= 2 && sum === sorted.length - 1) {
      var rows = [[sorted[0]]];
      var idx = 1;
      for (var i = 0; i < nums.length; i++) {
        rows.push(sorted.slice(idx, idx + nums[i]));
        idx += nums[i];
      }
      return rows;
    }
    var g = [], d = [], m = [], f = [];
    sorted.forEach(function(p) {
      var pos = ((p.position && p.position.abbreviation) || '').toUpperCase();
      if (pos === 'G' || pos === 'GK') g.push(p);
      else if (pos.indexOf('D') !== -1 || pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'WB') d.push(p);
      else if (pos.indexOf('F') !== -1 || pos === 'ST' || pos === 'CF' || pos === 'LW' || pos === 'RW') f.push(p);
      else m.push(p);
    });
    return [g, d, m, f].filter(function(arr) { return arr.length > 0; });
  }

  function renderPitchHtml(rosterObj, isHome) {
    if (!rosterObj || !rosterObj.roster || !rosterObj.roster.length) {
      return '<div class="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center space-y-2">' +
        '<div class="text-3xl">🏟️</div>' +
        '<div class="font-bold text-sm text-white">التشكيلة الرسمية لم تُعلن بعد</div>' +
        '<p class="text-xs text-slate-400">يتم نشر الخطة والتشكيلة الأساسية تلقائياً قبل صافرة البداية بـ 60 دقيقة.</p>' +
      '</div>';
    }
    var starters = rosterObj.roster.filter(function(p) { return p.starter; });
    if (!starters.length) starters = rosterObj.roster.slice(0, 11);
    var subs = rosterObj.roster.filter(function(p) { return !p.starter; });
    var rows = buildPitchRows(starters, rosterObj.formation);
    var jerseyBg = isHome ? '#10b981' : '#0ea5e9';
    var jerseyTxt = '#020617';
    var teamName = (rosterObj.team && rosterObj.team.displayName) || '';

    var rowsHtml = rows.map(function(row, rIdx) {
      return '<div class="kt-pitch-row">' + row.map(function(p) {
        var bg = rIdx === 0 ? '#f59e0b' : jerseyBg;
        var nm = shortPlayerName(p.athlete && p.athlete.displayName);
        var num = p.jersey || '•';
        return '<div class="kt-player" title="' + esc((p.athlete && p.athlete.displayName) || '') + '">' +
          '<div class="kt-jersey" style="background:' + bg + ';color:' + jerseyTxt + '">' + esc(num) + '</div>' +
          '<div class="kt-pname">' + esc(nm) + '</div>' +
        '</div>';
      }).join('') + '</div>';
    }).join('');

    var subsHtml = subs.length ? (
      '<div class="mt-3 bg-slate-950/70 border border-slate-800 rounded-xl p-3">' +
        '<div class="text-[11px] font-black text-slate-400 mb-2">🪑 مقاعد البدلاء (' + subs.length + ')</div>' +
        '<div class="flex flex-wrap gap-1.5">' + subs.map(function(p) {
          var nm = (p.athlete && p.athlete.displayName) || '';
          var num = p.jersey ? ('#' + p.jersey + ' ') : '';
          return '<span class="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">' + esc(num + nm) + '</span>';
        }).join('') + '</div>' +
      '</div>'
    ) : '';

    return '<div class="space-y-2">' +
      '<div class="flex items-center justify-between text-xs px-1">' +
        '<span class="font-black text-white">' + esc(teamName) + '</span>' +
        (rosterObj.formation ? '<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-black">الخطة: ' + esc(rosterObj.formation) + '</span>' : '') +
      '</div>' +
      '<div class="kt-pitch">' +
        '<div class="kt-pitch-box-top"></div><div class="kt-pitch-box-bot"></div>' +
        rowsHtml +
      '</div>' +
      subsHtml +
    '</div>';
  }

  function renderInfoTab(summary, ev) {
    var gi = summary.gameInfo || {};
    var venue = gi.venue || {};
    var officials = gi.officials || [];
    var refName = (officials[0] && officials[0].displayName) ? officials[0].displayName : 'سيُعلن قبل المباراة';
    var venueStr = venue.fullName ? (venue.fullName + (venue.address && venue.address.city ? ' — ' + venue.address.city : '')) : 'غير محدد';
    var capStr = venue.capacity ? Number(venue.capacity).toLocaleString() + ' متفرج' : '';

    var comp = (summary.header && summary.header.competitions && summary.header.competitions[0]) || {};
    var dateIso = comp.date || (ev && ev.date) || '';
    var lgName = (summary.header && summary.header.league && summary.header.league.name) || (ev && ev.leagueName) || '';

    var infoCards =
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">' +
        '<div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5"><span class="text-lg">🏟️</span><div><div class="text-[10px] text-slate-400">الملعب</div><div class="font-bold text-xs text-white">' + esc(venueStr) + '</div>' + (capStr ? '<div class="text-[10px] text-slate-500">السعة: ' + esc(capStr) + '</div>' : '') + '</div></div>' +
        '<div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5"><span class="text-lg">⚖️</span><div><div class="text-[10px] text-slate-400">حكم المباراة</div><div class="font-bold text-xs text-white">' + esc(refName) + '</div></div></div>' +
        '<div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5"><span class="text-lg">🏆</span><div><div class="text-[10px] text-slate-400">البطولة</div><div class="font-bold text-xs text-white">' + esc(lgName) + '</div></div></div>' +
        '<div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5"><span class="text-lg">🕒</span><div><div class="text-[10px] text-slate-400">توقيت الانطلاق</div><div class="font-bold text-xs text-emerald-400">' + esc(dateIso ? (fmtLocalTime(dateIso) + ' • ' + fmtDateShort(dateIso)) : '--:--') + '</div></div></div>' +
      '</div>';

    var forms = (summary.boxscore && summary.boxscore.form) || [];
    var formHtml = '';
    if (forms.length) {
      formHtml = '<div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">' +
        '<div class="text-xs font-black text-sky-400">📈 آخر 5 مباريات لكل فريق</div>' +
        '<div class="space-y-2">' + forms.map(function(f) {
          var tName = (f.team && (f.team.shortDisplayName || f.team.displayName)) || '';
          var tLogo = (f.team && f.team.logo) || '';
          var pills = (f.events || []).slice(0, 5).map(function(fe) {
            var r = (fe.gameResult || '').toUpperCase();
            var cls = r === 'W' ? 'bg-emerald-500 text-slate-950' : (r === 'L' ? 'bg-red-500 text-white' : 'bg-slate-600 text-white');
            var lbl = r === 'W' ? 'ف' : (r === 'L' ? 'خ' : 'ت');
            var opp = (fe.opponent && fe.opponent.shortDisplayName) || '';
            return '<span title="' + esc((fe.score || '') + ' vs ' + opp) + '" class="kt-form-pill ' + cls + '">' + lbl + '</span>';
          }).join('');
          return '<div class="flex items-center justify-between gap-2">' +
            '<div class="flex items-center gap-2 min-w-0">' + (tLogo ? '<img src="' + esc(tLogo) + '" class="w-5 h-5 object-contain shrink-0" />' : '') + '<span class="font-bold text-xs text-white truncate">' + esc(tName) + '</span></div>' +
            '<div class="flex items-center gap-1 shrink-0">' + pills + '</div>' +
          '</div>';
        }).join('') + '</div></div>';
    }

    var h2hGroups = summary.headToHeadGames || [];
    var h2hEvents = (h2hGroups[0] && h2hGroups[0].events) ? h2hGroups[0].events.slice(0, 5) : [];
    var h2hHtml = '';
    if (h2hEvents.length) {
      var baseTeam = (h2hGroups[0].team && (h2hGroups[0].team.shortDisplayName || h2hGroups[0].team.displayName)) || '';
      h2hHtml = '<div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">' +
        '<div class="text-xs font-black text-amber-400">⚔️ آخر المواجهات المباشرة (H2H)</div>' +
        '<div class="space-y-1.5">' + h2hEvents.map(function(h) {
          var opp = (h.opponent && (h.opponent.shortDisplayName || h.opponent.displayName)) || '';
          var left = h.atVs === '@' ? opp : baseTeam;
          var right = h.atVs === '@' ? baseTeam : opp;
          var sc = (h.homeTeamScore !== undefined && h.awayTeamScore !== undefined) ? (h.homeTeamScore + ' - ' + h.awayTeamScore) : (h.score || '-');
          return '<div class="flex items-center justify-between gap-2 text-[11px] bg-slate-900/90 border border-slate-800/80 rounded-lg px-2.5 py-2">' +
            '<span class="text-slate-400 shrink-0">' + esc(fmtDateShort(h.gameDate)) + '</span>' +
            '<div class="flex items-center gap-2 font-bold text-white truncate">' +
              '<span class="truncate">' + esc(left) + '</span>' +
              '<span class="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-black shrink-0">' + esc(sc) + '</span>' +
              '<span class="truncate">' + esc(right) + '</span>' +
            '</div>' +
          '</div>';
        }).join('') + '</div></div>';
    }

    return '<div class="space-y-3">' + infoCards + formHtml + h2hHtml + '</div>';
  }

  function renderEventsTab(summary) {
    var evs = summary.keyEvents || [];
    if (!evs.length) {
      return '<div class="text-center py-8 text-slate-400 text-xs">لم تبدأ أحداث المباراة بعد — ستظهر الأهداف والبطاقات تلقائياً فور انطلاقها.</div>';
    }
    return '<div class="space-y-2">' + evs.map(function(ev) {
      var icon = '🔹';
      var tName = (ev.type && ev.type.text) || '';
      if (ev.scoringPlay || /goal/i.test(tName)) icon = '⚽';
      else if (ev.redCard || /red card/i.test(tName)) icon = '🟥';
      else if (ev.yellowCard || /yellow card/i.test(tName)) icon = '🟨';
      else if (/substitution/i.test(tName)) icon = '🔄';
      var min = (ev.clock && ev.clock.displayValue) || '--';
      var pName = (ev.participants && ev.participants[0] && ev.participants[0].athlete && ev.participants[0].athlete.displayName) || '';
      var teamN = (ev.team && ev.team.displayName) || '';
      var desc = ev.text || (pName ? (pName + (teamN ? ' (' + teamN + ')' : '')) : tName);
      return '<div class="flex items-start gap-2.5 bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs">' +
        '<span class="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono font-bold shrink-0">' + esc(min) + '</span>' +
        '<span class="text-sm leading-none mt-0.5">' + icon + '</span>' +
        '<div class="flex-1 text-slate-200 leading-relaxed">' + esc(desc) + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function renderStatsTab(summary) {
    var teams = (summary.boxscore && summary.boxscore.teams) || [];
    if (teams.length < 2 || !teams[0].statistics || !teams[0].statistics.length) {
      return '<div class="text-center py-8 text-slate-400 text-xs">الإحصائيات المباشرة (الاستحواذ، التسديدات، الركنيات) تبدأ تلقائياً مع انطلاق المباراة.</div>';
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
      return '<div class="space-y-1">' +
        '<div class="flex items-center justify-between font-bold text-xs">' +
          '<span class="text-emerald-400">' + esc(v0) + '</span>' +
          '<span class="text-slate-300">' + esc(STAT_LABELS[k] || k) + '</span>' +
          '<span class="text-sky-400">' + esc(v1) + '</span>' +
        '</div>' +
        '<div class="h-2 rounded-full bg-slate-800 overflow-hidden flex">' +
          '<div style="width:' + p0 + '%" class="bg-emerald-500 h-full"></div>' +
          '<div style="width:' + (100 - p0) + '%" class="bg-sky-500 h-full"></div>' +
        '</div>' +
      '</div>';
    }).filter(Boolean).join('');
    return '<div class="space-y-3">' + (rows || '<div class="text-center py-8 text-slate-400 text-xs">لا توجد إحصائيات متاحة حالياً.</div>') + '</div>';
  }

  function mountHub(container, ev, summary, opts) {
    opts = opts || {};
    var rosters = (summary && summary.rosters) || [];
    var hasLineups = rosters.some(function(r) { return r.roster && r.roster.length > 0; });
    var state = (ev && ev.state) || 'pre';
    var activeTab = state === 'pre' ? (hasLineups ? 'pitch' : 'info') : 'events';
    var pitchTeamIdx = 0;

    var comp = (summary && summary.header && summary.header.competitions && summary.header.competitions[0]) || {};
    var kickoffIso = comp.date || (ev && ev.date) || '';
    var kickoffMs = kickoffIso ? new Date(kickoffIso).getTime() : 0;

    var uid = 'kthub_' + Math.random().toString(36).slice(2, 8);
    var cdBanner = (state === 'pre' && kickoffMs > Date.now())
      ? '<div class="bg-gradient-to-l from-emerald-500/15 via-sky-500/10 to-slate-900 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">' +
          '<div class="text-xs font-bold text-slate-200">⏳ بانتظار صافرة البداية — البث المباشر يشتغل فور انطلاق المباراة</div>' +
          '<div id="' + uid + '_cd" dir="ltr" class="font-mono font-black text-sm text-emerald-400 bg-slate-950 px-3 py-1 rounded-lg border border-emerald-500/40">' + fmtCountdown(Math.floor((kickoffMs - Date.now()) / 1000)) + '</div>' +
        '</div>'
      : '';

    container.innerHTML =
      '<div class="space-y-3" dir="rtl">' +
        cdBanner +
        '<div class="space-y-2">' +
          '<div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 w-full">' +
            '<button type="button" data-tab="pitch" class="kth-tab px-2.5 py-2 rounded-xl text-xs font-bold text-center">🏟️ الخطة والتشكيلة</button>' +
            '<button type="button" data-tab="info" class="kth-tab px-2.5 py-2 rounded-xl text-xs font-bold text-center">📋 معلومات والمواجهات</button>' +
            '<button type="button" data-tab="events" class="kth-tab px-2.5 py-2 rounded-xl text-xs font-bold text-center">⚽ الأحداث</button>' +
            '<button type="button" data-tab="stats" class="kth-tab px-2.5 py-2 rounded-xl text-xs font-bold text-center">📊 الإحصائيات</button>' +
          '</div>' +
          (opts.showWatchBtn ? '<a href="index.html" onclick="ktClosePreMatch()" class="block w-full sm:w-auto text-center px-3 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-500 text-white">📺 الانتقال إلى البث المباشر</a>' : '') +
        '</div>' +
        '<div id="' + uid + '_body"></div>' +
      '</div>';

    if (cdBanner) countdownTargets.push({ id: uid + '_cd', kickoffMs: kickoffMs });

    function paintTab() {
      container.querySelectorAll('.kth-tab').forEach(function(b) {
        var act = b.getAttribute('data-tab') === activeTab;
        b.className = act
          ? 'kth-tab px-2.5 py-2 rounded-xl text-xs font-black bg-emerald-500 text-slate-950 text-center'
          : 'kth-tab px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 text-center';
      });
      var body = document.getElementById(uid + '_body');
      if (!body) return;

      if (activeTab === 'pitch') {
        if (!hasLineups) {
          body.innerHTML = renderPitchHtml(null, true) + '<div class="mt-3">' + renderInfoTab(summary, ev) + '</div>';
          return;
        }
        var toggleBtns = rosters.map(function(r, idx) {
          var tNm = (r.team && (r.team.shortDisplayName || r.team.displayName)) || ('فريق ' + (idx + 1));
          var formTag = r.formation ? (' (' + r.formation + ')') : '';
          var actCls = idx === pitchTeamIdx
            ? (idx === 0 ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-sky-500 text-white font-black')
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold';
          return '<button type="button" data-pidx="' + idx + '" class="ktp-sw flex-1 px-3 py-2 rounded-xl text-xs transition ' + actCls + '">' + esc(tNm + formTag) + '</button>';
        }).join('');
        body.innerHTML = '<div class="flex items-center gap-2 mb-3">' + toggleBtns + '</div>' + renderPitchHtml(rosters[pitchTeamIdx], pitchTeamIdx === 0);
        body.querySelectorAll('.ktp-sw').forEach(function(btn) {
          btn.onclick = function() {
            pitchTeamIdx = parseInt(btn.getAttribute('data-pidx'), 10) || 0;
            paintTab();
          };
        });
      } else if (activeTab === 'info') {
        body.innerHTML = renderInfoTab(summary, ev);
      } else if (activeTab === 'events') {
        body.innerHTML = renderEventsTab(summary);
      } else if (activeTab === 'stats') {
        body.innerHTML = renderStatsTab(summary);
      }
    }

    container.querySelectorAll('.kth-tab').forEach(function(b) {
      b.onclick = function() { activeTab = b.getAttribute('data-tab'); paintTab(); };
    });
    paintTab();
  }

  function ensureModal() {
    if (document.getElementById('kt-prematch-modal')) return;
    var wrap = document.createElement('div');
    wrap.id = 'kt-prematch-modal';
    wrap.dir = 'rtl';
    wrap.className = 'hidden fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4';
    wrap.onclick = function(e) { if (e.target === wrap) ktClosePreMatch(); };
    wrap.innerHTML =
      '<div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85dvh] flex flex-col overflow-hidden shadow-2xl text-slate-100">' +
        '<div class="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2">' +
          '<span id="ktpm-league" class="text-xs font-black text-sky-400">مركز المباراة</span>' +
          '<button type="button" onclick="ktClosePreMatch()" class="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1 rounded-lg font-bold">إغلاق ✕</button>' +
        '</div>' +
        '<div id="ktpm-score" class="px-4 py-3.5 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800"></div>' +
        '<div id="ktpm-content" class="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0" style="-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;"></div>' +
      '</div>';
    document.body.appendChild(wrap);
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') ktClosePreMatch(); });
  }

  window.ktClosePreMatch = function() {
    var m = document.getElementById('kt-prematch-modal');
    if (m) m.classList.add('hidden');
  };

  window.ktOpenPreMatch = async function(leagueId, eventId, fallbackTitle) {
    ensureModal();
    var modal = document.getElementById('kt-prematch-modal');
    var lgEl = document.getElementById('ktpm-league');
    var scEl = document.getElementById('ktpm-score');
    var contentEl = document.getElementById('ktpm-content');
    modal.classList.remove('hidden');

    var ev = (window.ktTodayEvents || []).find(function(x) { return String(x.id) === String(eventId); });
    if (ev) {
      lgEl.textContent = ev.leagueName || 'مركز المباراة';
      var mid = ev.state === 'pre'
        ? '<div class="text-lg font-black text-sky-400">' + esc(fmtLocalTime(ev.date)) + '</div><div class="text-[11px] text-slate-400">لم تبدأ بعد</div>'
        : '<div class="text-2xl font-black text-white">' + esc(ev.homeScore) + ' - ' + esc(ev.awayScore) + '</div><div class="text-[11px] font-bold ' + (ev.state === 'in' ? 'text-red-400 animate-pulse' : 'text-slate-400') + '">' + esc(ev.state === 'in' ? ('● ' + (ev.detail || ev.clock || 'مباشر')) : 'انتهت المباراة') + '</div>';
      scEl.innerHTML =
        '<div class="grid grid-cols-3 items-center text-center gap-2">' +
          '<div class="flex flex-col items-center gap-1">' + (ev.homeLogo ? '<img src="' + esc(ev.homeLogo) + '" class="w-10 h-10 object-contain" />' : '') + '<span class="font-bold text-xs sm:text-sm text-white">' + esc(ev.homeName) + '</span></div>' +
          '<div>' + mid + '</div>' +
          '<div class="flex flex-col items-center gap-1">' + (ev.awayLogo ? '<img src="' + esc(ev.awayLogo) + '" class="w-10 h-10 object-contain" />' : '') + '<span class="font-bold text-xs sm:text-sm text-white">' + esc(ev.awayName) + '</span></div>' +
        '</div>';
    } else {
      lgEl.textContent = 'معلومات المباراة';
      scEl.innerHTML = '<div class="text-center font-black text-sm text-white py-1">' + esc(fallbackTitle || '') + '</div>';
    }

    if (!leagueId || !eventId) {
      contentEl.innerHTML = '<div class="text-center py-8 space-y-2"><div class="text-3xl">⚽</div><div class="font-bold text-sm text-white">بانتظار انطلاق المباراة</div><p class="text-xs text-slate-400">التشكيلة الرسمية ومعلومات الملعب تتوفر تلقائياً للمباريات المدرجة في الدوريات الكبرى قبل صافرة البداية.</p></div>';
      return;
    }

    contentEl.innerHTML = '<div class="text-center py-10 text-xs text-slate-400">جاري تحميل الخطة والتشكيلة ومعلومات المباراة...</div>';
    try {
      var summary = await fetchSummary(leagueId, eventId);
      mountHub(contentEl, ev || { state: 'pre' }, summary, { showWatchBtn: true });
    } catch (e) {
      contentEl.innerHTML = '<div class="text-center py-8 text-xs text-red-400">تعذر جلب تفاصيل المباراة حالياً.</div>';
    }
  };

  async function syncInlinePlayerPanel() {
    var sec = document.getElementById('player-section');
    var titleEl = document.getElementById('player-title');
    if (!sec || !titleEl || sec.classList.contains('hidden')) return;

    var titleTxt = (titleEl.textContent || '').trim();
    if (!titleTxt || titleTxt === lastInlineTitle) return;
    lastInlineTitle = titleTxt;

    var panel = document.getElementById('kt-inline-prematch');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'kt-inline-prematch';
      panel.className = 'border-t border-slate-800 bg-slate-950/90 p-4';
      sec.appendChild(panel);
    }

    var ev = findEventByText(titleTxt);
    if (!ev) {
      panel.innerHTML = '<div class="text-center text-xs text-slate-400 py-2">📺 ' + esc(titleTxt) + ' — في حالة توقف البث جرب تحديث الصفحة أو اختيار سيرفر آخر.</div>';
      return;
    }

    panel.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">جاري تحميل الخطة والتشكيلة ومعلومات المباراة...</div>';
    try {
      var summary = await fetchSummary(ev.leagueId, ev.id);
      mountHub(panel, ev, summary, { showWatchBtn: false });
    } catch (e) {
      panel.innerHTML = '';
    }
  }

  function findCardRoot(el, container) {
    var cur = el;
    var best = null;
    while (cur && cur !== container && cur !== document.body) {
      var cls = typeof cur.className === 'string' ? cur.className : '';
      if (cls.indexOf('rounded-2xl') !== -1 || cls.indexOf('rounded-xl') !== -1 || cur.hasAttribute('onclick')) {
        best = cur;
        if (cur.hasAttribute('onclick') || cls.indexOf('border') !== -1) break;
      }
      cur = cur.parentElement;
    }
    return best || el.parentElement;
  }

  function addButtonsToCards() {
    if (isAddingBtns) return;
    var container = document.getElementById('matches-list');
    if (!container) return;
    isAddingBtns = true;
    try {
      var leaves = container.querySelectorAll('span, div, p');
      var seen = new Set();
      for (var i = 0; i < leaves.length; i++) {
        var el = leaves[i];
        if (el.children.length > 0) continue;
        if (el.closest('.kt-cd-slot') || el.closest('.kt-pm-wrap')) continue;
        var txt = (el.textContent || '').trim();
        if (!/^VS$/i.test(txt) && !/^\d{1,2}:\d{2}$/.test(txt)) continue;

        var card = findCardRoot(el, container);
        if (!card || seen.has(card) || card.querySelector('.kt-pm-wrap')) continue;
        seen.add(card);

        var anchorParent = el.parentElement;
        if (!anchorParent) continue;

        var wrap = document.createElement('div');
        wrap.className = 'kt-pm-wrap';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kt-pm-card-btn';
        btn.textContent = '📋 الخطة والمعلومات';
        (function(targetCard) {
          btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            var cardTxt = targetCard.textContent || '';
            var ev = findEventByText(cardTxt);
            if (ev) {
              window.ktOpenPreMatch(ev.leagueId, ev.id, ev.homeName + ' vs ' + ev.awayName);
            } else {
              window.ktOpenPreMatch(null, null, cardTxt.replace(/📋 الخطة والمعلومات|⏳.*|🔥.*|✓.*/g, '').trim().slice(0, 60));
            }
          };
        })(card);
        wrap.appendChild(btn);
        anchorParent.appendChild(wrap);
      }
    } finally {
      isAddingBtns = false;
    }
  }

  setInterval(function() {
    if (!countdownTargets.length) return;
    var now = Date.now();
    countdownTargets = countdownTargets.filter(function(t) {
      var el = document.getElementById(t.id);
      if (!el) return false;
      var diff = Math.floor((t.kickoffMs - now) / 1000);
      el.textContent = diff > 0 ? fmtCountdown(diff) : 'LIVE';
      return true;
    });
  }, 1000);

  function init() {
    var list = document.getElementById('matches-list');
    if (list) {
      var obs = new MutationObserver(function(muts) {
        if (isAddingBtns) return;
        for (var i = 0; i < muts.length; i++) {
          var t = muts[i].target;
          if (t && t.closest && (t.closest('.kt-cd-slot') || t.closest('.kt-pm-wrap'))) continue;
          if (muts[i].addedNodes && muts[i].addedNodes.length) {
            clearTimeout(btnDebounce);
            btnDebounce = setTimeout(addButtonsToCards, 180);
            break;
          }
        }
      });
      obs.observe(list, { childList: true, subtree: true });
      setTimeout(addButtonsToCards, 300);
    }

    var pSec = document.getElementById('player-section');
    var pTitle = document.getElementById('player-title');
    if (pSec && pTitle) {
      var pObs = new MutationObserver(function() { syncInlinePlayerPanel(); });
      pObs.observe(pSec, { attributes: true, attributeFilter: ['class'] });
      pObs.observe(pTitle, { childList: true, characterData: true, subtree: true });
    }

    window.addEventListener('kt-ticker-updated', function() {
      lastInlineTitle = '';
      syncInlinePlayerPanel();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
