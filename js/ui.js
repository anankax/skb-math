/**
 * skb-math UI 模块
 * 界面交互：侧栏、编辑模式、Toast、灯箱、首页
 */
var SKB = window.SKB || {};

(function() {
  'use strict';

  // ====== 内部状态访问器 ======
  var _isEditMode = false;
  var _currentChapter = null;
  var _currentDiaryId = null;
  var _isPureMode = false;

  SKB.getEditMode = function() { return _isEditMode; };
  SKB.getCurrentChapter = function() { return _currentChapter; };
  SKB.getCurrentDiaryId = function() { return _currentDiaryId; };
  SKB.setCurrentDiaryId = function(id) { _currentDiaryId = id; };

  // ====== 公开 API ======
  SKB.ui = {};

  // ====== Toast ======
  SKB.ui.showToast = function(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2000);
  };

  // ====== 侧栏 ======
  SKB.ui.openSidebar = function() {
    var sb = document.getElementById('sidebar');
    var mask = document.getElementById('overlayMask');
    if (sb) sb.classList.add('open');
    if (mask) mask.classList.add('show');
  };

  SKB.ui.closeSidebar = function() {
    var sb = document.getElementById('sidebar');
    var mask = document.getElementById('overlayMask');
    if (sb) sb.classList.remove('open');
    if (mask) mask.classList.remove('show');
  };

  SKB.ui.selAndClose = function(ch, item) {
    SKB.ui.selectChapter(ch, item);
    if (window.innerWidth <= 768) SKB.ui.closeSidebar();
  };

  // 侧栏触屏拖动
  (function() {
    var sb, ox, oy, dx, dragging = false, touchStarted = false;
    document.addEventListener('touchstart', function(e) {
      sb = document.getElementById('sidebar');
      if (!sb || !sb.classList.contains('open')) return;
      var t = e.touches[0];
      ox = t.clientX; oy = t.clientY;
      if (ox > 60) return;
      touchStarted = true; dragging = false;
    }, { passive: true });
    document.addEventListener('touchmove', function(e) {
      if (!touchStarted) return;
      var t = e.touches[0]; dx = t.clientX - ox;
      if (Math.abs(dx) > 8) dragging = true;
      if (dragging && dx < -20) SKB.ui.closeSidebar();
    }, { passive: true });
    document.addEventListener('touchend', function() { touchStarted = false; dragging = false; });
  })();

  // ====== 编辑模式 ======
  SKB.ui.toggleEditMode = function() {
    if (_isEditMode) {
      // 退出编辑：刷新编辑器内容
      document.querySelectorAll('.editor-area').forEach(function(el) {
        var f = el.dataset.field, chId = el.dataset.chid || (_currentChapter ? _currentChapter.id : '');
        if (f && chId) SKB.editor.autoSaveCh(chId, f, el.innerHTML);
      });
      localStorage.setItem(SKB.LS_KEY, JSON.stringify(SKB.getChapterData()));
      _isEditMode = false;
      var badge = document.getElementById('modeBadge');
      var toggleBtn = document.getElementById('btnEditToggle');
      var saveBtn = document.getElementById('btnSave');
      if (badge) { badge.className = 'mode-tag view'; badge.textContent = '只读'; }
      if (toggleBtn) toggleBtn.textContent = '开启编辑';
      if (saveBtn) saveBtn.style.display = 'none';
      if (_currentChapter) SKB.render.renderContent(_currentChapter);
    } else {
      var overlay = document.getElementById('pwdOverlay');
      var input = document.getElementById('pwdInput');
      if (overlay) overlay.classList.remove('hidden');
      if (input) { input.value = ''; input.focus(); }
    }
  };

  SKB.ui.checkPwd = function() {
    var input = document.getElementById('pwdInput');
    var password = input ? input.value : '';

    // 如果设置了 EP_HASH，使用哈希比对
    if (SKB.EP_HASH) {
      var enc = new TextEncoder();
      window.crypto.subtle.digest('SHA-256', enc.encode(password)).then(function(hashBuffer) {
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        var hashHex = hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
        if (hashHex === SKB.EP_HASH) {
          SKB.ui._enableEditMode();
        } else {
          SKB.ui.showToast('密码错误');
        }
      }).catch(function() {
        // SubtleCrypto 不可用时回退
        if (password === SKB.EP_FALLBACK) SKB.ui._enableEditMode();
        else SKB.ui.showToast('密码错误');
      });
    } else {
      // 回退：明文比对
      if (password === SKB.EP_FALLBACK) {
        SKB.ui._enableEditMode();
      } else {
        SKB.ui.showToast('密码错误');
      }
    }
  };

  SKB.ui._enableEditMode = function() {
    _isEditMode = true;
    var overlay = document.getElementById('pwdOverlay');
    var badge = document.getElementById('modeBadge');
    var toggleBtn = document.getElementById('btnEditToggle');
    var saveBtn = document.getElementById('btnSave');
    if (overlay) overlay.classList.add('hidden');
    if (badge) { badge.className = 'mode-tag edit'; badge.textContent = '编辑中'; }
    if (toggleBtn) toggleBtn.textContent = '退出编辑';
    if (saveBtn) saveBtn.style.display = '';
    if (_currentChapter) SKB.render.renderContent(_currentChapter);
    SKB.ui.showToast('编辑模式已开启');
  };

  // ====== 章节选择 ======
  SKB.ui.selectChapter = function(ch, item) {
    _currentChapter = ch;
    _currentDiaryId = null;

    document.querySelectorAll('.chapter-item.active').forEach(function(el) { el.classList.remove('active'); });
    if (item) item.classList.add('active');

    var title = document.getElementById('currentTitle');
    if (title) title.textContent = '第' + ch.num + '章 · ' + ch.name;

    // 设置背景
    var bgKey = SKB.render.getChapterBgKey(ch.id);
    var bgLayer = document.getElementById('bgLayer');
    if (bgLayer && SKB.IMG_KEYS[bgKey]) {
      bgLayer.style.backgroundImage = 'url(' + SKB.IMG_KEYS[bgKey] + ')';
    }

    // 确保章节数据存在
    var chapterData = SKB.getChapterData();
    if (!chapterData[ch.id]) {
      chapterData[ch.id] = { knowledge: '', competency: '', mistakes: '', kax: '', lessonPlan: '', homework: '', images: [], footerImgs: [] };
    }

    SKB.render.renderContent(ch);
  };

  // ====== 首页 ======
  SKB.ui.enterSite = function() {
    var homePage = document.getElementById('homePage');
    var appContainer = document.getElementById('appContainer');
    var headerBanner = document.getElementById('headerBanner');
    var bgLayer = document.getElementById('bgLayer');
    var pureBtn = document.getElementById('pureBtn');

    if (homePage) homePage.classList.add('hidden');
    if (appContainer) appContainer.style.display = 'flex';
    if (headerBanner) headerBanner.style.display = '';
    if (bgLayer) bgLayer.style.display = '';
    if (pureBtn) pureBtn.style.display = '';
  };

  SKB.ui.goHome = function() {
    var homePage = document.getElementById('homePage');
    if (homePage) {
      homePage.classList.remove('hidden');
    }
    _currentChapter = null;
    _currentDiaryId = null;
  };

  // ====== 纯净模式 ======
  SKB.ui.togglePureMode = function() {
    _isPureMode = !_isPureMode;
    var app = document.getElementById('appContainer');
    var bg = document.getElementById('bgLayer');
    var btn = document.getElementById('pureBtn');

    if (_isPureMode) {
      if (app) app.classList.add('pure-mode');
      if (bg) bg.classList.add('pure');
      if (btn) { btn.classList.add('active'); btn.title = '返回章节内容'; }
    } else {
      if (app) app.classList.remove('pure-mode');
      if (bg) bg.classList.remove('pure');
      if (btn) { btn.classList.remove('active'); btn.title = '纯净欣赏背景'; }
    }
  };

  // ====== 灯箱 ======
  SKB.ui.openLb = function(src) {
    var lb = document.getElementById('lightbox');
    var img = document.getElementById('lightboxImg');
    if (lb && img) {
      img.src = src;
      lb.classList.add('show');
    }
  };

  SKB.ui.openLbByRef = function(ref) {
    // 支持 dataUrl 或 IDB id
    if (!ref) return;
    if (ref.indexOf('data:image/') === 0) {
      SKB.ui.openLb(ref);
    } else {
      SKB.resolveImageRef(ref).then(function(dataUrl) {
        if (dataUrl) SKB.ui.openLb(dataUrl);
      });
    }
  };

  SKB.ui.openLbById = function(imgId) {
    if (!imgId) return;
    SKB.resolveImageRef(imgId).then(function(dataUrl) {
      if (dataUrl) SKB.ui.openLb(dataUrl);
    });
  };

  // 灯箱关闭
  document.addEventListener('click', function(e) {
    if (e.target.id === 'lightbox') {
      document.getElementById('lightbox').classList.remove('show');
    }
  });

})();
