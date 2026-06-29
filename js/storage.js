/**
 * skb-math 存储模块
 * localStorage 读写 + IndexedDB 图片存储 + GitHub 云端同步
 */
var SKB = window.SKB || {};

(function() {
  'use strict';

  // ====== 内部状态 ======
  var chapterData = {};
  var githubToken = '';
  var _autoSaveTimer = null;
  var _cloudSha = null;
  var _diaryCloudSha = null;
  var _dbPromise = null;
  var _imageCache = {}; // 内存缓存：imgId → dataUrl

  // ====== 导出内部状态 ======
  SKB.getChapterData = function() { return chapterData; };
  SKB.setChapterData = function(d) { chapterData = d; };
  SKB.getGithubToken = function() { return githubToken; };
  SKB.getCloudSha = function() { return _cloudSha; };
  SKB.setCloudSha = function(s) { _cloudSha = s; };
  SKB.getDiaryCloudSha = function() { return _diaryCloudSha; };
  SKB.setDiaryCloudSha = function(s) { _diaryCloudSha = s; };

  // ====== localStorage 操作 ======
  SKB.loadData = function() {
    var s = localStorage.getItem(SKB.LS_KEY);
    if (s) {
      try { chapterData = JSON.parse(s); } catch(e) { chapterData = {}; }
    }
    SKB.updateStats();
  };

  SKB.saveData = function() {
    localStorage.setItem(SKB.LS_KEY, JSON.stringify(chapterData));
    SKB.updateStats();
    SKB.ui.showToast('已保存');
    if (githubToken) SKB.saveToCloud(true);
  };

  SKB.autoSave = function() {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(function() {
      localStorage.setItem(SKB.LS_KEY, JSON.stringify(chapterData));
      SKB.updateStats();
    }, 600);
  };

  SKB.updateStats = function() {
    var filled = 0, words = 0;
    for (var id in chapterData) {
      if (!chapterData.hasOwnProperty(id)) continue;
      var d = chapterData[id];
      var text = [d.knowledge, d.competency, d.mistakes, d.kax, d.lessonPlan, d.homework].filter(Boolean).join('');
      if (text.length > 10) filled++;
      words += text.length;
    }
    var filledEl = document.getElementById('stats-filled');
    var wordsEl = document.getElementById('stats-words');
    var pctEl = document.getElementById('progPct');
    var fillEl = document.getElementById('progFill');
    if (filledEl) filledEl.textContent = filled;
    if (wordsEl) wordsEl.textContent = Math.round(words / 1000);
    var pct = Math.round(filled / SKB.TOTAL_CHAPTERS * 100);
    if (pctEl) pctEl.textContent = pct + '%';
    if (fillEl) fillEl.style.width = pct + '%';
  };

  // ====== 数据校验 ======
  SKB.CHAPTER_FIELDS = ['knowledge', 'competency', 'mistakes', 'kax', 'lessonPlan', 'homework'];

  SKB.validateChapterData = function() {
    var repaired = 0;
    for (var chId in chapterData) {
      if (!chapterData.hasOwnProperty(chId)) continue;
      var entry = chapterData[chId];
      if (typeof entry !== 'object' || entry === null) {
        chapterData[chId] = {};
        repaired++;
        continue;
      }
      SKB.CHAPTER_FIELDS.forEach(function(f) {
        if (typeof entry[f] !== 'string') {
          entry[f] = String(entry[f] || '');
          repaired++;
        }
      });
      if (!Array.isArray(entry.images)) { entry.images = []; repaired++; }
      if (!Array.isArray(entry.footerImgs)) { entry.footerImgs = []; repaired++; }
    }
    if (repaired > 0) {
      console.warn('[SKB] 章节数据校验修复了 ' + repaired + ' 处问题');
      localStorage.setItem(SKB.LS_KEY, JSON.stringify(chapterData));
    }
  };

  SKB.validateDiaryData = function(diaryData) {
    var repaired = 0;
    if (!Array.isArray(diaryData)) return [];
    var clean = [];
    diaryData.forEach(function(entry) {
      if (typeof entry !== 'object' || entry === null) { repaired++; return; }
      var c = {
        id: typeof entry.id === 'string' ? entry.id : 'd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        date: typeof entry.date === 'string' ? entry.date : '',
        title: typeof entry.title === 'string' ? entry.title : '未命名',
        content: typeof entry.content === 'string' ? entry.content : ''
      };
      if (c.id !== entry.id || c.date !== entry.date || c.title !== entry.title || c.content !== entry.content) repaired++;
      clean.push(c);
    });
    if (repaired > 0) console.warn('[SKB] 日记数据校验修复了 ' + repaired + ' 处问题');
    return clean;
  };

  // ====== IndexedDB 图片存储 ======
  SKB.initDB = function() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise(function(resolve, reject) {
      var req = indexedDB.open(SKB.IDB_NAME, SKB.IDB_VERSION);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(SKB.IDB_STORE)) {
          var store = db.createObjectStore(SKB.IDB_STORE, { keyPath: 'id' });
          store.createIndex('chId', 'chId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains(SKB.IDB_META_STORE)) {
          db.createObjectStore(SKB.IDB_META_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
    return _dbPromise;
  };

  SKB.storeImage = function(id, dataUrl, chId, type) {
    return SKB.initDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(SKB.IDB_STORE, 'readwrite');
        var store = tx.objectStore(SKB.IDB_STORE);
        var record = { id: id, dataUrl: dataUrl, chId: chId || '', type: type || 'content', created: Date.now(), size: dataUrl.length };
        store.put(record);
        tx.oncomplete = function() {
          _imageCache[id] = dataUrl;
          resolve(id);
        };
        tx.onerror = function() { reject(tx.error); };
      });
    });
  };

  SKB.getImage = function(id) {
    if (_imageCache[id]) return Promise.resolve(_imageCache[id]);
    return SKB.initDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(SKB.IDB_STORE, 'readonly');
        var store = tx.objectStore(SKB.IDB_STORE);
        var req = store.get(id);
        req.onsuccess = function() {
          if (req.result) {
            _imageCache[id] = req.result.dataUrl;
            resolve(req.result.dataUrl);
          } else {
            resolve(null);
          }
        };
        req.onerror = function() { reject(req.error); };
      });
    });
  };

  SKB.deleteImage = function(id) {
    delete _imageCache[id];
    return SKB.initDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(SKB.IDB_STORE, 'readwrite');
        tx.objectStore(SKB.IDB_STORE).delete(id);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { reject(tx.error); };
      });
    });
  };

  SKB.batchGetImages = function(ids) {
    var promises = ids.map(function(id) { return SKB.getImage(id); });
    return Promise.all(promises).then(function(results) {
      var map = {};
      ids.forEach(function(id, i) { if (results[i]) map[id] = results[i]; });
      return map;
    });
  };

  // 生成唯一图片ID
  SKB.genImageId = function(chId, type, field) {
    var prefix = (chId || 'unknown') + '_' + (type || 'content');
    if (field) prefix += '_' + field;
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  };

  // ====== 统一图片压缩并存储 ======
  SKB.compressAndStore = function(file, options) {
    var opts = options || {};
    var maxW = opts.maxW || 600;
    var quality = opts.quality || 0.72;
    var chId = opts.chId || '';
    var type = opts.type || 'content';
    var field = opts.field || '';

    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          var dataUrl = canvas.toDataURL('image/jpeg', quality);
          var imgId = SKB.genImageId(chId, type, field);
          SKB.storeImage(imgId, dataUrl, chId, type).then(function() {
            resolve({ id: imgId, dataUrl: dataUrl });
          }).catch(reject);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ====== 迁移现有 base64 图片到 IndexedDB ======
  SKB.migrateBase64Images = function() {
    return SKB.initDB().then(function(db) {
      // 检查是否已迁移
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(SKB.IDB_META_STORE, 'readonly');
        var req = tx.objectStore(SKB.IDB_META_STORE).get('migrated');
        req.onsuccess = function() {
          if (req.result && req.result.value === true) {
            resolve(false); // 已迁移，跳过
            return;
          }
          resolve(true); // 需要迁移
        };
        req.onerror = function() { resolve(true); }; // meta 不存在，需要迁移
      });
    }).then(function(needsMigration) {
      if (!needsMigration) return;

      // 备份原数据
      try {
        var backup = localStorage.getItem(SKB.LS_KEY);
        if (backup) localStorage.setItem(SKB.LS_KEY + '_backup', backup);
      } catch(e) {}

      var promises = [];
      var base64Regex = /<img\s+[^>]*src="(data:image\/[^"]+)"([^>]*)>/gi;

      // 扫描章节内容中的 base64 图片
      for (var chId in chapterData) {
        if (!chapterData.hasOwnProperty(chId)) continue;
        var data = chapterData[chId];
        var fields = ['knowledge', 'competency', 'mistakes', 'kax', 'lessonPlan', 'homework'];

        fields.forEach(function(field) {
          if (!data[field] || typeof data[field] !== 'string') return;
          var imgIndex = 0;
          data[field] = data[field].replace(base64Regex, function(match, src, attrs) {
            var imgId = chId + '_content_' + field + '_m' + (imgIndex++);
            promises.push(SKB.storeImage(imgId, src, chId, 'content'));
            return '<img src="" data-img-id="' + imgId + '" ' + attrs + '>';
          });
        });

        // 迁移图片素材区
        if (data.images && Array.isArray(data.images)) {
          for (var i = 0; i < data.images.length; i++) {
            if (data.images[i] && data.images[i].indexOf('data:image/') === 0) {
              var imgId = chId + '_gallery_' + i;
              promises.push(SKB.storeImage(imgId, data.images[i], chId, 'gallery'));
              data.images[i] = imgId;
            }
          }
        }

        // 迁移章节配图
        if (data.footerImgs && Array.isArray(data.footerImgs)) {
          for (var j = 0; j < data.footerImgs.length; j++) {
            if (data.footerImgs[j] && data.footerImgs[j].indexOf('data:image/') === 0) {
              var fImgId = chId + '_footer_' + j;
              promises.push(SKB.storeImage(fImgId, data.footerImgs[j], chId, 'footer'));
              data.footerImgs[j] = fImgId;
            }
          }
        }
      }

      // 等待所有图片存储完成
      return Promise.all(promises).then(function() {
        // 保存清理后的数据
        localStorage.setItem(SKB.LS_KEY, JSON.stringify(chapterData));
        // 标记迁移完成
        return SKB.initDB().then(function(db) {
          return new Promise(function(resolve, reject) {
            var tx = db.transaction(SKB.IDB_META_STORE, 'readwrite');
            tx.objectStore(SKB.IDB_META_STORE).put({ key: 'migrated', value: true });
            tx.oncomplete = function() { resolve(); };
            tx.onerror = function() { reject(tx.error); };
          });
        });
      }).then(function() {
        try { localStorage.setItem(SKB.LS_MIGRATED_KEY, 'true'); } catch(e) {}
        console.log('[SKB] 图片迁移完成');
      });
    });
  };

  // 解析 HTML 中的 data-img-id，替换为实际 dataUrl
  SKB.resolveImagesInHTML = function(html) {
    var regex = /(<img\s+[^>]*)data-img-id="([^"]+)"([^>]*?)src=""/g;
    var ids = [];
    var match;
    // 先收集所有 ID
    var tempHtml = html;
    while ((match = regex.exec(html)) !== null) {
      ids.push(match[2]);
    }
    if (ids.length === 0) return Promise.resolve(html);

    return SKB.batchGetImages(ids).then(function(map) {
      regex.lastIndex = 0;
      return html.replace(regex, function(m, before, imgId, after) {
        var dataUrl = map[imgId] || '';
        return before + 'data-img-id="' + imgId + '"' + after + 'src="' + dataUrl + '"';
      });
    });
  };

  // ====== 图片上传辅助 ======
  SKB.uploadGalleryImg = function(chId, input) {
    var file = input.files[0];
    if (!file) return;
    SKB.compressAndStore(file, { maxW: 400, quality: 0.65, chId: chId, type: 'gallery' }).then(function(result) {
      if (!chapterData[chId]) chapterData[chId] = {};
      if (!chapterData[chId].images) chapterData[chId].images = [];
      chapterData[chId].images.push(result.id);
      SKB.autoSave();
      SKB.render.renderContent({ id: chId, num: 0, name: '', el: '' }); // 触发重渲染
      SKB.ui.showToast('已上传');
    });
    input.value = '';
  };

  SKB.uploadFooterImg = function(chId, input) {
    var file = input.files[0];
    if (!file) return;
    SKB.compressAndStore(file, { maxW: 900, quality: 0.78, chId: chId, type: 'footer' }).then(function(result) {
      if (!chapterData[chId]) chapterData[chId] = {};
      if (!chapterData[chId].footerImgs) chapterData[chId].footerImgs = [];
      chapterData[chId].footerImgs.push(result.id);
      SKB.autoSave();
      SKB.render.renderContent(SKB.getCurrentChapter());
      SKB.ui.showToast('配图已添加');
    });
    input.value = '';
  };

  SKB.delFooterImg = function(chId, idx) {
    if (chapterData[chId] && chapterData[chId].footerImgs) {
      var imgId = chapterData[chId].footerImgs[idx];
      chapterData[chId].footerImgs.splice(idx, 1);
      if (imgId && imgId.indexOf('data:image/') !== 0) {
        SKB.deleteImage(imgId);
      }
      SKB.autoSave();
      SKB.render.renderContent(SKB.getCurrentChapter());
      SKB.ui.showToast('已删除');
    }
  };

  // ====== GitHub 云端同步 ======
  SKB.loadGithubToken = function() {
    githubToken = localStorage.getItem(SKB.LS_TOKEN_KEY) || '';
  };

  SKB.setGithubToken = function() {
    var t = prompt('输入GitHub Personal Access Token（repo权限）：', (githubToken || ''));
    if (t !== null) {
      githubToken = t;
      localStorage.setItem(SKB.LS_TOKEN_KEY, t);
      SKB.ui.showToast('Token已保存');
    }
  };

  SKB.saveToCloud = function(silent) {
    if (!githubToken) {
      if (!silent) SKB.setGithubToken();
      if (!githubToken) return;
    }
    // 备课数据
    var data = JSON.stringify(chapterData, null, 2);
    var content = btoa(unescape(encodeURIComponent(data)));
    var sha = _cloudSha || '';
    var body = {
      message: 'auto: 备份备课数据 ' + new Date().toISOString().slice(0, 10) + ' ' + new Date().toTimeString().slice(0, 5),
      content: content
    };
    if (sha) body.sha = sha;
    fetch('https://api.github.com/repos/anankax/skb-math/contents/data.json', {
      method: 'PUT',
      headers: { Authorization: 'token ' + githubToken, 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify(body)
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.message || '保存失败'); });
      return r.json();
    })
    .then(function(j) {
      _cloudSha = j.sha;
      if (!silent) SKB.ui.showToast('✅ 已推送到云端');
    })
    .catch(function(e) {
      if (!silent) SKB.ui.showToast('❌ 推送失败: ' + e.message);
    });

    // 日记数据
    var diaryData = SKB.diary ? SKB.diary.getData() : [];
    var diaryContent = btoa(unescape(encodeURIComponent(JSON.stringify(diaryData, null, 2))));
    var diarySha = _diaryCloudSha || '';
    var diaryBody = {
      message: 'auto: 备份日记数据 ' + new Date().toISOString().slice(0, 10),
      content: diaryContent
    };
    if (diarySha) diaryBody.sha = diarySha;
    fetch('https://api.github.com/repos/anankax/skb-math/contents/diary.json', {
      method: 'PUT',
      headers: { Authorization: 'token ' + githubToken, 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify(diaryBody)
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.message || '日记保存失败'); });
      return r.json();
    })
    .then(function(j) { _diaryCloudSha = j.sha; console.log('[sync] 日记已推送'); })
    .catch(function(e) { console.log('[sync] 日记推送失败:', e.message); });
  };

  SKB.loadFromCloud = function(silent) {
    if (!silent) SKB.ui.showToast('⏳ 正在拉取...');
    var headers = githubToken
      ? { 'Authorization': 'token ' + githubToken, 'Accept': 'application/vnd.github.v3+json' }
      : { 'Accept': 'application/vnd.github.v3+json' };

    // 拉取备课数据
    fetch('https://api.github.com/repos/anankax/skb-math/contents/data.json', { headers: headers })
      .then(function(r) {
        if (r.status === 404) { if (!silent) SKB.ui.showToast('云端暂无数据'); return null; }
        if (!r.ok) throw new Error('拉取失败');
        return r.json();
      })
      .then(function(j) {
        if (!j) return;
        _cloudSha = j.sha;
        var data = decodeURIComponent(escape(atob(j.content)));
        chapterData = JSON.parse(data);
        localStorage.setItem(SKB.LS_KEY, JSON.stringify(chapterData));
        SKB.updateStats();
        var ch = SKB.getCurrentChapter();
        if (ch) SKB.render.renderContent(ch);
        if (!silent) SKB.ui.showToast('✅ 已从云端拉取');
        else console.log('[sync] 云端数据已同步');
      })
      .catch(function(e) { if (!silent) SKB.ui.showToast('❌ 拉取失败: ' + e.message); });

    // 拉取日记数据
    fetch('https://api.github.com/repos/anankax/skb-math/contents/diary.json', { headers: headers })
      .then(function(r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('日记拉取失败');
        return r.json();
      })
      .then(function(j) {
        if (!j) return;
        _diaryCloudSha = j.sha;
        var diaryData = JSON.parse(decodeURIComponent(escape(atob(j.content))));
        if (SKB.diary) {
          SKB.diary.setData(diaryData);
          SKB.diary.saveData();
          SKB.render.renderDiaryList();
        }
        console.log('[sync] 日记已同步');
      })
      .catch(function(e) { console.log('[sync] 日记拉取失败:', e.message); });
  };

  // ====== 图片分辨率（渲染辅助） ======
  // 将 gallery/footer 中的 imgId 转为 dataUrl
  SKB.resolveImageRef = function(imgRef) {
    if (!imgRef || imgRef.indexOf('data:image/') === 0) {
      return Promise.resolve(imgRef); // 已经是 dataUrl，直接返回
    }
    return SKB.getImage(imgRef).then(function(dataUrl) {
      return dataUrl || imgRef; // 找不到就返回原引用
    });
  };

  SKB.resolveImageRefs = function(refs) {
    if (!refs || refs.length === 0) return Promise.resolve([]);
    return Promise.all(refs.map(function(r) { return SKB.resolveImageRef(r); }));
  };

})();
