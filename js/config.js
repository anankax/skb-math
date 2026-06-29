/**
 * skb-math 配置模块
 * 所有常量、配色方案、教材数据和图片映射
 */
var SKB = window.SKB || {};

(function() {
  'use strict';

  // ====== 密码（SHA-256 哈希，明文不出现） ======
  SKB.EP_HASH = null; // 将在 main.js 中设置

  // ====== localStorage 键名 ======
  SKB.LS_KEY = 'skb7_data';
  SKB.LS_DIARY_KEY = 'skb7_diary';
  SKB.LS_TOKEN_KEY = 'skb_github_token';
  SKB.LS_MIGRATED_KEY = 'skb7_migrated_to_v2';

  // ====== IndexedDB 配置 ======
  SKB.IDB_NAME = 'skb-math-images';
  SKB.IDB_STORE = 'images';
  SKB.IDB_META_STORE = 'meta';
  SKB.IDB_VERSION = 1;

  // ====== 章节总数 ======
  SKB.TOTAL_CHAPTERS = 32;

  // ====== 六元素配色 ======
  SKB.gColors = {
    '七上': { idx: 1, chCls: 'ch-item-1', acc: 'var(--c1)', tc: 'tc-1', bgRole: 'bg_qi_shang', elIcon: 'images/el_wind.webp' },
    '七下': { idx: 2, chCls: 'ch-item-2', acc: 'var(--c2)', tc: 'tc-2', bgRole: 'bg_qi_xia', elIcon: 'images/el_rock.webp' },
    '八上': { idx: 3, chCls: 'ch-item-3', acc: 'var(--c3)', tc: 'tc-3', bgRole: 'bg_ba_shang', elIcon: 'images/el_lightning.webp' },
    '八下': { idx: 4, chCls: 'ch-item-4', acc: 'var(--c4)', tc: 'tc-4', bgRole: 'bg_ba_xia', elIcon: 'images/el_grass.webp' },
    '九上': { idx: 5, chCls: 'ch-item-5', acc: 'var(--c5)', tc: 'tc-5', bgRole: 'bg_jiu_9a', elIcon: 'images/el_water.webp' },
    '九下': { idx: 6, chCls: 'ch-item-6', acc: 'var(--c6)', tc: 'tc-6', bgRole: 'bg_jiu_9b', elIcon: 'images/el_fire.webp' }
  };

  SKB.regionMap = { '七上': '蒙德', '七下': '璃月', '八上': '稻妻', '八下': '须弥', '九上': '枫丹', '九下': '纳塔' };

  SKB.elDots = { '风': '#5b9bd5', '岩': '#c9a96e', '雷': '#9b7fd4', '草': '#6daa6f', '水': '#5babc4', '火': '#e07b54', '冰': '#7ec8e3' };

  // ====== 每章分配的底部大图 ======
  SKB.CH_FOOTER_IMG = {
    '7a-1': 'scene_1', '7a-2': 'char_1', '7a-3': 'extra_1', '7a-4': 'extra_2', '7a-5': 'char_2', '7a-6': 'scene_2',
    '7b-1': 'scene_3', '7b-2': 'char_3', '7b-3': 'extra_3', '7b-4': 'extra_4', '7b-5': 'extra_5', '7b-6': 'extra_6',
    '8a-1': 'char_1', '8a-2': 'char_2', '8a-3': 'scene_1', '8a-4': 'extra_1', '8a-5': 'extra_7', '8a-6': 'scene_2',
    '8b-1': 'scene_3', '8b-2': 'char_3', '8b-3': 'extra_3', '8b-4': 'extra_4', '8b-5': 'extra_5',
    '9a-1': 'char_1', '9a-2': 'char_2', '9a-3': 'scene_1', '9a-4': 'extra_1', '9a-5': 'extra_2',
    '9b-6': 'char_3', '9b-7': 'scene_3', '9b-8': 'extra_3', '9b-9': 'extra_7'
  };

  // ====== 教材章节数据 ======
  SKB.textbook = {
    '七上': { chapters: [
      { id: '7a-1', num: 1, name: '数学与我们同行', el: '风', keywords: ['观察', '思考', '表达', '数学建模'] },
      { id: '7a-2', num: 2, name: '有理数', el: '风', keywords: ['正负数', '数轴', '绝对值', '加减乘除', '乘方'] },
      { id: '7a-3', num: 3, name: '代数式', el: '风', keywords: ['字母表示数', '多项式', '整式', '代数式求值'] },
      { id: '7a-4', num: 4, name: '一元一次方程', el: '风', keywords: ['等式性质', '移项', '去分母', '应用题'] },
      { id: '7a-5', num: 5, name: '走进几何世界', el: '岩', keywords: ['几何体', '展开图', '三视图', '点线面体'] },
      { id: '7a-6', num: 6, name: '平面图形的初步认识', el: '岩', keywords: ['线段', '射线', '角', '平行', '垂直', '对顶角'] }
    ]},
    '七下': { chapters: [
      { id: '7b-1', num: 7, name: '幂的运算', el: '岩', keywords: ['同底数幂', '幂的乘方', '积的乘方', '零指数', '负指数'] },
      { id: '7b-2', num: 8, name: '整式乘法', el: '岩', keywords: ['单项式乘法', '多项式乘法', '平方差', '完全平方'] },
      { id: '7b-3', num: 9, name: '图形的变换', el: '岩', keywords: ['平移', '旋转', '轴对称', '中心对称'] },
      { id: '7b-4', num: 10, name: '二元一次方程组', el: '岩', keywords: ['代入消元', '加减消元', '三元一次', '应用题'] },
      { id: '7b-5', num: 11, name: '一元一次不等式', el: '冰', keywords: ['不等式性质', '解集', '数轴表示', '不等式组'] },
      { id: '7b-6', num: 12, name: '定义·命题·证明', el: '冰', keywords: ['命题', '真命题', '假命题', '逆命题', '反证法'] }
    ]},
    '八上': { chapters: [
      { id: '8a-1', num: 1, name: '三角形', el: '雷', keywords: ['三边关系', '内角和', '外角', '全等判定', 'SSS', 'SAS', 'ASA', 'AAS', 'HL'] },
      { id: '8a-2', num: 2, name: '实数的初步认识', el: '雷', keywords: ['平方根', '立方根', '无理数', '实数', '近似数'] },
      { id: '8a-3', num: 3, name: '勾股定理', el: '雷', keywords: ['a²+b²=c²', '逆定理', '勾股数', '最短路径'] },
      { id: '8a-4', num: 4, name: '平面直角坐标系', el: '雷', keywords: ['象限', '坐标', '对称点', '中点公式', '距离公式'] },
      { id: '8a-5', num: 5, name: '一次函数', el: '火', keywords: ['y=kx+b', 'k与b意义', '图象', '交点', '待定系数法', '分段函数'] },
      { id: '8a-6', num: 6, name: '数据的收集整理与描述', el: '火', keywords: ['普查', '抽样调查', '频数分布', '直方图'] }
    ]},
    '八下': { chapters: [
      { id: '8b-1', num: 7, name: '认识概率', el: '草', keywords: ['确定事件', '随机事件', '等可能性', '频率估计概率'] },
      { id: '8b-2', num: 8, name: '四边形', el: '草', keywords: ['平行四边形', '矩形', '菱形', '正方形', '中位线', '判定'] },
      { id: '8b-3', num: 9, name: '因式分解', el: '草', keywords: ['提公因式', '平方差', '完全平方', '十字相乘', '分组分解'] },
      { id: '8b-4', num: 10, name: '分式', el: '草', keywords: ['分式运算', '分式方程', '增根', '验根', '应用题'] },
      { id: '8b-5', num: 11, name: '二次根式', el: '草', keywords: ['√a意义', '最简二次根式', '乘除', '加减', '分母有理化'] }
    ]},
    '九上': { chapters: [
      { id: '9a-1', num: 1, name: '反比例函数', el: '水', keywords: ['y=k/x', '双曲线', 'k几何意义', '矩形面积', '实际应用'] },
      { id: '9a-2', num: 2, name: '一元二次方程', el: '水', keywords: ['配方法', '公式法', 'Δ判别式', '韦达定理', '根与系数', '增长率'] },
      { id: '9a-3', num: 3, name: '圆', el: '水', keywords: ['圆心角', '圆周角', '切线', '切线长', '弦切角', '弧长', '扇形'] },
      { id: '9a-4', num: 4, name: '数据的集中趋势和离散程度', el: '水', keywords: ['平均数', '中位数', '众数', '极差', '方差', '标准差'] },
      { id: '9a-5', num: 5, name: '等可能条件下的概率', el: '水', keywords: ['树状图', '列表法', '放回', '不放回', '概率乘法'] }
    ]},
    '九下': { chapters: [
      { id: '9b-6', num: 6, name: '二次函数', el: '火', keywords: ['y=ax²+bx+c', '顶点', '对称轴', '最值', '平移', '交点式'] },
      { id: '9b-7', num: 7, name: '图形的相似', el: '火', keywords: ['相似三角形', '比例线段', '位似', '黄金分割'] },
      { id: '9b-8', num: 8, name: '锐角三角函数', el: '冰', keywords: ['sin', 'cos', 'tan', '特殊角', '解直角三角形'] },
      { id: '9b-9', num: 9, name: '投影与视图', el: '冰', keywords: ['平行投影', '中心投影', '三视图', '展开图'] }
    ]}
  };

  // ====== 静态图片键名映射 ======
  SKB.IMG_KEYS = {
    'header': 'images/header.jpg',
    'home_bg': 'images/home_bg.jpg',
    'char_1': 'images/char_1.jpg',
    'char_2': 'images/char_2.jpg',
    'char_3': 'images/char_3.jpg',
    'scene_1': 'images/scene_1.jpg',
    'scene_2': 'images/scene_2.jpg',
    'scene_3': 'images/scene_3.jpg',
    'extra_1': 'images/extra_1.jpg',
    'extra_2': 'images/extra_2.jpg',
    'extra_3': 'images/extra_3.jpg',
    'extra_4': 'images/extra_4.jpg',
    'extra_5': 'images/extra_5.jpg',
    'extra_6': 'images/extra_6.jpg',
    'extra_7': 'images/extra_7.jpg',
    'bg_7a_1': 'images/bg_7a_1.jpg', 'bg_7a_2': 'images/bg_7a_2.jpg', 'bg_7a_3': 'images/bg_7a_3.jpg',
    'bg_7a_4': 'images/bg_7a_4.jpg', 'bg_7a_5': 'images/bg_7a_5.jpg', 'bg_7a_6': 'images/bg_7a_6.jpg',
    'bg_7b_1': 'images/bg_7b_1.jpg', 'bg_7b_2': 'images/bg_7b_2.jpg', 'bg_7b_3': 'images/bg_7b_3.jpg',
    'bg_7b_4': 'images/bg_7b_4.jpg', 'bg_7b_5': 'images/bg_7b_5.jpg', 'bg_7b_6': 'images/bg_7b_6.jpg',
    'bg_8a_1': 'images/bg_8a_1.jpg', 'bg_8a_2': 'images/bg_8a_2.jpg', 'bg_8a_3': 'images/bg_8a_3.jpg',
    'bg_8a_4': 'images/bg_8a_4.jpg', 'bg_8a_5': 'images/bg_8a_5.jpg', 'bg_8a_6': 'images/bg_8a_6.jpg',
    'bg_8b_1': 'images/bg_8b_1.jpg', 'bg_8b_2': 'images/bg_8b_2.jpg', 'bg_8b_3': 'images/bg_8b_3.jpg',
    'bg_8b_4': 'images/bg_8b_4.jpg', 'bg_8b_5': 'images/bg_8b_5.jpg',
    'bg_9a_1': 'images/bg_9a_1.jpg', 'bg_9a_2': 'images/bg_9a_2.jpg', 'bg_9a_3': 'images/bg_9a_3.jpg',
    'bg_9a_4': 'images/bg_9a_4.jpg', 'bg_9a_5': 'images/bg_9a_5.jpg',
    'bg_9b_1': 'images/bg_9b_1.jpg', 'bg_9b_2': 'images/bg_9b_2.jpg', 'bg_9b_3': 'images/bg_9b_3.jpg',
    'bg_9b_4': 'images/bg_9b_4.jpg'
  };

})();
