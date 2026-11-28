(function() {
  if (!document.getElementById('kt-cd-css')) {
    var st = document.createElement('style');
    st.id = 'kt-cd-css';
    st.textContent =
      '.kt-cd-slot{margin-top:6px;display:flex;justify-content:center;align-items:center;}' +
      '.kt-cd-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:700;white-space:nowrap;line-height:1.4;}' +
      '.kt-cd-pre{background:rgba(15,23,42,.95);color:#34d399;border:1px solid rgba(16,185,129,.35);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;direction:ltr;}' +
      '.kt-cd-soon{background:rgba(245,158,11,.18);color:#fbbf24;border:1px solid rgba(245,158,11,.45);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;direction:ltr;}' +
      '.kt-cd-live{background:rgba(239,68,68,.2);color:#f87171;border:1px solid rgba(239,68,68,.45);font-weight:800;}' +
      '.kt-cd-post{background:#1e293b;color:#94a3b8;border:1px solid #334155;}' +
      '.kt-cd-dot{width:6px;height:6px;border-radius:9999px;background:#ef4444;display:inline-block;}';
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
    'rayo': 'rayo vallecano'
  };

  var trackedCards = [];
  var isWorking = false;
  var debounceTimer = null;

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function teamInCard(cardNorm, espnName) {
    var t = norm(espnName);
    if (!t) return false;
    if (cardNorm.indexOf(t) !== -1) return true;
    if (ALIASES[t] && cardNorm.indexOf(ALIASES[t]) !== -1) return true;
    var words = t.split(' ').filter(function(w) { return w.length >= 4 && !STOP_WORDS[w]; });
    for (var i = 0; i < words.length; i++) {
      if (cardNorm.indexOf(words[i]) !== -1) return true;
    }
    return false;
  }

  function findEspnMatch(cardNorm) {
    var events = window.ktTodayEvents || [];
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (teamInCard(cardNorm, ev.homeName) && teamInCard(cardNorm, ev.awayName)) return ev;
    }
    return null;
  }

  function parseLocalTime(hhmm) {
    var m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(m[1], 10), parseInt(m[2], 10), 0, 0).getTime();
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtCountdown(sec) {
    return pad2(Math.floor(sec / 3600)) + ':' + pad2(Math.floor((sec % 3600) / 60)) + ':' + pad2(sec % 60);
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

  function enhanceCards() {
    if (isWorking) return;
    var container = document.getElementById('matches-list');
    if (!container) return;

    isWorking = true;
    try {
      // Drop detached cards
      trackedCards = trackedCards.filter(function(item) { return document.body.contains(item.card); });

      var leaves = container.querySelectorAll('span, div, p');
      var seen = new Set(trackedCards.map(function(x) { return x.card; }));

      for (var i = 0; i < leaves.length; i++) {
        var el = leaves[i];
        if (el.children.length > 0) continue;
        if (el.closest('.kt-cd-slot')) continue;

        var txt = (el.textContent || '').trim();
        if (!/^VS$/i.test(txt) && !/^\d{1,2}:\d{2}$/.test(txt)) continue;

        var card = findCardRoot(el, container);
        if (!card || seen.has(card) || card.querySelector('.kt-cd-slot')) continue;
        seen.add(card);

        var timeStr = '';
        var vsEl = null;
        var inner = card.querySelectorAll('span, div, p');
        for (var j = 0; j < inner.length; j++) {
          var lf = inner[j];
          if (lf.children.length > 0) continue;
          var lt = (lf.textContent || '').trim();
          if (!timeStr && /^\d{1,2}:\d{2}$/.test(lt)) timeStr = lt;
          if (!vsEl && /^VS$/i.test(lt)) vsEl = lf;
        }

        var anchorParent = (vsEl && vsEl.parentElement) ? vsEl.parentElement : el.parentElement;
        if (!anchorParent) continue;

        var slot = document.createElement('div');
        slot.className = 'kt-cd-slot';
        var badge = document.createElement('span');
        badge.className = 'kt-cd-badge kt-cd-pre';
        var txtNode = document.createTextNode('');
        badge.appendChild(txtNode);
        slot.appendChild(badge);
        anchorParent.appendChild(slot);

        trackedCards.push({
          card: card,
          badge: badge,
          txtNode: txtNode,
          vsEl: vsEl,
          timeStr: timeStr,
          cardNorm: norm(card.textContent),
          lastState: ''
        });
      }
    } finally {
      isWorking = false;
    }

    updateAllCountdowns();
  }

  function updateAllCountdowns() {
    if (!trackedCards.length) return;
    var now = Date.now();

    for (var i = 0; i < trackedCards.length; i++) {
      var item = trackedCards[i];
      if (!document.body.contains(item.card)) continue;

      var ev = findEspnMatch(item.cardNorm);
      var kickoffMs = (ev && ev.date) ? new Date(ev.date).getTime() : parseLocalTime(item.timeStr);

      var state = 'pre';
      if (ev && ev.state) {
        state = ev.state;
      } else if (kickoffMs) {
        var elapsedMin = (now - kickoffMs) / 60000;
        if (elapsedMin >= 115) state = 'post';
        else if (elapsedMin >= 0) state = 'in';
        else state = 'pre';
      }

      var nextCls = 'kt-cd-badge kt-cd-pre';
      var nextTxt = '';
      var stateKey = state;

      if (state === 'post') {
        nextCls = 'kt-cd-badge kt-cd-post';
        nextTxt = '✓ انتهت المباراة';
        if (item.lastState !== 'post') {
          item.card.style.opacity = '0.72';
          item.card.style.boxShadow = '';
        }
        if (item.vsEl && ev) {
          var ftScore = ev.homeScore + ' - ' + ev.awayScore;
          if (item.vsEl.textContent !== ftScore) item.vsEl.textContent = ftScore;
        }
      } else if (state === 'in') {
        nextCls = 'kt-cd-badge kt-cd-live';
        nextTxt = (ev && (ev.detail || ev.clock)) ? ('● مباشر • ' + (ev.detail || ev.clock)) : '● مباشر الآن';
        if (item.lastState !== 'in') {
          item.card.style.opacity = '1';
          item.card.style.boxShadow = '0 0 0 1px rgba(239,68,68,0.45)';
        }
        if (item.vsEl && ev) {
          var liveScore = ev.homeScore + ' - ' + ev.awayScore;
          if (item.vsEl.textContent !== liveScore) item.vsEl.textContent = liveScore;
        }
      } else if (kickoffMs && kickoffMs > now) {
        var diffSec = Math.floor((kickoffMs - now) / 1000);
        if (diffSec <= 900) {
          stateKey = 'soon';
          nextCls = 'kt-cd-badge kt-cd-soon';
          nextTxt = '🔥 ' + fmtCountdown(diffSec);
        } else {
          stateKey = 'pre';
          nextCls = 'kt-cd-badge kt-cd-pre';
          nextTxt = '⏳ ' + fmtCountdown(diffSec);
        }
        if (item.lastState !== stateKey) {
          item.card.style.opacity = '1';
          item.card.style.boxShadow = '';
        }
      }

      if (item.lastState !== stateKey) {
        item.badge.className = nextCls;
        item.lastState = stateKey;
      }
      if (item.txtNode.nodeValue !== nextTxt) {
        item.txtNode.nodeValue = nextTxt;
      }
    }
  }

  function init() {
    var container = document.getElementById('matches-list');
    if (container) {
      var obs = new MutationObserver(function(muts) {
        if (isWorking) return;
        for (var i = 0; i < muts.length; i++) {
          var t = muts[i].target;
          if (t && t.closest && t.closest('.kt-cd-slot')) continue;
          if (muts[i].addedNodes && muts[i].addedNodes.length) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(enhanceCards, 120);
            break;
          }
        }
      });
      obs.observe(container, { childList: true, subtree: true });
    }
    window.addEventListener('kt-ticker-updated', updateAllCountdowns);
    setTimeout(enhanceCards, 200);
    setInterval(updateAllCountdowns, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
