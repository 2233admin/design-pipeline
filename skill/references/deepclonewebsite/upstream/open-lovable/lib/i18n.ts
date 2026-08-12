/**
 * 前端多语言 —— 英/中/韩/日, 缺项英文兜底。
 *
 * 纯客户端字典 + t(locale,key,vars)。key 走扁平命名, {var} 占位。
 * en 为完整基准; 其它语言缺 key 时自动回落 en。
 */

export type Locale = 'en' | 'zh' | 'ko' | 'ja';

export const LOCALES: Array<{ code: Locale; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
];

type Dict = Record<string, string>;

const en: Dict = {
  'app.title': 'Deep Site Clone · Tasks',
  'app.subtitle': 'Create a task → pick depth & outputs → log in via a real browser → hit Start, then it runs fully automatically to completion. Saved per domain, re-runnable.',

  'form.startUrl': 'Start URL',
  'form.taskName': 'Task name (optional, defaults to domain)',
  'form.taskNamePh': 'e.g. TapTap home clone',
  'form.depth': 'Crawl depth (single choice)',
  'form.outputs': 'Data outputs (multiple choice)',
  'form.aiNote': 'Analysis outputs auto-build the offline site first, then reverse-engineer. Design system needs CSS. AI is used only in “plan strategy” and “reverse analysis”.',
  'form.create': 'Create task & open browser to log in',
  'form.creating': 'Creating…',
  'form.needOutput': 'Pick at least one data output',

  'depth.structure': 'Structure',
  'depth.structure.hint': 'Same-template pages captured once (fast)',
  'depth.full': 'Whole site',
  'depth.full.hint': 'Visit every page + download every asset (slow)',
  'depth.short.structure': 'Structure',
  'depth.short.full': 'Whole site',

  'out.site': 'Offline site',
  'out.site.hint': 'Faithfully rebuilt, opens offline',
  'out.product': 'Product structure',
  'out.product.hint': 'AI infers IA / feature modules',
  'out.dataModel': 'Data model',
  'out.dataModel.hint': 'AI infers backend entities',
  'out.backend': 'Backend requirements',
  'out.backend.hint': 'AI infers REST API doc',
  'out.design': 'Design system',
  'out.design.hint': 'AI extracts design tokens / components',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.model': 'AI model',
  'settings.model.hint': 'Used for plan strategy & reverse analysis',
  'settings.key': 'mdbox key',
  'settings.key.set': 'Set',
  'settings.key.unset': 'Not set',
  'settings.key.ph': 'Leave blank to keep unchanged',
  'settings.getKey': 'Get API Key ↗',
  'settings.save': 'Save',
  'settings.saving': 'Saving…',
  'settings.saved': 'Saved',

  'login.title': 'Login gate',
  'login.reused': '✓ Reused your last login for this site. Confirm you are logged in and on the start page in the popped-up browser, then hit Start.',
  'login.fresh': 'A browser opened on your desktop. Log in / navigate to the start page in that window, then hit Start. Login is saved once.',
  'login.start': 'Start (auto-run to completion)',
  'login.starting': 'Starting…',
  'login.cancel': 'Cancel',

  'run.hint': 'Running… you can watch tabs flip in the browser window. This page refreshes progress every 2s.',
  'run.waiting': 'Waiting for first progress…',
  'run.newTask': 'New task',

  'prod.openSite': '▶ Open offline site',
  'prod.openDir': '📁 Open local folder',
  'prod.pagesAssets': '{pages} pages / {assets} assets',

  'history.title': 'History (by domain)',
  'history.empty': 'No tasks yet.',
  'history.count': '{n} tasks',
  'history.rerun': 'Re-run',
  'history.delete': 'Delete',
  'history.confirmDelete': 'Delete task “{name}” and all its outputs?',

  'status.created': 'Created',
  'status.awaiting-login': 'Awaiting login',
  'status.crawling': 'Crawling',
  'status.planning': 'LLM planning',
  'status.building': 'Building',
  'status.distilling': 'Distilling',
  'status.analyzing': 'LLM analyzing',
  'status.done': 'Done',
  'status.error': 'Error',

  // 后端进度(run-task/子模块)—— 服务端也用 t() 取
  'p.crawl.full': 'Crawling whole site (visiting every page)…',
  'p.crawl.structure': 'Crawling site structure (sampling same templates)…',
  'p.crawl.done': 'Crawled: {pages} pages / {types} types',
  'p.plan.start': 'LLM deciding capture strategy (merge templates / pick representatives)…',
  'p.plan.done': 'Strategy: {n} types to capture',
  'p.build.full': 'Faithfully capturing {n} pages + downloading assets…',
  'p.build.structure': 'Faithfully capturing representative pages + downloading assets…',
  'p.build.page': 'Capturing {label} …',
  'p.build.pageFail': '✗ {label} capture failed: {err}',
  'p.build.pageOk': '✓ {label} → {file} ({n} assets)',
  'p.build.done': 'Offline site: {pages} pages / {assets} assets',
  'p.distill.start': 'Distilling page semantic skeletons…',
  'p.distill.page': 'Distilling {label}',
  'p.analyze.start': 'LLM reverse-engineering product docs…',
  'p.analyze.gen': 'LLM generating: {title}',
  'p.done': '✅ Task complete',
  'p.error': '✗ {msg}',

  // 逆推文档标题(作为 .md 的 # 标题, 随所选语言)
  'doc.product': 'Product Structure & Information Architecture',
  'doc.dataModel': 'Data Model (reverse-engineered)',
  'doc.backend': 'Backend Requirements (API)',
  'doc.design': 'Components & Design System',
};

const zh: Dict = {
  'app.title': '整站深度克隆 · 任务',
  'app.subtitle': '建任务 → 选深度与产物 → 打开真实浏览器登录 → 点开始,之后全自动按序跑到完成。按域名保存、可重跑。',

  'form.startUrl': '起点 URL',
  'form.taskName': '任务名(可留空,默认用域名)',
  'form.taskNamePh': '例如:TapTap 首页克隆',
  'form.depth': '爬虫深度(单选)',
  'form.outputs': '数据产物(多选)',
  'form.aiNote': '分析类产物会自动先重建离线站再逆推;设计系统需要下载 CSS。AI 只用在「定策略」和「逆推分析」两处。',
  'form.create': '创建任务并打开浏览器登录',
  'form.creating': '创建中…',
  'form.needOutput': '至少选一个数据产物',

  'depth.structure': '网站结构',
  'depth.structure.hint': '同模板页只抓 1 个代表页(快)',
  'depth.full': '整站',
  'depth.full.hint': '访问所有页面 + 下载所有资源(慢)',
  'depth.short.structure': '结构',
  'depth.short.full': '整站',

  'out.site': '离线多页站',
  'out.site.hint': '忠实抓取重建可离线打开的站',
  'out.product': '产品结构',
  'out.product.hint': 'AI 逆推信息架构/功能模块',
  'out.dataModel': '数据模型',
  'out.dataModel.hint': 'AI 逆推后端数据实体',
  'out.backend': '服务端需求',
  'out.backend.hint': 'AI 逆推 REST API 文档',
  'out.design': '设计系统',
  'out.design.hint': 'AI 提取设计 token / 组件',

  'settings.title': '设置',
  'settings.language': '语言',
  'settings.model': 'AI 模型',
  'settings.model.hint': '用于「定策略」和「逆推分析」',
  'settings.key': 'mdbox 密钥',
  'settings.key.set': '已设置',
  'settings.key.unset': '未设置',
  'settings.key.ph': '留空则不修改',
  'settings.getKey': '获取 API Key ↗',
  'settings.save': '保存',
  'settings.saving': '保存中…',
  'settings.saved': '已保存',

  'login.title': '登录门',
  'login.reused': '✓ 已复用该站上次登录。请在弹出的浏览器窗口确认已登录、导航到起点页,然后点「开始」。',
  'login.fresh': '浏览器已在你桌面弹出。请在那个窗口登录 / 导航到起点页,完成后点「开始」。登录一次即保存。',
  'login.start': '开始(全自动跑到完成)',
  'login.starting': '启动中…',
  'login.cancel': '取消',

  'run.hint': '运行中…可在浏览器窗口看到新标签翻页。此页每 2 秒刷新进度。',
  'run.waiting': '等待首条进度…',
  'run.newTask': '建新任务',

  'prod.openSite': '▶ 打开离线站',
  'prod.openDir': '📁 打开本地目录',
  'prod.pagesAssets': '{pages} 页 / {assets} 资源',

  'history.title': '历史任务(按域名)',
  'history.empty': '还没有任务。',
  'history.count': '{n} 个任务',
  'history.rerun': '重跑',
  'history.delete': '删除',
  'history.confirmDelete': '删除任务「{name}」及其所有产物?',

  'status.created': '待启动',
  'status.awaiting-login': '等待登录',
  'status.crawling': '爬取中',
  'status.planning': 'LLM 定策略',
  'status.building': '抓取重建',
  'status.distilling': '蒸馏页面',
  'status.analyzing': 'LLM 逆推分析',
  'status.done': '已完成',
  'status.error': '出错',

  'p.crawl.full': '整站爬取(访问所有页面)…',
  'p.crawl.structure': '爬取网站结构(同模板取样)…',
  'p.crawl.done': '爬完: {pages} 页 / {types} 种类型',
  'p.plan.start': 'LLM 定抓取策略(归并同模板/挑代表)…',
  'p.plan.done': '策略: {n} 类待抓',
  'p.build.full': '忠实抓取 {n} 页 + 下载资源…',
  'p.build.structure': '忠实抓取代表页 + 下载资源…',
  'p.build.page': '抓取 {label} …',
  'p.build.pageFail': '✗ {label} 抓取失败: {err}',
  'p.build.pageOk': '✓ {label} → {file}({n} 资源)',
  'p.build.done': '离线站: {pages} 页 / {assets} 资源',
  'p.distill.start': '蒸馏页面语义骨架…',
  'p.distill.page': '蒸馏 {label}',
  'p.analyze.start': 'LLM 逆推产品文档…',
  'p.analyze.gen': 'LLM 生成: {title}',
  'p.done': '✅ 任务完成',
  'p.error': '✗ {msg}',

  'doc.product': '产品结构与信息架构',
  'doc.dataModel': '数据模型(逆推)',
  'doc.backend': '服务端需求文档(API)',
  'doc.design': '组件与设计系统',
};

const ko: Dict = {
  'app.title': '사이트 심층 복제 · 작업',
  'app.subtitle': '작업 생성 → 깊이·산출물 선택 → 실제 브라우저로 로그인 → 시작을 누르면 완료까지 완전 자동 실행. 도메인별 저장, 재실행 가능.',

  'form.startUrl': '시작 URL',
  'form.taskName': '작업 이름 (선택, 기본값은 도메인)',
  'form.taskNamePh': '예: TapTap 홈 복제',
  'form.depth': '크롤링 깊이 (단일 선택)',
  'form.outputs': '데이터 산출물 (복수 선택)',
  'form.aiNote': '분석 산출물은 먼저 오프라인 사이트를 재구성한 뒤 역추론합니다. 디자인 시스템은 CSS가 필요합니다. AI는 “전략 수립”과 “역분석” 두 곳에만 사용됩니다.',
  'form.create': '작업 생성 후 브라우저 열어 로그인',
  'form.creating': '생성 중…',
  'form.needOutput': '데이터 산출물을 하나 이상 선택하세요',

  'depth.structure': '사이트 구조',
  'depth.structure.hint': '동일 템플릿 페이지는 대표 1개만 (빠름)',
  'depth.full': '전체 사이트',
  'depth.full.hint': '모든 페이지 방문 + 모든 리소스 다운로드 (느림)',
  'depth.short.structure': '구조',
  'depth.short.full': '전체',

  'out.site': '오프라인 사이트',
  'out.site.hint': '충실히 재구성, 오프라인 열람 가능',
  'out.product': '제품 구조',
  'out.product.hint': 'AI가 정보구조/기능 모듈 추론',
  'out.dataModel': '데이터 모델',
  'out.dataModel.hint': 'AI가 백엔드 엔터티 추론',
  'out.backend': '서버 요구사항',
  'out.backend.hint': 'AI가 REST API 문서 추론',
  'out.design': '디자인 시스템',
  'out.design.hint': 'AI가 디자인 토큰/컴포넌트 추출',

  'settings.title': '설정',
  'settings.language': '언어',
  'settings.model': 'AI 모델',
  'settings.model.hint': '전략 수립 및 역분석에 사용',
  'settings.key': 'mdbox 키',
  'settings.key.set': '설정됨',
  'settings.key.unset': '미설정',
  'settings.key.ph': '비워두면 변경 안 함',
  'settings.getKey': 'API Key 발급 ↗',
  'settings.save': '저장',
  'settings.saving': '저장 중…',
  'settings.saved': '저장됨',

  'login.title': '로그인 관문',
  'login.reused': '✓ 이 사이트의 지난 로그인을 재사용했습니다. 열린 브라우저 창에서 로그인 상태와 시작 페이지를 확인한 뒤 시작을 누르세요.',
  'login.fresh': '바탕화면에 브라우저가 열렸습니다. 그 창에서 로그인 / 시작 페이지로 이동한 뒤 시작을 누르세요. 로그인은 한 번만 저장됩니다.',
  'login.start': '시작 (완료까지 자동 실행)',
  'login.starting': '시작 중…',
  'login.cancel': '취소',

  'run.hint': '실행 중… 브라우저 창에서 탭이 넘어가는 것을 볼 수 있습니다. 이 페이지는 2초마다 진행률을 새로고침합니다.',
  'run.waiting': '첫 진행 상황 대기 중…',
  'run.newTask': '새 작업',

  'prod.openSite': '▶ 오프라인 사이트 열기',
  'prod.openDir': '📁 로컬 폴더 열기',
  'prod.pagesAssets': '{pages} 페이지 / {assets} 리소스',

  'history.title': '기록 (도메인별)',
  'history.empty': '아직 작업이 없습니다.',
  'history.count': '작업 {n}개',
  'history.rerun': '다시 실행',
  'history.delete': '삭제',
  'history.confirmDelete': '작업 “{name}” 및 모든 산출물을 삭제할까요?',

  'status.created': '대기 중',
  'status.awaiting-login': '로그인 대기',
  'status.crawling': '크롤링 중',
  'status.planning': 'LLM 전략 수립',
  'status.building': '재구성 중',
  'status.distilling': '페이지 추출',
  'status.analyzing': 'LLM 역분석',
  'status.done': '완료',
  'status.error': '오류',

  'p.crawl.full': '전체 사이트 크롤링(모든 페이지 방문)…',
  'p.crawl.structure': '사이트 구조 크롤링(동일 템플릿 샘플링)…',
  'p.crawl.done': '크롤링 완료: {pages} 페이지 / {types} 유형',
  'p.plan.start': 'LLM이 캡처 전략 수립(템플릿 병합/대표 선정)…',
  'p.plan.done': '전략: {n} 유형 캡처 예정',
  'p.build.full': '{n} 페이지 충실 캡처 + 리소스 다운로드…',
  'p.build.structure': '대표 페이지 충실 캡처 + 리소스 다운로드…',
  'p.build.page': '{label} 캡처 중 …',
  'p.build.pageFail': '✗ {label} 캡처 실패: {err}',
  'p.build.pageOk': '✓ {label} → {file}({n} 리소스)',
  'p.build.done': '오프라인 사이트: {pages} 페이지 / {assets} 리소스',
  'p.distill.start': '페이지 의미 골격 추출…',
  'p.distill.page': '{label} 추출',
  'p.analyze.start': 'LLM이 제품 문서 역추론…',
  'p.analyze.gen': 'LLM 생성: {title}',
  'p.done': '✅ 작업 완료',
  'p.error': '✗ {msg}',

  'doc.product': '제품 구조 및 정보 아키텍처',
  'doc.dataModel': '데이터 모델(역추론)',
  'doc.backend': '서버 요구사항 문서(API)',
  'doc.design': '컴포넌트 및 디자인 시스템',
};

const ja: Dict = {
  'app.title': 'サイト詳細クローン · タスク',
  'app.subtitle': 'タスク作成 → 深さと成果物を選択 → 実ブラウザでログイン → 開始を押すと完了まで全自動で実行。ドメインごとに保存、再実行可能。',

  'form.startUrl': '開始 URL',
  'form.taskName': 'タスク名(任意、既定はドメイン)',
  'form.taskNamePh': '例:TapTap ホームのクローン',
  'form.depth': 'クロール深度(単一選択)',
  'form.outputs': 'データ成果物(複数選択)',
  'form.aiNote': '分析系の成果物は先にオフラインサイトを再構築してから逆解析します。デザインシステムには CSS が必要です。AI は「戦略立案」と「逆解析」の 2 箇所のみで使用します。',
  'form.create': 'タスクを作成してブラウザを開きログイン',
  'form.creating': '作成中…',
  'form.needOutput': 'データ成果物を1つ以上選択してください',

  'depth.structure': 'サイト構造',
  'depth.structure.hint': '同一テンプレートは代表1件のみ取得(速い)',
  'depth.full': 'サイト全体',
  'depth.full.hint': '全ページ訪問 + 全リソースをダウンロード(遅い)',
  'depth.short.structure': '構造',
  'depth.short.full': '全体',

  'out.site': 'オフラインサイト',
  'out.site.hint': '忠実に再構築、オフラインで開ける',
  'out.product': 'プロダクト構造',
  'out.product.hint': 'AI が情報設計/機能モジュールを推論',
  'out.dataModel': 'データモデル',
  'out.dataModel.hint': 'AI がバックエンドのエンティティを推論',
  'out.backend': 'サーバー要件',
  'out.backend.hint': 'AI が REST API ドキュメントを推論',
  'out.design': 'デザインシステム',
  'out.design.hint': 'AI がデザイントークン/コンポーネントを抽出',

  'settings.title': '設定',
  'settings.language': '言語',
  'settings.model': 'AI モデル',
  'settings.model.hint': '戦略立案と逆解析に使用',
  'settings.key': 'mdbox キー',
  'settings.key.set': '設定済み',
  'settings.key.unset': '未設定',
  'settings.key.ph': '空欄なら変更しません',
  'settings.getKey': 'API Key を取得 ↗',
  'settings.save': '保存',
  'settings.saving': '保存中…',
  'settings.saved': '保存しました',

  'login.title': 'ログインゲート',
  'login.reused': '✓ このサイトの前回のログインを再利用しました。開いたブラウザでログイン状態と開始ページを確認してから開始を押してください。',
  'login.fresh': 'デスクトップにブラウザが開きました。その画面でログイン / 開始ページへ移動し、完了したら開始を押してください。ログインは一度だけ保存されます。',
  'login.start': '開始(完了まで自動実行)',
  'login.starting': '起動中…',
  'login.cancel': 'キャンセル',

  'run.hint': '実行中…ブラウザ画面でタブが切り替わるのが見えます。このページは2秒ごとに進捗を更新します。',
  'run.waiting': '最初の進捗を待っています…',
  'run.newTask': '新規タスク',

  'prod.openSite': '▶ オフラインサイトを開く',
  'prod.openDir': '📁 ローカルフォルダを開く',
  'prod.pagesAssets': '{pages} ページ / {assets} リソース',

  'history.title': '履歴(ドメイン別)',
  'history.empty': 'まだタスクがありません。',
  'history.count': 'タスク {n} 件',
  'history.rerun': '再実行',
  'history.delete': '削除',
  'history.confirmDelete': 'タスク「{name}」とすべての成果物を削除しますか?',

  'status.created': '待機中',
  'status.awaiting-login': 'ログイン待ち',
  'status.crawling': 'クロール中',
  'status.planning': 'LLM 戦略立案',
  'status.building': '再構築中',
  'status.distilling': 'ページ抽出',
  'status.analyzing': 'LLM 逆解析',
  'status.done': '完了',
  'status.error': 'エラー',

  'p.crawl.full': 'サイト全体をクロール(全ページを訪問)…',
  'p.crawl.structure': 'サイト構造をクロール(同一テンプレートをサンプリング)…',
  'p.crawl.done': 'クロール完了: {pages} ページ / {types} 種類',
  'p.plan.start': 'LLM がキャプチャ戦略を決定(テンプレート統合/代表選定)…',
  'p.plan.done': '戦略: {n} 種類をキャプチャ予定',
  'p.build.full': '{n} ページを忠実にキャプチャ + リソースをダウンロード…',
  'p.build.structure': '代表ページを忠実にキャプチャ + リソースをダウンロード…',
  'p.build.page': '{label} をキャプチャ中 …',
  'p.build.pageFail': '✗ {label} キャプチャ失敗: {err}',
  'p.build.pageOk': '✓ {label} → {file}({n} リソース)',
  'p.build.done': 'オフラインサイト: {pages} ページ / {assets} リソース',
  'p.distill.start': 'ページの意味骨格を抽出…',
  'p.distill.page': '{label} を抽出',
  'p.analyze.start': 'LLM がプロダクト文書を逆解析…',
  'p.analyze.gen': 'LLM 生成: {title}',
  'p.done': '✅ タスク完了',
  'p.error': '✗ {msg}',

  'doc.product': 'プロダクト構造と情報アーキテクチャ',
  'doc.dataModel': 'データモデル(逆解析)',
  'doc.backend': 'サーバー要件ドキュメント(API)',
  'doc.design': 'コンポーネントとデザインシステム',
};

const DICTS: Record<Locale, Dict> = { en, zh, ko, ja };

/** 从浏览器语言猜首选 locale, 不认得则 en。 */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  const l = (navigator.language || 'en').toLowerCase();
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('ko')) return 'ko';
  if (l.startsWith('ja')) return 'ja';
  return 'en';
}

/** 取译文, 缺则英文兜底, 再缺返回 key。{var} 用 vars 替换。 */
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[locale]?.[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** LLM 提示词里用的语言名(让模型用该语言产出文档/label)。 */
export function llmLang(locale: Locale): string {
  return ({ en: 'English', zh: '简体中文', ko: '한국어', ja: '日本語' } as Record<Locale, string>)[locale] || 'English';
}
