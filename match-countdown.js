(function() {
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
      if (teamInCard(cardNorm, ev.homeName) && teamInCard(cardNorm, ev.awayName)) {
        return ev;
      }
    }
    return null;
  }

  function parseLocalTime(hhmm) {
    var m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(m[1], 10), parseInt(m[2], 10), 0, 0).getTime();
  }

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function fmtCountdown(sec) {
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s);
  }

  function findCardRoot(el, container) {
    var cur = el;
    var best = null;
    while (cur && cur !== container && cur !== document.body) {
      var cls = cur.className || '';
      if (typeof cls === 'string' && (cls.indexOf('rounded-2xl') !== -1 || cls.indexOf('rounded-xl') !== -1 || cur.hasAttribute('onclick'))) {
        best = cur;
        if (cur.hasAttribute('onclick') || cls.indexOf('border') !== -1) break;
      }
      cur = cur.parentElement;
    }
    return best || el.parentElement;
  }

  function enhanceCards() {
    var container = document.getElementById('matches-list');
    if (!container) return;

    var allEls = container.querySelectorAll('span, div, p');
    var seenCards = new Set();

    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      if (el.children.length > 0) continue;
      if (el.closest('.kt-cd-slot')) continue;

      var txt = (el.textContent || '').trim();
      var isTime = /^\d{1,2}:\d{2}$/.test(txt);
      var isVs = /^VS$/i.test(txt);
      if (!isTime && !isVs) continue;

      var card = findCardRoot(el, container);
      if (!card || seenCards.has(card) || card.querySelector('.kt-cd-slot')) continue;
      seenCards.add(card);

      var centerBox = el.parentElement;
      if (!centerBox) continue;

      // Capture time string and VS element inside this card
      var timeStr = isTime ? txt : '';
      var vsEl = isVs ? el : null;
      var innerLeaves = card.querySelectorAll('span, div, p');
      for (var j = 0; j < innerLeaves.length; j++) {
        var leaf = innerLeaves[j];
        if (leaf.children.length > 0) continue;
        var lt = (leaf.textContent || '').trim();
        if (!timeStr && /^\d{1,2}:\d{2}$/.test(lt)) timeStr = lt;
        if (!vsEl && /^VS$/i.test(lt)) vsEl = leaf;
      }

      if (vsEl && !vsEl.dataset.ktOrig) {
        vsEl.dataset.ktOrig = vsEl.textContent.trim();
        vsEl.setAttribute('data-kt-vs', '1');
      }

      card.dataset.ktTime = timeStr;
      card.dataset.ktNorm = norm(card.textContent);

      var slot = document.createElement('div');
      slot.className = 'kt-cd-slot mt-1.5 flex items-center justify-center';
      centerBox.appendChild(slot);
    }

    updateAllCountdowns();
  }

  function updateAllCountdowns() {
    var slots = document.querySelectorAll('#matches-list .kt-cd-slot');
    if (!slots.length) return;
    var now = Date.now();

    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var card = findCardRoot(slot, document.getElementById('matches-list'));
      if (!card) continue;

      var ev = findEspnMatch(card.dataset.ktNorm || '');
      var kickoffMs = ev && ev.date ? new Date(ev.date).getTime() : parseLocalTime(card.dataset.ktTime);
      var vsEl = card.querySelector('[data-kt-vs="1"]');

      var state = 'pre';
      if (ev && ev.state) {
        state = ev.state; // 'pre', 'in', 'post'
      } else if (kickoffMs) {
        var elapsedMin = (now - kickoffMs) / 60000;
        if (elapsedMin >= 115) state = 'post';
        else if (elapsedMin >= 0) state = 'in';
        else state = 'pre';
      }

      if (state === 'post') {
        slot.innerHTML = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">✓ انتهت المباراة</span>';
        card.style.opacity = '0.72';
        card.style.boxShadow = '';
        if (vsEl && ev) {
          vsEl.textContent = ev.homeScore + ' - ' + ev.awayScore;
        }
      } else if (state === 'in') {
        var liveLabel = (ev && (ev.detail || ev.clock)) ? ('مباشر • ' + (ev.detail || ev.clock)) : 'مباشر الآن';
        slot.innerHTML = '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-500/20 text-red-400 border border-red-500/40 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>' + liveLabel + '</span>';
        card.style.opacity = '1';
        card.style.boxShadow = '0 0 0 1px rgba(239, 68, 68, 0.45)';
        if (vsEl && ev) {
          vsEl.textContent = ev.homeScore + ' - ' + ev.awayScore;
        }
      } else if (kickoffMs && kickoffMs > now) {
        var diffSec = Math.floor((kickoffMs - now) / 1000);
        var clockStr = fmtCountdown(diffSec);
        if (diffSec <= 900) {
          slot.innerHTML = '<span dir="ltr" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono whitespace-nowrap">🔥 ' + clockStr + '</span>';
        } else {
          slot.innerHTML = '<span dir="ltr" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800/90 text-emerald-400 border border-emerald-500/30 font-mono whitespace-nowrap">⏳ ' + clockStr + '</span>';
        }
        card.style.opacity = '1';
        card.style.boxShadow = '';
      }
    }
  }

  function init() {
    var container = document.getElementById('matches-list');
    if (container) {
      var obs = new MutationObserver(function() { enhanceCards(); });
      obs.observe(container, { childList: true, subtree: true });
    }
    window.addEventListener('kt-ticker-updated', updateAllCountdowns);
    enhanceCards();
    setInterval(updateAllCountdowns, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
