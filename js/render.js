/**
 * skb-math 渲染模块
 * 导航栏、章节内容、日记内容的 DOM 渲染
 */
var SKB = window.SKB || {};

(function() {
  'use strict';

  // ====== 辅助函数 ======
  SKB.render = {};

  SKB.render.getGrade = function(id) {
    if (id.startsWith('7a')) return '七上';
    if (id.startsWith('7b')) return '七下';
    if (id.startsWith('8a')) return '八上';
    if (id.startsWith('8b')) return '八下';
    if (id.startsWith('9a')) return '九上';
    if (id.startsWith('9b')) return '九下';
    return '九上';
  };

  SKB.render.getChapterBgKey = function(chId) {
    var grade = SKB.render.getGrade(chId);
    var gradePrefix = { '七上': '7a', '七下': '7b', '八上': '8a', '八下': '8b', '九上': '9a', '九下': '9b' }[grade];
    var chapters = SKB.textbook[grade].chapters;
    var idx = chapters.findIndex(function(c) { return c.id === chId; }) + 1;
    return 'bg_' + gradePrefix + '_' + idx;
  };

  // ====== 导航渲染 ======
  SKB.render.renderNav = function() {
    var nav = document.getElementById('chapterNav');
    if (!nav) return;
    nav.innerHTML = '';

    var chapterData = SKB.getChapterData();
    var grades = Object.keys(SKB.textbook);

    grades.forEach(function(grade) {
      var data = SKB.textbook[grade];
      var gc = SKB.gColors[grade];
      var g = document.createElement('div');
      g.className = 'grade-group';

      var t = document.createElement('div');
      t.className = 'grade-title g-' + gc.idx;
      var rgn = SKB.regionMap[grade] || '';
      t.innerHTML = '<img src="' + gc.elIcon + '" class="el-icon" alt=""> ' + grade +
        ' <span class="region-tag" style="background:' + gc.acc + ';color:#fff">' + rgn + '</span>' +
        ' <span class="gd-arrow open">▶</span>';
      t.onclick = function() {
        var c = g.querySelector('.grade-chapters');
        c.classList.toggle('collapsed');
        t.querySelector('.gd-arrow').classList.toggle('open');
      };

      var cd = document.createElement('div');
      cd.className = 'grade-chapters';

      data.chapters.forEach(function(ch) {
        var item = document.createElement('div');
        item.className = 'chapter-item ' + gc.chCls;
        item.dataset.id = ch.id;
        item.dataset.grade = grade;
        item.dataset.name = ch.name;

        var filled = false;
        var d = chapterData[ch.id];
        if (d) {
          var tx = Object.values(d).filter(Boolean).join('');
          if (tx.length > 10) filled = true;
        }

        item.innerHTML = '<span class="el-dot" style="background:' + gc.acc + '"></span>' +
          '<span class="ch-num">' + ch.num + '</span>' + ch.name +
          (filled ? '<span class="badge" style="background:' + gc.acc + '">✦</span>' : '');

        item.onclick = function() { SKB.ui.selAndClose(ch, item); };
        cd.appendChild(item);
      });

      g.appendChild(t);
      g.appendChild(cd);
      nav.appendChild(g);
    });
  };

  SKB.render.filterChapters = function() {
    var q = document.getElementById('searchBox').value.toLowerCase();
    document.querySelectorAll('.chapter-item').forEach(function(it) {
      var n = (it.dataset.name || '').toLowerCase();
      var g = (it.dataset.grade || '').toLowerCase();
      it.style.display = (!q || n.includes(q) || g.includes(q)) ? '' : 'none';
    });
  };

  // ====== 章节渲染 ======
  SKB.render.renderContent = function(ch) {
    var chapterData = SKB.getChapterData();
    var d = chapterData[ch.id] || { knowledge: '', competency: '', mistakes: '', kax: '', lessonPlan: '', homework: '', images: [], footerImgs: [] };
    chapterData[ch.id] = d; // 确保存在
    var main = document.getElementById('mainContent');
    var ed = SKB.getEditMode();
    var grade = SKB.render.getGrade(ch.id);
    var gc = SKB.gColors[grade];

    var secs = [
      { f: 'knowledge', icon: '📖', title: '知识要点', tag: '核心', ph: '本章核心知识点、公式、定理、性质……', st: true },
      { f: 'competency', icon: '🎯', title: '核心素养与教学目标', tag: '课标', ph: '六大核心素养目标、教学重难点、教学方法……' },
      { f: 'mistakes', icon: '⚠️', title: '易错清单', tag: '错因', ph: '学生常见错误类型、认知根源分析、干预策略……' },
      { f: 'kax', icon: '📛', title: 'KAX真题精选', tag: '真题', ph: '从KAX工具书中摘录典型真题，标注年份、地区、来源ID……' },
      { f: 'lessonPlan', icon: '📝', title: '备课笔记', ph: '教案框架、课堂活动设计、提问链、板书设计、教学反思……' },
      { f: 'homework', icon: '📔', title: '课后作业设计', ph: '分层作业：基础巩固层 / 能力提升层 / 拓展探究层……' }
    ];

    var html = '';

    // 章节信息栏
    var elName = ch.el || '';
    html += '<div class="chapter-meta">';
    if (elName) {
      html += '<span class="el-badge" style="background:' + gc.acc + '15;color:' + gc.acc + ';border:1px solid ' + gc.acc + '33">' +
        '<img src="' + gc.elIcon + '" class="el-icon-sm" alt="">' + elName + '</span>';
    }
    html += '<div class="meta-item">教材：<b style="color:' + gc.acc + '">苏科版 · ' + grade + '</b></div>' +
      '<div class="meta-item">第 ' + ch.num + ' 章 · ' + ch.name + '</div></div>';

    // 各内容卡片
    secs.forEach(function(s) {
      var v = d[s.f] || '';
      html += '<div class="section-card"><div class="card-hd" onclick="this.nextElementSibling.classList.toggle(\'collapsed\');this.querySelector(\'.hd-toggle\').classList.toggle(\'collapsed\')">' +
        '<span class="hd-icon">' + s.icon + '</span><span class="hd-title">' + s.title + '</span>' +
        (s.tag ? '<span class="hd-tag ' + gc.tc + '">' + s.tag + '</span>' : '') +
        '<span class="hd-toggle">▼</span></div><div class="card-bd">';

      if (ed) {
        // 编辑模式 - 使用统一工具栏
        html += '<div class="editor-wrap">';
        html += SKB.editor.generateToolbarHTML({ field: s.f, chId: ch.id, type: 'chapter' });
        html += '<div class="editor-area" contenteditable="true" data-field="' + s.f + '" data-chid="' + ch.id + '" ' +
          'oninput="SKB.editor.onEditorInput(this,\'' + s.f + '\',\'' + ch.id + '\')" ' +
          'onpaste="SKB.editor.handleImagePaste(event,{targetSelector:\'.editor-area[data-field=\\\'' + s.f + '\\\']\',chId:\'' + ch.id + '\',field:\'' + s.f + '\',maxW:600,quality:0.72})" ' +
          'onblur="SKB.editor.saveSelection()">' + v + '</div></div>';
        if (s.st && ch.keywords) {
          html += '<div class="tag-row">' + ch.keywords.map(function(k) {
            return '<span class="kw" onclick="SKB.editor.insTagToEditor(\'' + ch.id + '\',\'' + s.f + '\',\'' + k.replace(/'/g, '\\\'') + '\')">' + k + '</span>';
          }).join('') + '</div>';
        }
      } else {
        // 只读模式
        html += '<div class="readonly-render">' + (v || '') + '</div>';
      }
      html += '</div></div>';
    });

    // 图片素材区
    var imgs = d.images || [];
    html += '<div class="section-card"><div class="card-hd" onclick="this.nextElementSibling.classList.toggle(\'collapsed\');this.querySelector(\'.hd-toggle\').classList.toggle(\'collapsed\')">' +
      '<span class="hd-icon">🎼</span><span class="hd-title">图片素材</span>' +
      '<span class="hd-tag ' + gc.tc + '">附件</span><span class="hd-toggle">▼</span></div><div class="card-bd">';
    if (ed) {
      html += '<div class="upload-zone" onclick="this.querySelector(\'input\').click()"><div class="hint">点击上传图片（自动压缩）</div>' +
        '<input type="file" accept="image/*" onchange="SKB.uploadGalleryImg(\'' + ch.id + '\',this)"></div>';
    }
    if (imgs.length > 0) {
      html += '<div class="img-row">';
      imgs.forEach(function(imgRef) {
        // 如果是 dataUrl 直接使用，否则从 IDB 加载
        if (imgRef && imgRef.indexOf('data:image/') === 0) {
          html += '<img class="thumb" src="' + imgRef + '" onclick="SKB.ui.openLb(\'' + imgRef.replace(/'/g, '\\\'') + '\')">';
        } else {
          html += '<img class="thumb" src="" data-img-id="' + (imgRef || '') + '" onclick="SKB.ui.openLbById(\'' + (imgRef || '') + '\')">';
        }
      });
      html += '</div>';
    }
    html += '</div></div>';

    // 章节配图区
    var footerImgs = d.footerImgs || [];
    html += '<div class="section-card"><div class="card-hd" onclick="this.nextElementSibling.classList.toggle(\'collapsed\');this.querySelector(\'.hd-toggle\').classList.toggle(\'collapsed\')">' +
      '<span class="hd-icon">🗼️</span><span class="hd-title">章节配图</span>' +
      '<span class="hd-tag ' + gc.tc + '">自定义</span><span class="hd-toggle">▼</span></div><div class="card-bd">';
    if (ed) {
      html += '<div class="upload-zone" onclick="this.querySelector(\'input\').click()"><div class="hint">点击上传图片（支持多张，自动压缩）</div>' +
        '<input type="file" accept="image/*" onchange="SKB.uploadFooterImg(\'' + ch.id + '\',this)"></div>';
    }
    if (footerImgs.length > 0) {
      html += '<div class="footer-gallery">';
      footerImgs.forEach(function(imgRef, i) {
        var src = (imgRef && imgRef.indexOf('data:image/') === 0) ? imgRef : '';
        var dataAttr = (!src && imgRef) ? ' data-img-id="' + imgRef + '"' : '';
        html += '<div class="footer-img-wrap"><img src="' + src + '"' + dataAttr + ' loading="lazy" onclick="SKB.ui.openLbByRef(\'' + (imgRef || '').replace(/'/g, '\\\'') + '\')">' +
          '<span class="footer-del' + (!ed ? ' hidden' : '') + '" onclick="SKB.delFooterImg(\'' + ch.id + '\',' + i + ')">✕</span></div>';
      });
      html += '</div>';
    } else if (!ed) {
      html += '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:12px">暂无配图</div>';
    }
    html += '</div></div>';

    main.innerHTML = html;

    // 异步解析 IDB 图片引用
    if (!ed) {
      setTimeout(function() {
        SKB.resolveImagesInHTML(main.innerHTML).then(function(resolved) {
          main.innerHTML = resolved;
          if (window.MathJax) MathJax.typesetPromise([main]);
        }).catch(function() {
          if (window.MathJax) MathJax.typesetPromise([main]);
        });
      }, 100);
    } else {
      setTimeout(function() {
        SKB.editor.bindImageDrop('.editor-area[data-field="knowledge"]', { targetSelector: '.editor-area[data-field="knowledge"]', chId: ch.id, field: 'knowledge', maxW: 600, quality: 0.72 });
      }, 50);
    }
  };

  // ====== 空状态 ======
  SKB.render.showMainEmpty = function() {
    var main = document.getElementById('mainContent');
    if (main) {
      main.innerHTML = '<div class="empty-state"><div class="emblem">📝</div><h4>随笔</h4><p>记录日常思考 · 整理碎片想法<br>写下来，记得更牢</p></div>';
    }
    var title = document.getElementById('currentTitle');
    if (title) title.textContent = '欢迎 👋';
  };

  // ====== 日记列表渲染 ======
  SKB.render.renderDiaryList = function() {
    var list = document.getElementById('diaryList');
    if (!list) return;
    list.innerHTML = '';
    var diaryData = SKB.diary.getData();
    var currentDiaryId = SKB.getCurrentDiaryId();

    if (diaryData.length === 0) {
      list.innerHTML = '<div class="diary-empty">还没有随笔，开始写一篇吧 ✨</div>';
      return;
    }

    diaryData.forEach(function(d) {
      var el = document.createElement('div');
      el.className = 'diary-entry' + (d.id === currentDiaryId ? ' active' : '');
      el.innerHTML = '<span class="de-date">' + (d.date || '') + '</span><span class="de-title">' + (d.title || '未命名') + '</span>';
      el.onclick = function() { SKB.diary.select(d.id); };
      list.appendChild(el);
    });
  };

  // ====== 日记内容渲染 ======
  SKB.render.renderDiaryContent = function(entry) {
    var main = document.getElementById('mainContent');
    if (!main) return;
    var ed = SKB.getEditMode();
    var html = '';

    html += '<div class="diary-content-header">';
    html += '<h3>📝 ' + (entry.title || '') + '</h3>';
    if (ed) {
      html += '<input type="text" class="diary-date-input" value="' + (entry.date || '') + '" placeholder="日期" ' +
        'onchange="SKB.diary.updateField(\'' + entry.id + '\',\'date\',this.value)">';
    } else {
      html += '<span style="color:var(--text-dim);font-size:12.5px">' + (entry.date || '') + '</span>';
    }
    html += '</div>';

    html += '<div class="diary-card">';
    if (ed) {
      html += SKB.editor.generateToolbarHTML({ field: '', chId: entry.id, type: 'diary' });
      html += '<div class="diary-editor-area" contenteditable="true" id="diaryEditorArea" ' +
        'oninput="SKB.diary.onEditorInput(\'' + entry.id + '\')" ' +
        'onpaste="SKB.editor.handleImagePaste(event,{targetSelector:\'#diaryEditorArea\',chId:\'' + entry.id + '\',diaryMode:true,maxW:800,quality:0.78})">' +
        (entry.content || '') + '</div>';
    } else {
      html += '<div class="diary-readonly">' + (entry.content || '') + '</div>';
    }
    html += '</div>';

    html += '<div class="diary-action-bar">';
    if (ed) {
      html += '<button onclick="SKB.diary.saveCurrent()" style="background:linear-gradient(135deg,#f5e6c3,#e8d4a0);color:var(--gold-dark);border-color:var(--gold);font-weight:700">💾 保存</button>';
    }
    html += '<button class="btn-del" onclick="SKB.diary.deleteEntry(\'' + entry.id + '\')">🗑 删除此篇</button>';
    html += '<button onclick="SKB.ui.goHome()" class="btn-gold" style="margin-left:auto">← 返回首页</button>';
    html += '</div>';

    main.innerHTML = html;

    if (!ed) {
      setTimeout(function() {
        SKB.resolveImagesInHTML(main.innerHTML).then(function(resolved) {
          main.innerHTML = resolved;
          if (window.MathJax) MathJax.typesetPromise([main]);
        }).catch(function() {
          if (window.MathJax) MathJax.typesetPromise([main]);
        });
      }, 100);
    } else {
      setTimeout(function() {
        SKB.editor.bindImageDrop('#diaryEditorArea', { targetSelector: '#diaryEditorArea', chId: entry.id, diaryMode: true, maxW: 800, quality: 0.78 });
      }, 50);
    }
  };

})();
