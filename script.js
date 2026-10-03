(function () {
  'use strict';

  var DISKS = 7;
  var MIN_MOVES = Math.pow(2, DISKS) - 1; // 127
  var KEY_BEST = 'Tower-of-Hanoi:best';
  var KEY_STATE = 'Tower-of-Hanoi:state';

  var board = document.getElementById('board');
  var movesEl = document.getElementById('moves');
  var bestEl = document.getElementById('best');
  var starsEl = document.getElementById('stars');
  var toastEl = document.getElementById('toast');
  var overlay = document.getElementById('overlay');
  var dlgStars = document.getElementById('dlg-stars');
  var dlgTitle = document.getElementById('dlg-title');
  var dlgText = document.getElementById('dlg-text');
  var dlgOk = document.getElementById('dlg-ok');
  var dlgCancel = document.getElementById('dlg-cancel');
  document.getElementById('min-moves').textContent = MIN_MOVES;

  // ---------- storage ----------
  function load(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) { /* storage unavailable */ }
  }

  // ---------- state ----------
  var towers, moves, won, best;
  var held = -1;      // peg index whose top disk is lifted (tap mode), -1 = none
  var press = null;   // active pointer press / drag
  var geom = null;
  var diskEls = {};
  var zoneEls = [];
  var pegEls = [];
  var baseEl;
  var dialogAction = null;
  var toastTimer = 0;

  best = parseInt(load(KEY_BEST), 10);
  if (!(best > 0)) best = 0;

  function freshTowers() {
    var t = [[], [], []];
    for (var v = DISKS; v >= 1; v--) t[0].push(v);
    return t;
  }

  function validState(s) {
    if (!s || !Array.isArray(s.towers) || s.towers.length !== 3 || typeof s.moves !== 'number') return false;
    var seen = {};
    var count = 0;
    for (var p = 0; p < 3; p++) {
      var t = s.towers[p];
      if (!Array.isArray(t)) return false;
      for (var i = 0; i < t.length; i++) {
        var v = t[i];
        if (typeof v !== 'number' || v < 1 || v > DISKS || seen[v]) return false;
        if (i > 0 && t[i - 1] < v) return false;
        seen[v] = true;
        count++;
      }
    }
    return count === DISKS;
  }

  function saveState() {
    if (won || moves === 0) save(KEY_STATE, null);
    else save(KEY_STATE, JSON.stringify({ towers: towers, moves: moves }));
  }

  function rating(m) {
    if (m <= MIN_MOVES) return 3;
    if (m <= 160) return 2;
    if (m <= 228) return 1;
    return 0;
  }

  // ---------- DOM ----------
  function build() {
    for (var p = 0; p < 3; p++) {
      var z = document.createElement('div');
      z.className = 'peg-zone';
      board.appendChild(z);
      zoneEls.push(z);
    }
    baseEl = document.createElement('div');
    baseEl.className = 'base';
    board.appendChild(baseEl);
    for (p = 0; p < 3; p++) {
      var peg = document.createElement('div');
      peg.className = 'peg';
      board.appendChild(peg);
      pegEls.push(peg);
    }
    for (var v = 1; v <= DISKS; v++) {
      var d = document.createElement('div');
      d.className = 'disk disk-' + v;
      board.appendChild(d);
      diskEls[v] = d;
    }
  }

  function computeGeom() {
    var W = board.clientWidth;
    var H = board.clientHeight;
    var colW = W / 3;
    var maxW = Math.max(30, Math.min(colW - 10, colW * 0.94));
    var minW = maxW * 0.32;
    var baseH = Math.max(10, Math.min(22, H * 0.035));
    // vertical budget: 7 disks + peg tip (0.9) + lift area (1.9) + margins
    var diskH = Math.min((H - baseH - 20) / (DISKS + 2.9), maxW * 0.3, 64);
    diskH = Math.max(8, diskH);
    var pegH = diskH * (DISKS + 0.9);
    var comp = diskH * 1.9 + pegH + baseH;
    var top = Math.max(6, (H - comp) * 0.62);
    var baseTop = top + diskH * 1.9 + pegH;
    var pegW = Math.max(6, Math.min(18, diskH * 0.32));
    geom = {
      W: W, H: H, colW: colW, maxW: maxW, minW: minW, diskH: diskH,
      baseTop: baseTop, baseH: baseH, pegH: pegH, pegW: pegW,
      liftY: baseTop - pegH - diskH * 1.45
    };
  }

  function diskWidth(v) {
    return geom.minW + (geom.maxW - geom.minW) * (v - 1) / (DISKS - 1);
  }

  function pegCenter(p) {
    return geom.colW * (p + 0.5);
  }

  function placeDisk(v, cx, top) {
    var el = diskEls[v];
    var w = diskWidth(v);
    el.style.width = w + 'px';
    el.style.height = (geom.diskH - 2) + 'px';
    el.style.transform = 'translate(' + (cx - w / 2) + 'px,' + top + 'px)';
  }

  function layout() {
    var g = geom;
    baseEl.style.left = '8px';
    baseEl.style.width = (g.W - 16) + 'px';
    baseEl.style.top = g.baseTop + 'px';
    baseEl.style.height = g.baseH + 'px';
    for (var p = 0; p < 3; p++) {
      var cx = pegCenter(p);
      var peg = pegEls[p];
      peg.style.left = (cx - g.pegW / 2) + 'px';
      peg.style.width = g.pegW + 'px';
      peg.style.top = (g.baseTop - g.pegH) + 'px';
      peg.style.height = g.pegH + 'px';
      var z = zoneEls[p];
      z.style.left = (cx - g.colW / 2 + 4) + 'px';
      z.style.width = (g.colW - 8) + 'px';
      z.style.top = Math.max(0, g.liftY - 8) + 'px';
      z.style.height = (g.baseTop + g.baseH + 8 - Math.max(0, g.liftY - 8)) + 'px';
      var t = towers[p];
      for (var i = 0; i < t.length; i++) {
        var v = t[i];
        if (press && press.disk === v && press.dragging) continue;
        if (i === t.length - 1 && (held === p || (press && press.disk === v))) {
          diskEls[v].classList.add('held');
          placeDisk(v, cx, g.liftY);
        } else {
          diskEls[v].classList.remove('held');
          placeDisk(v, cx, g.baseTop - (i + 1) * g.diskH + 1);
        }
      }
    }
  }

  function relayout() {
    computeGeom();
    for (var v = 1; v <= DISKS; v++) diskEls[v].style.transition = 'none';
    layout();
    if (press && press.dragging) dragTo(press.x, press.y);
    void board.offsetWidth;
    for (v = 1; v <= DISKS; v++) diskEls[v].style.transition = '';
  }

  function updateHud() {
    movesEl.textContent = moves;
    bestEl.textContent = best ? best : '–';
    var r = rating(moves);
    var stars = starsEl.children;
    for (var i = 0; i < 3; i++) stars[i].classList.toggle('on', i < r);
    starsEl.setAttribute('aria-label', 'Rating: ' + r + (r === 1 ? ' star' : ' stars'));
  }

  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 1600);
  }

  function clearZones() {
    for (var p = 0; p < 3; p++) zoneEls[p].classList.remove('target', 'bad');
  }

  function canDrop(disk, p) {
    var t = towers[p];
    return t.length === 0 || t[t.length - 1] > disk;
  }

  function topDisk(p) {
    var t = towers[p];
    return t.length ? t[t.length - 1] : 0;
  }

  function highlight(p, disk, from) {
    clearZones();
    if (p < 0 || p === from) return;
    zoneEls[p].classList.add(canDrop(disk, p) ? 'target' : 'bad');
  }

  function shake(v) {
    var el = diskEls[v];
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  // ---------- game ----------
  function newGame() {
    towers = freshTowers();
    moves = 0;
    won = false;
    held = -1;
    press = null;
    clearZones();
    saveState();
    updateHud();
    layout();
  }

  function moveDisk(from, to) {
    var v = towers[from].pop();
    towers[to].push(v);
    moves++;
    held = -1;
    if (towers[1].length === DISKS || towers[2].length === DISKS) won = true;
    saveState();
    updateHud();
    layout();
    if (won) {
      var isBest = !best || moves < best;
      if (isBest) {
        best = moves;
        save(KEY_BEST, String(best));
        updateHud();
      }
      setTimeout(function () { showWin(isBest); }, 450);
    }
  }

  function rejectMove(v) {
    shake(v);
    toast('A bigger disk can’t go on a smaller one');
  }

  // tap/click/keyboard selection of a peg
  function selectPeg(p) {
    if (won) { showWin(false); return; }
    if (held >= 0) {
      var v = topDisk(held);
      if (p === held) {
        held = -1;
        layout();
      } else if (canDrop(v, p)) {
        moveDisk(held, p);
      } else {
        rejectMove(v);
      }
      clearZones();
      return;
    }
    if (!towers[p].length) return;
    held = p;
    layout();
  }

  // ---------- pointer input ----------
  function localPoint(e) {
    var r = board.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function pegAt(x) {
    if (!geom) return -1;
    return Math.max(0, Math.min(2, Math.floor(x / geom.colW)));
  }

  function dragTo(x, y) {
    var v = press.disk;
    var w = diskWidth(v);
    var el = diskEls[v];
    var tx = Math.max(-w / 2, Math.min(geom.W - w / 2, x - w / 2));
    var ty = Math.max(-geom.diskH / 2, Math.min(geom.H - geom.diskH, y - geom.diskH * 0.6));
    el.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
  }

  board.addEventListener('pointerdown', function (e) {
    if (press || !overlay.classList.contains('hidden')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    var pt = localPoint(e);
    var p = pegAt(pt.x);
    if (won) { showWin(false); return; }
    if (held >= 0 && p !== held) {
      selectPeg(p);
      return;
    }
    if (!towers[p].length) return;
    press = {
      id: e.pointerId, from: p, disk: topDisk(p), sx: pt.x, sy: pt.y,
      x: pt.x, y: pt.y, dragging: false, wasHeld: held === p
    };
    held = -1;
    try { board.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    layout();
  });

  board.addEventListener('pointermove', function (e) {
    var pt = localPoint(e);
    if (!press) {
      if (held >= 0 && e.pointerType === 'mouse') highlight(pegAt(pt.x), topDisk(held), held);
      return;
    }
    if (e.pointerId !== press.id) return;
    press.x = pt.x;
    press.y = pt.y;
    if (!press.dragging) {
      var dx = pt.x - press.sx, dy = pt.y - press.sy;
      if (dx * dx + dy * dy < 100) return;
      press.dragging = true;
      diskEls[press.disk].classList.add('dragging');
    }
    dragTo(pt.x, pt.y);
    highlight(pegAt(pt.x), press.disk, press.from);
  });

  function endPress(e, cancelled) {
    if (!press || e.pointerId !== press.id) return;
    var pr = press;
    press = null;
    diskEls[pr.disk].classList.remove('dragging');
    clearZones();
    if (cancelled) { layout(); return; }
    if (pr.dragging) {
      var to = pegAt(localPoint(e).x);
      if (to !== pr.from && canDrop(pr.disk, to)) {
        moveDisk(pr.from, to);
      } else {
        layout();
        if (to !== pr.from) rejectMove(pr.disk);
      }
    } else {
      // a tap: lift the disk (or put it back if it was already lifted)
      held = pr.wasHeld ? -1 : pr.from;
      layout();
    }
  }

  board.addEventListener('pointerup', function (e) { endPress(e, false); });
  board.addEventListener('pointercancel', function (e) { endPress(e, true); });
  board.addEventListener('lostpointercapture', function (e) {
    if (press && e.pointerId === press.id) endPress(e, true);
  });
  board.addEventListener('pointerleave', function (e) {
    if (!press && e.pointerType === 'mouse') clearZones();
  });
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------- keyboard ----------
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('hidden')) {
      if (e.key === 'Escape' && !dlgCancel.classList.contains('hidden')) closeDialog();
      return;
    }
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      if (!press) selectPeg(parseInt(e.key, 10) - 1);
    } else if (e.key === 'Escape' && held >= 0) {
      held = -1;
      layout();
    } else if (e.key === 'r' || e.key === 'R') {
      askRestart();
    }
  });

  // ---------- dialogs ----------
  function openDialog(opts) {
    dlgStars.innerHTML = '';
    if (typeof opts.stars === 'number') {
      for (var i = 0; i < 3; i++) {
        var s = document.createElement('span');
        s.className = i < opts.stars ? 'on' : 'off';
        s.textContent = '★';
        dlgStars.appendChild(s);
      }
    }
    dlgTitle.textContent = opts.title;
    dlgText.textContent = opts.text;
    dlgOk.textContent = opts.ok;
    dlgCancel.textContent = opts.cancel || 'Cancel';
    dlgCancel.classList.toggle('hidden', !opts.cancel);
    dialogAction = opts.action;
    overlay.classList.remove('hidden');
    dlgOk.focus();
  }

  function closeDialog() {
    overlay.classList.add('hidden');
    dialogAction = null;
  }

  dlgOk.addEventListener('click', function () {
    var a = dialogAction;
    closeDialog();
    if (a) a();
  });
  dlgCancel.addEventListener('click', closeDialog);

  function showWin(isBest) {
    var r = rating(moves);
    var text;
    if (moves <= MIN_MOVES) text = 'A perfect solution in ' + moves + ' moves!';
    else text = 'You finished in ' + moves + ' moves. The minimum is ' + MIN_MOVES + '.';
    if (isBest && best) text += ' New best score!';
    openDialog({ stars: r, title: 'You solved it!', text: text, ok: 'Play again', cancel: 'View board', action: newGame });
  }

  function askRestart() {
    if (moves === 0 || won) { closeDialog(); newGame(); return; }
    openDialog({
      title: 'Restart the puzzle?',
      text: 'Your current progress (' + moves + (moves === 1 ? ' move' : ' moves') + ') will be lost.',
      ok: 'Restart', cancel: 'Cancel', action: newGame
    });
  }

  document.getElementById('restart-btn').addEventListener('click', askRestart);

  // ---------- start ----------
  build();
  var stored = null;
  try { stored = JSON.parse(load(KEY_STATE)); } catch (e) { stored = null; }
  if (validState(stored) && stored.towers[1].length !== DISKS && stored.towers[2].length !== DISKS) {
    towers = stored.towers;
    moves = stored.moves;
    won = false;
  } else {
    towers = freshTowers();
    moves = 0;
    won = false;
  }
  computeGeom();
  updateHud();
  relayout();

  if (window.ResizeObserver) new ResizeObserver(relayout).observe(board);
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', function () { setTimeout(relayout, 200); });

  setTimeout(function () {
    if (moves === 0) toast('Tap a peg or drag a disk to move it', 3200);
    else toast('Welcome back! Your puzzle was saved.', 2400);
  }, 400);
})();
