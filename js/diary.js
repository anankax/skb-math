/**
 * skb-math 日记模块
 * 日记的 CRUD 操作
 */
var SKB = window.SKB || {};

(function() {
  'use strict';

  var diaryData = [];

  // ====== 数据访问 ======
  SKB.diary = {};

  SKB.diary.getData = function() { return diaryData; };
  SKB.diary.setData = function(d) { diaryData = d || []; };

  SKB.diary.loadData = function() {
    var s = localStorage.getItem(SKB.LS_DIARY_KEY);
    if (s) {
      try { diaryData = JSON.parse(s); } catch(e) { diaryData = []; }
    }
    // 数据校验
    diaryData = SKB.validateDiaryData(diaryData);
  };

  SKB.diary.saveData = function() {
    localStorage.setItem(SKB.LS_DIARY_KEY, JSON.stringify(diaryData));
  };

  SKB.diary.genId = function() {
    return 'd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  };

  // ====== CRUD ======
  SKB.diary.add = function() {
    var now = new Date();
    var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var entry = { id: SKB.diary.genId(), date: dateStr, title: dateStr + ' 随笔', content: '' };
    diaryData.unshift(entry);
    SKB.diary.saveData();
    SKB.render.renderDiaryList();
    SKB.diary.select(entry.id);
    SKB.ui.showToast('新随笔已创建');
  };

  SKB.diary.getEntryById = function(id) {
    return diaryData.find(function(d) { return d.id === id; });
  };

  SKB.diary.select = function(id) {
    SKB.setCurrentDiaryId(id);
    document.querySelectorAll('.diary-entry').forEach(function(e) { e.classList.remove('active'); });
    var entry = SKB.diary.getEntryById(id);
    if (!entry) return;

    // 高亮列表项
    var entries = document.querySelectorAll('.diary-entry');
    entries.forEach(function(el) {
      if (el.textContent.indexOf(entry.date) !== -1 && el.textContent.indexOf(entry.title) !== -1) {
        el.classList.add('active');
      }
    });

    SKB.render.renderDiaryContent(entry);
    var title = document.getElementById('currentTitle');
    if (title) title.textContent = '📝 ' + entry.title;
  };

  SKB.diary.deleteEntry = function(id) {
    if (!confirm('确定删除这篇随笔吗？')) return;
    diaryData = diaryData.filter(function(d) { return d.id !== id; });
    SKB.diary.saveData();
    SKB.render.renderDiaryList();
    if (SKB.getCurrentDiaryId() === id) {
      SKB.setCurrentDiaryId(null);
      SKB.render.showMainEmpty();
    }
    SKB.ui.showToast('随笔已删除');
  };

  SKB.diary.updateField = function(id, field, val) {
    var entry = SKB.diary.getEntryById(id);
    if (entry) {
      entry[field] = val;
      SKB.diary.saveData();
      SKB.render.renderDiaryList();
    }
  };

  SKB.diary.saveCurrent = function() {
    var el = document.getElementById('diaryEditorArea');
    var currentDiaryId = SKB.getCurrentDiaryId();
    if (!el || !currentDiaryId) return;
    var entry = SKB.diary.getEntryById(currentDiaryId);
    if (entry) {
      entry.content = el.innerHTML;
      SKB.diary.saveData();
      SKB.render.renderDiaryList();
      SKB.ui.showToast('💾 随笔已保存');
    }
  };

  // ====== 编辑器事件处理 ======
  SKB.diary.onEditorInput = function(id) {
    var el = document.getElementById('diaryEditorArea');
    if (!el) return;
    var entry = SKB.diary.getEntryById(id);
    if (entry) {
      entry.content = el.innerHTML;
      SKB.autoSave();
    }
  };

  // ====== 侧栏日记折叠 ======
  SKB.diary.toggleBody = function() {
    var body = document.getElementById('diaryBody');
    var arrow = document.getElementById('diaryArrow');
    if (body) body.classList.toggle('collapsed');
    if (arrow) arrow.classList.toggle('open');
  };

})();
