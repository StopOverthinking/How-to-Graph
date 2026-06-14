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
- 보고서 미리보기와 저장 PNG에서 그래프 크기/위치를 바꿀 때는 글자와 화살표의 저장 좌표를 단순 `rect.width * percent`로 다시 해석하지 않는다. `projectGraphCanvasPoint`, `getReportPreviewGraphSvgRect`, `getReportImageGraphSvgRect`처럼 편집 SVG 기준에서 보고서 SVG 기준으로 재투영하는 공통 함수를 함께 확인한다.
- 그래프 도형의 폭, 비율, 여백, `bar-svg`/`pie-svg` 크기, 보고서 그래프 배치를 바꾸면 라벨 위치, 라벨 크기, 화살표 시작/끝점, 화살표 두께가 편집 화면과 보고서 미리보기/저장 PNG에서 같은 상대 위치로 보이는지 같이 검증한다.

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
- 외부 링크를 열어 달라는 요청은 사용자용 `외부 링크 열기.cmd`를 우선 그대로 실행한다. 링크 확인을 위해 출력 캡처가 필요할 때도 런처를 우회하지 말고 같은 `.cmd`를 백그라운드/리다이렉트로 실행해 터널 출력의 `trycloudflare.com` URL을 읽는다.
- 외부 링크를 열어 달라는 요청은 설명이 아니라 실제 실행 요청으로 처리한다. 스크립트/런처를 먼저 확인하고, URL이 나오면 HTTP 확인 뒤 연다.

## 발표용 애니메이션/녹화

- 직접 화면 녹화보다 `scripts/record-demo.mjs`의 Playwright 기반 녹화를 우선 사용한다. 이 방식은 실제 앱을 조작하면서 포인터, 클릭 효과, 설명 오버레이, 음향을 결정적으로 재현한다.
- 데모 오버레이는 `?demo=1` 또는 `?recordDemo=1`에서만 켜진다. `src/main.jsx`의 `DemoOverlay`가 `window.HowToGraphDemo` API를 노출하며, 스크립트는 `movePointer`, `clickAt`, `clickTarget`, `showSpotlight`, `clearSpotlight`를 사용한다.
- 녹화 대상 요소에는 안정적인 `data-demo-id`를 붙인다. 스크립트에서는 `selectorForDemoId()`로 접근하고, 마우스가 입력 텍스트를 가리지 않도록 입력칸 오른쪽처럼 실제 클릭 좌표를 명시한다.
- 기본 녹화 명령은 전체 데모 `npm run demo:record`, 계획 단계 데모 `npm run demo:record:plan`이다. 출력은 `output/playwright/demo/<scenario>/<timestamp>/` 아래에 저장한다. 기본 녹화는 `.webm`과 음향 포함 `.mp4`를 만들며, 프레임 시퀀스는 움직임보다 정지 화질 검증이 중요할 때만 `DEMO_CAPTURE=frames`로 명시해 사용한다.
- `DEMO_ZOOM`이 1보다 큰 녹화는 업스케일링으로 처리하지 않는다. 기본 `video` 모드에서는 출력 뷰포트를 `DEMO_WIDTH` × `DEMO_HEIGHT`로 두고 앱을 `DEMO_WIDTH / DEMO_ZOOM` × `DEMO_HEIGHT / DEMO_ZOOM` 레이아웃으로 CSS `zoom` 확대하여 Playwright 비디오의 25fps와 음향 싱크를 유지한다. 예를 들어 FHD에서 요소를 크게 보이게 하려면 `DEMO_WIDTH=1920 DEMO_HEIGHT=1080 DEMO_ZOOM=1.5`를 사용해 `1280x720` 레이아웃을 FHD 비디오에 직접 렌더링한다. `DEMO_CAPTURE=frames`는 스크린샷 반복 저장이라 시스템 부하가 크면 FPS와 싱크가 흔들릴 수 있으므로 발표용 최종 영상의 기본값으로 쓰지 않는다.
- 녹화 URL은 `http://127.0.0.1:5173/?demo=1&demoReset=1`을 기본으로 한다. 스크립트가 서버 응답을 확인하고 필요하면 Vite dev server를 기동하되, 결과 확인에는 `localhost`보다 `127.0.0.1`을 사용한다.
- 발표용 포인터는 앱의 주색 `#95d9d1`과 어울리는 강조색 `#cb838c` 단색을 사용하고, 흰색 얇은 테두리(`stroke-width: 1.8`)를 둔다. 네온 효과와 포인터 안의 별도 점은 쓰지 않는다.
- 설명 오버레이는 배경을 어둡게 처리한 spotlight와 함께 사용한다. 설명 텍스트는 짧게 쓰고, `Gowun Dodum` 폰트와 가운데 정렬을 유지하며, 네온처럼 보이는 밝은 역방향 그림자 대신 차분하고 은은한 드롭 섀도우를 사용한다.
- 클릭/강조/타이핑 음향은 `public/demo-sounds/`의 `click.ogg`, `highlight.ogg`, `typing.ogg`를 사용한다. 타이핑은 글자 입력 중 `recordTypingSounds()`로 연속 이벤트를 찍고, `ffmpeg-static`으로 AAC 오디오가 포함된 MP4를 만든다.
- 녹화 후에는 `npm run codex:verify`와 실제 녹화 명령을 모두 확인한다. 오버레이 스타일 변경은 필요하면 짧은 Playwright 캡처로 DOM 계산값과 스크린샷을 같이 확인한다.

### 계획 단계 발표 영상 기준값

- 마지막 승인본과 같은 계획 단계 영상을 만들 때는 PowerShell에서 `$env:DEMO_WIDTH='1920'; $env:DEMO_HEIGHT='1080'; $env:DEMO_ZOOM='1.5'; $env:DEMO_CAPTURE='video'; npm run demo:record:plan`을 사용한다.
- 녹화 URL은 `http://127.0.0.1:5173/?demo=1`이며, 시나리오 시작 전에 localStorage를 2개 빈 항목 상태로 seed한다. 출력은 `output/playwright/demo/plan/<timestamp>/` 아래의 Playwright `.webm`, 음향 포함 `.mp4`, 최종 스크린샷, `.sound-events.json`, `recording-meta.json`이다.
- 비디오 제작 방식은 Playwright Chromium video capture다. 출력 뷰포트와 `recordVideo.size`는 `1920x1080`, `deviceScaleFactor`는 `1`, `locale`은 `ko-KR`, 기본 headless 실행이다. `DEMO_ZOOM=1.5`에서는 앱을 `1280x720` 레이아웃으로 만든 뒤 CSS `zoom: 1.5`로 FHD 안에 직접 렌더링한다. `window.__HOW_TO_GRAPH_DEMO_VIEWPORT_ZOOM=1.5`로 데모 오버레이 좌표를 보정한다.
- MP4 합성은 `ffmpeg-static`을 사용한다. WebM 비디오는 `recordingTrimStartMs`부터 `trim`, `setpts=PTS-STARTPTS`로 정렬하고, `libx264`, `preset slow`, `crf 15`, `+faststart`, `yuv420p`로 인코딩한다. 오디오는 48kHz stereo silence track 위에 이벤트 사운드를 `adelay`로 배치한 뒤 AAC 160k로 만들고 MP4에는 copy한다.
- 사운드 파일은 `typing.ogg`, `click.ogg`, `highlight.ogg`이며 전체 볼륨 배율은 `1.5`다. 최종 볼륨은 타이핑 `0.42`, 클릭 `0.51`, 강조 `0.69`다. 타이핑 사운드는 공백을 제외한 글자마다 찍고, 사운드 간격은 `Math.max(32, keyDelay)`다.
- 계획 단계 시나리오는 반드시 항목 `탄산음료`, `과일주스`, `차/커피`, `기타`와 제목 `우리 반 학생이 좋아하는 음료수 종류의 비율`을 사용한다. 설명 문구는 `표로 정리할 항목 정하기`, `표의 이름 정하기`, `계획 확인`만 사용한다.
- 시작 상태에서 첫 번째 항목 입력칸 오른쪽(`xRatio: 0.86`)을 클릭한다. 이 최초 클릭은 포인터 이동 `220ms`, 클릭 애니메이션 `180ms` 기본값을 사용한다. 곧바로 첫 번째 항목 입력칸을 `placement: right`로 spotlight 처리하고 `표로 정리할 항목 정하기`를 `3000ms` 표시한 뒤 `clearSpotlight`한다.
- 항목 입력 구간은 각 입력 및 추가 동작 뒤 `500ms` 지연한다. 항목 입력은 모두 입력칸 오른쪽(`clickXRatio: 0.86`)을 클릭하고, 포인터 이동 `110ms`, 클릭 애니메이션 `90ms`, 키 입력 지연 `28ms/글자`, 타이핑 사운드 간격 `32ms/글자`를 사용한다. `탄산음료`, `과일주스`를 입력한 뒤 `plan-add-item`을 2회 클릭하고, `차/커피`, `기타`를 입력한다.
- 항목 단계의 `다음` 버튼은 기본 `clickTarget` 경로로 클릭하고 클릭 뒤 `1200ms` 지연한다. 그 다음 제목 입력칸을 `placement: bottom`으로 spotlight 처리하고 `표의 이름 정하기`를 `3000ms` 표시한 뒤 `clearSpotlight`한다.
- 제목 입력은 기본 `clickTarget` 경로로 입력칸을 클릭하고 `Control+A` 후 입력한다. 키 입력 지연은 `45ms/글자`, 타이핑 사운드 간격은 `45ms/글자`, 입력 뒤 지연은 `1500ms`다.
- 제목 단계의 `다음` 버튼은 기본 `clickTarget` 경로로 클릭하고 클릭 뒤 `1000ms` 지연한다. 이후 `.plan-sheet-screen` 전체를 `placement: bottom`으로 spotlight 처리하고 `계획 확인`을 `3000ms` 표시한 뒤 `clearSpotlight`, 마지막으로 `300ms` 대기한다.
- 오버레이의 기본 spotlight padding은 `12px`, radius는 `10px`, spotlight 전환은 `220ms`다. 클릭 ring은 `720ms`, target glow는 `560ms`, callout 위치 전환은 `220ms`다.
- 설명 텍스트박스는 `min-width: 260px`, `padding: 14px 16px`, `border-radius: 8px`, `background: #f7f8f4`, `font-family: Gowun Dodum`, 가운데 정렬이다. 그림자는 `0 16px 34px rgba(10, 16, 24, 0.20)`, `0 3px 10px rgba(10, 16, 24, 0.10)`, `inset 0 1px 0 rgba(255,255,255,0.72)`만 사용한다.
- 발표용 포인터는 `52x52px` 컨테이너 안에 `MousePointer2` `44px`를 렌더링한다. 포인터 색은 `#cb838c`, 흰색 테두리 stroke width는 `1.8`, 기본 위치 보정은 `translate(-7px, -5px)`, 클릭 중 scale은 `0.9`다.
- 기준 검증은 MP4가 `1920x1080`, `25fps`, H.264 video, AAC audio를 포함하고 `ffmpeg -v error -i <mp4> -f null -`가 성공하는 것이다. 대표 프레임은 첫 항목 설명, 제목 설명, 계획 확인 구간을 추출해 요소 크기, spotlight 위치, 포인터 위치, 설명 텍스트박스 그림자를 눈으로 확인한다.

### 그래프 만들기 발표 영상 기준값

- 마지막 승인본과 같은 그래프 만들기 영상을 만들 때는 PowerShell에서 `$env:DEMO_WIDTH='1920'; $env:DEMO_HEIGHT='1080'; $env:DEMO_ZOOM='1.5'; $env:DEMO_CAPTURE='video'; npm run demo:record:graph`를 사용한다.
- 녹화는 표 탭에서 시작하며 localStorage를 제목 `우리 반 학생이 좋아하는 음료수 종류의 비율`, 항목 `탄산음료`, `과일주스`, `차/커피`, `기타`, 인원 `8`, `6`, `4`, `2`, `20`, 백분율 `40`, `30`, `20`, `10`, `100`으로 seed한다.
- 그래프 눈금 크기는 `10%`이며 띠그래프와 원그래프 모두 구분선 `40%`, `70%`, `90%`를 사용한다.
- 설명 문구는 순서대로 `그래프 그리기 시작`, `그래프 종류 선택`, `눈금 크기 선택`, `그래프 칸 나누기`, `색칠하기`, `항목 이름과 백분율 적기`, `좁은 칸은 화살표 사용`, `친구의 그래프를 받아오기`, `완성 후 보고서 다운로드`, `다운로드한 보고서를 띵커벨에 제출`만 사용한다.
- 라벨은 `탄산음료\n(40%)`, `과일주스\n(30%)`, `차/커피\n(20%)`, `기타\n(10%)` 형식으로 넣는다. 좁은 `기타` 칸은 칸 밖 라벨과 화살표를 사용한다.
- QR 장면은 QR 버튼을 하이라이트한 뒤 실제 QR 창을 2초간 보여주고 닫는다. 보고서 장면은 보고서 이미지 버튼을 하이라이트한 뒤 실제 이미지 저장을 실행하고 창을 닫는다.
- 완성 영상과 보고서 PNG 같은 결과물은 `output/playwright/demo/graph/<timestamp>/` 아래에 생성되며 Git에는 포함하지 않는다. 재현용 스크립트, 데모 사운드, 패키지 의존성, 데모 모드 UI 코드만 커밋한다.

## 검증 기준

- 코드 변경 후 기본은 `npm run codex:verify`다. 기본 Vite 빌드가 멈추거나 실패하면 스크립트가 Codex 번들 Node로 재시도한다.
- UI 변경은 브라우저나 DOM으로 확인한다. 빌드만 성공하고 끝내지 않는다.
- 그래프 관련 UI 변경은 활성 그래프 화면과 보고서 미리보기/저장 이미지 흐름을 함께 확인한다. 특히 라벨/화살표가 있는 상태에서 편집 화면의 상대 위치와 보고서 결과의 상대 위치가 일치하는지 DOM 좌표 또는 스크린샷으로 비교한다.
- 그래프/표/QR 변경은 저장 후 새로고침, QR/hash round trip, 구버전 payload 복구 가능성을 함께 생각한다.
- 브라우저가 빈 화면이면 CSS를 의심하기 전에 콘솔 오류와 누락 import를 먼저 확인한다.
- 스크린샷이 느리거나 실패하면 DOM 스냅샷, 콘솔 로그, 요소 크기/개수 검증을 우선 사용한다.

## Git 작업 주의

- 작업 트리가 더러울 수 있다. 사용자가 만든 변경을 되돌리지 않는다.
- 커밋/푸시 요청을 받으면 의도한 파일만 선별 스테이징한다. `.codex-remote-attachments/` 같은 관련 없는 산출물은 요청 없이는 포함하지 않는다.
- Windows PowerShell에서 upstream 표기는 `'@{u}'`처럼 따옴표로 감싼다.
