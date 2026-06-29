/**
 * skb-math 编辑器模块
 * 富文本编辑器、图片处理、工具栏生成
 */
var SKB = window.SKB || {};

(function() {
  'use strict';

  // ====== 内部状态 ======
  var savedSelection = null;
  var _selImg = null;
  var _resizeHandle = null;

  // ====== 导出选择图片引用 ======
  SKB.getSelImg = function() { return _selImg; };

  // ====== 选区保存/恢复 ======
  SKB.editor = {};

  SKB.editor.saveSelection = function() {
    var s = window.getSelection();
    if (s.rangeCount > 0) savedSelection = s.getRangeAt(0);
  };

  SKB.editor.restoreSelection = function() {
    if (savedSelection) {
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(savedSelection);
      savedSelection = null;
    }
  };

  // ====== 章节自动保存 ======
  SKB.editor.autoSaveCh = function(id, field, val) {
    var data = SKB.getChapterData();
    if (!data[id]) data[id] = {};
    data[id][field] = val;
    SKB.autoSave();
  };

  SKB.editor.onEditorInput = function(el, field, id) {
    SKB.editor.autoSaveCh(id, field, el.innerHTML);
  };

  // ====== 执行编辑命令（包装 execCommand） ======
  SKB.editor.execCmd = function(cmd, btn) {
    document.execCommand(cmd, false, null);
    if (btn) {
      setTimeout(function() {
        btn.classList.toggle('active', document.queryCommandState(cmd));
      }, 10);
    }
  };

  SKB.editor.execCmdVal = function(cmd, val, btn) {
    document.execCommand(cmd, false, val);
  };

  // ====== 字号和颜色 ======
  SKB.editor.doFontSize = function(size, field) {
    var el = document.querySelector('.editor-area[data-field="' + field + '"]');
    if (!el) return;
    SKB.editor.restoreSelection();
    el.focus();
    document.execCommand('fontSize', false, size);
  };

  SKB.editor.doForeColor = function(color, field) {
    var el = document.querySelector('.editor-area[data-field="' + field + '"]');
    if (!el) return;
    SKB.editor.restoreSelection();
    el.focus();
    document.execCommand('foreColor', false, color);
  };

  // ====== 链接插入 ======
  SKB.editor.insertLink = function(field, diaryMode) {
    var url = prompt('输入链接地址：', 'https://');
    if (!url) return;
    if (diaryMode) {
      document.execCommand('createLink', false, url);
    } else {
      var el = document.querySelector('.editor-area[data-field="' + field + '"]');
      if (el) el.focus();
      document.execCommand('createLink', false, url);
    }
  };

  // ====== 图片插入编辑器 ======
  SKB.editor.insertImg = function(chId, field, diaryMode) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function() {
      var file = this.files[0];
      if (!file) return;
      var targetSelector = diaryMode
        ? '#diaryEditorArea'
        : '.editor-area[data-field="' + field + '"]';
      var maxW = diaryMode ? 800 : 600;
      var quality = diaryMode ? 0.78 : 0.72;
      SKB.editor.compressAndInsertImg(file, {
        targetSelector: targetSelector,
        chId: chId,
        field: field,
        maxW: maxW,
        quality: quality,
        diaryMode: diaryMode
      });
    };
    input.click();
  };

  // ====== 统一图片压缩并插入 ======
  SKB.editor.compressAndInsertImg = function(file, options) {
    var opts = options || {};
    var targetSelector = opts.targetSelector;
    var chId = opts.chId || '';
    var field = opts.field || '';
    var maxW = opts.maxW || 600;
    var quality = opts.quality || 0.72;
    var diaryMode = opts.diaryMode || false;

    SKB.compressAndStore(file, {
      maxW: maxW,
      quality: quality,
      chId: chId,
      type: 'content',
      field: field
    }).then(function(result) {
      var el = document.querySelector(targetSelector);
      if (!el) return;
      el.focus();
      document.execCommand('insertImage', false, result.dataUrl);
      setTimeout(function() {
        var imgs = el.querySelectorAll('img:not(.img-float-left):not(.img-float-right):not(.img-center):not(.img-inline):not(.img-size-s):not(.img-size-m):not(.img-size-l):not(.img-size-f)');
        imgs.forEach(function(i) {
          if (i.src === result.dataUrl) {
            i.classList.add('img-center', 'img-size-m');
            i.dataset.imgId = result.id;
          }
        });
        if (diaryMode) {
          var diaryId = chId; // 日记模式时 chId 即 diaryId
          var entry = SKB.diary.getEntryById(diaryId);
          if (entry) { entry.content = el.innerHTML; SKB.autoSave(); }
        } else if (chId && field) {
          SKB.editor.autoSaveCh(chId, field, el.innerHTML);
        }
      }, 50);
    });
  };

  // ====== 标签插入编辑器 ======
  SKB.editor.insTagToEditor = function(id, field, text) {
    var el = document.querySelector('.editor-area[data-field="' + field + '"]');
    if (!el) return;
    el.focus();
    document.execCommand('insertText', false, text);
    SKB.editor.onEditorInput(el, field, id);
  };

  // ====== 统一图片粘贴处理 ======
  SKB.editor.handleImagePaste = function(event, options) {
    var items = event.clipboardData.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        event.preventDefault();
        var file = items[i].getAsFile();
        SKB.editor.compressAndInsertImg(file, options);
        return;
      }
    }
    // 非图片粘贴，延迟触发自动保存
    setTimeout(function() {
      var el = document.querySelector(options.targetSelector);
      if (!el) return;
      if (options.diaryMode) {
        var entry = SKB.diary.getEntryById(options.chId);
        if (entry) { entry.content = el.innerHTML; SKB.autoSave(); }
      } else if (options.chId && options.field) {
        SKB.editor.autoSaveCh(options.chId, options.field, el.innerHTML);
      }
    }, 50);
  };

  // ====== 统一拖放绑定 ======
  SKB.editor.bindImageDrop = function(targetSelector, options) {
    var el = document.querySelector(targetSelector);
    if (!el) return;
    el.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.style.borderColor = 'var(--gold)';
      this.style.background = 'rgba(200,160,60,0.08)';
    });
    el.addEventListener('dragleave', function(e) {
      e.preventDefault();
      this.style.borderColor = '';
      this.style.background = '';
    });
    el.addEventListener('drop', function(e) {
      e.preventDefault();
      this.style.borderColor = '';
      this.style.background = '';
      var files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        SKB.editor.compressAndInsertImg(files[0], options);
      }
    });
  };

  // ====== 统一工具栏 HTML 生成 ======
  SKB.editor.generateToolbarHTML = function(context) {
    var isDiary = (context.type === 'diary');
    var field = context.field || '';
    var chId = context.chId || '';
    var html = '';

    html += '<div class="' + (isDiary ? 'diary-editor-toolbar' : 'editor-toolbar') + '"';
    if (!isDiary) html += ' data-field="' + field + '"';
    html += '>';

    // 格式按钮（通用）
    html += '<button onclick="SKB.editor.execCmd(\'bold\',this)" title="粗体(Ctrl+B)"><b>B</b></button>';
    html += '<button onclick="SKB.editor.execCmd(\'italic\',this)" title="斜体(Ctrl+I)"><i>I</i></button>';
    html += '<button onclick="SKB.editor.execCmd(\'underline\',this)" title="下划线(Ctrl+U)"><u>U</u></button>';
    html += '<span class="tb-sep"></span>';
    html += '<button onclick="SKB.editor.execCmd(\'insertUnorderedList\',this)" title="无序列表">• 列表</button>';
    if (!isDiary) {
      html += '<button onclick="SKB.editor.execCmd(\'insertOrderedList\',this)" title="有序列表">1. 列表</button>';
    }

    // 链接和图片
    html += '<span class="tb-sep"></span>';
    if (isDiary) {
      html += '<button onclick="SKB.editor.insertLink(\'\',true)" title="链接">🔗 链接</button>';
      html += '<button onclick="SKB.editor.insertImg(\'' + chId + '\',\'\',true)" title="图片">🗼️ 图片</button>';
    } else {
      html += '<button onclick="SKB.editor.insertLink(\'' + field + '\')" title="插入链接">🔗链接</button>';
      html += '<button onclick="SKB.editor.insertImg(\'' + chId + '\',\'' + field + '\')" title="插入图片">🗼️图片</button>';
    }

    // 标题格式
    html += '<span class="tb-sep"></span>';
    html += '<span class="tb-label">标题</span>';
    html += '<button onclick="SKB.editor.execCmdVal(\'formatBlock\',\'h3\',this)" title="标题">' + (isDiary ? 'H3' : 'H') + '</button>';
    html += '<button onclick="SKB.editor.execCmdVal(\'formatBlock\',\'p\',this)" title="正文">P</button>';

    // 章节编辑器才有的字号和颜色
    if (!isDiary) {
      html += '<span class="tb-sep"></span>';
      html += '<span class="tb-label">字号</span>';
      html += '<select onchange="SKB.editor.doFontSize(this.value,\'' + field + '\')">';
      html += '<option value="">默认</option><option value="3">12px</option><option value="4">14px</option>';
      html += '<option value="5" selected>16px</option><option value="6">20px</option><option value="7">26px</option>';
      html += '</select>';
      html += '<span class="tb-sep"></span>';
      html += '<span class="tb-label">颜色</span>';
      html += '<input type="color" id="colorPicker_' + field + '" value="#333333" onchange="SKB.editor.doForeColor(this.value,\'' + field + '\')" title="字体颜色">';
      html += '<div class="color-swatches">';
      var swatches = [['#4a3c2d','深棕'],['#c9a227','金'],['#e07b54','红'],['#4a8fc2','蓝'],['#5cb85c','绿'],['#9b6fc9','紫']];
      swatches.forEach(function(s) {
        html += '<div class="color-swatch" style="background:' + s[0] + '" onclick="SKB.editor.doForeColor(\'' + s[0] + '\',\'' + field + '\');document.getElementById(\'colorPicker_' + field + '\').value=\'' + s[0] + '\'" title="' + s[1] + '"></div>';
      });
      html += '</div>';
    }

    // 图片排版按钮（通用）
    html += '<span class="tb-sep"></span><span class="tb-label">图片</span>';
    html += '<button onclick="SKB.editor.setImgAlign(\'left\')" data-img-align="left" title="图片左浮">←左浮</button>';
    html += '<button onclick="SKB.editor.setImgAlign(\'right\')" data-img-align="right" title="图片右浮">→右浮</button>';
    html += '<button onclick="SKB.editor.setImgAlign(\'center\')" data-img-align="center" title="图片居中">↔居中</button>';
    html += '<button onclick="SKB.editor.setImgAlign(\'inline\')" data-img-align="inline" title="图片内嵌">⌇内嵌</button>';
    html += '<span class="tb-sep"></span>';
    html += '<button onclick="SKB.editor.setImgSize(\'s\')" data-img-size="s" title="小25%">小</button>';
    html += '<button onclick="SKB.editor.setImgSize(\'m\')" data-img-size="m" title="中48%">中</button>';
    html += '<button onclick="SKB.editor.setImgSize(\'l\')" data-img-size="l" title="大75%">大</button>';
    html += '<button onclick="SKB.editor.setImgSize(\'f\')" data-img-size="f" title="满100%">满</button>';
    html += '<button onclick="SKB.editor.removeImg()" title="删除选中图片" style="color:#c44">🗑删图</button>';

    html += '</div>';
    return html;
  };

  // ====== 图片排版 ======
  SKB.editor.clearImgBtnStates = function() {
    document.querySelectorAll('[data-img-align],[data-img-size]').forEach(function(b) { b.classList.remove('active'); });
  };

  SKB.editor.updateImgBtnStates = function() {
    document.querySelectorAll('[data-img-align]').forEach(function(b) {
      var cls = _selImg ? _selImg.classList.contains('img-float-' + b.dataset.imgAlign) : false;
      if (_selImg && !_selImg.classList.contains('img-float-left') && !_selImg.classList.contains('img-float-right') && !_selImg.classList.contains('img-center') && !_selImg.classList.contains('img-inline') && b.dataset.imgAlign === 'center') cls = true;
      b.classList.toggle('active', cls);
    });
    document.querySelectorAll('[data-img-size]').forEach(function(b) {
      var cls = _selImg ? _selImg.classList.contains('img-size-' + b.dataset.imgSize) : false;
      if (_selImg && !_selImg.classList.contains('img-size-s') && !_selImg.classList.contains('img-size-m') && !_selImg.classList.contains('img-size-l') && !_selImg.classList.contains('img-size-f') && b.dataset.imgSize === 'm') cls = true;
      b.classList.toggle('active', cls);
    });
  };

  SKB.editor.setImgAlign = function(mode) {
    if (!_selImg) return;
    ['img-float-left','img-float-right','img-center','img-inline'].forEach(function(c) { _selImg.classList.remove(c); });
    if (mode === 'left') _selImg.classList.add('img-float-left');
    else if (mode === 'right') _selImg.classList.add('img-float-right');
    else if (mode === 'center') _selImg.classList.add('img-center');
    else if (mode === 'inline') _selImg.classList.add('img-inline');
    SKB.editor.autoSaveAfterImgEdit();
    SKB.editor.updateImgBtnStates();
  };

  SKB.editor.setImgSize = function(s) {
    if (!_selImg) return;
    ['img-size-s','img-size-m','img-size-l','img-size-f'].forEach(function(c) { _selImg.classList.remove(c); });
    _selImg.classList.add('img-size-' + s);
    SKB.editor.autoSaveAfterImgEdit();
    SKB.editor.updateImgBtnStates();
  };

  SKB.editor.removeImg = function() {
    if (!_selImg) return;
    var area = _selImg.closest('.editor-area');
    var diaryArea = _selImg.closest('.diary-editor-area');
    _selImg.remove();
    _selImg = null;
    SKB.editor.clearImgBtnStates();
    SKB.editor.hideResizeHandle();
    if (area) {
      var f = area.dataset.field, chId = area.dataset.chid;
      if (f && chId) SKB.editor.autoSaveCh(chId, f, area.innerHTML);
    }
    if (diaryArea) {
      var entry = SKB.diary.getEntryById(SKB.getCurrentDiaryId());
      if (entry) { entry.content = diaryArea.innerHTML; SKB.autoSave(); }
    }
  };

  SKB.editor.autoSaveAfterImgEdit = function() {
    if (!_selImg) return;
    var area = _selImg.closest('.editor-area');
    if (area) {
      var f = area.dataset.field, chId = area.dataset.chid;
      if (f && chId) SKB.editor.autoSaveCh(chId, f, area.innerHTML);
    }
    var diaryArea = _selImg.closest('.diary-editor-area');
    if (diaryArea) {
      var diaryId = SKB.getCurrentDiaryId();
      if (diaryId) {
        var entry = SKB.diary.getEntryById(diaryId);
        if (entry) { entry.content = diaryArea.innerHTML; SKB.autoSave(); }
      }
    }
  };

  // ====== 缩放手柄 ======
  SKB.editor.getResizeHandle = function() {
    if (!_resizeHandle) {
      _resizeHandle = document.createElement('div');
      _resizeHandle.className = 'img-resize-handle';
      document.body.appendChild(_resizeHandle);
      _resizeHandle.addEventListener('mousedown', function(e) {
        e.stopPropagation(); e.preventDefault();
        if (!_selImg) return;
        var startCX = e.clientX, startCY = e.clientY;
        var startW = _selImg.offsetWidth || _selImg.naturalWidth || 200;
        var startH = _selImg.offsetHeight || _selImg.naturalHeight || 150;
        var ratio = startH / startW;
        function onMove(ev) {
          var dx = ev.clientX - startCX, newW = Math.max(40, startW + dx);
          _selImg.style.width = newW + 'px';
          _selImg.style.height = Math.round(newW * ratio) + 'px';
          SKB.editor.positionResizeHandle();
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          ['img-size-s','img-size-m','img-size-l','img-size-f'].forEach(function(c) { _selImg.classList.remove(c); });
          SKB.editor.autoSaveAfterImgEdit();
          SKB.editor.clearImgBtnStates();
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }
    return _resizeHandle;
  };

  SKB.editor.positionResizeHandle = function() {
    if (!_selImg || !_resizeHandle) return;
    var r = _selImg.getBoundingClientRect();
    _resizeHandle.style.top = (r.top + window.scrollY + r.height - 16) + 'px';
    _resizeHandle.style.left = (r.left + window.scrollX + r.width - 16) + 'px';
    _resizeHandle.style.display = 'block';
  };

  SKB.editor.hideResizeHandle = function() {
    if (_resizeHandle) _resizeHandle.style.display = 'none';
  };

  // 初始化：禁用浏览器内置 contentEditable 图片缩放
  try { document.execCommand('enableObjectResizing', false, 'false'); } catch(e) {}

  // 全局 mousedown：点击图片选中，点击其他地方取消
  document.addEventListener('mousedown', function(e) {
    var img = e.target;
    if (img.tagName === 'IMG' && (img.closest('.editor-area') || img.closest('.diary-editor-area'))) {
      if (_selImg && _selImg !== img) _selImg.classList.remove('img-selected');
      _selImg = img;
      img.classList.add('img-selected');
      SKB.editor.updateImgBtnStates();
      SKB.editor.getResizeHandle();
      setTimeout(SKB.editor.positionResizeHandle, 10);
    } else if (!e.target.closest('.editor-toolbar') && !e.target.closest('.diary-editor-toolbar') && !e.target.closest('.img-resize-handle')) {
      if (_selImg) _selImg.classList.remove('img-selected');
      _selImg = null;
      SKB.editor.clearImgBtnStates();
      SKB.editor.hideResizeHandle();
    }
  });

  // 滚动/缩放时重新定位缩放手柄
  window.addEventListener('scroll', function() { if (_selImg) SKB.editor.positionResizeHandle(); }, true);
  window.addEventListener('resize', function() { if (_selImg) SKB.editor.positionResizeHandle(); });

})();
