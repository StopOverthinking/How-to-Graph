# AGENTS.md

- 사용자의 인풋이 적더라도 충분히 사고하여 응답한다. 더블 체크의 빈도를 높이고, 속도보다 질과 정확성을 우선한다.
- 화면과 UI를 만들거나 수정할 때는 공간을 항상 아낀다.
- 쓸데없는 장식 요소, 불필요한 제목/소제목, 설명문, 과한 여백, 장식용 감싸기 요소를 만들지 않는다.
- 사용자가 실제로 조작하거나 확인해야 하는 주 요소를 먼저 배치하고, 보조 액션은 가능한 한 작게 두며 레이아웃 공간을 차지하지 않게 한다.
- UI 변경에서는 사용자의 마지막 구체 지시가 기준이다. 이전 구현 의도보다 최신 지시의 문구, 위치, 선택자, 조작 흐름을 우선한다.

## Codex 빠른 작업 경로

- 작업 시작 시 `npm run codex:context`를 먼저 실행해 git 상태, 서버 응답, 주요 파일 위치를 한 번에 확인한다.
- 검증은 `npm run codex:verify`를 우선 사용한다. 기본 Vite 빌드가 실패하면 Codex 번들 Node로 한 번 재시도한다.
- 기본 탐색은 `rg`를 사용한다. `.ignore`가 `tmp/`, `dist/`, `node_modules/`, `*.log`를 제외하므로 오래된 임시 자료가 필요할 때만 직접 경로 또는 `rg -uuu`를 사용한다.
- 앱 로직은 주로 `src/main.jsx`, 시각/반응형 규칙은 `src/styles.css`, 외부 링크 절차는 `scripts/open-external-link.ps1`에 있다.
- QR/공유 문제는 현재 코드 기준 `packScopedShareState`, `unpackSharePayload`, `parseImportTextResult`, `applyScopedStateImport`를 함께 확인한다. 레거시 호환을 봐야 할 때는 `packShareState`와 `unpackShareState`도 같이 확인한다.
- 사용자용 실행은 기존 `서버 열기.cmd`, `외부 링크 열기.cmd`를 우선 사용한다.
- UI 변경 뒤에는 빌드 성공만으로 끝내지 말고 실제 브라우저나 DOM에서 동작과 표시를 확인한다.
- PowerShell에서 한국어 파일이 깨져 보이면 `Get-Content -Encoding UTF8`로 다시 확인한다.

## 앱 구조

- 이 앱은 React/Vite 단일 페이지 앱이다. `package.json`의 주요 명령은 `dev`, `build`, `preview`, `codex:context`, `codex:verify`다.
- `src/main.jsx`에 상태 모델, 정규화, 워크스페이스 UI, QR 공유, 그래프 렌더링, 보고서 이미지 흐름이 거의 모두 모여 있다. 새 파일을 만들기 전에 기존 함수와 컴포넌트를 먼저 찾는다.
- `src/styles.css`는 전체 뷰포트 고정 레이아웃, 표/그래프/QR/보고서 반응형 규칙을 담당한다. 모바일 수정은 JS보다 CSS 그리드/플렉스/높이 제약을 먼저 점검한다.
- 상단 탭은 `plan`, `table`, `graph`, `interpret` 네 개이며, QR 버튼은 별도 네비게이션 버튼으로 열린다.
- 주요 컴포넌트는 `App`, `PlanWorkspace`, `TableWorkspace`, `ManualTable`, `GraphWorkspace`, `GraphCanvas`, `InterpretationWorkspace`, `ShareDialog`, `CameraQrScanner`, `ReportDialog`다.

## 상태 모델

- 영속 앱 상태는 `state = { plan, table, graph }`이며 `how-to-graph-state` localStorage 키에 저장된다.
- `interpretationAnswers`는 `INTERPRETATION_STORAGE_KEY`(`how-to-graph-interpretation`)로 별도 저장한다. 메인 `state`에 합치지 않는다.
- `lastPlanStep`, `presentationVisible`, `activeTab`, 다이얼로그 열림 상태, 토스트는 로컬 UI 상태다. 사용자가 명시적으로 요청하지 않는 한 QR/공유 payload에 넣지 않는다.
- 기본값과 복구는 `createDefaultState`, `createDefaultGraphState`, `normalizeLoadedState`, `normalizeGraphState`, `normalizeInterpretationAnswers`를 통과시킨다. 저장/공유/구버전 payload는 항상 정규화 함수로 받아낸다.
- 그래프 상태는 공통 설정(`scale`, `mode`, `activeColor`, `activeType`)과 그래프별 그림(`bar`, `pie`)으로 나뉜다. 각 그림은 `dividers`, `fills`, `undoStack`, `labels`, `arrows`를 가진다.

## 계획/표 규칙

- `PlanWorkspace`의 항목 수는 표의 열 구조와 직결된다. 항목 추가/삭제를 바꿀 때는 `syncItems`, `getTableWidthForItemCount`, `fitHeaderRow`, `fitRows`, `buildHeaderRow`를 같이 확인한다.
- 표 너비는 `항목 수 + 2`다. 첫 열은 행 라벨, 마지막 열은 `합계` 열이다.
- 표 본문은 현재 `인원(명)`, `백분율(%)` 두 행이 표준이다. 행 수나 첫 열 라벨을 바꾸면 정규화, 렌더링, 공유 pack/unpack을 함께 고친다.
- `ManualTable`은 표 탭의 입력 표와 그래프 탭의 읽기 전용 미리보기를 함께 담당한다. 읽기 전용 표는 input을 남기지 말고 `span.manual-table-cell-text`처럼 실제 텍스트로 렌더링한다.

## 그래프 규칙

- 그래프 종류는 띠그래프와 원그래프를 동시에 보존하며, `activeType`은 현재 편집 대상만 가리킨다. 한 종류를 수정할 때 다른 종류의 그림 상태를 덮어쓰지 않는다.
- 작업 모드는 `divide`, `paint`, `text`, `arrow`다. 모드를 추가/제거하면 `GRAPH_MODE_CODES`, `GRAPH_MODES_BY_CODE`, 정규화, 공유, CSS `mode-*` 규칙을 모두 맞춘다.
- 색칠은 `graph.mode`, `graph.activeColor`, 각 그림의 `fills`가 함께 움직인다. 색상 스와치나 지우개를 바꾸면 저장/공유된 오래된 색상 코드도 확인한다.
- 실행 취소는 그림 단위의 `undoStack`에 의존한다. 나누기, 색칠, 화살표처럼 되돌릴 수 있는 동작을 추가하면 `makeGraphUndoSnapshot`, `withGraphUndo`, 비교 함수도 업데이트한다.
- 라벨은 `GraphCanvas` 안의 `graph-label-frame` / `graph-floating-label` 경계에서 관리한다. 본문 드래그는 이동, 전용 편집 핸들은 텍스트 편집이라는 분리를 유지한다.
- 라벨 텍스트는 한국어/영어/숫자가 섞여도 잘리지 않아야 한다. 너비, 줄바꿈 높이, 캔버스 클램프를 함께 확인하고 DOM에서 `scrollWidth <= clientWidth`, `scrollHeight <= clientHeight`를 검증한다.
- 화살표는 `arrows` 배열, `GraphArrowLayer`, `GraphArrowItem`, 공유의 `packArrowsForShare` / `decodeArrowsForShare`까지 이어진다. 보고서/정적 그래프에도 같이 보여야 한다.

## QR/공유 규칙

- 현재 공유 흐름은 `makeSharePayload -> packScopedShareState -> QR/hash URL 또는 chunked QR -> parseImportTextResult -> decodeShareToken -> unpackSharePayload -> applyScopedStateImport`다.
- `SHARE_VERSION` 3은 범위 공유(`plan`, `table`, `graph`, `interpret`, `full`)를 다룬다. `LEGACY_SHARE_VERSION` 2와 `packShareState`/`unpackShareState`는 구버전 전체 상태 호환용으로 남겨둔다.
- 현재 탭이 공유 범위를 결정한다. 그래프 탭에서는 QR 안에서 띠그래프/원그래프 종류를 선택할 수 있다.
- `interpretationAnswers`는 별도 상태로 유지하되, 해석 탭 또는 전체 공유에서만 `packInterpretationForShare`로 다룬다. 계획/표/그래프 payload에 몰래 섞지 않는다.
- QR 스캔은 `CameraQrScanner`가 `jsQR`로 읽은 문자열을 반드시 `parseImportTextResult()`에 넘긴다. 붙여넣기, hash URL, chunked QR, legacy payload와 다른 별도 파서를 만들지 않는다.
- 공유 데이터 모양을 바꾸면 pack과 unpack, hash에서 읽기, localStorage에서 읽기, 레거시 복구를 모두 검증한다.

## 레이아웃/UI 규칙

- 이 앱은 수업 중 조작 도구다. 첫 화면부터 실제 작업 화면이어야 하며, 랜딩/설명/장식용 섹션을 만들지 않는다.
- 전체 레이아웃은 `100vh`/`100dvh`, `overflow: hidden`, `minmax(0, 1fr)` 패턴에 기대고 있다. 페이지 스크롤을 되살리기보다 각 작업 영역 내부가 남은 높이를 나누도록 한다.
- 작은 화면에서는 모든 주요 텍스트와 조작 요소가 스크롤 없이 보이는 것이 우선이다. 320px 폭, 짧은 높이, 390x844 모바일 상태를 특히 확인한다.
- 카드 안에 카드를 중첩하거나, 장식용 배경/그라데이션/큰 히어로 영역을 추가하지 않는다.
- 버튼에는 가능한 `lucide-react` 아이콘을 사용한다. 외부 아이콘을 요구받으면 직접 SVG를 그리기보다 패키지 제공 아이콘을 먼저 찾는다.
- 텍스트가 버튼/표/라벨 안에서 넘치지 않게 한다. 필요하면 문구를 줄이고, 크기/행높이/폭 제약을 실제 DOM에서 확인한다.

## 실행/외부 링크

- 로컬 기준 URL은 `http://127.0.0.1:5173/`이다. 이 환경에서는 `localhost:5173`이 응답하지 않을 수 있으므로 HTTP 상태를 직접 확인한다.
- `scripts/open-external-link.ps1`는 의존성 확인, 로컬 서버 기동, `wrangler tunnel quick-start` 실행을 포함한다. 임시 공개 URL은 터널 출력이 원본이다.
- 외부 링크를 열어 달라는 요청은 설명이 아니라 실제 실행 요청으로 처리한다. 스크립트/런처를 먼저 확인하고, URL이 나오면 HTTP 확인 뒤 연다.

## 검증 기준

- 코드 변경 후 기본은 `npm run codex:verify`다. 기본 Vite 빌드가 멈추거나 실패하면 스크립트가 Codex 번들 Node로 재시도한다.
- UI 변경은 브라우저나 DOM으로 확인한다. 빌드만 성공하고 끝내지 않는다.
- 그래프/표/QR 변경은 저장 후 새로고침, QR/hash round trip, 구버전 payload 복구 가능성을 함께 생각한다.
- 브라우저가 빈 화면이면 CSS를 의심하기 전에 콘솔 오류와 누락 import를 먼저 확인한다.
- 스크린샷이 느리거나 실패하면 DOM 스냅샷, 콘솔 로그, 요소 크기/개수 검증을 우선 사용한다.

## Git 작업 주의

- 작업 트리가 더러울 수 있다. 사용자가 만든 변경을 되돌리지 않는다.
- 커밋/푸시 요청을 받으면 의도한 파일만 선별 스테이징한다. `.codex-remote-attachments/` 같은 관련 없는 산출물은 요청 없이는 포함하지 않는다.
- Windows PowerShell에서 upstream 표기는 `'@{u}'`처럼 따옴표로 감싼다.
