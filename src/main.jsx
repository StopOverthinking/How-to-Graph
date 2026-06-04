import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import {
  ArrowLeft,
  Brush,
  Check,
  Circle,
  ClipboardList,
  Download,
  Eraser,
  Grid3X3,
  MousePointer2,
  PenLine,
  PieChart,
  Plus,
  QrCode,
  RotateCcw,
  Share2,
  Table2,
  Trash2,
  Undo2,
  UsersRound
} from 'lucide-react';
import './styles.css';

const TABS = [
  { id: 'survey', label: '조사', icon: ClipboardList },
  { id: 'plan', label: '계획 세우기', icon: UsersRound },
  { id: 'table', label: '표 그리기', icon: Table2 },
  { id: 'graph', label: '그래프 그리기', icon: PieChart }
];

const ITEM_COLORS = ['#ff6b6b', '#f7b731', '#20bf6b', '#45aaf2', '#a55eea', '#fd9644'];
const GRAPH_COLORS = ['#5ac8a8', '#ffb84d', '#ff6b6b', '#4d96ff', '#9b6bff', '#7bd389', '#f78fb3', '#6c7a89'];
const LEGACY_DEFAULT_QUESTION = '우리 반 친구들이 가장 좋아하는 것은?';
const LEGACY_DEFAULT_OPTIONS = ['좋아하는 간식', '좋아하는 놀이', '가고 싶은 장소'];
const CHOICES = ['눈금', '표', '제목', '단위', '크기', '항목', '그래프', '합계', '색깔', '백분율', '범례', '순서'];
const STICKER_SIZE_PX = 23;
const MAX_STICKER_OVERLAP_RATIO = 0.1;
const STICKER_PLACEMENT_STEP_PX = 1;
const PLAN_TEMPLATES = [
  { id: 'summary', prefix: '조사 결과를 ', josa: 'ro', after: ' 만들어 정리한다.' },
  { id: 'kind', prefix: '적절한 ', after: ' 종류를 정한다.' },
  { id: 'percent', prefix: '각 항목의 ', josa: 'eul', after: ' 구한다.' },
  { id: 'draw', prefix: '', josa: 'eul', after: ' 그린다.' },
  { id: 'present', prefix: '', josa: 'eul', after: ' 발표한다.' }
];

let idSeed = 1;
function makeId(prefix) {
  idSeed += 1;
  return `${prefix}-${Date.now()}-${idSeed}`;
}

function createDefaultState() {
  const options = Array.from({ length: 3 }, (_, index) => ({
    id: makeId('option'),
    label: '',
    color: ITEM_COLORS[index % ITEM_COLORS.length]
  }));

  return {
    survey: {
      question: '',
      options,
      stickers: []
    },
    plan: {
      answers: PLAN_TEMPLATES.map(() => ''),
      roles: []
    },
    table: {
      headerRow: makeDefaultHeaderRow(options.length + 2),
      rows: [
        Array(options.length + 2).fill(''),
        Array(options.length + 2).fill('')
      ],
      percentRow: null
    },
    graph: {
      type: 'bar',
      scale: 10,
      mode: 'divide',
      activeColor: GRAPH_COLORS[0],
      dividers: [],
      fills: {},
      labels: []
    }
  };
}

function normalizeLoadedState(raw) {
  const fallback = createDefaultState();
  if (!raw || typeof raw !== 'object') return fallback;
  const survey = raw.survey || fallback.survey;
  const sourceOptions = Array.isArray(survey.options) && survey.options.length ? survey.options : fallback.survey.options;
  const hasStickers = Array.isArray(survey.stickers) && survey.stickers.length > 0;
  const isLegacyDefaultSurvey = !hasStickers
    && survey.question === LEGACY_DEFAULT_QUESTION
    && sourceOptions.length === LEGACY_DEFAULT_OPTIONS.length
    && sourceOptions.every((option, index) => option.label === LEGACY_DEFAULT_OPTIONS[index]);
  const options = sourceOptions.map((option, index) => ({
    id: option.id || makeId('option'),
    label: isLegacyDefaultSurvey ? '' : (typeof option.label === 'string' ? option.label : ''),
    color: option.color || ITEM_COLORS[index % ITEM_COLORS.length]
  }));
  const optionIds = new Set(options.map((option) => option.id));
  const stickers = Array.isArray(survey.stickers)
    ? survey.stickers
      .filter((sticker) => sticker && optionIds.has(sticker.optionId))
      .map((sticker) => {
        const x = Number(sticker.x);
        const y = Number(sticker.y);
        return {
          id: sticker.id || makeId('sticker'),
          optionId: sticker.optionId,
          x: clamp(Number.isFinite(x) ? x : 50, 5, 95),
          y: clamp(Number.isFinite(y) ? y : 50, 8, 92)
        };
      })
    : [];
  const width = options.length + 2;
  const table = raw.table && typeof raw.table === 'object' ? raw.table : fallback.table;
  const existingRows = Array.isArray(table.rows) ? table.rows : fallback.table.rows;
  const headerRow = fitHeaderRow(table.headerRow, width);
  const rows = [0, 1].map((rowIndex) => fitRow(existingRows[rowIndex], width));
  const percentRow = table.percentRow ? fitPercentRow(table.percentRow, width) : null;

  return {
    survey: {
      question: isLegacyDefaultSurvey ? '' : (typeof survey.question === 'string' ? survey.question : fallback.survey.question),
      options,
      stickers
    },
    plan: {
      answers: raw.plan && Array.isArray(raw.plan.answers) ? PLAN_TEMPLATES.map((_, index) => raw.plan.answers[index] || '') : fallback.plan.answers,
      roles: raw.plan && Array.isArray(raw.plan.roles) ? raw.plan.roles : []
    },
    table: { headerRow, rows, percentRow },
    graph: {
      type: raw.graph && raw.graph.type === 'pie' ? 'pie' : 'bar',
      scale: raw.graph && raw.graph.scale ? raw.graph.scale : fallback.graph.scale,
      mode: raw.graph && raw.graph.mode ? raw.graph.mode : fallback.graph.mode,
      activeColor: raw.graph && raw.graph.activeColor ? raw.graph.activeColor : fallback.graph.activeColor,
      dividers: raw.graph && Array.isArray(raw.graph.dividers) ? sanitizeDividers(raw.graph.dividers) : [],
      fills: raw.graph && raw.graph.fills ? raw.graph.fills : {},
      labels: raw.graph && Array.isArray(raw.graph.labels) ? raw.graph.labels : []
    }
  };
}

function makeDefaultHeaderRow(width) {
  return Array.from({ length: width }, (_, index) => {
    if (index === 0) return '제목';
    if (index === width - 1) return '전체';
    return `항목${index}`;
  });
}

function makePercentRow(width) {
  const row = Array(width).fill('');
  row[0] = '백분율(%)';
  return row;
}

function fitHeaderRow(row, width) {
  const next = makeDefaultHeaderRow(width);
  if (Array.isArray(row)) {
    for (let index = 0; index < width; index += 1) {
      if (typeof row[index] === 'string') next[index] = row[index];
    }
  }
  return next;
}

function fitRow(row, width) {
  const next = Array(width).fill('');
  if (Array.isArray(row)) {
    for (let index = 0; index < width; index += 1) next[index] = row[index] || '';
  }
  return next;
}

function fitPercentRow(row, width) {
  return Array.isArray(row) ? fitRow(row, width) : makePercentRow(width);
}

function sanitizeDividers(dividers) {
  return dividers
    .map((value) => Number(value))
    .filter((value) => value > 0 && value < 100)
    .sort((a, b) => a - b)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function getFinalConsonantIndex(word) {
  const characters = Array.from((word || '').trim());
  const lastCharacter = characters[characters.length - 1];
  if (!lastCharacter) return 0;
  const code = lastCharacter.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return 0;
  return (code - 0xac00) % 28;
}

function pickJosa(word, type) {
  const finalConsonant = getFinalConsonantIndex(word);
  if (type === 'ro') return finalConsonant && finalConsonant !== 8 ? '으로' : '로';
  if (type === 'eul') return finalConsonant ? '을' : '를';
  return '';
}

function getTemplateSuffix(template, answer) {
  const word = answer && answer.trim() ? answer.trim() : '';
  if (!template.josa) return template.after;
  const placeholderJosa = template.josa === 'ro' ? '(으)로' : '을/를';
  return `${word ? pickJosa(word, template.josa) : placeholderJosa}${template.after}`;
}

function buildSentence(answer, index) {
  const template = PLAN_TEMPLATES[index];
  const word = answer && answer.trim() ? answer.trim() : '___';
  return `${template.prefix}${word}${getTemplateSuffix(template, answer)}`;
}

function getSegments(dividers) {
  const points = [0].concat(sanitizeDividers(dividers), [100]);
  const segments = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    segments.push({
      start: points[index],
      end: points[index + 1],
      key: `${points[index]}-${points[index + 1]}`
    });
  }
  return segments;
}

function findNearestStickerPoint(point, stickers) {
  const fieldWidth = Number(point.fieldWidth);
  const fieldHeight = Number(point.fieldHeight);
  const stickerSize = Number(point.stickerSize) || STICKER_SIZE_PX;
  if (!Number.isFinite(fieldWidth) || !Number.isFinite(fieldHeight) || fieldWidth <= 0 || fieldHeight <= 0) {
    return {
      x: clamp(Number.isFinite(point.x) ? point.x : 50, 5, 95),
      y: clamp(Number.isFinite(point.y) ? point.y : 50, 8, 92)
    };
  }

  const stickerRadius = stickerSize / 2;
  const minX = Math.min(stickerRadius, fieldWidth / 2);
  const maxX = Math.max(fieldWidth - stickerRadius, minX);
  const minY = Math.min(stickerRadius, fieldHeight / 2);
  const maxY = Math.max(fieldHeight - stickerRadius, minY);
  const pointX = Number(point.x);
  const pointY = Number(point.y);
  const desiredX = clamp(((Number.isFinite(pointX) ? pointX : 50) / 100) * fieldWidth, minX, maxX);
  const desiredY = clamp(((Number.isFinite(pointY) ? pointY : 50) / 100) * fieldHeight, minY, maxY);
  const minDistance = Math.ceil(stickerSize * (1 - MAX_STICKER_OVERLAP_RATIO));
  const minDistanceSq = minDistance * minDistance;
  const existingCenters = stickers
    .map((sticker) => ({
      x: (Number(sticker.x) / 100) * fieldWidth,
      y: (Number(sticker.y) / 100) * fieldHeight
    }))
    .filter((sticker) => Number.isFinite(sticker.x) && Number.isFinite(sticker.y));

  function canPlace(candidateX, candidateY) {
    return existingCenters.every((sticker) => {
      const dx = candidateX - sticker.x;
      const dy = candidateY - sticker.y;
      return dx * dx + dy * dy >= minDistanceSq;
    });
  }

  if (canPlace(desiredX, desiredY)) {
    return {
      x: (desiredX / fieldWidth) * 100,
      y: (desiredY / fieldHeight) * 100
    };
  }

  let bestPoint = null;
  let bestDistanceSq = Infinity;
  const startX = Math.ceil(minX);
  const endX = Math.floor(maxX);
  const startY = Math.ceil(minY);
  const endY = Math.floor(maxY);

  for (let candidateY = startY; candidateY <= endY; candidateY += STICKER_PLACEMENT_STEP_PX) {
    for (let candidateX = startX; candidateX <= endX; candidateX += STICKER_PLACEMENT_STEP_PX) {
      const dx = candidateX - desiredX;
      const dy = candidateY - desiredY;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq >= bestDistanceSq || !canPlace(candidateX, candidateY)) continue;
      bestDistanceSq = distanceSq;
      bestPoint = { x: candidateX, y: candidateY };
    }
  }

  if (!bestPoint) return null;
  return {
    x: (bestPoint.x / fieldWidth) * 100,
    y: (bestPoint.y / fieldHeight) * 100
  };
}

function getStickerDiameter(target) {
  const renderedSticker = target ? target.querySelector('.sticker') : null;
  if (!renderedSticker || typeof window === 'undefined') return STICKER_SIZE_PX;
  const width = Number.parseFloat(window.getComputedStyle(renderedSticker).width);
  return Number.isFinite(width) && width > 0 ? width : STICKER_SIZE_PX;
}

function App() {
  const [state, setState] = useState(() => {
    try {
      const hashState = readStateFromHash();
      if (hashState) return hashState;
      const saved = window.localStorage.getItem('how-to-graph-state');
      return saved ? normalizeLoadedState(JSON.parse(saved)) : createDefaultState();
    } catch (error) {
      return createDefaultState();
    }
  });
  const [activeTab, setActiveTab] = useState('survey');
  const [surveyScreen, setSurveyScreen] = useState('setup');
  const [planScreen, setPlanScreen] = useState('steps');
  const [toast, setToast] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem('how-to-graph-state', JSON.stringify(state));
    } catch (error) {
      // 저장 공간이 부족한 구형 기기에서도 앱 자체는 계속 쓸 수 있다.
    }
  }, [state]);

  function patchState(section, patch) {
    setState((previous) => ({
      ...previous,
      [section]: typeof patch === 'function' ? patch(previous[section], previous) : { ...previous[section], ...patch }
    }));
  }

  function applyLoadedState(nextState) {
    setState(normalizeLoadedState(nextState));
    setToast('QR 자료를 적용했습니다.');
    window.setTimeout(() => setToast(''), 2200);
  }

  return (
    <div className="app-shell">
      <div className="navigation-row">
        <nav className="tabbar" aria-label="작업 단계">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            if (tab.id === 'survey' && activeTab === 'survey') {
              return (
                <div className="tab-button tab-mode-switch is-active" key={tab.id} role="group" aria-label="조사">
                  <button
                    className={`tab-mode-choice ${surveyScreen === 'setup' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setSurveyScreen('setup')}
                    aria-pressed={surveyScreen === 'setup'}
                  >
                    준비
                  </button>
                  <button
                    className={`tab-mode-choice ${surveyScreen === 'board' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setSurveyScreen('board')}
                    aria-pressed={surveyScreen === 'board'}
                  >
                    실시
                  </button>
                </div>
              );
            }

            if (tab.id === 'plan' && activeTab === 'plan') {
              return (
                <div className="tab-button tab-mode-switch is-active" key={tab.id} role="group" aria-label="계획 세우기">
                  <button
                    className={`tab-mode-choice ${planScreen === 'steps' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setPlanScreen('steps')}
                    aria-pressed={planScreen === 'steps'}
                  >
                    절차
                  </button>
                  <button
                    className={`tab-mode-choice ${planScreen === 'roles' ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setPlanScreen('roles')}
                    aria-pressed={planScreen === 'roles'}
                  >
                    역할
                  </button>
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'is-active' : ''}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <button className="icon-button qr-nav-button" type="button" onClick={() => setShareOpen(true)} title="QR 보내기 / 받기" aria-label="QR 보내기 / 받기">
            <QrCode size={21} aria-hidden="true" />
          </button>
        </nav>
      </div>

      <main className="stage">
        <section className="tab-panel" key={activeTab}>
          {activeTab === 'survey' && (
            <SurveyWorkspace
              survey={state.survey}
              screen={surveyScreen}
              onChange={(patch) => patchState('survey', patch)}
            />
          )}
          {activeTab === 'plan' && (
            <PlanWorkspace
              plan={state.plan}
              screen={planScreen}
              onChange={(patch) => patchState('plan', patch)}
            />
          )}
          {activeTab === 'table' && (
            <TableWorkspace
              survey={state.survey}
              table={state.table}
              onTableChange={(patch) => patchState('table', patch)}
            />
          )}
          {activeTab === 'graph' && (
            <GraphWorkspace graph={state.graph} onChange={(patch) => patchState('graph', patch)} />
          )}
        </section>
      </main>

      {shareOpen && (
        <ShareDialog
          state={state}
          onClose={() => setShareOpen(false)}
          onImport={applyLoadedState}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function SurveyWorkspace({ survey, screen, onChange }) {
  const [activePaletteId, setActivePaletteId] = useState(null);
  const previewColumns = survey.options.length > 4 ? 'many-options' : '';

  function updateOption(optionId, patch) {
    onChange({
      options: survey.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option))
    });
  }

  function addOption() {
    if (survey.options.length >= 8) return;
    onChange({
      options: survey.options.concat({
        id: makeId('option'),
        label: '',
        color: ITEM_COLORS[survey.options.length % ITEM_COLORS.length]
      })
    });
  }

  function removeOption(optionId) {
    if (survey.options.length <= 2) return;
    onChange({
      options: survey.options.filter((option) => option.id !== optionId),
      stickers: survey.stickers.filter((sticker) => sticker.optionId !== optionId)
    });
    if (activePaletteId === optionId) setActivePaletteId(null);
  }

  function placeSticker(optionId, point) {
    onChange((current) => {
      const placedPoint = findNearestStickerPoint(
        point,
        current.stickers.filter((sticker) => sticker.optionId === optionId)
      );
      if (!placedPoint) return current;

      return {
        ...current,
        stickers: current.stickers.concat({
          id: makeId('sticker'),
          optionId,
          x: placedPoint.x,
          y: placedPoint.y
        })
      };
    });
  }

  function undoSticker() {
    if (!survey.stickers.length) return;
    if (window.confirm('마지막으로 붙인 스티커를 떼어낼까요?')) {
      onChange({ stickers: survey.stickers.slice(0, -1) });
    }
  }

  if (screen === 'board') {
    return (
      <div className="survey-board-screen">
        <div className="canvas-area">
          <SurveyBoard
            survey={survey}
            onSticker={placeSticker}
            className={previewColumns}
            actions={(
              <button className="icon-button" type="button" onClick={undoSticker} disabled={!survey.stickers.length} title="실행 취소" aria-label="실행 취소">
                <Undo2 size={18} aria-hidden="true" />
              </button>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="survey-setup-screen">
      <section className="panel-block survey-setup-panel">
        <label className="field-label">
          제목
          <input
            className="text-input"
            value={survey.question}
            onChange={(event) => onChange({ question: event.target.value })}
            placeholder="제목"
          />
        </label>

        <div className="option-editor-list">
          {survey.options.map((option, index) => (
            <div className="option-editor-shell" key={option.id}>
              <div className="option-editor">
                <button
                  className={`color-dot-button ${activePaletteId === option.id ? 'is-active' : ''}`}
                  style={{ backgroundColor: option.color }}
                  type="button"
                  onClick={() => setActivePaletteId(activePaletteId === option.id ? null : option.id)}
                  title="항목 색 고르기"
                  aria-label={`항목${index + 1} 색 고르기`}
                />
                <input
                  className="text-input compact"
                  value={option.label}
                  onChange={(event) => updateOption(option.id, { label: event.target.value })}
                  placeholder={`항목${index + 1}`}
                  aria-label={`항목${index + 1}`}
                />
                <button
                  className="icon-button danger"
                  type="button"
                  onClick={() => removeOption(option.id)}
                  disabled={survey.options.length <= 2}
                  title="항목 지우기"
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
              {activePaletteId === option.id && (
                <div className="item-color-palette" aria-label={`항목${index + 1} 색`}>
                  {ITEM_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`swatch ${option.color === color ? 'is-active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        updateOption(option.id, { color });
                        setActivePaletteId(null);
                      }}
                      title="색 고르기"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="survey-setup-actions">
          <button className="icon-text-button" type="button" onClick={addOption} disabled={survey.options.length >= 8}>
            <Plus size={18} aria-hidden="true" />
            <span>항목 추가</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function SurveyBoard({ survey, onSticker, readOnly = false, compact = false, className = '', actions = null }) {
  return (
    <div className={`survey-board ${compact ? 'compact-board' : ''} ${className}`}>
      <div className={`survey-question ${actions ? 'with-actions' : ''}`}>
        <span className="survey-question-text">{survey.question || '제목'}</span>
        {actions && <div className="survey-board-actions">{actions}</div>}
      </div>
      <div className="survey-columns" style={{ gridTemplateColumns: `repeat(${survey.options.length}, minmax(132px, 1fr))` }}>
        {survey.options.map((option, index) => (
          <StickerColumn
            key={option.id}
            option={option}
            optionIndex={index}
            stickers={survey.stickers.filter((sticker) => sticker.optionId === option.id)}
            onSticker={onSticker}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

function StickerColumn({ option, optionIndex, stickers, onSticker, readOnly }) {
  const touchGuard = useRef(0);
  const optionLabel = option.label || `항목${optionIndex + 1}`;

  function commitFromPoint(clientX, clientY, target) {
    if (readOnly) return;
    const rect = target.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    onSticker(option.id, {
      x,
      y,
      fieldWidth: rect.width,
      fieldHeight: rect.height,
      stickerSize: getStickerDiameter(target)
    });
  }

  function handleTouchStart(event) {
    if (!event.touches || !event.touches.length) return;
    touchGuard.current = Date.now();
    event.preventDefault();
    commitFromPoint(event.touches[0].clientX, event.touches[0].clientY, event.currentTarget);
  }

  function handleMouseDown(event) {
    if (Date.now() - touchGuard.current < 650) return;
    commitFromPoint(event.clientX, event.clientY, event.currentTarget);
  }

  return (
    <div className="survey-column">
      <div className="survey-column-title" style={{ borderColor: option.color }}>
        {optionLabel}
      </div>
      <div
        className={`sticker-field ${readOnly ? 'is-readonly' : ''}`}
        onTouchStart={handleTouchStart}
        onMouseDown={handleMouseDown}
        role={readOnly ? 'img' : 'button'}
        aria-label={`${optionLabel} 스티커 붙이기`}
      >
        {stickers.map((sticker) => (
          <span
            key={sticker.id}
            className="sticker"
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              backgroundColor: option.color
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function PlanWorkspace({ plan, screen, onChange }) {
  const [activeBlank, setActiveBlank] = useState(0);
  const isRolesScreen = screen === 'roles';

  function updateAnswer(index, value) {
    const answers = plan.answers.slice();
    answers[index] = value;
    onChange({ answers });
  }

  function chooseWord(word) {
    const answers = plan.answers.slice();
    answers[activeBlank] = word;
    onChange({ answers });

    const nextBlank = answers.findIndex((answer, index) => index > activeBlank && !answer);
    if (nextBlank !== -1) setActiveBlank(nextBlank);
  }

  function updateRole(index, name) {
    const roles = PLAN_TEMPLATES.map((_, rowIndex) => {
      const currentRole = plan.roles[rowIndex] || {};
      const currentName = typeof currentRole.name === 'string' ? currentRole.name : '';
      return {
        id: currentRole.id || makeId('role'),
        sentence: buildSentence(plan.answers[rowIndex], rowIndex),
        name: rowIndex === index ? name : currentName
      };
    });
    onChange({ roles });
  }

  return (
    <div className="plan-screen">
      <section className="panel-block plan-panel">
        <SectionTitle icon={isRolesScreen ? UsersRound : ClipboardList} title={isRolesScreen ? '역할 나누기' : '절차'} />
        <div className={`sentence-list ${isRolesScreen ? 'is-roles' : 'is-steps'}`}>
          {PLAN_TEMPLATES.map((template, index) => {
            const roleName = plan.roles[index] && typeof plan.roles[index].name === 'string' ? plan.roles[index].name : '';
            const answer = plan.answers[index] || '';
            return (
              <React.Fragment key={template.id}>
                <div
                  className={`sentence-row ${!isRolesScreen ? 'is-selectable' : ''} ${activeBlank === index ? 'is-active' : ''}`}
                  onClick={() => {
                    if (!isRolesScreen) setActiveBlank(index);
                  }}
                  style={{ transitionDelay: isRolesScreen ? `${index * 34}ms` : '0ms' }}
                >
                  <div className="sentence-main">
                    <span>{template.prefix}</span>
                    <button
                      type="button"
                      className="sentence-blank-button"
                      onClick={() => setActiveBlank(index)}
                      aria-pressed={activeBlank === index}
                      aria-label={`${index + 1}번째 빈칸`}
                    >
                      {answer || '___'}
                    </button>
                    <span>{getTemplateSuffix(template, answer)}</span>
                  </div>
                </div>
                <label
                  className="role-name-slot"
                  aria-hidden={!isRolesScreen}
                >
                  <input
                    className="text-input role-name-input"
                    value={roleName}
                    onChange={(event) => updateRole(index, event.target.value)}
                    placeholder="이름"
                    aria-label={`${index + 1}번째 역할 이름`}
                    disabled={!isRolesScreen}
                    tabIndex={isRolesScreen ? undefined : -1}
                  />
                </label>
              </React.Fragment>
            );
          })}
        </div>

        {!isRolesScreen && (
          <div className="choice-bank">
            {CHOICES.map((choice) => (
              <button type="button" key={choice} onClick={() => chooseWord(choice)} className="choice-chip">
                {choice}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TableWorkspace({ survey, table, onTableChange }) {
  const width = survey.options.length + 2;
  const fittedHeader = useMemo(() => fitHeaderRow(table.headerRow, width), [table.headerRow, width]);
  const fittedRows = useMemo(() => [fitRow(table.rows[0], width), fitRow(table.rows[1], width)], [table.rows, width]);
  const fittedPercent = table.percentRow ? fitPercentRow(table.percentRow, width) : null;
  const readyForPercent = fittedRows.every((row) => row.every((cell) => cell.trim()));
  const percentComplete = fittedPercent ? fittedPercent.every((cell) => cell.trim()) : false;

  useEffect(() => {
    if (!Array.isArray(table.headerRow) || table.headerRow.length !== width || table.rows[0].length !== width || table.rows[1].length !== width || (table.percentRow && table.percentRow.length !== width)) {
      onTableChange({ headerRow: fittedHeader, rows: fittedRows, percentRow: fittedPercent });
    }
  }, [width]);

  function updateHeaderCell(cellIndex, value) {
    onTableChange((currentTable) => {
      const headerRow = fitHeaderRow(currentTable.headerRow, width);
      headerRow[cellIndex] = value;
      return { ...currentTable, headerRow };
    });
  }

  function updateCell(rowIndex, cellIndex, value) {
    onTableChange((currentTable) => {
      const rows = [fitRow(currentTable.rows[0], width), fitRow(currentTable.rows[1], width)];
      rows[rowIndex][cellIndex] = value;
      return { ...currentTable, rows };
    });
  }

  function updatePercentCell(cellIndex, value) {
    onTableChange((currentTable) => {
      const percentRow = currentTable.percentRow ? fitPercentRow(currentTable.percentRow, width) : makePercentRow(width);
      percentRow[cellIndex] = value;
      return { ...currentTable, percentRow };
    });
  }

  function addPercentRow() {
    if (!readyForPercent || fittedPercent) return;
    onTableChange((currentTable) => ({ ...currentTable, percentRow: makePercentRow(width) }));
  }

  return (
    <div className="table-workspace">
      <div className="survey-preview-wrap">
        <SurveyBoard survey={survey} readOnly compact />
      </div>

      <section className="panel-block table-panel">
        <div className="section-heading with-action">
          <SectionTitle icon={Table2} title="표 그리기" />
          <button className="icon-text-button" type="button" onClick={addPercentRow} disabled={!readyForPercent || Boolean(fittedPercent)}>
            <ArrowLeft size={18} aria-hidden="true" />
            <span>다음</span>
          </button>
        </div>

        <div className="manual-table-wrap">
          <table className="manual-table">
            <thead>
              <tr>
                {fittedHeader.map((cell, cellIndex) => (
                  <th key={cellIndex}>
                    <input
                      value={cell}
                      onChange={(event) => updateHeaderCell(cellIndex, event.target.value)}
                      aria-label={`머리행 ${cellIndex + 1}열`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fittedRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <input
                        value={cell}
                        onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)}
                        aria-label={`${rowIndex + 1}행 ${cellIndex + 1}열`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {fittedPercent && (
                <tr className="percent-row">
                  {fittedPercent.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <input
                        value={cell}
                        onChange={(event) => updatePercentCell(cellIndex, event.target.value)}
                        aria-label={`백분율 행 ${cellIndex + 1}열`}
                      />
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={`completion-strip ${percentComplete ? 'is-complete' : ''}`}>
          {fittedPercent ? (
            <>
              <Check size={18} aria-hidden="true" />
              <span>{percentComplete ? '백분율 행까지 모두 채웠습니다.' : '백분율 행을 직접 채워 주세요.'}</span>
            </>
          ) : (
            <>
              <MousePointer2 size={18} aria-hidden="true" />
              <span>{readyForPercent ? '다음 버튼을 눌러 백분율 행을 추가할 수 있습니다.' : '모든 칸을 채우면 다음 버튼이 켜집니다.'}</span>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function GraphWorkspace({ graph, onChange }) {
  const canvasRef = useRef(null);
  const segments = getSegments(graph.dividers);

  function setGraph(patch) {
    onChange({ ...graph, ...patch });
  }

  function handleGraphPoint(point) {
    if (graph.mode === 'divide') {
      const raw = graph.type === 'bar' ? point.graphX : point.percentAngle;
      const snapped = clamp(Math.round(raw / graph.scale) * graph.scale, graph.scale, 100 - graph.scale);
      const hasDivider = graph.dividers.indexOf(snapped) !== -1;
      const dividers = hasDivider
        ? graph.dividers.filter((value) => value !== snapped)
        : sanitizeDividers(graph.dividers.concat(snapped));
      setGraph({ dividers });
      return;
    }

    if (graph.mode === 'paint') {
      const targetValue = graph.type === 'bar' ? point.graphX : point.percentAngle;
      const segment = segments.find((item) => targetValue >= item.start && targetValue <= item.end) || segments[segments.length - 1];
      setGraph({ fills: { ...graph.fills, [segment.key]: graph.activeColor } });
      return;
    }

    const labels = graph.labels.concat({
      id: makeId('label'),
      text: '글자',
      x: point.canvasX,
      y: point.canvasY
    });
    setGraph({ labels });
  }

  function updateLabel(labelId, patch) {
    setGraph({
      labels: graph.labels.map((label) => (label.id === labelId ? { ...label, ...patch } : label))
    });
  }

  function removeLabel(labelId) {
    setGraph({ labels: graph.labels.filter((label) => label.id !== labelId) });
  }

  function resetGraph() {
    if (window.confirm('그래프에 그린 선, 색, 글자를 모두 지울까요?')) {
      setGraph({ dividers: [], fills: {}, labels: [] });
    }
  }

  return (
    <div className="workspace-grid graph-layout">
      <aside className="tool-rail">
        <SectionTitle icon={PieChart} title="그래프 틀" />
        <SegmentedControl
          value={graph.type}
          onChange={(value) => setGraph({ type: value, dividers: [], fills: {} })}
          items={[
            { value: 'bar', label: '띠그래프', icon: Grid3X3 },
            { value: 'pie', label: '원그래프', icon: Circle }
          ]}
        />

        <label className="field-label">
          눈금 크기
          <select className="text-input" value={graph.scale} onChange={(event) => setGraph({ scale: Number(event.target.value), dividers: [], fills: {} })}>
            {[5, 10, 20, 25].map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
        </label>

        <SectionTitle icon={MousePointer2} title="작업 모드" />
        <SegmentedControl
          value={graph.mode}
          onChange={(value) => setGraph({ mode: value })}
          items={[
            { value: 'divide', label: '나누기', icon: PenLine },
            { value: 'paint', label: '색칠', icon: Brush },
            { value: 'text', label: '글자', icon: PenLine }
          ]}
        />

        <div className="swatch-block graph-swatches" aria-label="그래프 색">
          {GRAPH_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`swatch ${graph.activeColor === color ? 'is-active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setGraph({ activeColor: color })}
              title="색 고르기"
            />
          ))}
        </div>

        <button className="icon-text-button secondary" type="button" onClick={resetGraph}>
          <Eraser size={18} aria-hidden="true" />
          <span>그래프 지우기</span>
        </button>
      </aside>

      <div className="graph-main">
        <GraphCanvas
          ref={canvasRef}
          graph={graph}
          segments={segments}
          onPoint={handleGraphPoint}
          onLabelChange={updateLabel}
        />

        <div className="label-editor">
          <SectionTitle icon={PenLine} title="글자 목록" />
          {graph.labels.length === 0 && <p className="empty-copy">글자 모드에서 그래프 위나 둘레를 누르면 글자를 놓을 수 있습니다.</p>}
          {graph.labels.map((label) => (
            <div className="label-row" key={label.id}>
              <input
                className="text-input compact"
                value={label.text}
                onChange={(event) => updateLabel(label.id, { text: event.target.value })}
                aria-label="그래프 글자"
              />
              <button className="icon-button danger" type="button" onClick={() => removeLabel(label.id)} title="글자 지우기">
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const GraphCanvas = React.forwardRef(function GraphCanvas({ graph, segments, onPoint, onLabelChange }, ref) {
  const touchGuard = useRef(0);

  function pointFromEvent(clientX, clientY, target) {
    const rect = target.getBoundingClientRect();
    const canvasX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const canvasY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    const graphLeft = graph.type === 'bar' ? 8 : 20;
    const graphTop = graph.type === 'bar' ? 34 : 9;
    const graphWidth = graph.type === 'bar' ? 84 : 60;
    const graphHeight = graph.type === 'bar' ? 28 : 82;
    const graphX = clamp(((canvasX - graphLeft) / graphWidth) * 100, 0, 100);
    const percentAngle = pointToPiePercent(canvasX, canvasY);
    return { canvasX, canvasY, graphX, percentAngle };
  }

  function handleTouchStart(event) {
    if (!event.touches || !event.touches.length) return;
    touchGuard.current = Date.now();
    event.preventDefault();
    onPoint(pointFromEvent(event.touches[0].clientX, event.touches[0].clientY, event.currentTarget));
  }

  function handleMouseDown(event) {
    if (Date.now() - touchGuard.current < 650) return;
    onPoint(pointFromEvent(event.clientX, event.clientY, event.currentTarget));
  }

  return (
    <div
      className={`graph-canvas mode-${graph.mode}`}
      ref={ref}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="button"
      aria-label="그래프 그리기 영역"
    >
      {graph.type === 'bar' ? (
        <BarGraph graph={graph} segments={segments} />
      ) : (
        <PieGraph graph={graph} segments={segments} />
      )}

      {graph.labels.map((label) => (
        <input
          key={label.id}
          className="graph-floating-label"
          value={label.text}
          style={{ left: `${label.x}%`, top: `${label.y}%` }}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onChange={(event) => onLabelChange(label.id, { text: event.target.value })}
          aria-label="그래프 글자"
        />
      ))}
    </div>
  );
});

function BarGraph({ graph, segments }) {
  const ticks = [];
  for (let value = 0; value <= 100; value += graph.scale) ticks.push(value);
  return (
    <svg className="bar-svg" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
      <rect x="6" y="18" width="88" height="24" rx="1.5" fill="#ffffff" stroke="#1f2d3d" strokeWidth="0.55" />
      {segments.map((segment) => (
        <rect
          key={segment.key}
          x={6 + segment.start * 0.88}
          y="18"
          width={(segment.end - segment.start) * 0.88}
          height="24"
          fill={graph.fills[segment.key] || 'rgba(255,255,255,0)'}
          stroke="none"
        />
      ))}
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={6 + tick * 0.88} x2={6 + tick * 0.88} y1="15" y2="45" stroke="#bdc7d3" strokeWidth="0.24" />
          <text x={6 + tick * 0.88} y="52" textAnchor="middle" fill="#52606f" fontSize="3.2">{tick}</text>
        </g>
      ))}
      {graph.dividers.map((divider) => (
        <line key={divider} x1={6 + divider * 0.88} x2={6 + divider * 0.88} y1="16" y2="44" stroke="#1f2d3d" strokeWidth="1.05" />
      ))}
    </svg>
  );
}

function PieGraph({ graph, segments }) {
  const ticks = [];
  for (let value = 0; value < 100; value += graph.scale) ticks.push(value);
  return (
    <svg className="pie-svg" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="38" fill="#ffffff" stroke="#1f2d3d" strokeWidth="1.15" />
      {segments.map((segment) => {
        const color = graph.fills[segment.key] || 'rgba(255,255,255,0)';
        if (segment.start === 0 && segment.end === 100) {
          return <circle key={segment.key} cx="50" cy="50" r="38" fill={color} stroke="none" />;
        }
        return <path key={segment.key} d={sectorPath(50, 50, 38, segment.start, segment.end)} fill={color} stroke="none" />;
      })}
      <circle cx="50" cy="50" r="38" fill="none" stroke="#1f2d3d" strokeWidth="1.15" />
      {ticks.map((tick) => {
        const point = polarPoint(50, 50, 38, tick);
        const label = polarPoint(50, 50, 44, tick);
        return (
          <g key={tick}>
            <line x1="50" y1="50" x2={point.x} y2={point.y} stroke="#bdc7d3" strokeWidth="0.45" />
            <text x={label.x} y={label.y + 1.6} textAnchor="middle" fill="#52606f" fontSize="3.8">{tick}</text>
          </g>
        );
      })}
      {graph.dividers.map((divider) => {
        const point = polarPoint(50, 50, 38, divider);
        return <line key={divider} x1="50" y1="50" x2={point.x} y2={point.y} stroke="#1f2d3d" strokeWidth="1.15" />;
      })}
    </svg>
  );
}

function ShareDialog({ state, onClose, onImport }) {
  const [qrSrc, setQrSrc] = useState('');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');
  const sharePayload = useMemo(() => makeSharePayload(state), [state]);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(sharePayload.url, {
      margin: 2,
      scale: 7,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1f2d3d',
        light: '#ffffff'
      }
    }).then((url) => {
      if (live) setQrSrc(url);
    }).catch(() => {
      if (live) setMessage('QR 이미지를 만들지 못했습니다. 아래 코드를 복사해 주세요.');
    });
    return () => {
      live = false;
    };
  }, [sharePayload.url]);

  function copyPayload() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sharePayload.url).then(() => setMessage('복사했습니다.'));
    } else {
      setImportText(sharePayload.url);
      setMessage('아래 주소를 길게 눌러 복사해 주세요.');
    }
  }

  function applyImport() {
    const loaded = parseImportText(importText);
    if (!loaded) {
      setMessage('가져올 수 없는 QR 내용입니다.');
      return;
    }
    onImport(loaded);
    onClose();
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="share-dialog" role="dialog" aria-modal="true" aria-label="QR 보내기 받기">
        <div className="section-heading with-action">
          <SectionTitle icon={Share2} title="QR 보내기 / 받기" />
          <button className="icon-button" type="button" onClick={onClose} title="닫기">
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="share-grid">
          <div className="qr-card">
            {qrSrc ? <img src={qrSrc} alt="현재 자료 QR 코드" /> : <div className="qr-placeholder" />}
            <button className="icon-text-button" type="button" onClick={copyPayload}>
              <Share2 size={18} aria-hidden="true" />
              <span>주소 복사</span>
            </button>
          </div>

          <div className="import-card">
            <label className="field-label">
              QR로 연 주소나 코드를 붙여넣기
              <textarea
                className="text-input import-area"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="다른 기기에서 받은 QR 주소"
              />
            </label>
            <button className="icon-text-button" type="button" onClick={applyImport}>
              <Download size={18} aria-hidden="true" />
              <span>적용</span>
            </button>
          </div>
        </div>
        {message && <p className="dialog-message">{message}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  void Icon;
  void title;
  return null;
}

function SegmentedControl({ value, onChange, items }) {
  return (
    <div className="segmented-control">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            className={value === item.value ? 'is-active' : ''}
            onClick={() => onChange(item.value)}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pointToPiePercent(x, y) {
  const dx = x - 50;
  const dy = y - 50;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  if (angle < 0) angle += 360;
  return clamp((angle / 360) * 100, 0, 100);
}

function polarPoint(cx, cy, radius, percent) {
  const angle = percent / 100 * 360 - 90;
  const radians = angle * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}

function sectorPath(cx, cy, radius, start, end) {
  const startPoint = polarPoint(cx, cy, radius, start);
  const endPoint = polarPoint(cx, cy, radius, end);
  const largeArc = end - start > 50 ? 1 : 0;
  return `M ${cx} ${cy} L ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`;
}

function makeSharePayload(state) {
  const data = compressToEncodedURIComponent(JSON.stringify({ version: 1, state }));
  const base = window.location.href.split('#')[0];
  return {
    code: data,
    url: `${base}#how-to-graph=${data}`
  };
}

function readStateFromHash() {
  const hash = window.location.hash || '';
  const marker = '#how-to-graph=';
  if (hash.indexOf(marker) !== 0 && hash.indexOf('how-to-graph=') === -1) return null;
  return parseImportText(hash);
}

function parseImportText(text) {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();
  const marker = 'how-to-graph=';
  const token = trimmed.indexOf(marker) >= 0
    ? trimmed.slice(trimmed.indexOf(marker) + marker.length)
    : trimmed;
  try {
    const json = decompressFromEncodedURIComponent(token.replace(/^#/, ''));
    if (!json) return null;
    const parsed = JSON.parse(json);
    return normalizeLoadedState(parsed.state || parsed);
  } catch (error) {
    return null;
  }
}

const rootElement = document.getElementById('root');
const appRoot = rootElement._howToGraphRoot || createRoot(rootElement);
rootElement._howToGraphRoot = appRoot;
appRoot.render(<App />);
