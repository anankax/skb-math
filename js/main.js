/**
 * skb-math 入口模块
 * 初始化序列、事件绑定、启动应用
 */
(function() {
  'use strict';

  // ====== 密码配置 ======
  // 明文回退（仅在 SubtleCrypto 不可用时使用）
  SKB.EP_FALLBACK = 'anan001014';
  // SHA-256 哈希（优先使用）。'anan001014' 的 SHA-256:
  SKB.EP_HASH = null; // 推迟到初始化后设置

  // 预计算哈希（使用 SubtleCrypto）
  function initPasswordHash() {
    var enc = new TextEncoder();
    return window.crypto.subtle.digest('SHA-256', enc.encode(SKB.EP_FALLBACK)).then(function(hashBuffer) {
      var hashArray = Array.from(new Uint8Array(hashBuffer));
      SKB.EP_HASH = hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    }).catch(function() {
      // SubtleCrypto 不可用，保持 EP_HASH 为 null，使用明文回退
      SKB.EP_HASH = null;
    });
  }

  // ====== 设置页眉横幅 ======
  function setHeader() {
    var hb = document.getElementById('headerBanner');
    if (!hb) return;
    if (SKB.IMG_KEYS['header']) {
      var img = document.createElement('img');
      img.src = SKB.IMG_KEYS['header'];
      img.alt = '';
      img.className = 'header-full-img';
      img.loading = 'eager';
      hb.insertBefore(img, hb.firstChild);
    }
  }

  // ====== 设置首页背景 ======
  function initHomePage() {
    var homeImg = document.getElementById('homeBgImg');
    if (homeImg && SKB.IMG_KEYS['home_bg']) {
      homeImg.src = SKB.IMG_KEYS['home_bg'];
    }
    if (window.location.hash === '#main') {
      SKB.ui.enterSite();
    }
  }

  // ====== 应用启动 ======
  function boot() {
    // 加载数据
    SKB.loadGithubToken();
    SKB.loadData();
    SKB.validateChapterData();
    SKB.diary.loadData();

    // 渲染
    setHeader();
    initHomePage();
    SKB.render.renderNav();
    SKB.render.renderDiaryList();

    // 从云端加载
    SKB.loadFromCloud(true);

    // 迁移旧 base64 图片到 IndexedDB
    SKB.migrateBase64Images().then(function() {
      console.log('[SKB] 图片迁移检查完成');
    }).catch(function(err) {
      console.warn('[SKB] 图片迁移失败:', err);
    });

    // 键盘快捷键 Ctrl+S 保存
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        SKB.saveData();
      }
    });

    // 离开页面前保存
    window.addEventListener('beforeunload', function() {
      localStorage.setItem(SKB.LS_KEY, JSON.stringify(SKB.getChapterData()));
    });

    console.log('[SKB] 应用已启动');
  }

  // ====== 初始化密码哈希后启动 ======
  initPasswordHash().then(function() {
    boot();
  }).catch(function() {
    boot(); // 即使哈希失败也启动
  });

})();
