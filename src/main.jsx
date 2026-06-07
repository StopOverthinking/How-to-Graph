import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import {
  compressToEncodedURIComponent,
  compressToUint8Array,
  decompressFromEncodedURIComponent,
  decompressFromUint8Array
} from 'lz-string';
import {
  Brush,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eraser,
  Grid3X3,
  MousePointer2,
  PenLine,
  PieChart,
  Plus,
  QrCode,
  Share2,
  Table2,
  Trash2,
  Undo2
} from 'lucide-react';
import './styles.css';

const TABS = [
  { id: 'plan', label: '계획', icon: PenLine },
  { id: 'table', label: '표 그리기', icon: Table2 },
  { id: 'graph', label: '그래프 그리기', icon: PieChart }
];

const DEFAULT_PLAN_ITEM_COUNT = 4;
const MIN_PLAN_ITEM_COUNT = 1;
const MAX_PLAN_ITEM_COUNT = 8;
const GRAPH_COLORS = ['#5ac8a8', '#ffb84d', '#ff6b6b', '#4d96ff', '#9b6bff', '#7bd389', '#f78fb3', '#6c7a89'];
const COUNT_ROW_LABEL = '인원(명)';
const PERCENTAGE_ROW_LABEL = '백분율(%)';
const SHARE_VERSION = 2;
const SHARE_DEFAULT_TOKEN = '0';
const SHARE_CHUNK_PREFIX = 'how-to-graph-share-parts:';
const SHARE_CHUNK_SIZES = [1500, 1200, 950, 720, 540, 400, 300, 220, 160, 110, 72, 44, 24, 12, 6, 3, 1];
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const QR_IMAGE_OPTIONS = {
  margin: 1,
  scale: 8,
  errorCorrectionLevel: 'L',
  color: {
    dark: '#1f2d3d',
    light: '#ffffff'
  }
};
const GRAPH_MODE_CODES = { divide: 'd', paint: 'p', text: 't' };
const GRAPH_MODES_BY_CODE = { d: 'divide', p: 'paint', t: 'text' };
const BAR_GRAPH_BOX = { left: 6, top: 18, width: 88, height: 24 };
const PIE_GRAPH_CIRCLE = { cx: 50, cy: 50, radius: 38 };
const chunkMemory = new Map();

let idSeed = 1;
function makeId(prefix) {
  idSeed += 1;
  return `${prefix}-${Date.now()}-${idSeed}`;
}

function createDefaultState() {
  return {
    plan: {
      title: '',
      items: makeEmptyRow(DEFAULT_PLAN_ITEM_COUNT)
    },
    table: {
      headerRow: makeEmptyRow(DEFAULT_PLAN_ITEM_COUNT + 1),
      rows: fitRows([], DEFAULT_PLAN_ITEM_COUNT + 1),
      tableDefaultsCleared: true
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
  const table = raw.table && typeof raw.table === 'object' ? raw.table : fallback.table;
  const existingRows = Array.isArray(table.rows) ? table.rows : fallback.table.rows;
  const clearLegacyTableDefaults = table.tableDefaultsCleared !== true;
  const rawPlan = raw.plan && typeof raw.plan === 'object' ? raw.plan : {};
  const itemCount = getPlanItemCount(rawPlan.items, table.headerRow);
  const tableWidth = itemCount + 1;
  const headerRow = fitHeaderRow(table.headerRow, tableWidth, clearLegacyTableDefaults);
  const rows = fitRows(existingRows, tableWidth);
  const items = fitRow(rawPlan.items, itemCount);
  for (let index = 0; index < itemCount; index += 1) {
    if (!items[index] && headerRow[index + 1]) items[index] = headerRow[index + 1];
  }

  return {
    plan: {
      title: typeof rawPlan.title === 'string' ? rawPlan.title : (headerRow[0] || ''),
      items
    },
    table: { headerRow, rows, tableDefaultsCleared: true },
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

function makeEmptyRow(width) {
  return Array(width).fill('');
}

function normalizePlanItemCount(value, fallback = DEFAULT_PLAN_ITEM_COUNT) {
  const count = Number(value);
  if (!Number.isFinite(count)) return fallback;
  return clamp(Math.round(count), MIN_PLAN_ITEM_COUNT, MAX_PLAN_ITEM_COUNT);
}

function getPlanItemCount(items, headerRow, fallback = DEFAULT_PLAN_ITEM_COUNT) {
  if (Array.isArray(items) && items.length) return normalizePlanItemCount(items.length, fallback);
  if (Array.isArray(headerRow) && headerRow.length > 1) return normalizePlanItemCount(headerRow.length - 1, fallback);
  return normalizePlanItemCount(fallback);
}

function getTableWidth(table) {
  const headerLength = table && Array.isArray(table.headerRow) ? table.headerRow.length : 0;
  const rowLength = table && Array.isArray(table.rows) && Array.isArray(table.rows[0]) ? table.rows[0].length : 0;
  const width = Math.max(headerLength, rowLength);
  return width > 1 ? normalizePlanItemCount(width - 1) + 1 : DEFAULT_PLAN_ITEM_COUNT + 1;
}

function fitHeaderRow(row, width, clearLegacyDefaults = false) {
  const next = makeEmptyRow(width);
  if (Array.isArray(row)) {
    for (let index = 0; index < width; index += 1) {
      if (typeof row[index] === 'string') {
        next[index] = clearLegacyDefaults && row[index] === getLegacyHeaderText(index, width) ? '' : row[index];
      }
    }
  }
  next[0] = '';
  return next;
}

function fitRow(row, width) {
  const next = Array(width).fill('');
  if (Array.isArray(row)) {
    for (let index = 0; index < width; index += 1) next[index] = row[index] || '';
  }
  return next;
}

function fitRows(rows, width) {
  const sourceRows = Array.isArray(rows) ? rows.slice(0, 2) : [];
  while (sourceRows.length < 2) sourceRows.push(makeEmptyRow(width));
  return sourceRows.map((row, rowIndex) => {
    const fitted = fitRow(row, width);
    if (rowIndex === 0) fitted[0] = COUNT_ROW_LABEL;
    if (rowIndex === 1) fitted[0] = PERCENTAGE_ROW_LABEL;
    return fitted;
  });
}

function getLegacyHeaderText(index, width) {
  if (index === 0) return '제목';
  if (index === width - 1) return '전체';
  return `항목${index}`;
}

function sanitizeDividers(dividers) {
  return dividers
    .map((value) => Number(value))
    .filter((value) => value > 0 && value < 100)
    .sort((a, b) => a - b)
    .filter((value, index, array) => array.indexOf(value) === index);
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
  const [activeTab, setActiveTab] = useState('plan');
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
          {activeTab === 'plan' && (
            <PlanWorkspace
              plan={state.plan}
              table={state.table}
              graph={state.graph}
              onChange={(patch) => patchState('plan', patch)}
              onTableChange={(patch) => patchState('table', patch)}
              onGraphChange={(patch) => patchState('graph', patch)}
            />
          )}
          {activeTab === 'table' && (
            <TableWorkspace
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

function PlanWorkspace({ plan, table, graph, onChange, onTableChange, onGraphChange }) {
  const titleRef = useRef(null);
  const itemsRef = useRef(null);
  const graphRef = useRef(null);
  const planSheetRef = useRef(null);
  const pendingScrollRef = useRef(null);
  const itemCount = getPlanItemCount(plan.items, table.headerRow);
  const tableWidth = itemCount + 1;
  const headerRow = fitHeaderRow(table.headerRow, tableWidth);
  const title = typeof plan.title === 'string' ? plan.title : (headerRow[0] || '');
  const items = fitRow(plan.items, itemCount);

  for (let index = 0; index < itemCount; index += 1) {
    if (!items[index] && headerRow[index + 1]) items[index] = headerRow[index + 1];
  }

  const titleComplete = title.trim().length > 0;
  const itemsComplete = items.every((item) => item.trim().length > 0);
  const graphTypeLabel = graph.type === 'pie' ? '원그래프' : '띠그래프';
  const [visibleStep, setVisibleStep] = useState(() => {
    if (itemsComplete) return 3;
    if (titleComplete) return 2;
    return 1;
  });
  const [activeStep, setActiveStep] = useState(() => {
    if (itemsComplete) return 3;
    if (titleComplete) return 2;
    return 1;
  });

  useEffect(() => {
    setVisibleStep((currentStep) => {
      if (!titleComplete) return 1;
      if (!itemsComplete) return Math.min(currentStep, 2);
      return currentStep;
    });
    setActiveStep((currentStep) => {
      if (!titleComplete) return 1;
      if (!itemsComplete && currentStep > 2) return 2;
      return currentStep;
    });
  }, [titleComplete, itemsComplete]);

  useEffect(() => {
    if (!pendingScrollRef.current || !pendingScrollRef.current.current) return;
    scrollTo(pendingScrollRef.current);
    pendingScrollRef.current = null;
  }, [visibleStep, activeStep]);

  function scrollTo(ref) {
    if (ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function goToStep(step, ref) {
    pendingScrollRef.current = ref;
    setActiveStep(step);
    setVisibleStep((currentStep) => Math.max(currentStep, step));
  }

  function handleAdvanceKey(event, step, ref) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    goToStep(step, ref);
  }

  function updateHeaderCell(cellIndex, value) {
    onTableChange((currentTable) => {
      const nextHeader = fitHeaderRow(currentTable.headerRow, tableWidth);
      nextHeader[cellIndex] = value;
      return { ...currentTable, headerRow: nextHeader };
    });
  }

  function updateTitle(value) {
    onChange({ title: value });
    updateHeaderCell(0, value);
  }

  function updateItem(index, value) {
    const nextItems = items.slice();
    nextItems[index] = value;
    syncItems(nextItems);
  }

  function syncItems(nextItems, removedIndex = null) {
    onChange({ items: nextItems });
    onTableChange((currentTable) => {
      const nextWidth = nextItems.length + 1;
      const sourceWidth = Math.max(getTableWidth(currentTable), tableWidth);
      let nextHeader = fitHeaderRow(currentTable.headerRow, sourceWidth);
      let nextRow = fitRow(Array.isArray(currentTable.rows) ? currentTable.rows[0] : null, sourceWidth);

      if (Number.isInteger(removedIndex)) {
        nextHeader.splice(removedIndex + 1, 1);
        nextRow.splice(removedIndex + 1, 1);
      }

      nextHeader = fitHeaderRow(nextHeader, nextWidth);
      nextRow = fitRow(nextRow, nextWidth);
      nextHeader[0] = title;
      nextItems.forEach((item, index) => {
        nextHeader[index + 1] = item;
      });

      return { ...currentTable, headerRow: nextHeader, rows: [nextRow] };
    });
  }

  function addItem() {
    if (items.length >= MAX_PLAN_ITEM_COUNT) return;
    syncItems(items.concat(''));
  }

  function removeItem(index) {
    if (items.length <= MIN_PLAN_ITEM_COUNT) return;
    syncItems(items.filter((_, itemIndex) => itemIndex !== index), index);
  }

  function chooseGraphType(type) {
    if (graph.type === type) return;
    onGraphChange({ type, dividers: [], fills: {} });
  }

  function summaryText(value, fallback) {
    return value && value.trim() ? value.trim() : fallback;
  }

  return (
    <div className="plan-screen">
      <div className="plan-flow">
        {activeStep === 1 ? (
          <section className="panel-block plan-step is-active" ref={titleRef}>
            <div className="plan-step-head">
              <span className="plan-step-index">1</span>
              <PenLine size={18} aria-hidden="true" />
              <span>제목 정하기</span>
            </div>
            <div className="plan-title-row">
              <input
                className="text-input plan-title-input"
                value={title}
                onChange={(event) => updateTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && titleComplete) goToStep(2, itemsRef);
                }}
                placeholder="제목"
                aria-label="제목"
              />
              <button
                className="plan-next-button"
                type="button"
                onClick={() => goToStep(2, itemsRef)}
                onPointerDown={(event) => {
                  if (!titleComplete) return;
                  event.preventDefault();
                  goToStep(2, itemsRef);
                }}
                onKeyDown={(event) => handleAdvanceKey(event, 2, itemsRef)}
                disabled={!titleComplete}
                title="다음"
                aria-label="다음: 항목"
              >
                <span>다음</span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : activeStep < 4 ? (
          <div className="plan-summary-row" ref={titleRef}>
            <PenLine size={18} aria-hidden="true" />
            <span>{summaryText(title, '제목')}</span>
          </div>
        ) : null}

        {activeStep === 4 && visibleStep >= 4 && (
          <section className="panel-block plan-sheet-screen" ref={planSheetRef}>
            <h2 className="plan-sheet-title">&lt;자료 정리 계획서&gt;</h2>
            <div className="plan-sheet-list">
              <div className="plan-sheet-row">
                <PenLine size={18} aria-hidden="true" />
                <span>제목</span>
                <strong>{summaryText(title, '제목')}</strong>
              </div>
              <div className="plan-sheet-row">
                <Table2 size={18} aria-hidden="true" />
                <span>항목</span>
                <strong>{items.map((item, index) => summaryText(item, `항목 ${index + 1}`)).join(', ')}</strong>
              </div>
              <div className="plan-sheet-row">
                <PieChart size={18} aria-hidden="true" />
                <span>그래프</span>
                <strong>{graphTypeLabel}</strong>
              </div>
            </div>
            <div className="plan-step-actions">
              <button
                className="plan-previous-button"
                type="button"
                onClick={() => goToStep(3, graphRef)}
                title="이전"
                aria-label="이전: 그래프"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>이전</span>
              </button>
            </div>
          </section>
        )}

        {activeStep === 2 && visibleStep >= 2 && (
          <section className="panel-block plan-step is-active" ref={itemsRef}>
            <div className="plan-step-head">
              <span className="plan-step-index">2</span>
              <Table2 size={18} aria-hidden="true" />
              <span>표의 항목 정하기</span>
            </div>
            <div className="plan-items-grid">
              {items.map((item, index) => (
                <div className="plan-item-control" key={index}>
                  <input
                    className="text-input compact plan-item-input"
                    value={item}
                    onChange={(event) => updateItem(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && itemsComplete) goToStep(3, graphRef);
                    }}
                    placeholder={`항목 ${index + 1}`}
                    aria-label={`항목 ${index + 1}`}
                  />
                  <button
                    className="icon-button plan-item-delete-button"
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= MIN_PLAN_ITEM_COUNT}
                    title="항목 삭제"
                    aria-label={`항목 ${index + 1} 삭제`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <div className="plan-item-actions">
              <button
                className="plan-previous-button"
                type="button"
                onClick={() => goToStep(1, titleRef)}
                title="이전"
                aria-label="이전: 제목"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>이전</span>
              </button>
              <button
                className="plan-add-button"
                type="button"
                onClick={addItem}
                disabled={items.length >= MAX_PLAN_ITEM_COUNT}
                title="항목 추가"
                aria-label="항목 추가"
              >
                <Plus size={17} aria-hidden="true" />
                <span>항목</span>
              </button>
              <button
                className="plan-next-button"
                type="button"
                onClick={() => goToStep(3, graphRef)}
                onPointerDown={(event) => {
                  if (!itemsComplete) return;
                  event.preventDefault();
                  goToStep(3, graphRef);
                }}
                onKeyDown={(event) => handleAdvanceKey(event, 3, graphRef)}
                disabled={!itemsComplete}
                title="다음"
                aria-label="다음: 그래프"
              >
                <span>다음</span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {activeStep === 3 && visibleStep >= 3 && (
          <>
            <div className="plan-summary-row" ref={itemsRef}>
              <Table2 size={18} aria-hidden="true" />
              <span>{items.map((item, index) => summaryText(item, `항목 ${index + 1}`)).join(', ')}</span>
            </div>
            <section className="panel-block plan-step is-active" ref={graphRef}>
              <div className="plan-step-head">
                <span className="plan-step-index">3</span>
                <PieChart size={18} aria-hidden="true" />
                <span>그래프 종류 선택</span>
              </div>
              <div className="plan-graph-options">
                <button
                  className={`plan-graph-button ${graph.type === 'bar' ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => chooseGraphType('bar')}
                  aria-pressed={graph.type === 'bar'}
                >
                  <Grid3X3 size={18} aria-hidden="true" />
                  <span>띠그래프</span>
                </button>
                <button
                  className={`plan-graph-button ${graph.type === 'pie' ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => chooseGraphType('pie')}
                  aria-pressed={graph.type === 'pie'}
                >
                  <Circle size={18} aria-hidden="true" />
                  <span>원그래프</span>
                </button>
              </div>
              <div className="plan-step-actions">
                <button
                  className="plan-previous-button"
                  type="button"
                  onClick={() => goToStep(2, itemsRef)}
                  title="이전"
                  aria-label="이전: 항목"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                  <span>이전</span>
                </button>
                <button
                  className="plan-next-button"
                  type="button"
                  onClick={() => goToStep(4, planSheetRef)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    goToStep(4, planSheetRef);
                  }}
                  onKeyDown={(event) => handleAdvanceKey(event, 4, planSheetRef)}
                  title="다음"
                  aria-label="다음: 자료 정리 계획서"
                >
                  <span>다음</span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function TableWorkspace({ table, onTableChange }) {
  const tableWidth = getTableWidth(table);
  const fittedHeader = useMemo(() => fitHeaderRow(table.headerRow, tableWidth), [table.headerRow, tableWidth]);
  const fittedRows = useMemo(() => fitRows(table.rows, tableWidth), [table.rows, tableWidth]);

  useEffect(() => {
    if (!Array.isArray(table.headerRow) || table.headerRow.length !== tableWidth || !Array.isArray(table.rows) || table.rows.length !== 2 || table.rows.some((row) => !Array.isArray(row) || row.length !== tableWidth)) {
      onTableChange({ headerRow: fittedHeader, rows: fittedRows });
    }
  }, [table.headerRow, table.rows, tableWidth, fittedHeader, fittedRows, onTableChange]);

  function updateHeaderCell(cellIndex, value) {
    onTableChange((currentTable) => {
      const headerRow = fitHeaderRow(currentTable.headerRow, tableWidth);
      headerRow[cellIndex] = value;
      return { ...currentTable, headerRow };
    });
  }

  function updateCell(rowIndex, cellIndex, value) {
    onTableChange((currentTable) => {
      const rows = fitRows(currentTable.rows, tableWidth);
      rows[rowIndex][cellIndex] = value;
      return { ...currentTable, rows };
    });
  }

  return (
    <div className="table-workspace">
      <section className="panel-block table-panel">
        <div className="manual-table-wrap">
          <table className="manual-table" style={{ minWidth: `${Math.max(420, tableWidth * 118)}px` }}>
            <thead>
              <tr>
                {fittedHeader.map((cell, cellIndex) => (
                  <th key={cellIndex}>
                    <input
                      value={cell}
                      onChange={(event) => updateHeaderCell(cellIndex, event.target.value)}
                      readOnly={cellIndex === 0}
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
                    <td key={cellIndex} className={cellIndex === 0 ? 'title-column-cell' : undefined}>
                      <input
                        value={cell}
                        onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)}
                        readOnly={cellIndex === 0}
                        aria-label={`${rowIndex + 1}행 ${cellIndex + 1}열`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </section>
    </div>
  );
}

function GraphWorkspace({ graph, onChange }) {
  const canvasRef = useRef(null);
  const segments = getSegments(graph.dividers);
  const dividerTicks = useMemo(() => makeDividerTicks(graph.scale), [graph.scale]);
  const coloredSegmentCount = getColoredSegmentCount(segments, graph.fills);

  function setGraph(patch) {
    onChange({ ...graph, ...patch });
  }

  function handleGraphPoint(point) {
    if ((graph.mode === 'divide' || graph.mode === 'paint') && !point.insideGraph) return;

    if (graph.mode === 'divide') {
      const snapped = getSnappedDividerValue(graph, point);
      const hasDivider = graph.dividers.indexOf(snapped) !== -1;
      const dividers = hasDivider
        ? graph.dividers.filter((value) => value !== snapped)
        : sanitizeDividers(graph.dividers.concat(snapped));
      setGraph({ dividers });
      return;
    }

    if (graph.mode === 'paint') {
      fillSegment(findSegmentFromPoint(graph, segments, point));
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

  function toggleDivider(value) {
    const hasDivider = graph.dividers.indexOf(value) !== -1;
    const dividers = hasDivider
      ? graph.dividers.filter((divider) => divider !== value)
      : sanitizeDividers(graph.dividers.concat(value));
    setGraph({ dividers });
  }

  function undoDivider() {
    if (!graph.dividers.length) return;
    setGraph({ dividers: graph.dividers.slice(0, -1) });
  }

  function fillSegment(segment) {
    if (!segment) return;
    setGraph({ fills: { ...graph.fills, [segment.key]: graph.activeColor } });
  }

  function clearSegment(segment) {
    if (!segment || !graph.fills[segment.key]) return;
    const fills = { ...graph.fills };
    delete fills[segment.key];
    setGraph({ fills });
  }

  function clearFills() {
    if (!coloredSegmentCount) return;
    setGraph({ fills: {} });
  }

  function addCenterLabel() {
    setGraph({
      labels: graph.labels.concat({
        id: makeId('label'),
        text: '글자',
        x: 50,
        y: graph.type === 'bar' ? 72 : 88
      })
    });
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

        <GraphManualPanel
          graph={graph}
          segments={segments}
          dividerTicks={dividerTicks}
          coloredSegmentCount={coloredSegmentCount}
          onToggleDivider={toggleDivider}
          onFillSegment={fillSegment}
          onClearSegment={clearSegment}
        />

        <div className="graph-action-row">
          <button className="icon-button" type="button" onClick={undoDivider} disabled={!graph.dividers.length} title="마지막 선 지우기" aria-label="마지막 선 지우기">
            <Undo2 size={17} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" onClick={clearFills} disabled={!coloredSegmentCount} title="색 모두 지우기" aria-label="색 모두 지우기">
            <Eraser size={17} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" onClick={addCenterLabel} title="글자 추가" aria-label="글자 추가">
            <Plus size={17} aria-hidden="true" />
          </button>
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

function GraphManualPanel({ graph, segments, dividerTicks, coloredSegmentCount, onToggleDivider, onFillSegment, onClearSegment }) {
  return (
    <div className="graph-manual-panel">
      <div className="graph-count-row" aria-live="polite">
        <span>선 {graph.dividers.length}</span>
        <span>구간 {segments.length}</span>
        <span>색 {coloredSegmentCount}</span>
      </div>

      <div className="divider-chip-grid" aria-label="눈금선 직접 나누기">
        {dividerTicks.map((value) => (
          <button
            key={value}
            type="button"
            className={graph.dividers.indexOf(value) !== -1 ? 'is-active' : ''}
            onClick={() => onToggleDivider(value)}
            aria-pressed={graph.dividers.indexOf(value) !== -1}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="graph-segment-list" aria-label="구간 직접 색칠하기">
        {segments.map((segment) => {
          const color = graph.fills[segment.key];
          return (
            <div className="graph-segment-row" key={segment.key}>
              <button className="graph-segment-fill" type="button" onClick={() => onFillSegment(segment)}>
                <span className="segment-color-dot" style={{ backgroundColor: color || '#ffffff' }} />
                <span>{formatSegmentRange(segment)}</span>
              </button>
              <button
                className="segment-clear-button"
                type="button"
                onClick={() => onClearSegment(segment)}
                disabled={!color}
                title={`${formatSegmentRange(segment)} 색 지우기`}
                aria-label={`${formatSegmentRange(segment)} 색 지우기`}
              >
                <Eraser size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const GraphCanvas = React.forwardRef(function GraphCanvas({ graph, segments, onPoint, onLabelChange }, ref) {
  const touchGuard = useRef(0);
  const [hoverPoint, setHoverPoint] = useState(null);
  const previewDivider = hoverPoint && hoverPoint.insideGraph && graph.mode === 'divide'
    ? getSnappedDividerValue(graph, hoverPoint)
    : null;
  const previewSegment = hoverPoint && hoverPoint.insideGraph && graph.mode === 'paint'
    ? findSegmentFromPoint(graph, segments, hoverPoint)
    : null;
  const readoutText = hoverPoint && hoverPoint.insideGraph && graph.mode !== 'text'
    ? getPointReadout(graph, segments, hoverPoint)
    : '';
  const readoutStyle = hoverPoint
    ? {
      left: `${clamp(hoverPoint.canvasX, 9, 91)}%`,
      top: `${clamp(hoverPoint.canvasY - 8, 7, 93)}%`
    }
    : null;

  function pointFromEvent(clientX, clientY, target) {
    const rect = target.getBoundingClientRect();
    const canvasX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const canvasY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    const graphElement = target.querySelector(graph.type === 'bar' ? '.bar-svg' : '.pie-svg');
    const graphRect = graphElement ? graphElement.getBoundingClientRect() : rect;
    const svgHeight = graph.type === 'bar' ? 60 : 100;
    const rawSvgX = graphRect.width ? ((clientX - graphRect.left) / graphRect.width) * 100 : 0;
    const rawSvgY = graphRect.height ? ((clientY - graphRect.top) / graphRect.height) * svgHeight : 0;
    const svgX = clamp(rawSvgX, 0, 100);
    const svgY = clamp(rawSvgY, 0, svgHeight);
    const graphX = clamp(((svgX - BAR_GRAPH_BOX.left) / BAR_GRAPH_BOX.width) * 100, 0, 100);
    const graphY = clamp(((svgY - BAR_GRAPH_BOX.top) / BAR_GRAPH_BOX.height) * 100, 0, 100);
    const pieDistance = Math.hypot(rawSvgX - PIE_GRAPH_CIRCLE.cx, rawSvgY - PIE_GRAPH_CIRCLE.cy);
    const insideGraph = graph.type === 'bar'
      ? rawSvgX >= BAR_GRAPH_BOX.left
        && rawSvgX <= BAR_GRAPH_BOX.left + BAR_GRAPH_BOX.width
        && rawSvgY >= BAR_GRAPH_BOX.top
        && rawSvgY <= BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height
      : pieDistance <= PIE_GRAPH_CIRCLE.radius;
    const percentAngle = pointToPiePercent(svgX, svgY);
    return { canvasX, canvasY, svgX, svgY, graphX, graphY, percentAngle, insideGraph };
  }

  function handleTouchStart(event) {
    if (!event.touches || !event.touches.length) return;
    touchGuard.current = Date.now();
    event.preventDefault();
    const point = pointFromEvent(event.touches[0].clientX, event.touches[0].clientY, event.currentTarget);
    setHoverPoint(point.insideGraph ? point : null);
    onPoint(point);
  }

  function handleMouseDown(event) {
    if (Date.now() - touchGuard.current < 650) return;
    if (event.button !== 0) return;
    const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget);
    setHoverPoint(point.insideGraph ? point : null);
    onPoint(point);
  }

  function handleMouseMove(event) {
    const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget);
    setHoverPoint(point.insideGraph ? point : null);
  }

  return (
    <div
      className={`graph-canvas mode-${graph.mode}`}
      ref={ref}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverPoint(null)}
      onTouchStart={handleTouchStart}
      role="button"
      aria-label="그래프 그리기 영역"
    >
      {graph.type === 'bar' ? (
        <BarGraph graph={graph} segments={segments} previewDivider={previewDivider} previewSegmentKey={previewSegment && previewSegment.key} />
      ) : (
        <PieGraph graph={graph} segments={segments} previewDivider={previewDivider} previewSegmentKey={previewSegment && previewSegment.key} />
      )}

      {readoutText && <div className="graph-readout" style={readoutStyle}>{readoutText}</div>}

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

function BarGraph({ graph, segments, previewDivider, previewSegmentKey }) {
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
      {segments.map((segment) => (
        segment.key === previewSegmentKey ? (
          <rect
            key={`preview-${segment.key}`}
            className="graph-preview-segment"
            x={6 + segment.start * 0.88}
            y="18"
            width={(segment.end - segment.start) * 0.88}
            height="24"
            fill="none"
          />
        ) : null
      ))}
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={6 + tick * 0.88} x2={6 + tick * 0.88} y1="15" y2="45" stroke="#bdc7d3" strokeWidth="0.24" />
          <text x={6 + tick * 0.88} y="52" textAnchor="middle" fill="#52606f" fontSize="3.2">{tick}</text>
        </g>
      ))}
      {Number.isFinite(previewDivider) && (
        <line className="graph-preview-line" x1={6 + previewDivider * 0.88} x2={6 + previewDivider * 0.88} y1="14" y2="46" />
      )}
      {graph.dividers.map((divider) => (
        <line key={divider} x1={6 + divider * 0.88} x2={6 + divider * 0.88} y1="16" y2="44" stroke="#1f2d3d" strokeWidth="1.05" />
      ))}
    </svg>
  );
}

function PieGraph({ graph, segments, previewDivider, previewSegmentKey }) {
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
      {segments.map((segment) => {
        if (segment.key !== previewSegmentKey) return null;
        if (segment.start === 0 && segment.end === 100) {
          return <circle key={`preview-${segment.key}`} className="graph-preview-segment" cx="50" cy="50" r="38" fill="none" />;
        }
        return <path key={`preview-${segment.key}`} className="graph-preview-segment" d={sectorPath(50, 50, 38, segment.start, segment.end)} fill="none" />;
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
      {Number.isFinite(previewDivider) && (
        <line className="graph-preview-line" x1="50" y1="50" x2={polarPoint(50, 50, 40, previewDivider).x} y2={polarPoint(50, 50, 40, previewDivider).y} />
      )}
      {graph.dividers.map((divider) => {
        const point = polarPoint(50, 50, 38, divider);
        return <line key={divider} x1="50" y1="50" x2={point.x} y2={point.y} stroke="#1f2d3d" strokeWidth="1.15" />;
      })}
    </svg>
  );
}

function ShareDialog({ state, onClose, onImport }) {
  const [qrSrc, setQrSrc] = useState('');
  const [activeQrIndex, setActiveQrIndex] = useState(0);
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');
  const sharePayload = useMemo(() => makeSharePayload(state), [state]);
  const activeQrItem = sharePayload.items[Math.min(activeQrIndex, sharePayload.items.length - 1)] || sharePayload.items[0];

  useEffect(() => {
    setActiveQrIndex(0);
    setMessage('');
  }, [sharePayload.cacheKey]);

  useEffect(() => {
    let live = true;
    setQrSrc('');
    makeQrImage(activeQrItem.url).then((url) => {
      if (live) setQrSrc(url);
    }).catch(() => {
      if (live) setMessage('QR 이미지를 만들지 못했습니다.');
    });
    return () => {
      live = false;
    };
  }, [activeQrItem.url]);

  function copyPayload() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sharePayload.copyText)
        .then(() => setMessage('복사했습니다.'))
        .catch(() => {
          setImportText(sharePayload.copyText);
          setMessage('아래 주소를 길게 눌러 복사해 주세요.');
        });
    } else {
      setImportText(sharePayload.copyText);
      setMessage('아래 주소를 길게 눌러 복사해 주세요.');
    }
  }

  function applyImport() {
    const result = parseImportTextResult(importText);
    if (!result.state) {
      setMessage(result.message || '가져올 수 없는 QR 내용입니다.');
      return;
    }
    onImport(result.state);
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
            {sharePayload.items.length > 1 && (
              <div className="qr-pager" aria-label="QR 순서">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setActiveQrIndex((index) => Math.max(0, index - 1))}
                  disabled={activeQrIndex === 0}
                  title="이전"
                  aria-label="이전 QR"
                >
                  <ChevronLeft size={17} aria-hidden="true" />
                </button>
                <span>{activeQrIndex + 1}/{sharePayload.items.length}</span>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setActiveQrIndex((index) => Math.min(sharePayload.items.length - 1, index + 1))}
                  disabled={activeQrIndex >= sharePayload.items.length - 1}
                  title="다음"
                  aria-label="다음 QR"
                >
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>
            )}
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

function makeDividerTicks(scale) {
  const ticks = [];
  for (let value = scale; value < 100; value += scale) ticks.push(value);
  return ticks;
}

function getGraphPointValue(graph, point) {
  return graph.type === 'bar' ? point.graphX : point.percentAngle;
}

function getSnappedDividerValue(graph, point) {
  const raw = getGraphPointValue(graph, point);
  return clamp(Math.round(raw / graph.scale) * graph.scale, graph.scale, 100 - graph.scale);
}

function findSegmentByValue(segments, value) {
  if (!segments.length) return null;
  return segments.find((segment, index) => (
    value >= segment.start && (value < segment.end || index === segments.length - 1)
  )) || segments[segments.length - 1];
}

function findSegmentFromPoint(graph, segments, point) {
  return findSegmentByValue(segments, getGraphPointValue(graph, point));
}

function formatSegmentRange(segment) {
  return `${segment.start}-${segment.end}%`;
}

function getColoredSegmentCount(segments, fills) {
  return segments.reduce((count, segment) => count + (fills && fills[segment.key] ? 1 : 0), 0);
}

function getPointReadout(graph, segments, point) {
  if (graph.mode === 'divide') return `${getSnappedDividerValue(graph, point)}%`;
  const segment = findSegmentFromPoint(graph, segments, point);
  return segment ? formatSegmentRange(segment) : '';
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

async function makeQrImage(text) {
  try {
    return await QRCode.toDataURL(text, QR_IMAGE_OPTIONS);
  } catch (error) {
    const svg = await QRCode.toString(text, { ...QR_IMAGE_OPTIONS, type: 'svg' });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}

function makeSharePayload(state) {
  const base = getShareBaseUrl();
  const packed = packShareState(state);
  const candidates = makeShareCandidates(base, packed);
  const single = chooseBestQrCandidate(candidates);
  if (single) {
    return {
      cacheKey: single.url,
      copyText: single.url,
      items: [{ url: single.url }],
      mode: 'single'
    };
  }
  return chooseBestChunkPayload(base, candidates);
}

function getShareBaseUrl() {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (origin && origin !== 'null') return `${origin}${window.location.pathname}`;
  return window.location.href.split('#')[0].split('?')[0];
}

function makeShareCandidates(base, packed) {
  if (isDefaultShareState(packed)) {
    return [makeShareCandidate(base, 'g', SHARE_DEFAULT_TOKEN)];
  }

  const json = JSON.stringify(packed);
  return [
    makeShareCandidate(base, 'g', compressToEncodedURIComponent(json)),
    makeShareCandidate(base, 'u', encodeBase32(compressToUint8Array(json)))
  ];
}

function makeShareCandidate(base, kind, token) {
  return {
    kind,
    token,
    url: `${base}#${kind}=${token}`
  };
}

function chooseBestQrCandidate(candidates) {
  return candidates
    .map((candidate) => ({ ...candidate, score: scoreQrText(candidate.url) }))
    .filter((candidate) => candidate.score.ok)
    .sort(compareQrCandidates)[0] || null;
}

function chooseBestChunkPayload(base, candidates) {
  const plans = candidates
    .map((candidate) => makeChunkPayload(base, candidate))
    .filter(Boolean)
    .sort((first, second) => (
      first.items.length - second.items.length
      || first.maxVersion - second.maxVersion
      || first.totalLength - second.totalLength
    ));

  if (plans[0]) return plans[0];
  const codeOnlyPlans = candidates
    .map((candidate) => makeChunkPayload('', candidate))
    .filter(Boolean)
    .sort((first, second) => (
      first.items.length - second.items.length
      || first.maxVersion - second.maxVersion
      || first.totalLength - second.totalLength
    ));
  if (codeOnlyPlans[0]) return codeOnlyPlans[0];

  const fallback = makeShareCandidate(base, 'g', SHARE_DEFAULT_TOKEN);
  return {
    cacheKey: fallback.url,
    copyText: fallback.url,
    items: [{ url: fallback.url }],
    mode: 'single'
  };
}

function makeChunkPayload(base, candidate) {
  const batchId = makeShareBatchId(`${candidate.kind}:${candidate.token}`);
  for (const size of SHARE_CHUNK_SIZES) {
    const parts = splitText(candidate.token, size);
    const prefix = base ? `${base}#p=` : 'p=';
    const items = parts.map((part, index) => ({
      url: `${prefix}${candidate.kind.toUpperCase()}.${batchId}.${index.toString(36).toUpperCase()}.${parts.length.toString(36).toUpperCase()}.${part}`
    }));
    const scores = items.map((item) => scoreQrText(item.url));
    if (!scores.every((score) => score.ok)) continue;
    return {
      cacheKey: `${candidate.kind}:${batchId}:${candidate.token.length}:${size}`,
      copyText: candidate.url,
      items,
      mode: 'chunked',
      maxVersion: Math.max(...scores.map((score) => score.version)),
      totalLength: items.reduce((sum, item) => sum + item.url.length, 0)
    };
  }
  return null;
}

function scoreQrText(text) {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: QR_IMAGE_OPTIONS.errorCorrectionLevel });
    return {
      ok: true,
      version: qr.version || 0,
      length: text.length
    };
  } catch (error) {
    return {
      ok: false,
      version: Infinity,
      length: text.length
    };
  }
}

function compareQrCandidates(first, second) {
  return first.score.version - second.score.version
    || first.score.length - second.score.length
    || first.kind.localeCompare(second.kind);
}

function splitText(text, size) {
  const parts = [];
  for (let index = 0; index < text.length; index += size) {
    parts.push(text.slice(index, index + size));
  }
  return parts.length ? parts : [''];
}

function makeShareBatchId(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}

function packShareState(state) {
  const packed = { v: SHARE_VERSION };
  const plan = state && state.plan ? state.plan : {};
  const table = state && state.table ? state.table : {};
  const graph = state && state.graph ? state.graph : {};
  const itemCount = getPlanItemCount(plan.items, table.headerRow);
  const tableWidth = itemCount + 1;

  const planPayload = {};
  const title = typeof plan.title === 'string' ? plan.title : '';
  const itemPayload = packRowForShare(plan.items, itemCount);
  if (title) planPayload.t = title;
  if (itemPayload) planPayload.i = itemPayload;
  if (itemCount !== DEFAULT_PLAN_ITEM_COUNT) planPayload.c = itemCount;
  if (hasObjectKeys(planPayload)) packed.p = planPayload;

  const tablePayload = {};
  const headerPayload = packRowForShare(table.headerRow, tableWidth);
  const rowPayload = packRowsForShare(table.rows, tableWidth);
  if (headerPayload) tablePayload.h = headerPayload;
  if (rowPayload) {
    if (rowPayload.length === 1) {
      tablePayload.r = rowPayload[0];
    } else {
      tablePayload.rs = rowPayload;
    }
  }
  if (hasObjectKeys(tablePayload)) packed.t = tablePayload;

  const graphPayload = packGraphForShare(graph);
  if (graphPayload) packed.g = graphPayload;

  return packed;
}

function isDefaultShareState(packed) {
  return packed && Object.keys(packed).length === 1 && packed.v === SHARE_VERSION;
}

function packRowForShare(row, width) {
  const fitted = fitRow(row, width);
  while (fitted.length && !fitted[fitted.length - 1]) fitted.pop();
  return fitted.length ? fitted : null;
}

function packRowsForShare(rows, width) {
  const packedRows = fitRows(rows, width)
    .map((row) => packRowForShare(row, width))
    .filter((row) => row);
  return packedRows.length ? packedRows : null;
}

function packGraphForShare(graph) {
  const packed = {};
  const type = graph.type === 'pie' ? 'pie' : 'bar';
  const scale = Number(graph.scale) || 10;
  const dividers = sanitizeDividers(Array.isArray(graph.dividers) ? graph.dividers : []);
  const fillPayload = packFillsForShare(graph.fills, dividers);
  const labelPayload = packLabelsForShare(graph.labels);
  const mode = GRAPH_MODE_CODES[graph.mode] || GRAPH_MODE_CODES.divide;
  const activeColor = graph.activeColor || GRAPH_COLORS[0];

  if (type === 'pie') packed.t = 'p';
  if (scale !== 10) packed.s = scale;
  if (dividers.length) packed.d = encodeDividersForShare(dividers);
  if (fillPayload) packed.f = fillPayload;
  if (labelPayload) packed.l = labelPayload;
  if (mode !== GRAPH_MODE_CODES.divide) packed.m = mode;
  if (activeColor !== GRAPH_COLORS[0]) packed.a = encodeColorForShare(activeColor, GRAPH_COLORS);

  return hasObjectKeys(packed) ? packed : null;
}

function packFillsForShare(fills, dividers) {
  if (!fills || typeof fills !== 'object') return null;
  const segments = getSegments(dividers);
  const entries = [];
  const codes = Array(segments.length).fill('.');
  let canUseString = true;

  segments.forEach((segment, index) => {
    const color = fills[segment.key];
    if (!color) return;
    const code = encodeColorForShare(color, GRAPH_COLORS);
    entries.push([index, code]);
    if (typeof code === 'string' && code.length === 1) {
      codes[index] = code;
    } else {
      canUseString = false;
    }
  });

  if (!entries.length) return null;
  if (!canUseString) return entries;
  while (codes.length && codes[codes.length - 1] === '.') codes.pop();
  return codes.join('');
}

function packLabelsForShare(labels) {
  if (!Array.isArray(labels) || !labels.length) return null;
  return labels.map((label) => [
    label && typeof label.text === 'string' ? label.text : '',
    quantizePercent(label && label.x),
    quantizePercent(label && label.y)
  ]);
}

function unpackShareState(packed) {
  if (!packed || packed.v !== SHARE_VERSION) return null;
  const tablePayload = asPlainObject(packed.t);
  const planPayload = asPlainObject(packed.p);
  const itemCount = normalizePlanItemCount(planPayload.c, getPlanItemCount(planPayload.i, tablePayload.h));
  const tableWidth = itemCount + 1;

  return normalizeLoadedState({
    plan: {
      title: typeof planPayload.t === 'string' ? planPayload.t : '',
      items: unpackRowForShare(planPayload.i, itemCount)
    },
    table: {
      headerRow: unpackRowForShare(tablePayload.h, tableWidth),
      rows: unpackRowsForShare(tablePayload, tableWidth),
      tableDefaultsCleared: true
    },
    graph: unpackGraphForShare(packed.g)
  });
}

function unpackRowForShare(encoded, width) {
  const row = Array(width).fill('');
  if (Array.isArray(encoded)) {
    for (let index = 0; index < width; index += 1) {
      if (typeof encoded[index] === 'string') row[index] = encoded[index];
    }
    return row;
  }
  if (!encoded || typeof encoded !== 'object') return row;
  Object.entries(encoded).forEach(([key, value]) => {
    const index = Number.parseInt(key, 36);
    if (index >= 0 && index < width && typeof value === 'string') row[index] = value;
  });
  return row;
}

function unpackRowsForShare(tablePayload, width) {
  if (Array.isArray(tablePayload.rs)) {
    const rows = tablePayload.rs
      .map((row) => unpackRowForShare(row, width))
      .filter((row) => row.some((cell) => cell));
    return rows.length ? rows : [makeEmptyRow(width)];
  }
  return [unpackRowForShare(tablePayload.r, width)];
}

function unpackGraphForShare(encoded) {
  const graph = asPlainObject(encoded);
  const dividers = decodeDividersForShare(graph.d);
  const scale = [5, 10, 20, 25].includes(Number(graph.s)) ? Number(graph.s) : 10;
  return {
    type: graph.t === 'p' ? 'pie' : 'bar',
    scale,
    mode: GRAPH_MODES_BY_CODE[graph.m] || 'divide',
    activeColor: decodeColorForShare(graph.a, GRAPH_COLORS, GRAPH_COLORS[0]),
    dividers,
    fills: decodeFillsForShare(graph.f, dividers),
    labels: decodeLabelsForShare(graph.l)
  };
}

function encodeDividersForShare(dividers) {
  return sanitizeDividers(dividers).map((divider) => toBase36(Math.round(divider), 2)).join('');
}

function decodeDividersForShare(encoded) {
  if (Array.isArray(encoded)) return sanitizeDividers(encoded);
  if (typeof encoded !== 'string' || !encoded) return [];
  const dividers = [];
  for (let index = 0; index + 1 < encoded.length; index += 2) {
    const value = Number.parseInt(encoded.slice(index, index + 2), 36);
    if (Number.isFinite(value)) dividers.push(value);
  }
  return sanitizeDividers(dividers);
}

function decodeFillsForShare(encoded, dividers) {
  const segments = getSegments(dividers);
  const fills = {};
  if (typeof encoded === 'string') {
    Array.from(encoded).forEach((code, index) => {
      if (!segments[index] || code === '.') return;
      fills[segments[index].key] = decodeColorForShare(code, GRAPH_COLORS, GRAPH_COLORS[0]);
    });
    return fills;
  }
  if (!Array.isArray(encoded)) return fills;
  encoded.forEach((entry) => {
    if (!Array.isArray(entry)) return;
    const index = Number(entry[0]);
    if (!segments[index]) return;
    fills[segments[index].key] = decodeColorForShare(entry[1], GRAPH_COLORS, GRAPH_COLORS[0]);
  });
  return fills;
}

function decodeLabelsForShare(encoded) {
  if (!Array.isArray(encoded)) return [];
  return encoded
    .filter((label) => Array.isArray(label))
    .map((label) => ({
      id: makeId('label'),
      text: typeof label[0] === 'string' ? label[0] : '',
      x: decodeQuantizedPercent(label[1]),
      y: decodeQuantizedPercent(label[2])
    }));
}

function encodeColorForShare(color, palette) {
  const index = palette.indexOf(color);
  return index >= 0 ? index.toString(36) : color;
}

function decodeColorForShare(value, palette, fallback) {
  if (typeof value === 'number') return palette[value] || fallback;
  if (typeof value !== 'string' || !value) return fallback;
  const index = Number.parseInt(value, 36);
  if (value.length <= 2 && Number.isFinite(index) && palette[index]) return palette[index];
  return value;
}

function quantizePercent(value) {
  const number = Number(value);
  return Math.round(clamp(Number.isFinite(number) ? number : 50, 0, 100) * 10);
}

function decodeQuantizedPercent(value) {
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number / 10 : 50, 0, 100);
}

function toBase36(value, width) {
  return Math.max(0, value).toString(36).padStart(width, '0');
}

function encodeBase32(bytes) {
  let output = '';
  let value = 0;
  let bits = 0;
  bytes.forEach((byte) => {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  });
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(text) {
  const clean = (text || '').toUpperCase();
  const bytes = [];
  let value = 0;
  let bits = 0;

  for (const character of clean) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

function hasObjectKeys(value) {
  return value && Object.keys(value).length > 0;
}

function asPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readStateFromHash() {
  return parseImportTextResult(window.location.hash || '').state;
}

function parseImportText(text) {
  return parseImportTextResult(text).state;
}

function parseImportTextResult(text) {
  if (!text || !text.trim()) return { state: null };
  const payload = extractSharePayload(text);
  if (!payload) return { state: null };
  if (payload.kind === 'p') return parseShareChunk(payload.value);
  const state = decodeShareToken(payload.kind, payload.value);
  return { state };
}

function extractSharePayload(text) {
  const trimmed = text.trim();
  const sources = [];
  try {
    const url = new URL(trimmed, window.location.href);
    if (url.hash) sources.push(url.hash.replace(/^#/, ''));
  } catch (error) {
    // 붙여넣은 값이 URL이 아니면 아래 원문 검사로 처리한다.
  }
  sources.push(trimmed.replace(/^#/, ''));

  for (const source of sources) {
    const marker = ['g=', 'u=', 'p=', 'how-to-graph='].find((item) => source.indexOf(item) >= 0);
    if (marker) {
      return {
        kind: marker === 'how-to-graph=' ? 'legacy' : marker[0],
        value: source.slice(source.indexOf(marker) + marker.length)
      };
    }
  }

  return { kind: 'legacy', value: trimmed.replace(/^#/, '') };
}

function decodeShareToken(kind, token) {
  const clean = (token || '').trim().replace(/^#/, '');
  try {
    if (kind === 'g') {
      if (clean === SHARE_DEFAULT_TOKEN) return unpackShareState({ v: SHARE_VERSION });
      return parseShareJson(decompressFromEncodedURIComponent(clean));
    }
    if (kind === 'u') {
      const bytes = decodeBase32(clean);
      return bytes ? parseShareJson(decompressFromUint8Array(bytes)) : null;
    }
    const json = decompressFromEncodedURIComponent(clean);
    if (!json) return null;
    const parsed = JSON.parse(json);
    return normalizeLoadedState(parsed.state || parsed);
  } catch (error) {
    return null;
  }
}

function parseShareJson(json) {
  if (!json) return null;
  const parsed = JSON.parse(json);
  if (parsed && parsed.v === SHARE_VERSION) return unpackShareState(parsed);
  return normalizeLoadedState(parsed.state || parsed);
}

function parseShareChunk(value) {
  const parts = value.split('.');
  if (parts.length < 5) return { state: null, message: '가져올 수 없는 QR 내용입니다.' };
  const [kindCode, batchId, indexCode, totalCode, ...chunkParts] = parts;
  const kind = kindCode.toLowerCase();
  const index = Number.parseInt(indexCode, 36);
  const total = Number.parseInt(totalCode, 36);
  const chunk = chunkParts.join('.');
  if (!['g', 'u'].includes(kind) || !batchId || !Number.isInteger(index) || !Number.isInteger(total) || index < 0 || index >= total || total < 1) {
    return { state: null, message: '가져올 수 없는 QR 내용입니다.' };
  }

  const key = `${SHARE_CHUNK_PREFIX}${kind}:${batchId}:${total}`;
  const chunks = readShareChunks(key, total);
  chunks[index] = chunk;
  writeShareChunks(key, chunks);

  const received = chunks.filter((part) => part).length;
  if (received < total) {
    return { state: null, message: `QR ${received}/${total} 받았습니다.` };
  }

  const state = decodeShareToken(kind, chunks.join(''));
  clearShareChunks(key);
  return state ? { state } : { state: null, message: '가져올 수 없는 QR 내용입니다.' };
}

function readShareChunks(key, total) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(key));
    if (Array.isArray(saved) && saved.length === total) return saved;
  } catch (error) {
    // 저장소 접근이 막힌 환경에서는 현재 탭 메모리로만 이어 붙인다.
  }
  const cached = chunkMemory.get(key);
  return Array.isArray(cached) && cached.length === total ? cached : Array(total).fill('');
}

function writeShareChunks(key, chunks) {
  chunkMemory.set(key, chunks);
  try {
    window.localStorage.setItem(key, JSON.stringify(chunks));
  } catch (error) {
    // QR 조각은 메모리에도 남겨 현재 탭에서는 계속 받을 수 있게 한다.
  }
}

function clearShareChunks(key) {
  chunkMemory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // 저장소 접근 실패는 가져오기 완료를 막지 않는다.
  }
}

const rootElement = document.getElementById('root');
const appRoot = rootElement._howToGraphRoot || createRoot(rootElement);
rootElement._howToGraphRoot = appRoot;
appRoot.render(<App />);
