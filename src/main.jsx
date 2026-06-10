import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {
  compressToEncodedURIComponent,
  compressToUint8Array,
  decompressFromEncodedURIComponent,
  decompressFromUint8Array
} from 'lz-string';
import {
  ALargeSmall,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eraser,
  FileText,
  Grid3X3,
  Maximize2,
  Megaphone,
  MousePointer2,
  PaintBucket,
  PenLine,
  PieChart,
  Plus,
  QrCode,
  Share2,
  Table2,
  Trash2,
  Undo2,
  X
} from 'lucide-react';
import './styles.css';

const TABS = [
  { id: 'plan', label: '계획', icon: PenLine },
  { id: 'table', label: '표 그리기', icon: Table2 },
  { id: 'graph', label: '그래프 그리기', icon: PieChart },
  { id: 'interpret', label: '해석하기', icon: FileText }
];

const DEFAULT_PLAN_ITEM_COUNT = 4;
const MIN_PLAN_ITEM_COUNT = 1;
const MAX_PLAN_ITEM_COUNT = 8;
const MIN_PLAN_STEP = 1;
const MAX_PLAN_STEP = 4;
const GRAPH_COLORS = [
  '#8fe6d2',
  '#ffd37a',
  '#ff9b9b',
  '#8fc2ff',
  '#c6a6ff',
  '#a8e8b3',
  '#ffb9d1',
  '#a9b2bd',
  '#fff08a',
  '#7fdcf0',
  '#bca39a'
];
const GRAPH_ERASER_COLOR = '#ffffff';
const GRAPH_COLOR_SHARE_PALETTE = [
  '#8fe6d2',
  '#ffd37a',
  '#ff9b9b',
  '#8fc2ff',
  '#c6a6ff',
  '#a8e8b3',
  '#ffb9d1',
  '#a9b2bd',
  '#ff9b9b',
  '#fff08a',
  '#7fdcf0',
  '#bca39a'
];
const GRAPH_COLOR_MIGRATIONS = {
  '#5ac8a8': '#8fe6d2',
  '#ffb84d': '#ffd37a',
  '#ff6b6b': '#ff9b9b',
  '#4d96ff': '#8fc2ff',
  '#9b6bff': '#c6a6ff',
  '#7bd389': '#a8e8b3',
  '#f78fb3': '#ffb9d1',
  '#6c7a89': '#a9b2bd',
  '#f25f5c': '#ff9b9b',
  '#ffe066': '#fff08a',
  '#00b4d8': '#7fdcf0',
  '#8d6e63': '#bca39a',
  '#fff': GRAPH_ERASER_COLOR
};
const LABEL_TICK_STEPS_BY_SCALE = {
  1: 20,
  2: 20,
  3: 15,
  4: 20,
  5: 25,
  6: 18,
  7: 21,
  8: 24,
  9: 27,
  10: 20,
  11: 22,
  12: 24,
  13: 26,
  14: 28,
  15: 30,
  16: 32,
  17: 34,
  18: 36,
  19: 38,
  20: 40
};
const LABEL_COLORS = ['#1f2d3d', '#ffffff'];
const LABEL_BORDER_MOVE_AREAS = ['top', 'right', 'bottom', 'left'];
const DEFAULT_LABEL_WIDTH = 88;
const MIN_LABEL_WIDTH = 40;
const MAX_LABEL_WIDTH = 640;
const LABEL_AUTO_PADDING = 32;
const LABEL_FRAME_MARGIN = 12;
const LABEL_LINE_HEIGHT = 1.18;
const LABEL_BOX_VERTICAL_PADDING_EM = 0.75;
const LABEL_BOX_VERTICAL_GUARD_PX = 2;
const LABEL_SELECTION_INSET_EM = 0.3;
const DEFAULT_LABEL_FONT_SIZE = 20;
const MIN_LABEL_FONT_SIZE = 12;
const MAX_LABEL_FONT_SIZE = 34;
const COUNT_ROW_LABEL = '인원(명)';
const PERCENTAGE_ROW_LABEL = '백분율(%)';
const TOTAL_COLUMN_LABEL = '합계';
const DEFAULT_GRAPH_SCALE = 10;
const MIN_GRAPH_SCALE = 1;
const MAX_GRAPH_SCALE = 20;
const DIVIDER_DRAG_BAR_TOLERANCE = 8;
const DIVIDER_DRAG_PIE_TOLERANCE = 10;
const SHARE_VERSION = 2;
const SHARE_DEFAULT_TOKEN = '0';
const SHARE_CHUNK_PREFIX = 'how-to-graph-share-parts:';
const SHARE_CHUNK_SIZES = [1500, 1200, 950, 720, 540, 400, 300, 220, 160, 110, 72, 44, 24, 12, 6, 3, 1];
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const INTERPRETATION_STORAGE_KEY = 'how-to-graph-interpretation';
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
const GRAPH_HISTORY_LIMIT = 80;
const BAR_GRAPH_VIEWBOX = { width: 100, height: 36 };
const BAR_GRAPH_BOX = { left: 8, top: 10, width: 84, height: 14 };
const PIE_GRAPH_CIRCLE = { cx: 50, cy: 50, radius: 38 };
const PIE_MINOR_TICK_INNER_RADIUS = PIE_GRAPH_CIRCLE.radius + 1.2;
const PIE_MINOR_TICK_OUTER_RADIUS = PIE_GRAPH_CIRCLE.radius + 4;
const PIE_MAJOR_TICK_INNER_RADIUS = PIE_GRAPH_CIRCLE.radius + 0.9;
const PIE_MAJOR_TICK_OUTER_RADIUS = PIE_GRAPH_CIRCLE.radius + 2.8;
const PIE_TICK_LABEL_RADIUS = PIE_GRAPH_CIRCLE.radius + 7.5;
const REPORT_IMAGE_WIDTH = 1600;
const REPORT_IMAGE_HEIGHT = 1200;
const REPORT_IMAGE_MARGIN = 72;
const REPORT_IMAGE_LOGICAL_WIDTH = 760;
const REPORT_IMAGE_FONT_FAMILY = 'Inter, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif';
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
      headerRow: fitHeaderRow([], getTableWidthForItemCount(DEFAULT_PLAN_ITEM_COUNT)),
      rows: fitRows([], getTableWidthForItemCount(DEFAULT_PLAN_ITEM_COUNT)),
      tableDefaultsCleared: true
    },
    graph: {
      type: 'bar',
      scale: DEFAULT_GRAPH_SCALE,
      mode: 'divide',
      activeColor: GRAPH_COLORS[0],
      dividers: [],
      fills: {},
      undoStack: [],
      labels: []
    }
  };
}

function createDefaultInterpretationAnswers() {
  return {
    mostAction: '',
    mostSubject: '',
    mostAnswer: '',
    leastAction: '',
    leastSubject: '',
    leastAnswer: '',
    compareLeftItem: '',
    compareLeftAction: '',
    compareRightItem: '',
    compareRightAction: '',
    compareRelation: '많습니다',
    ratioItem: '',
    ratioAction: '',
    ratioPercent: ''
  };
}

function normalizeInterpretationAnswers(raw) {
  const defaults = createDefaultInterpretationAnswers();
  if (!raw || typeof raw !== 'object') return defaults;
  return Object.keys(defaults).reduce((answers, key) => {
    if (key === 'compareRelation') {
      answers[key] = raw[key] === '적습니다' ? '적습니다' : '많습니다';
      return answers;
    }
    answers[key] = typeof raw[key] === 'string' ? raw[key] : defaults[key];
    return answers;
  }, { ...defaults });
}

function getSentenceBlankWidth(value) {
  const text = typeof value === 'string' ? value : '';
  if (!text) return 0;
  const textUnits = Array.from(text).reduce((total, character) => {
    if (character === ' ') return total + 0.35;
    return total + (/^[\x00-\x7F]$/.test(character) ? 0.62 : 1);
  }, 0);
  return Math.ceil(textUnits * 16 + 18);
}

function normalizeStoredGraphMode(value) {
  return value === 'text' ? 'text' : 'divide';
}

function normalizeLoadedState(raw) {
  const fallback = createDefaultState();
  if (!raw || typeof raw !== 'object') return fallback;
  const table = raw.table && typeof raw.table === 'object' ? raw.table : fallback.table;
  const existingRows = Array.isArray(table.rows) ? table.rows : fallback.table.rows;
  const clearLegacyTableDefaults = table.tableDefaultsCleared !== true;
  const rawPlan = raw.plan && typeof raw.plan === 'object' ? raw.plan : {};
  const itemCount = getPlanItemCount(rawPlan.items, table.headerRow);
  const tableWidth = getTableWidthForItemCount(itemCount);
  const headerRow = fitHeaderRow(table.headerRow, tableWidth, clearLegacyTableDefaults);
  const rows = fitRows(existingRows, tableWidth);
  const items = fitRow(rawPlan.items, itemCount);
  for (let index = 0; index < itemCount; index += 1) {
    if (!items[index] && headerRow[index + 1]) items[index] = headerRow[index + 1];
  }
  const syncedHeaderRow = buildHeaderRow(items, headerRow, tableWidth);

  return {
    plan: {
      title: typeof rawPlan.title === 'string' ? rawPlan.title : (headerRow[0] || ''),
      items
    },
    table: { headerRow: syncedHeaderRow, rows, tableDefaultsCleared: true },
    graph: {
      type: raw.graph && raw.graph.type === 'pie' ? 'pie' : 'bar',
      scale: normalizeGraphScale(raw.graph && raw.graph.scale),
      mode: normalizeStoredGraphMode(raw.graph && raw.graph.mode),
      activeColor: normalizeGraphActiveColor(raw.graph && raw.graph.activeColor, fallback.graph.activeColor),
      dividers: raw.graph && Array.isArray(raw.graph.dividers) ? sanitizeDividers(raw.graph.dividers) : [],
      fills: raw.graph && raw.graph.fills ? cloneGraphFills(raw.graph.fills) : {},
      undoStack: sanitizeGraphUndoStack(raw.graph && raw.graph.undoStack),
      labels: sanitizeLabels(raw.graph && raw.graph.labels)
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

function normalizePlanStep(value, fallback = MIN_PLAN_STEP) {
  const step = Number(value);
  if (!Number.isFinite(step)) return fallback;
  return clamp(Math.round(step), MIN_PLAN_STEP, MAX_PLAN_STEP);
}

function getPlanProgressStep(titleComplete, itemsComplete) {
  if (!titleComplete) return 1;
  if (!itemsComplete) return 2;
  return 3;
}

function getPlanMaxStep(titleComplete, itemsComplete) {
  if (!titleComplete) return 1;
  if (!itemsComplete) return 2;
  return MAX_PLAN_STEP;
}

function getAllowedPlanStep(step, titleComplete, itemsComplete) {
  const progressStep = getPlanProgressStep(titleComplete, itemsComplete);
  return Math.min(normalizePlanStep(step, progressStep), getPlanMaxStep(titleComplete, itemsComplete));
}

function getPlanItemCount(items, headerRow, fallback = DEFAULT_PLAN_ITEM_COUNT) {
  if (Array.isArray(items) && items.length) return normalizePlanItemCount(items.length, fallback);
  if (Array.isArray(headerRow) && headerRow.length > 1) {
    const hasTotalColumn = isTotalHeaderCell(headerRow[headerRow.length - 1]);
    return normalizePlanItemCount(headerRow.length - (hasTotalColumn ? 2 : 1), fallback);
  }
  return normalizePlanItemCount(fallback);
}

function getTableWidthForItemCount(itemCount) {
  return normalizePlanItemCount(itemCount) + 2;
}

function getTableWidth(table) {
  const headerLength = table && Array.isArray(table.headerRow) ? table.headerRow.length : 0;
  const rowLength = table && Array.isArray(table.rows) && Array.isArray(table.rows[0]) ? table.rows[0].length : 0;
  const width = Math.max(headerLength, rowLength);
  if (width <= 1) return getTableWidthForItemCount(DEFAULT_PLAN_ITEM_COUNT);
  const hasTotalColumn = table && Array.isArray(table.headerRow) && isTotalHeaderCell(table.headerRow[table.headerRow.length - 1]);
  return getTableWidthForItemCount(width - (hasTotalColumn ? 2 : 1));
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
  next[width - 1] = TOTAL_COLUMN_LABEL;
  return next;
}

function buildHeaderRow(items, row, width) {
  const headerRow = fitHeaderRow(row, width);
  const itemCells = fitRow(items, Math.max(0, width - 2));
  itemCells.forEach((item, index) => {
    headerRow[index + 1] = item;
  });
  return headerRow;
}

function isTotalHeaderCell(value) {
  return value === TOTAL_COLUMN_LABEL;
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

function areRowsEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  return left.every((cell, index) => cell === right[index]);
}

function areTableRowsEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  return left.every((row, index) => areRowsEqual(row, right[index]));
}

function sanitizeDividers(dividers) {
  return dividers
    .map((value) => Number(value))
    .filter((value) => value > 0 && value < 100)
    .sort((a, b) => a - b)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function cloneGraphFills(fills) {
  const next = {};
  if (!fills || typeof fills !== 'object') return next;
  Object.entries(fills).forEach(([key, color]) => {
    const normalizedColor = normalizeGraphColor(color);
    if (typeof key === 'string' && normalizedColor && normalizedColor !== GRAPH_ERASER_COLOR) next[key] = normalizedColor;
  });
  return next;
}

function normalizeGraphColor(color) {
  if (typeof color !== 'string' || !color) return '';
  const normalized = color.trim().toLowerCase();
  return GRAPH_COLOR_MIGRATIONS[normalized] || normalized;
}

function normalizeGraphActiveColor(color, fallback = GRAPH_COLORS[0]) {
  const normalizedColor = normalizeGraphColor(color);
  return normalizedColor || fallback;
}

function makeGraphUndoSnapshot(graph) {
  return {
    dividers: sanitizeDividers(Array.isArray(graph && graph.dividers) ? graph.dividers : []),
    fills: cloneGraphFills(graph && graph.fills)
  };
}

function areGraphFillsEqual(left, right) {
  const leftKeys = Object.keys(left || {});
  const rightKeys = Object.keys(right || {});
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

function areGraphUndoSnapshotsEqual(left, right) {
  if (!left || !right) return false;
  if (!areRowsEqual(left.dividers, right.dividers)) return false;
  return areGraphFillsEqual(left.fills, right.fills);
}

function sanitizeGraphUndoStack(stack) {
  if (!Array.isArray(stack)) return [];
  return stack
    .slice(-GRAPH_HISTORY_LIMIT)
    .map((snapshot) => makeGraphUndoSnapshot(snapshot));
}

function pushGraphUndoStack(graph, snapshot = makeGraphUndoSnapshot(graph)) {
  const currentStack = sanitizeGraphUndoStack(graph && graph.undoStack);
  const lastSnapshot = currentStack[currentStack.length - 1];
  const nextStack = lastSnapshot && areGraphUndoSnapshotsEqual(lastSnapshot, snapshot)
    ? currentStack
    : currentStack.concat(snapshot);
  return nextStack.slice(-GRAPH_HISTORY_LIMIT);
}

function withGraphUndo(currentGraph, nextPatch) {
  const previousSnapshot = makeGraphUndoSnapshot(currentGraph);
  const nextSnapshot = makeGraphUndoSnapshot({ ...currentGraph, ...nextPatch });
  if (areGraphUndoSnapshotsEqual(previousSnapshot, nextSnapshot)) return nextPatch;
  return {
    ...nextPatch,
    undoStack: pushGraphUndoStack(currentGraph, previousSnapshot)
  };
}

function normalizeLabelColor(value) {
  return LABEL_COLORS.includes(value) ? value : LABEL_COLORS[0];
}

function normalizeLabelWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return DEFAULT_LABEL_WIDTH;
  return roundLabelMetric(clamp(width, MIN_LABEL_WIDTH, MAX_LABEL_WIDTH));
}

function measureLabelLineWidth(line, fontSize, inputElement) {
  if (typeof document !== 'undefined') {
    const canvas = measureLabelLineWidth.canvas || document.createElement('canvas');
    measureLabelLineWidth.canvas = canvas;
    const context = canvas.getContext('2d');
    if (context) {
      const computedStyle = inputElement && typeof window !== 'undefined'
        ? window.getComputedStyle(inputElement)
        : null;
      const fontFamily = computedStyle && computedStyle.fontFamily
        ? computedStyle.fontFamily
        : 'system-ui, sans-serif';
      context.font = `900 ${fontSize}px ${fontFamily}`;
      return context.measureText(line).width;
    }
  }
  return Array.from(line).reduce((width, character) => (
    width + (/^[\x00-\x7F]$/.test(character) ? fontSize * 0.58 : fontSize)
  ), 0);
}

function getAutoLabelMaxWidth(inputElement, maxWidth = MAX_LABEL_WIDTH) {
  if (!inputElement) return maxWidth;
  const canvas = inputElement.closest('.graph-canvas');
  if (!canvas) return maxWidth;
  const availableWidth = Math.max(DEFAULT_LABEL_WIDTH, canvas.getBoundingClientRect().width - 24);
  return Math.min(maxWidth, availableWidth);
}

function getAutoLabelWidth(text, fontSize, inputElement, maxWidth = getAutoLabelMaxWidth(inputElement)) {
  const lines = String(text || '').split('\n');
  const longestLine = lines.reduce((longest, line) => (
    line.length > longest.length ? line : longest
  ), '');
  if (!longestLine) return DEFAULT_LABEL_WIDTH;
  const measuredWidth = measureLabelLineWidth(longestLine, fontSize, inputElement);
  return clamp(Math.ceil(measuredWidth + LABEL_AUTO_PADDING), DEFAULT_LABEL_WIDTH, maxWidth);
}

function getSafeLabelWidth(text, fontSize, width, inputElement, maxWidth = getAutoLabelMaxWidth(inputElement)) {
  const boundedWidth = Math.min(normalizeLabelWidth(width), maxWidth);
  const contentWidth = getAutoLabelWidth(text, fontSize, inputElement, maxWidth);
  return roundLabelMetric(Math.max(boundedWidth, contentWidth));
}

function normalizeLabelFontSize(value) {
  const fontSize = Number(value);
  if (!Number.isFinite(fontSize)) return DEFAULT_LABEL_FONT_SIZE;
  return roundLabelMetric(clamp(fontSize, MIN_LABEL_FONT_SIZE, MAX_LABEL_FONT_SIZE));
}

function roundLabelMetric(value) {
  return Math.round(value * 100) / 100;
}

function getLabelBoxVerticalChrome(fontSize, inputElement) {
  if (inputElement && typeof window !== 'undefined') {
    const style = window.getComputedStyle(inputElement);
    const chrome = [
      style.paddingTop,
      style.paddingBottom,
      style.borderTopWidth,
      style.borderBottomWidth
    ].reduce((total, value) => {
      const number = Number.parseFloat(value);
      return total + (Number.isFinite(number) ? number : 0);
    }, LABEL_BOX_VERTICAL_GUARD_PX);
    return Math.max(fontSize * LABEL_BOX_VERTICAL_PADDING_EM, chrome);
  }
  return fontSize * LABEL_BOX_VERTICAL_PADDING_EM;
}

function getLabelBoxHeight(rowCount, fontSize, inputElement) {
  return roundLabelMetric(
    fontSize * Math.max(1, rowCount) * LABEL_LINE_HEIGHT
      + getLabelBoxVerticalChrome(fontSize, inputElement)
  );
}

function getLabelVisualRowCount(text, fontSize, width, inputElement) {
  const contentWidth = Math.max(fontSize, normalizeLabelWidth(width) - LABEL_AUTO_PADDING);
  return String(text || '').split('\n').reduce((rowCount, line) => {
    if (!line) return rowCount + 1;
    const lineWidth = measureLabelLineWidth(line, fontSize, inputElement);
    return rowCount + Math.max(1, Math.ceil(lineWidth / contentWidth));
  }, 0);
}

function getLabelBoxHeightForText(text, fontSize, width, inputElement) {
  return getLabelBoxHeight(getLabelVisualRowCount(text, fontSize, width, inputElement), fontSize, inputElement);
}

function getLabelSelectionInset(fontSize) {
  return roundLabelMetric(fontSize * LABEL_SELECTION_INSET_EM);
}

function getLabelResizeScale(action, dx, dy) {
  const frameWidth = Math.max(1, action.frameRect.width);
  const frameHeight = Math.max(1, action.frameRect.height);
  const diagonalSquared = frameWidth * frameWidth + frameHeight * frameHeight;
  const projectedScale = 1 + (dx * frameWidth + dy * frameHeight) / diagonalSquared;
  const minScale = Math.max(
    MIN_LABEL_WIDTH / action.label.width,
    MIN_LABEL_FONT_SIZE / action.label.fontSize
  );
  const maxScale = Math.min(
    (action.maxLabelWidth || MAX_LABEL_WIDTH) / action.label.width,
    MAX_LABEL_FONT_SIZE / action.label.fontSize
  );
  return clamp(projectedScale, minScale, maxScale);
}

function getCanvasLabelMaxWidth(canvasSize) {
  if (!canvasSize || !Number.isFinite(canvasSize.width) || canvasSize.width <= 0) return MAX_LABEL_WIDTH;
  return Math.max(DEFAULT_LABEL_WIDTH, Math.min(MAX_LABEL_WIDTH, canvasSize.width - LABEL_FRAME_MARGIN * 2));
}

function clampLabelCenterToCanvas(x, y, width, height, canvasRect) {
  if (!canvasRect || !canvasRect.width || !canvasRect.height) {
    return { x: clamp(x, 3, 97), y: clamp(y, 3, 97) };
  }
  const halfWidthPercent = Math.min(50, (width / 2 / canvasRect.width) * 100);
  const halfHeightPercent = Math.min(50, (height / 2 / canvasRect.height) * 100);
  return {
    x: clamp(x, halfWidthPercent, 100 - halfWidthPercent),
    y: clamp(y, halfHeightPercent, 100 - halfHeightPercent)
  };
}

function useElementSize() {
  const elementRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    function updateSize() {
      const rect = element.getBoundingClientRect();
      setSize((currentSize) => {
        const width = roundLabelMetric(rect.width);
        const height = roundLabelMetric(rect.height);
        return currentSize.width === width && currentSize.height === height
          ? currentSize
          : { width, height };
      });
    }

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return [elementRef, size];
}

function normalizeGraphLabel(label) {
  const text = label && typeof label.text === 'string' ? label.text : '';
  const rawWidth = Number(label && label.width);
  const manualSize = label && label.manualSize === true;
  const fontSize = normalizeLabelFontSize(label && label.fontSize);
  const storedWidth = !manualSize && Number.isFinite(rawWidth) && rawWidth === 150 && text.length <= 6
    ? DEFAULT_LABEL_WIDTH
    : normalizeLabelWidth(label && label.width);
  const width = manualSize
    ? getSafeLabelWidth(text, fontSize, storedWidth)
    : Math.max(storedWidth, getAutoLabelWidth(text, fontSize));
  return {
    id: label && label.id ? label.id : makeId('label'),
    text,
    x: clamp(Number(label && label.x) || 50, 3, 97),
    y: clamp(Number(label && label.y) || 50, 3, 97),
    width,
    fontSize,
    color: normalizeLabelColor(label && label.color),
    manualSize
  };
}

function sanitizeLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels.map((label) => normalizeGraphLabel(label));
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
  const [lastPlanStep, setLastPlanStep] = useState(null);
  const [presentationVisible, setPresentationVisible] = useState(false);
  const [toast, setToast] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [interpretationAnswers, setInterpretationAnswers] = useState(() => {
    try {
      const saved = window.localStorage.getItem(INTERPRETATION_STORAGE_KEY);
      return saved ? normalizeInterpretationAnswers(JSON.parse(saved)) : createDefaultInterpretationAnswers();
    } catch (error) {
      return createDefaultInterpretationAnswers();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('how-to-graph-state', JSON.stringify(state));
    } catch (error) {
      // 저장 공간이 부족한 구형 기기에서도 앱 자체는 계속 쓸 수 있다.
    }
  }, [state]);

  useEffect(() => {
    try {
      window.localStorage.setItem(INTERPRETATION_STORAGE_KEY, JSON.stringify(interpretationAnswers));
    } catch (error) {
      // 해석 활동 답안은 로컬 보조 상태라 저장 실패가 앱 사용을 막지 않는다.
    }
  }, [interpretationAnswers]);

  function patchState(section, patch) {
    setState((previous) => ({
      ...previous,
      [section]: typeof patch === 'function' ? patch(previous[section], previous) : { ...previous[section], ...patch }
    }));
  }

  function patchInterpretationAnswers(patch) {
    setInterpretationAnswers((previous) => normalizeInterpretationAnswers({ ...previous, ...patch }));
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
              initialStep={lastPlanStep}
              presentationVisible={presentationVisible}
              onChange={(patch) => patchState('plan', patch)}
              onTableChange={(patch) => patchState('table', patch)}
              onGraphChange={(patch) => patchState('graph', patch)}
              onStepChange={setLastPlanStep}
              onShowPresentation={() => setPresentationVisible(true)}
            />
          )}
          {activeTab === 'table' && (
            <TableWorkspace
              plan={state.plan}
              table={state.table}
              onTableChange={(patch) => patchState('table', patch)}
            />
          )}
          {activeTab === 'graph' && (
            <GraphWorkspace
              plan={state.plan}
              table={state.table}
              graph={state.graph}
              onChange={(patch) => patchState('graph', patch)}
              onOpenReport={() => setReportOpen(true)}
            />
          )}
          {activeTab === 'interpret' && (
            <InterpretationWorkspace
              graph={state.graph}
              answers={interpretationAnswers}
              onAnswerChange={patchInterpretationAnswers}
            />
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

      {reportOpen && (
        <ReportDialog
          plan={state.plan}
          table={state.table}
          graph={state.graph}
          onClose={() => setReportOpen(false)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function PlanWorkspace({
  plan,
  table,
  graph,
  initialStep,
  presentationVisible,
  onChange,
  onTableChange,
  onGraphChange,
  onStepChange,
  onShowPresentation
}) {
  const titleRef = useRef(null);
  const itemsRef = useRef(null);
  const graphRef = useRef(null);
  const planSheetRef = useRef(null);
  const pendingScrollRef = useRef(null);
  const itemCount = getPlanItemCount(plan.items, table.headerRow);
  const tableWidth = getTableWidthForItemCount(itemCount);
  const headerRow = fitHeaderRow(table.headerRow, tableWidth);
  const title = typeof plan.title === 'string' ? plan.title : (headerRow[0] || '');
  const items = fitRow(plan.items, itemCount);

  for (let index = 0; index < itemCount; index += 1) {
    if (!items[index] && headerRow[index + 1]) items[index] = headerRow[index + 1];
  }

  const titleComplete = title.trim().length > 0;
  const itemsComplete = items.every((item) => item.trim().length > 0);
  const graphTypeLabel = graph.type === 'pie' ? '원그래프' : '띠그래프';
  const graphSpeechLabel = graph.type === 'pie' ? '원' : '띠';
  const presentationSentence = `저희 모둠의 그래프 제목은 ${summaryText(title, '제목')}입니다. 자료를 ${items.length}개의 항목으로 나누어 표로 정리하고 백분율을 구한 뒤 ${graphSpeechLabel}그래프로 나타내려 합니다.`;
  const [visibleStep, setVisibleStep] = useState(() => {
    const activeInitialStep = getAllowedPlanStep(initialStep, titleComplete, itemsComplete);
    return Math.max(getPlanProgressStep(titleComplete, itemsComplete), activeInitialStep);
  });
  const [activeStep, setActiveStep] = useState(() => {
    return getAllowedPlanStep(initialStep, titleComplete, itemsComplete);
  });

  useEffect(() => {
    const maxStep = getPlanMaxStep(titleComplete, itemsComplete);
    setVisibleStep((currentStep) => {
      return Math.min(currentStep, maxStep);
    });
    setActiveStep((currentStep) => {
      return Math.min(currentStep, maxStep);
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
    const nextStep = getAllowedPlanStep(step, titleComplete, itemsComplete);
    pendingScrollRef.current = ref;
    setActiveStep(nextStep);
    setVisibleStep((currentStep) => Math.max(currentStep, nextStep));
    onStepChange(nextStep);
  }

  function handleAdvanceKey(event, step, ref) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    goToStep(step, ref);
  }

  function updateTitle(value) {
    onChange({ title: value });
  }

  function updateItem(index, value) {
    const nextItems = items.slice();
    nextItems[index] = value;
    syncItems(nextItems);
  }

  function syncItems(nextItems, removedIndex = null) {
    onChange({ items: nextItems });
    onTableChange((currentTable) => {
      const nextWidth = getTableWidthForItemCount(nextItems.length);
      const sourceWidth = Math.max(getTableWidth(currentTable), tableWidth, nextWidth);
      let nextHeader = fitHeaderRow(currentTable.headerRow, sourceWidth);
      let nextRows = fitRows(currentTable.rows, sourceWidth);

      if (Number.isInteger(removedIndex)) {
        nextHeader.splice(removedIndex + 1, 1);
        nextRows = nextRows.map((row) => {
          const nextRow = row.slice();
          nextRow.splice(removedIndex + 1, 1);
          return nextRow;
        });
      } else if (nextItems.length > items.length) {
        const insertIndex = items.length + 1;
        nextHeader.splice(insertIndex, 0, '');
        nextRows = nextRows.map((row) => {
          const nextRow = row.slice();
          nextRow.splice(insertIndex, 0, '');
          return nextRow;
        });
      }

      nextHeader = fitHeaderRow(nextHeader, nextWidth);
      nextRows = fitRows(nextRows, nextWidth);
      nextItems.forEach((item, index) => {
        nextHeader[index + 1] = item;
      });

      return { ...currentTable, headerRow: nextHeader, rows: nextRows };
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
    onGraphChange({ type, dividers: [], fills: {}, undoStack: [] });
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
            {presentationVisible && (
              <p className="presentation-script" aria-live="polite">{presentationSentence}</p>
            )}
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
              <button
                className="plan-present-button"
                type="button"
                onClick={onShowPresentation}
                title="발표"
                aria-label="발표 문장 채우기"
              >
                <Megaphone size={18} aria-hidden="true" />
                <span>발표</span>
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

function TableWorkspace({ plan, table, onTableChange }) {
  const itemCount = getPlanItemCount(plan.items, table.headerRow);
  const tableWidth = getTableWidthForItemCount(itemCount);
  const fittedHeader = useMemo(() => buildHeaderRow(plan.items, table.headerRow, tableWidth), [plan.items, table.headerRow, tableWidth]);
  const fittedRows = useMemo(() => fitRows(table.rows, tableWidth), [table.rows, tableWidth]);

  useEffect(() => {
    if (!areRowsEqual(table.headerRow, fittedHeader) || !areTableRowsEqual(table.rows, fittedRows)) {
      onTableChange({ headerRow: fittedHeader, rows: fittedRows });
    }
  }, [table.headerRow, table.rows, tableWidth, fittedHeader, fittedRows, onTableChange]);

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
        <ManualTable
          headerRow={fittedHeader}
          rows={fittedRows}
          tableWidth={tableWidth}
          onCellChange={updateCell}
        />
      </section>
    </div>
  );
}

function ManualTable({ headerRow, rows, tableWidth, onCellChange, readOnly = false, compact = false, fitWidth = false }) {
  const tableClassName = [
    'manual-table',
    readOnly ? 'is-read-only' : '',
    compact ? 'is-compact' : '',
    fitWidth ? 'is-fit-width' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className="manual-table-wrap">
      <table className={tableClassName} style={{ minWidth: fitWidth ? '0px' : `min(100%, ${Math.max(360, tableWidth * (compact ? 92 : 104))}px)` }}>
        <thead>
          <tr>
            {headerRow.map((cell, cellIndex) => (
              <th key={cellIndex}>
                {readOnly ? (
                  <span className="manual-table-cell-text">{cell}</span>
                ) : (
                  <input
                    value={cell}
                    readOnly
                    aria-label={`머리행 ${cellIndex + 1}열`}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => {
                const cellReadOnly = readOnly || cellIndex === 0;
                return (
                  <td key={cellIndex} className={cellIndex === 0 ? 'title-column-cell' : undefined}>
                    {readOnly ? (
                      <span className="manual-table-cell-text">{cell}</span>
                    ) : (
                      <input
                        value={cell}
                        onChange={cellReadOnly ? undefined : (event) => onCellChange(rowIndex, cellIndex, event.target.value)}
                        readOnly={cellReadOnly}
                        aria-label={`${rowIndex + 1}행 ${cellIndex + 1}열`}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GraphTablePreview({ plan, table }) {
  const itemCount = getPlanItemCount(plan.items, table.headerRow);
  const tableWidth = getTableWidthForItemCount(itemCount);
  const fittedHeader = buildHeaderRow(plan.items, table.headerRow, tableWidth);
  const fittedRows = fitRows(table.rows, tableWidth);

  return (
    <section className="panel-block graph-table-panel" aria-label="표">
      <ManualTable
        headerRow={fittedHeader}
        rows={fittedRows}
        tableWidth={tableWidth}
        readOnly
        compact
      />
    </section>
  );
}

function GraphScaleControl({ scale, onConfirm }) {
  const currentScale = normalizeGraphScale(scale);
  const [isOpen, setIsOpen] = useState(false);
  const [draftScale, setDraftScale] = useState(currentScale);

  useEffect(() => {
    setDraftScale(currentScale);
  }, [currentScale]);

  function openSlider() {
    setDraftScale(currentScale);
    setIsOpen(true);
  }

  function confirmScale() {
    const nextScale = normalizeGraphScale(draftScale);
    onConfirm(nextScale);
    setIsOpen(false);
  }

  function updateDraftFromPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const nextScale = MIN_GRAPH_SCALE + Math.round(ratio * (MAX_GRAPH_SCALE - MIN_GRAPH_SCALE));
    setDraftScale(nextScale);
  }

  function handleSliderPointerMove(event) {
    if (event.buttons !== 1 && event.pointerType !== 'touch') return;
    updateDraftFromPointer(event);
  }

  return (
    <div className="scale-control">
      <div className="scale-control-top">
        <span>눈금 크기</span>
        <button
          className="scale-value-button"
          type="button"
          onClick={openSlider}
          aria-expanded={isOpen}
          aria-controls="graph-scale-slider"
          aria-label={`눈금 크기 ${currentScale}% 조정`}
        >
          {currentScale}%
        </button>
      </div>
      {isOpen && (
        <div className="scale-slider-row" id="graph-scale-slider">
          <input
            type="range"
            min={MIN_GRAPH_SCALE}
            max={MAX_GRAPH_SCALE}
            step="1"
            value={draftScale}
            onInput={(event) => setDraftScale(Number(event.currentTarget.value))}
            onChange={(event) => setDraftScale(Number(event.target.value))}
            onPointerDown={updateDraftFromPointer}
            onPointerMove={handleSliderPointerMove}
            aria-label="눈금 크기"
          />
          <output>{draftScale}%</output>
          <button className="scale-confirm-button" type="button" onClick={confirmScale}>
            확인
          </button>
        </div>
      )}
    </div>
  );
}

function ReportDialog({ plan, table, graph, onClose }) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const itemCount = getPlanItemCount(plan.items, table.headerRow);
  const tableWidth = getTableWidthForItemCount(itemCount);
  const headerRow = buildHeaderRow(plan.items, table.headerRow, tableWidth);
  const rows = fitRows(table.rows, tableWidth);
  const title = getReportTitle(plan, headerRow);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function saveReportImage() {
    if (saving) return;
    setSaving(true);
    setMessage('');

    try {
      const image = makeReportImage({ title, headerRow, rows, tableWidth, graph });
      saveReportImageFile(image)
        .then((nextMessage) => {
          if (nextMessage) setMessage(nextMessage);
        })
        .catch(() => setMessage('이미지를 저장하지 못했습니다.'))
        .finally(() => setSaving(false));
    } catch (error) {
      setMessage('이미지를 만들지 못했습니다.');
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop report-backdrop" role="presentation">
      <div className="report-dialog" role="dialog" aria-modal="true" aria-label="최종 보고서">
        <div className="report-toolbar">
          <button className="icon-text-button report-save-button" type="button" onClick={saveReportImage} disabled={saving}>
            <Download size={18} aria-hidden="true" />
            <span>{saving ? '준비 중' : '이미지 저장'}</span>
          </button>
          <button className="icon-button" type="button" onClick={onClose} title="닫기" aria-label="닫기">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <FinalReport
          title={title}
          headerRow={headerRow}
          rows={rows}
          tableWidth={tableWidth}
          graph={graph}
        />
        {message && <p className="dialog-message report-message">{message}</p>}
      </div>
    </div>
  );
}

function FinalReport({ title, headerRow, rows, tableWidth, graph }) {
  return (
    <section className="report-page" aria-label="최종 보고서 미리보기">
      <h1 className="report-title">{title}</h1>
      <div className="report-table-block">
        <ManualTable
          headerRow={headerRow}
          rows={rows}
          tableWidth={tableWidth}
          readOnly
          compact
          fitWidth
        />
      </div>
      <ReportGraph graph={graph} />
    </section>
  );
}

function ReportGraph({ graph }) {
  const [frameRef, frameSize] = useElementSize();
  const segments = getSegments(graph.dividers);
  const graphClassName = `report-graph-frame is-${graph.type === 'pie' ? 'pie' : 'bar'}`;

  return (
    <div className={graphClassName} ref={frameRef} aria-label="보고서 그래프">
      {graph.type === 'bar' ? (
        <BarGraph graph={graph} segments={segments} previewDivider={null} previewSegmentKey={null} />
      ) : (
        <PieGraph graph={graph} segments={segments} previewDivider={null} previewSegmentKey={null} />
      )}
      {(Array.isArray(graph.labels) ? graph.labels : []).map((rawLabel) => {
        const label = normalizeGraphLabel(rawLabel);
        if (!label.text.trim()) return null;
        const maxLabelWidth = getCanvasLabelMaxWidth(frameSize);
        const labelWidth = getSafeLabelWidth(label.text, label.fontSize, label.width, null, maxLabelWidth);
        const labelHeight = getLabelBoxHeightForText(label.text, label.fontSize, labelWidth, null);
        return (
          <div
            key={label.id}
            className="graph-label-frame report-label-frame"
            style={{
              left: `clamp(${labelWidth / 2}px, ${label.x}%, calc(100% - ${labelWidth / 2}px))`,
              top: `clamp(${labelHeight / 2}px, ${label.y}%, calc(100% - ${labelHeight / 2}px))`,
              width: `${labelWidth}px`,
              height: `${labelHeight}px`
            }}
          >
            <div
              className="graph-floating-label report-floating-label"
              style={{
                color: label.color,
                fontSize: `${label.fontSize}px`,
                height: `${labelHeight}px`,
                textShadow: label.color === '#ffffff'
                  ? '0 1px 3px rgba(0, 0, 0, 0.72)'
                  : '0 1px 2px rgba(255, 255, 255, 0.38)'
              }}
            >
              {label.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getReportTitle(plan, headerRow) {
  const title = plan && typeof plan.title === 'string' ? plan.title.trim() : '';
  if (title) return title;
  const firstItem = Array.isArray(headerRow)
    ? headerRow.find((cell, index) => index > 0 && typeof cell === 'string' && !isTotalHeaderCell(cell) && cell.trim())
    : '';
  return firstItem ? `${firstItem} 그래프 보고서` : '최종 보고서';
}

function makeReportImage(report) {
  const canvas = document.createElement('canvas');
  canvas.width = REPORT_IMAGE_WIDTH;
  canvas.height = REPORT_IMAGE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available.');

  drawReportImage(context, report);
  const dataUrl = canvas.toDataURL('image/png');
  return {
    dataUrl,
    blob: dataUrlToBlob(dataUrl),
    fileName: makeReportFileName(report.title),
    title: report.title || '그래프 보고서'
  };
}

function drawReportImage(context, report) {
  const titleRect = {
    x: REPORT_IMAGE_MARGIN,
    y: 58,
    width: REPORT_IMAGE_WIDTH - REPORT_IMAGE_MARGIN * 2,
    height: 92
  };
  const tableRect = {
    x: REPORT_IMAGE_MARGIN,
    y: 164,
    width: REPORT_IMAGE_WIDTH - REPORT_IMAGE_MARGIN * 2,
    height: 186
  };
  const graphRect = {
    x: REPORT_IMAGE_MARGIN,
    y: 392,
    width: REPORT_IMAGE_WIDTH - REPORT_IMAGE_MARGIN * 2,
    height: REPORT_IMAGE_HEIGHT - 392 - REPORT_IMAGE_MARGIN
  };

  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, REPORT_IMAGE_WIDTH, REPORT_IMAGE_HEIGHT);
  drawCanvasTextBox(context, report.title || '최종 보고서', titleRect, {
    align: 'left',
    fontSize: 48,
    minFontSize: 30,
    weight: 900,
    maxLines: 2
  });
  drawReportImageTable(context, report.headerRow, report.rows, tableRect);
  drawReportImageGraph(context, report.graph, graphRect);
  context.restore();
}

function drawReportImageTable(context, headerRow, rows, rect) {
  const tableRows = [headerRow].concat(rows);
  const rowHeight = rect.height / tableRows.length;
  const columnWidths = getReportImageColumnWidths(headerRow.length, rect.width);

  context.save();
  context.lineWidth = 2;
  context.strokeStyle = '#111111';

  tableRows.forEach((row, rowIndex) => {
    let cellX = rect.x;
    const cellY = rect.y + rowIndex * rowHeight;
    columnWidths.forEach((cellWidth, cellIndex) => {
      const isHeader = rowIndex === 0;
      const isLabelCell = cellIndex === 0 || (isHeader && cellIndex === columnWidths.length - 1);
      context.fillStyle = isHeader || isLabelCell ? '#f3f6f4' : '#ffffff';
      context.fillRect(cellX, cellY, cellWidth, rowHeight);
      context.strokeRect(cellX, cellY, cellWidth, rowHeight);
      drawCanvasTextBox(context, row[cellIndex] || '', {
        x: cellX + 9,
        y: cellY + 6,
        width: Math.max(1, cellWidth - 18),
        height: Math.max(1, rowHeight - 12)
      }, {
        fontSize: isHeader || cellIndex === 0 ? 25 : 23,
        minFontSize: 14,
        weight: 900,
        maxLines: 2
      });
      cellX += cellWidth;
    });
  });

  context.restore();
}

function getReportImageColumnWidths(columnCount, totalWidth) {
  if (columnCount <= 0) return [];
  if (columnCount <= 2) return Array(columnCount).fill(totalWidth / columnCount);

  const scale = totalWidth / (REPORT_IMAGE_WIDTH - REPORT_IMAGE_MARGIN * 2);
  const labelWidth = 176 * scale;
  const totalColumnWidth = 134 * scale;
  const itemWidth = (totalWidth - labelWidth - totalColumnWidth) / (columnCount - 2);
  return [labelWidth]
    .concat(Array(columnCount - 2).fill(itemWidth))
    .concat(totalColumnWidth);
}

function drawReportImageGraph(context, graph, rect) {
  const safeGraph = graph || {};
  const segments = getSegments(safeGraph.dividers);
  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  if (safeGraph.type === 'bar') {
    drawReportBarImage(context, safeGraph, segments, rect);
  } else {
    drawReportPieImage(context, safeGraph, segments, rect);
  }
  drawReportImageLabels(context, safeGraph, rect);
  context.restore();
}

function drawReportBarImage(context, graph, segments, rect) {
  const scale = Math.min((rect.width * 0.96) / BAR_GRAPH_VIEWBOX.width, (rect.height * 0.78) / BAR_GRAPH_VIEWBOX.height);
  const originX = rect.x + (rect.width - BAR_GRAPH_VIEWBOX.width * scale) / 2;
  const originY = rect.y + (rect.height - BAR_GRAPH_VIEWBOX.height * scale) / 2;
  const viewX = (value) => originX + value * scale;
  const viewY = (value) => originY + value * scale;
  const box = {
    x: viewX(BAR_GRAPH_BOX.left),
    y: viewY(BAR_GRAPH_BOX.top),
    width: BAR_GRAPH_BOX.width * scale,
    height: BAR_GRAPH_BOX.height * scale,
    radius: 2.2 * scale
  };
  const barX = (percent) => viewX(barPercentX(percent));
  const scaleValue = normalizeGraphScale(graph.scale);
  const labelTicks = makePercentLabelTicks(scaleValue, 'bar');
  const minorTicks = makeGraphTicks(scaleValue, true).filter((tick) => !labelTicks.includes(tick));

  context.save();
  context.fillStyle = '#ffffff';
  makeCanvasRoundRectPath(context, box.x, box.y, box.width, box.height, box.radius);
  context.fill();
  context.clip();
  segments.forEach((segment) => {
    const color = graph.fills && graph.fills[segment.key];
    if (!isVisibleReportFill(color)) return;
    context.fillStyle = color;
    context.fillRect(barX(segment.start), box.y, (segment.end - segment.start) * (BAR_GRAPH_BOX.width / 100) * scale, box.height);
  });
  context.restore();

  drawCanvasRoundRect(context, box.x, box.y, box.width, box.height, box.radius, null, '#1f2d3d', 2.4);
  minorTicks.forEach((tick) => {
    const x = barX(tick);
    drawCanvasLine(context, x, viewY(BAR_GRAPH_BOX.top - 2.8), x, viewY(BAR_GRAPH_BOX.top - 0.7), '#aebaca', 1.6);
    drawCanvasLine(context, x, viewY(BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + 0.7), x, viewY(BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + 2.8), '#aebaca', 1.6);
  });
  labelTicks.forEach((tick) => {
    const x = barX(tick);
    drawCanvasLine(context, x, viewY(BAR_GRAPH_BOX.top - 3.6), x, viewY(BAR_GRAPH_BOX.top - 0.6), '#52606f', 2);
    drawCanvasLine(context, x, viewY(BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + 0.6), x, viewY(BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + 4.2), '#52606f', 2);
    setReportCanvasFont(context, 3.1 * scale, 900);
    context.fillStyle = '#52606f';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${tick}%`, x, viewY(33));
  });
  sanitizeDividers(graph.dividers).forEach((divider) => {
    drawCanvasLine(context, barX(divider), box.y, barX(divider), box.y + box.height, '#1f2d3d', 2.4);
  });
}

function drawReportPieImage(context, graph, segments, rect) {
  const scale = Math.min(rect.width * 0.58, rect.height * 0.92) / 100;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const radius = PIE_GRAPH_CIRCLE.radius * scale;
  const scaleValue = normalizeGraphScale(graph.scale);
  const labelTicks = makePercentLabelTicks(scaleValue, 'pie');
  const minorTicks = makeGraphTicks(scaleValue).filter((tick) => !labelTicks.includes(tick));

  drawCanvasCircle(context, centerX, centerY, radius, '#ffffff', '#1f2d3d', 2.4);
  segments.forEach((segment) => {
    const color = graph.fills && graph.fills[segment.key];
    if (!isVisibleReportFill(color)) return;
    if (segment.start === 0 && segment.end === 100) {
      drawCanvasCircle(context, centerX, centerY, radius, color, null, 0);
      return;
    }
    drawCanvasPieSegment(context, centerX, centerY, radius, segment.start, segment.end, color);
  });
  drawCanvasCircle(context, centerX, centerY, radius, null, '#1f2d3d', 2.4);

  const zeroPoint = getReportPolarPoint(centerX, centerY, radius, 0);
  drawCanvasLine(context, centerX, centerY, zeroPoint.x, zeroPoint.y, '#1f2d3d', 2.4);
  minorTicks.forEach((tick) => {
    const inner = getReportPolarPoint(centerX, centerY, PIE_MINOR_TICK_INNER_RADIUS * scale, tick);
    const outer = getReportPolarPoint(centerX, centerY, PIE_MINOR_TICK_OUTER_RADIUS * scale, tick);
    drawCanvasLine(context, inner.x, inner.y, outer.x, outer.y, '#aebaca', 1.6);
  });
  labelTicks.forEach((tick) => {
    const inner = getReportPolarPoint(centerX, centerY, PIE_MAJOR_TICK_INNER_RADIUS * scale, tick);
    const outer = getReportPolarPoint(centerX, centerY, PIE_MAJOR_TICK_OUTER_RADIUS * scale, tick);
    const label = getReportPolarPoint(centerX, centerY, PIE_TICK_LABEL_RADIUS * scale, tick);
    drawCanvasLine(context, inner.x, inner.y, outer.x, outer.y, '#52606f', 2);
    setReportCanvasFont(context, 4 * scale, 900);
    context.fillStyle = '#52606f';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${tick}%`, label.x, label.y);
  });
  sanitizeDividers(graph.dividers).forEach((divider) => {
    const point = getReportPolarPoint(centerX, centerY, radius, divider);
    drawCanvasLine(context, centerX, centerY, point.x, point.y, '#1f2d3d', 2.4);
  });
}

function drawReportImageLabels(context, graph, rect) {
  const labelScale = rect.width / REPORT_IMAGE_LOGICAL_WIDTH;
  const labels = Array.isArray(graph.labels) ? graph.labels : [];
  labels.forEach((rawLabel) => {
    const label = normalizeGraphLabel(rawLabel);
    if (!label.text.trim()) return;

    const sourceWidth = getSafeLabelWidth(label.text, label.fontSize, label.width, null, MAX_LABEL_WIDTH);
    const sourceHeight = getLabelBoxHeightForText(label.text, label.fontSize, sourceWidth, null);
    const labelWidth = sourceWidth * labelScale;
    const labelHeight = sourceHeight * labelScale;
    const centerX = rect.x + rect.width * (label.x / 100);
    const centerY = rect.y + rect.height * (label.y / 100);
    const left = clamp(centerX - labelWidth / 2, rect.x, rect.x + rect.width - labelWidth);
    const top = clamp(centerY - labelHeight / 2, rect.y, rect.y + rect.height - labelHeight);

    context.save();
    context.shadowColor = label.color === '#ffffff' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(255, 255, 255, 0.72)';
    context.shadowBlur = label.color === '#ffffff' ? 5 : 3;
    context.shadowOffsetY = 2;
    drawCanvasTextBox(context, label.text, {
      x: left,
      y: top,
      width: labelWidth,
      height: labelHeight
    }, {
      color: label.color,
      fontSize: label.fontSize * labelScale,
      minFontSize: Math.max(12, MIN_LABEL_FONT_SIZE * labelScale),
      weight: 900,
      lineHeight: LABEL_LINE_HEIGHT,
      maxLines: Math.max(1, Math.floor(labelHeight / (label.fontSize * labelScale * LABEL_LINE_HEIGHT)))
    });
    context.restore();
  });
}

function isVisibleReportFill(color) {
  return typeof color === 'string' && color && color !== 'transparent' && color !== 'rgba(255,255,255,0)';
}

function drawCanvasTextBox(context, text, rect, options = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;

  const maxFontSize = options.fontSize || 24;
  const minFontSize = options.minFontSize || Math.min(14, maxFontSize);
  const weight = options.weight || 800;
  const align = options.align || 'center';
  const lineHeightRatio = options.lineHeight || 1.18;
  const explicitMaxLines = options.maxLines || null;
  let fontSize = maxFontSize;
  let lines = [];

  for (; fontSize >= minFontSize; fontSize -= 1) {
    setReportCanvasFont(context, fontSize, weight);
    const lineHeight = fontSize * lineHeightRatio;
    const maxLines = explicitMaxLines || Math.max(1, Math.floor(rect.height / lineHeight));
    const wrapped = wrapCanvasText(context, cleanText, rect.width);
    if (wrapped.length <= maxLines && wrapped.length * lineHeight <= rect.height + 0.5) {
      lines = wrapped;
      break;
    }
  }

  fontSize = Math.max(fontSize, minFontSize);
  setReportCanvasFont(context, fontSize, weight);
  const lineHeight = fontSize * lineHeightRatio;
  const maxLines = explicitMaxLines || Math.max(1, Math.floor(rect.height / lineHeight));
  if (!lines.length) lines = truncateCanvasLines(context, wrapCanvasText(context, cleanText, rect.width), maxLines, rect.width);

  context.save();
  context.beginPath();
  context.rect(rect.x, rect.y, rect.width, rect.height);
  context.clip();
  context.fillStyle = options.color || '#111111';
  context.textAlign = align;
  context.textBaseline = 'middle';

  const textX = align === 'left' ? rect.x : align === 'right' ? rect.x + rect.width : rect.x + rect.width / 2;
  const totalHeight = lines.length * lineHeight;
  const firstY = rect.y + (rect.height - totalHeight) / 2 + lineHeight / 2;
  lines.forEach((line, index) => {
    context.fillText(line, textX, firstY + index * lineHeight);
  });
  context.restore();
}

function wrapCanvasText(context, text, maxWidth) {
  const lines = [];
  String(text || '').replace(/\r/g, '').split('\n').forEach((paragraph) => {
    if (!paragraph) {
      lines.push('');
      return;
    }

    let line = '';
    makeCanvasWrapTokens(paragraph).forEach((token) => {
      const nextToken = line ? token : token.trimStart();
      if (!nextToken) return;
      const candidate = `${line}${nextToken}`;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
        return;
      }

      if (line) {
        lines.push(line.trimEnd());
        line = nextToken.trimStart();
      }

      if (context.measureText(line).width > maxWidth) {
        const brokenLines = breakCanvasToken(context, line, maxWidth);
        lines.push(...brokenLines.slice(0, -1));
        line = brokenLines[brokenLines.length - 1] || '';
      }
    });

    if (line) lines.push(line.trimEnd());
  });
  return lines.length ? lines : [''];
}

function makeCanvasWrapTokens(text) {
  const wordTokens = text.split(/(\s+)/).filter(Boolean);
  return wordTokens.length > 1 ? wordTokens : Array.from(text);
}

function breakCanvasToken(context, text, maxWidth) {
  const lines = [];
  let line = '';
  Array.from(text).forEach((character) => {
    const candidate = `${line}${character}`;
    if (!line || context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      return;
    }
    lines.push(line);
    line = character;
  });
  if (line) lines.push(line);
  return lines;
}

function truncateCanvasLines(context, lines, maxLines, maxWidth) {
  if (lines.length <= maxLines) return lines;
  const nextLines = lines.slice(0, maxLines);
  nextLines[maxLines - 1] = fitCanvasTextWithEllipsis(context, nextLines[maxLines - 1], maxWidth);
  return nextLines;
}

function fitCanvasTextWithEllipsis(context, text, maxWidth) {
  const ellipsis = '...';
  const characters = Array.from(String(text || '').trimEnd());
  while (characters.length && context.measureText(`${characters.join('')}${ellipsis}`).width > maxWidth) {
    characters.pop();
  }
  return characters.length ? `${characters.join('')}${ellipsis}` : ellipsis;
}

function setReportCanvasFont(context, fontSize, weight) {
  context.font = `${weight} ${fontSize}px ${REPORT_IMAGE_FONT_FAMILY}`;
}

function drawCanvasLine(context, x1, y1, x2, y2, color, lineWidth) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.restore();
}

function drawCanvasCircle(context, x, y, radius, fill, stroke, lineWidth) {
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke && lineWidth) {
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
  }
  context.restore();
}

function drawCanvasPieSegment(context, x, y, radius, start, end, fill) {
  context.save();
  context.fillStyle = fill;
  context.beginPath();
  context.moveTo(x, y);
  context.arc(x, y, radius, percentToCanvasAngle(start), percentToCanvasAngle(end));
  context.closePath();
  context.fill();
  context.restore();
}

function percentToCanvasAngle(percent) {
  return percent / 100 * Math.PI * 2 - Math.PI / 2;
}

function getReportPolarPoint(cx, cy, radius, percent) {
  const angle = percentToCanvasAngle(percent);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

function drawCanvasRoundRect(context, x, y, width, height, radius, fill, stroke, lineWidth) {
  context.save();
  makeCanvasRoundRectPath(context, x, y, width, height, radius);
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke && lineWidth) {
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
  }
  context.restore();
}

function makeCanvasRoundRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function makeReportFileName(title) {
  const baseName = String(title || '그래프-보고서')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '-')
    .slice(0, 42) || 'graph-report';
  return `${baseName}.png`;
}

function saveReportImageFile(image) {
  const file = makeReportImageFile(image.blob, image.fileName);
  if (file && isIosSafari() && canShareReportFile(file)) {
    return navigator.share({ files: [file], title: image.title })
      .then(() => '이미지 저장 화면을 열었습니다.')
      .catch((error) => {
        if (isAbortError(error)) return '저장을 취소했습니다.';
        return fallbackSaveReportImage(image.dataUrl, image.fileName);
      });
  }
  return Promise.resolve(fallbackSaveReportImage(image.dataUrl, image.fileName));
}

function makeReportImageFile(blob, fileName) {
  try {
    return typeof File === 'function' ? new File([blob], fileName, { type: 'image/png' }) : null;
  } catch (error) {
    return null;
  }
}

function canShareReportFile(file) {
  return typeof navigator !== 'undefined'
    && typeof navigator.share === 'function'
    && typeof navigator.canShare === 'function'
    && navigator.canShare({ files: [file] });
}

function fallbackSaveReportImage(dataUrl, fileName) {
  if (isIosSafari()) {
    if (openReportImageWindow(dataUrl, fileName)) return '이미지를 새 탭에 열었습니다.';
    if (downloadDataUrl(dataUrl, fileName)) return '이미지 파일을 저장했습니다.';
    return '이미지를 열지 못했습니다.';
  }

  const opened = openReportImageWindow(dataUrl, fileName);
  const downloaded = downloadDataUrl(dataUrl, fileName);
  if (opened && downloaded) return '이미지 탭을 열고 다운로드를 시작했습니다.';
  if (opened) return '이미지를 새 탭에 열었습니다.';
  if (downloaded) return '이미지 파일을 저장했습니다.';
  return '이미지를 열지 못했습니다.';
}

function downloadDataUrl(dataUrl, fileName) {
  if (typeof document === 'undefined') return false;
  const link = document.createElement('a');
  if (!('download' in link)) return false;
  link.href = dataUrl;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function openReportImageWindow(dataUrl, fileName) {
  void fileName;
  if (typeof window === 'undefined') return false;
  return !!window.open(dataUrl, '_blank');
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(parts[1] || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function isAbortError(error) {
  return error && error.name === 'AbortError';
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const isAppleMobile = /iP(ad|hone|od)/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isAppleMobile && /WebKit/.test(userAgent) && /Safari/.test(userAgent) && !isOtherIosBrowser;
}

function GraphWorkspace({ plan, table, graph, onChange, onOpenReport }) {
  const canvasRef = useRef(null);
  const segments = getSegments(graph.dividers);
  const canUndoGraphAction = Array.isArray(graph.undoStack) && graph.undoStack.length > 0;

  function setGraph(patch) {
    onChange((currentGraph) => {
      const nextPatch = typeof patch === 'function' ? patch(currentGraph) : patch;
      return { ...currentGraph, ...nextPatch };
    });
  }

  function handleGraphPoint(point) {
    if ((graph.mode === 'divide' || graph.mode === 'paint') && !point.insideGraph) return;

    if (graph.mode === 'divide') {
      setGraph((currentGraph) => {
        const snapped = getSnappedDividerValue(currentGraph, point);
        const currentDividers = Array.isArray(currentGraph.dividers) ? currentGraph.dividers : [];
        const hasDivider = currentDividers.indexOf(snapped) !== -1;
        const dividers = hasDivider
          ? currentDividers.filter((value) => value !== snapped)
          : sanitizeDividers(currentDividers.concat(snapped));
        return withGraphUndo(currentGraph, { dividers });
      });
      return;
    }

    if (graph.mode === 'paint') {
      setGraph((currentGraph) => {
        const currentSegments = getSegments(currentGraph.dividers);
        const segment = findSegmentFromPoint(currentGraph, currentSegments, point);
        if (!segment) return {};
        const activeColor = normalizeGraphActiveColor(currentGraph.activeColor);
        if (activeColor === GRAPH_ERASER_COLOR) {
          if (!currentGraph.fills || !currentGraph.fills[segment.key]) return {};
          const fills = cloneGraphFills(currentGraph.fills);
          delete fills[segment.key];
          return withGraphUndo(currentGraph, { fills });
        }
        if (currentGraph.fills && currentGraph.fills[segment.key] === activeColor) return {};
        return withGraphUndo(currentGraph, {
          fills: { ...cloneGraphFills(currentGraph.fills), [segment.key]: activeColor }
        });
      });
      return;
    }

    setGraph((currentGraph) => ({
      labels: currentGraph.labels.concat({
        id: makeId('label'),
        text: '',
        x: point.canvasX,
        y: point.canvasY,
        width: DEFAULT_LABEL_WIDTH,
        fontSize: DEFAULT_LABEL_FONT_SIZE,
        color: LABEL_COLORS[0]
      })
    }));
  }

  function undoGraphAction() {
    if (!canUndoGraphAction) return;
    setGraph((currentGraph) => {
      const undoStack = sanitizeGraphUndoStack(currentGraph.undoStack);
      const previousSnapshot = undoStack[undoStack.length - 1];
      if (!previousSnapshot) return {};
      return {
        dividers: previousSnapshot.dividers.slice(),
        fills: { ...previousSnapshot.fills },
        undoStack: undoStack.slice(0, -1)
      };
    });
  }

  function updateLabel(labelId, patch) {
    setGraph((currentGraph) => ({
      labels: currentGraph.labels.map((label) => (label.id === labelId ? { ...label, ...patch } : label))
    }));
  }

  function removeLabel(labelId) {
    setGraph((currentGraph) => ({
      labels: currentGraph.labels.filter((label) => label.id !== labelId)
    }));
  }

  function resetGraph() {
    if (window.confirm('그래프에 그린 선, 색, 글자를 모두 지울까요?')) {
      setGraph({ dividers: [], fills: {}, labels: [], undoStack: [] });
    }
  }

  return (
    <div className="graph-workspace">
      <GraphTablePreview plan={plan} table={table} />

      <div className="workspace-grid graph-layout">
        <aside className="tool-rail">
          <GraphScaleControl
            scale={graph.scale}
            onConfirm={(nextScale) => {
              if (nextScale !== normalizeGraphScale(graph.scale)) {
                setGraph({ scale: nextScale, dividers: [], fills: {}, undoStack: [] });
              }
            }}
          />

          <SectionTitle icon={MousePointer2} title="작업 모드" />
          <SegmentedControl
            value={graph.mode}
            onChange={(value) => setGraph({ mode: value })}
            items={[
              { value: 'divide', label: '나누기', icon: PenLine },
              { value: 'paint', label: '색칠하기', icon: PaintBucket },
              { value: 'text', label: '글자', icon: ALargeSmall }
            ]}
          />

          {graph.mode === 'paint' && (
            <div className="swatch-block graph-swatches" aria-label="그래프 색">
              {GRAPH_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`swatch ${graph.activeColor === color ? 'is-active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setGraph({ activeColor: color })}
                  title="색 선택"
                  aria-label="색 선택"
                />
              ))}
              <button
                type="button"
                className={`swatch is-eraser ${graph.activeColor === GRAPH_ERASER_COLOR ? 'is-active' : ''}`}
                style={{ backgroundColor: GRAPH_ERASER_COLOR }}
                onClick={() => setGraph({ activeColor: GRAPH_ERASER_COLOR })}
                title="색 지우개"
                aria-label="색 지우개"
              >
                <Eraser size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="graph-action-row">
            <button className="icon-text-button secondary graph-action-button" type="button" onClick={undoGraphAction} disabled={!canUndoGraphAction} title="실행 취소">
              <Undo2 size={17} aria-hidden="true" />
              <span>실행 취소</span>
            </button>
            <button className="icon-text-button secondary graph-action-button" type="button" onClick={resetGraph} title="그래프 지우기">
              <Eraser size={17} aria-hidden="true" />
              <span>초기화</span>
            </button>
          </div>

          <button className="icon-text-button graph-report-button" type="button" onClick={onOpenReport}>
            <FileText size={18} aria-hidden="true" />
            <span>보고서 이미지</span>
          </button>
          <a
            className="icon-text-button graph-share-button"
            href="https://b.tkbell.co.kr/tkboard/woi/1277778/nk4z42ORf8.do?pageSeq=2431822"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 size={18} aria-hidden="true" />
            <span>공유하기</span>
          </a>
        </aside>

        <div className="graph-main">
          <GraphCanvas
            ref={canvasRef}
            graph={graph}
            segments={segments}
            onPoint={handleGraphPoint}
            onLabelChange={updateLabel}
            onLabelRemove={removeLabel}
          />

        </div>
      </div>
    </div>
  );
}

function InterpretationWorkspace({ graph, answers, onAnswerChange }) {
  const currentAnswers = normalizeInterpretationAnswers(answers);

  function setAnswer(key, value) {
    onAnswerChange({ [key]: value });
  }

  return (
    <div className="interpretation-workspace">
      <div className="interpret-graph-panel">
        <StaticGraphCanvas graph={graph} />
      </div>

      <form className="interpret-form" aria-label="그래프 해석 문장 틀" onSubmit={(event) => event.preventDefault()}>
        <ol className="interpret-sentence-list">
          <li className="interpret-sentence">
            <span className="sentence-number">1</span>
            <span>가장 많은 학생이</span>
            <SentenceBlank
              value={currentAnswers.mostAction}
              onChange={(value) => setAnswer('mostAction', value)}
              label="1번 행동"
            />
            <span>하는</span>
            <SentenceBlank
              value={currentAnswers.mostSubject}
              onChange={(value) => setAnswer('mostSubject', value)}
              label="1번 대상"
            />
            <span>은</span>
            <SentenceBlank
              value={currentAnswers.mostAnswer}
              onChange={(value) => setAnswer('mostAnswer', value)}
              label="1번 답"
            />
            <span>입니다.</span>
          </li>

          <li className="interpret-sentence">
            <span className="sentence-number">2</span>
            <span>가장 적은 학생이</span>
            <SentenceBlank
              value={currentAnswers.leastAction}
              onChange={(value) => setAnswer('leastAction', value)}
              label="2번 행동"
            />
            <span>하는</span>
            <SentenceBlank
              value={currentAnswers.leastSubject}
              onChange={(value) => setAnswer('leastSubject', value)}
              label="2번 대상"
            />
            <span>은</span>
            <SentenceBlank
              value={currentAnswers.leastAnswer}
              onChange={(value) => setAnswer('leastAnswer', value)}
              label="2번 답"
            />
            <span>입니다.</span>
          </li>

          <li className="interpret-sentence">
            <span className="sentence-number">3</span>
            <SentenceBlank
              value={currentAnswers.compareLeftItem}
              onChange={(value) => setAnswer('compareLeftItem', value)}
              label="3번 첫 번째 항목"
            />
            <span>을</span>
            <SentenceBlank
              value={currentAnswers.compareLeftAction}
              onChange={(value) => setAnswer('compareLeftAction', value)}
              label="3번 첫 번째 행동"
            />
            <span>하는 학생은</span>
            <SentenceBlank
              value={currentAnswers.compareRightItem}
              onChange={(value) => setAnswer('compareRightItem', value)}
              label="3번 두 번째 항목"
            />
            <span>을</span>
            <SentenceBlank
              value={currentAnswers.compareRightAction}
              onChange={(value) => setAnswer('compareRightAction', value)}
              label="3번 두 번째 행동"
            />
            <span>하는 학생보다</span>
            <RelationChoice
              value={currentAnswers.compareRelation}
              onChange={(value) => setAnswer('compareRelation', value)}
            />
            <span>.</span>
          </li>

          <li className="interpret-sentence">
            <span className="sentence-number">4</span>
            <span>전체 학생 중</span>
            <SentenceBlank
              value={currentAnswers.ratioItem}
              onChange={(value) => setAnswer('ratioItem', value)}
              label="4번 항목"
            />
            <span>을</span>
            <SentenceBlank
              value={currentAnswers.ratioAction}
              onChange={(value) => setAnswer('ratioAction', value)}
              label="4번 행동"
            />
            <span>하는 학생은</span>
            <SentenceBlank
              value={currentAnswers.ratioPercent}
              onChange={(value) => setAnswer('ratioPercent', value)}
              label="4번 비율"
              short
              inputMode="decimal"
            />
            <span>%입니다.</span>
          </li>
        </ol>
      </form>
    </div>
  );
}

function RelationChoice({ value, onChange }) {
  const normalizedValue = value === '적습니다' ? '적습니다' : '많습니다';
  const choices = ['많습니다', '적습니다'];
  return (
    <span className="relation-choice" role="group" aria-label="3번 비교 결과">
      {choices.map((choice) => (
        <button
          key={choice}
          className={`relation-choice-button ${normalizedValue === choice ? 'is-active' : ''}`}
          type="button"
          aria-pressed={normalizedValue === choice}
          onClick={() => onChange(choice)}
        >
          {choice}
        </button>
      ))}
    </span>
  );
}

function SentenceBlank({ value, onChange, label, short = false, inputMode }) {
  const textValue = typeof value === 'string' ? value : '';
  return (
    <span
      className={`sentence-blank-wrap ${short ? 'is-short' : ''}`}
      style={{ '--sentence-blank-content-width': `${getSentenceBlankWidth(textValue)}px` }}
    >
      <input
        className="sentence-blank"
        value={textValue}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        inputMode={inputMode}
        autoComplete="off"
      />
    </span>
  );
}

function StaticGraphCanvas({ graph }) {
  const [frameRef, frameSize] = useElementSize();
  const segments = getSegments(graph.dividers);
  const graphClassName = `static-graph-canvas is-${graph.type === 'pie' ? 'pie' : 'bar'}`;

  return (
    <div className={graphClassName} ref={frameRef} aria-label="해석할 그래프">
      {graph.type === 'bar' ? (
        <BarGraph graph={graph} segments={segments} previewDivider={null} previewSegmentKey={null} />
      ) : (
        <PieGraph graph={graph} segments={segments} previewDivider={null} previewSegmentKey={null} />
      )}
      {(Array.isArray(graph.labels) ? graph.labels : []).map((rawLabel) => {
        const label = normalizeGraphLabel(rawLabel);
        if (!label.text.trim()) return null;
        const maxLabelWidth = getCanvasLabelMaxWidth(frameSize);
        const labelWidth = getSafeLabelWidth(label.text, label.fontSize, label.width, null, maxLabelWidth);
        const labelHeight = getLabelBoxHeightForText(label.text, label.fontSize, labelWidth, null);
        return (
          <div
            key={label.id}
            className="static-graph-label-frame"
            style={{
              left: `clamp(${labelWidth / 2}px, ${label.x}%, calc(100% - ${labelWidth / 2}px))`,
              top: `clamp(${labelHeight / 2}px, ${label.y}%, calc(100% - ${labelHeight / 2}px))`,
              width: `${labelWidth}px`,
              height: `${labelHeight}px`
            }}
          >
            <div
              className="static-graph-label"
              style={{
                color: label.color,
                fontSize: `${label.fontSize}px`,
                textShadow: label.color === '#ffffff'
                  ? '0 1px 3px rgba(0, 0, 0, 0.72)'
                  : '0 1px 2px rgba(255, 255, 255, 0.38)'
              }}
            >
              {label.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const GraphCanvas = React.forwardRef(function GraphCanvas({ graph, segments, onPoint, onLabelChange, onLabelRemove }, ref) {
  const canvasElementRef = useRef(null);
  const activeDividerDragRef = useRef(null);
  const labelActionRef = useRef(null);
  const labelInputRefs = useRef(new Map());
  const onLabelChangeRef = useRef(onLabelChange);
  const previousLabelIds = useRef(new Set(graph.labels.map((label) => label.id)));
  const [hoverPoint, setHoverPoint] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const [dividerDragInput, setDividerDragInput] = useState(null);
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
      top: `${clamp(hoverPoint.canvasY - (dividerDragInput === 'touch' && graph.mode === 'divide' ? 13 : 8), 7, 93)}%`
    }
    : null;

  useEffect(() => {
    onLabelChangeRef.current = onLabelChange;
  }, [onLabelChange]);

  useEffect(() => {
    const canvasElement = canvasElementRef.current;
    if (!canvasElement) return undefined;

    function updateCanvasSize() {
      const rect = canvasElement.getBoundingClientRect();
      setCanvasSize((currentSize) => {
        const width = roundLabelMetric(rect.width);
        const height = roundLabelMetric(rect.height);
        return currentSize.width === width && currentSize.height === height
          ? currentSize
          : { width, height };
      });
    }

    updateCanvasSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateCanvasSize);
      observer.observe(canvasElement);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    const previousIds = previousLabelIds.current;
    const nextLabel = graph.labels.find((label) => label.id && !previousIds.has(label.id));
    if (nextLabel && nextLabel.id) setSelectedLabelId(nextLabel.id);
    previousLabelIds.current = new Set(graph.labels.map((label) => label.id));
  }, [graph.labels]);

  useEffect(() => {
    if (selectedLabelId && !graph.labels.some((label) => label.id === selectedLabelId)) {
      setSelectedLabelId(null);
    }
  }, [graph.labels, selectedLabelId]);

  useEffect(() => {
    if (!selectedLabelId) return;
    const input = labelInputRefs.current.get(selectedLabelId);
    if (!input || input.value) return;
    input.focus();
    input.setSelectionRange(0, 0);
  }, [selectedLabelId]);

  useEffect(() => {
    if (!selectedLabelId) return undefined;

    function handleDocumentPointerDown(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.graph-label-frame')) return;
      if (target.closest('.graph-canvas')) return;
      releaseLabelSelection();
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  }, [graph.labels, selectedLabelId]);

  useEffect(() => {
    function handleDocumentLabelActionMove(event) {
      if (!labelActionRef.current) return;
      event.preventDefault();
      updateLabelAction(event.clientX, event.clientY);
    }

    function handleDocumentLabelActionEnd() {
      if (labelActionRef.current) labelActionRef.current = null;
    }

    document.addEventListener('pointermove', handleDocumentLabelActionMove, true);
    document.addEventListener('pointerup', handleDocumentLabelActionEnd, true);
    document.addEventListener('pointercancel', handleDocumentLabelActionEnd, true);
    return () => {
      document.removeEventListener('pointermove', handleDocumentLabelActionMove, true);
      document.removeEventListener('pointerup', handleDocumentLabelActionEnd, true);
      document.removeEventListener('pointercancel', handleDocumentLabelActionEnd, true);
    };
  }, []);

  function removeLabelIfEmpty(labelId) {
    const label = graph.labels.find((candidate) => candidate.id === labelId);
    if (label && label.text.trim() === '') onLabelRemove(labelId);
  }

  function releaseLabelSelection(nextLabelId = null) {
    if (selectedLabelId && selectedLabelId !== nextLabelId) {
      const input = labelInputRefs.current.get(selectedLabelId);
      if (input && document.activeElement === input) input.blur();
      removeLabelIfEmpty(selectedLabelId);
    }
    setSelectedLabelId(nextLabelId);
  }

  function selectLabel(labelId) {
    releaseLabelSelection(labelId);
  }

  function pointFromEvent(clientX, clientY, target, options = {}) {
    const rect = target.getBoundingClientRect();
    const canvasX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const canvasY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    const graphElement = target.querySelector(graph.type === 'bar' ? '.bar-svg' : '.pie-svg');
    const graphRect = graphElement ? graphElement.getBoundingClientRect() : rect;
    const svgHeight = graph.type === 'bar' ? BAR_GRAPH_VIEWBOX.height : 100;
    const rawSvgX = graphRect.width ? ((clientX - graphRect.left) / graphRect.width) * 100 : 0;
    const rawSvgY = graphRect.height ? ((clientY - graphRect.top) / graphRect.height) * svgHeight : 0;
    const svgX = clamp(rawSvgX, 0, 100);
    const svgY = clamp(rawSvgY, 0, svgHeight);
    const graphX = clamp(((svgX - BAR_GRAPH_BOX.left) / BAR_GRAPH_BOX.width) * 100, 0, 100);
    const graphY = clamp(((svgY - BAR_GRAPH_BOX.top) / BAR_GRAPH_BOX.height) * 100, 0, 100);
    const pieDistance = Math.hypot(rawSvgX - PIE_GRAPH_CIRCLE.cx, rawSvgY - PIE_GRAPH_CIRCLE.cy);
    const barTolerance = options.relaxedDivider ? DIVIDER_DRAG_BAR_TOLERANCE : 0;
    const pieTolerance = options.relaxedDivider ? DIVIDER_DRAG_PIE_TOLERANCE : 0;
    const insideGraph = graph.type === 'bar'
      ? rawSvgX >= BAR_GRAPH_BOX.left
        && rawSvgX <= BAR_GRAPH_BOX.left + BAR_GRAPH_BOX.width
        && rawSvgY >= BAR_GRAPH_BOX.top - barTolerance
        && rawSvgY <= BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + barTolerance
      : pieDistance <= PIE_GRAPH_CIRCLE.radius + pieTolerance;
    const percentAngle = pointToPiePercent(rawSvgX, rawSvgY);
    return { canvasX, canvasY, svgX, svgY, graphX, graphY, percentAngle, insideGraph };
  }

  function releaseDividerPointer(event) {
    if (event.currentTarget.releasePointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be gone after cancellation or browser cleanup.
      }
    }
  }

  function updateDividerDragPoint(event, options = {}) {
    const dragState = activeDividerDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return null;
    const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget, { relaxedDivider: true });
    if (point.insideGraph) {
      dragState.lastPoint = point;
      return point;
    }
    return options.allowLastPoint ? dragState.lastPoint : null;
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (selectedLabelId) {
      event.preventDefault();
      releaseLabelSelection();
      setHoverPoint(null);
      return;
    }

    const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget);
    setHoverPoint(point.insideGraph ? point : null);

    if (graph.mode === 'divide') {
      event.preventDefault();
      if (!point.insideGraph) return;
      activeDividerDragRef.current = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        lastPoint: point
      };
      setDividerDragInput(event.pointerType);
      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Some synthetic or interrupted pointer events cannot be captured.
        }
      }
      return;
    }

    onPoint(point);
  }

  function handlePointerMove(event) {
    if (graph.mode === 'divide' && activeDividerDragRef.current && activeDividerDragRef.current.pointerId === event.pointerId) {
      event.preventDefault();
      const point = updateDividerDragPoint(event, { allowLastPoint: true });
      setHoverPoint(point && point.insideGraph ? point : null);
      return;
    }

    const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget);
    setHoverPoint(point.insideGraph ? point : null);
  }

  function handlePointerUp(event) {
    if (graph.mode !== 'divide' || !activeDividerDragRef.current || activeDividerDragRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = updateDividerDragPoint(event, { allowLastPoint: true });
    activeDividerDragRef.current = null;
    setDividerDragInput(null);
    releaseDividerPointer(event);
    setHoverPoint(null);
    if (point && point.insideGraph) onPoint(point);
  }

  function handlePointerCancel(event) {
    if (!activeDividerDragRef.current || activeDividerDragRef.current.pointerId !== event.pointerId) return;
    activeDividerDragRef.current = null;
    setDividerDragInput(null);
    releaseDividerPointer(event);
    setHoverPoint(null);
  }

  function setGraphCanvasRef(node) {
    canvasElementRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }

  function startLabelAction(event, label, action) {
    event.preventDefault();
    event.stopPropagation();
    selectLabel(label.id);
    const canvasRect = event.currentTarget.closest('.graph-canvas').getBoundingClientRect();
    const frameElement = event.currentTarget.closest('.graph-label-frame');
    const frameRect = frameElement
      ? frameElement.getBoundingClientRect()
      : { left: event.clientX, top: event.clientY, width: label.width, height: getLabelBoxHeightForText(label.text, label.fontSize, label.width) };
    labelActionRef.current = {
      action,
      labelId: label.id,
      startX: event.clientX,
      startY: event.clientY,
      canvasRect,
      frameRect,
      maxLabelWidth: getCanvasLabelMaxWidth({ width: canvasRect.width, height: canvasRect.height }),
      label: normalizeGraphLabel(label)
    };
    if (event.currentTarget.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture can fail for synthetic or interrupted events.
      }
    }
  }

  function updateLabelAction(clientX, clientY) {
    const action = labelActionRef.current;
    if (!action) return;
    const dx = clientX - action.startX;
    const dy = clientY - action.startY;

    if (action.action === 'move') {
      const nextPosition = clampLabelCenterToCanvas(
        action.label.x + dx / action.canvasRect.width * 100,
        action.label.y + dy / action.canvasRect.height * 100,
        action.frameRect.width,
        action.frameRect.height,
        action.canvasRect
      );
      applyLabelActionPatch(action.labelId, {
        x: nextPosition.x,
        y: nextPosition.y
      });
      return;
    }

    const scale = getLabelResizeScale(action, dx, dy);
    const nextFontSize = normalizeLabelFontSize(action.label.fontSize * scale);
    const nextWidth = getSafeLabelWidth(action.label.text, nextFontSize, action.label.width * scale, null, action.maxLabelWidth);
    const nextHeight = getLabelBoxHeightForText(action.label.text, nextFontSize, nextWidth);
    const nextCenterX = action.frameRect.left + nextWidth / 2;
    const nextCenterY = action.frameRect.top + nextHeight / 2;
    const nextPosition = clampLabelCenterToCanvas(
      (nextCenterX - action.canvasRect.left) / action.canvasRect.width * 100,
      (nextCenterY - action.canvasRect.top) / action.canvasRect.height * 100,
      nextWidth,
      nextHeight,
      action.canvasRect
    );

    applyLabelActionPatch(action.labelId, {
      x: nextPosition.x,
      y: nextPosition.y,
      width: nextWidth,
      fontSize: nextFontSize,
      manualSize: true
    });
  }

  function applyLabelActionPatch(labelId, patch) {
    flushSync(() => {
      onLabelChangeRef.current(labelId, patch);
    });
  }

  function endLabelAction(event) {
    const action = labelActionRef.current;
    if (!action || action.labelId !== event.currentTarget.dataset.labelId) return;
    labelActionRef.current = null;
    if (event.currentTarget.releasePointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released.
      }
    }
  }

  return (
    <div
      className={`graph-canvas mode-${graph.mode}${dividerDragInput === 'touch' ? ' is-divider-touching' : ''}`}
      ref={setGraphCanvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={() => {
        if (!activeDividerDragRef.current) setHoverPoint(null);
      }}
      role="button"
      aria-label="그래프 그리기 영역"
    >
      {graph.type === 'bar' ? (
        <BarGraph graph={graph} segments={segments} previewDivider={previewDivider} previewSegmentKey={previewSegment && previewSegment.key} />
      ) : (
        <PieGraph graph={graph} segments={segments} previewDivider={previewDivider} previewSegmentKey={previewSegment && previewSegment.key} />
      )}

      {readoutText && <div className="graph-readout" style={readoutStyle}>{readoutText}</div>}

      {graph.labels.map((rawLabel) => {
        const label = normalizeGraphLabel(rawLabel);
        const isSelected = selectedLabelId === label.id;
        const inputElement = labelInputRefs.current.get(label.id);
        const maxLabelWidth = getCanvasLabelMaxWidth(canvasSize);
        const labelWidth = getSafeLabelWidth(label.text, label.fontSize, label.width, inputElement, maxLabelWidth);
        const labelHeight = getLabelBoxHeightForText(label.text, label.fontSize, labelWidth, inputElement);
        const labelRows = getLabelVisualRowCount(label.text, label.fontSize, labelWidth, inputElement);
        const displayLabel = { ...label, width: labelWidth };
        return (
          <div
            key={label.id}
            className={`graph-label-frame ${isSelected ? 'is-selected' : ''}`}
            style={{
              left: `clamp(${labelWidth / 2}px, ${label.x}%, calc(100% - ${labelWidth / 2}px))`,
              top: `clamp(${labelHeight / 2}px, ${label.y}%, calc(100% - ${labelHeight / 2}px))`,
              width: `${labelWidth}px`,
              height: `${labelHeight}px`,
              '--label-selection-inset': `${getLabelSelectionInset(label.fontSize)}px`
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              selectLabel(label.id);
            }}
          >
            <textarea
              ref={(node) => {
                if (node) {
                  labelInputRefs.current.set(label.id, node);
                } else {
                  labelInputRefs.current.delete(label.id);
                }
              }}
              className="graph-floating-label"
              value={label.text}
              rows={labelRows}
              wrap="soft"
              spellCheck="false"
              style={{
                color: label.color,
                fontSize: `${label.fontSize}px`,
                height: `${labelHeight}px`,
                textShadow: label.color === '#ffffff'
                  ? '0 1px 3px rgba(0, 0, 0, 0.72)'
                  : '0 1px 2px rgba(255, 255, 255, 0.38)'
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                selectLabel(label.id);
              }}
              onChange={(event) => {
                const nextText = event.target.value;
                const patch = { text: nextText };
                if (!label.manualSize) {
                  patch.width = getAutoLabelWidth(nextText, label.fontSize, event.currentTarget);
                }
                onLabelChange(label.id, patch);
              }}
              aria-label="그래프 글자"
            />
            {isSelected && (
              <>
                <span
                  className="label-selection-box"
                  style={{ inset: `-${getLabelSelectionInset(label.fontSize)}px` }}
                  aria-hidden="true"
                />
                {LABEL_BORDER_MOVE_AREAS.map((area) => (
                  <span
                    key={area}
                    className={`label-border-move-hit ${area}`}
                    title="이동"
                    aria-hidden="true"
                    data-label-id={label.id}
                    onPointerDown={(event) => startLabelAction(event, displayLabel, 'move')}
                    onPointerUp={endLabelAction}
                    onPointerCancel={endLabelAction}
                  />
                ))}
                <div className="label-color-tools" aria-label="텍스트 색">
                  {LABEL_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`label-color-button ${label.color === color ? 'is-active' : ''}`}
                      type="button"
                      style={{ backgroundColor: color }}
                      title={color === '#ffffff' ? '흰색' : '검은색'}
                      aria-label={color === '#ffffff' ? '흰색' : '검은색'}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onLabelChange(label.id, { color })}
                    />
                  ))}
                </div>
                <button
                  className="label-handle resize"
                  type="button"
                  title="크기 변경"
                  aria-label="텍스트 크기 변경"
                  data-label-id={label.id}
                  onPointerDown={(event) => startLabelAction(event, displayLabel, 'resize')}
                  onPointerUp={endLabelAction}
                  onPointerCancel={endLabelAction}
                >
                  <Maximize2 size={12} aria-hidden="true" />
                </button>
                <button
                  className="label-handle delete"
                  type="button"
                  title="글자 지우기"
                  aria-label="텍스트 지우기"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onLabelRemove(label.id);
                  }}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
});

function BarGraph({ graph, segments, previewDivider, previewSegmentKey }) {
  const scale = normalizeGraphScale(graph.scale);
  const labelTicks = makePercentLabelTicks(scale, 'bar');
  const minorTicks = makeGraphTicks(scale, true).filter((tick) => !labelTicks.includes(tick));
  const box = BAR_GRAPH_BOX;
  const barRadius = 2.2;
  return (
    <svg className="bar-svg" viewBox={`0 0 ${BAR_GRAPH_VIEWBOX.width} ${BAR_GRAPH_VIEWBOX.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <clipPath id="bar-graph-clip">
          <rect x={box.left} y={box.top} width={box.width} height={box.height} rx={barRadius} />
        </clipPath>
      </defs>
      <rect className="bar-graph-backdrop" x={box.left} y={box.top} width={box.width} height={box.height} rx={barRadius} />
      {segments.map((segment) => (
        <rect
          key={segment.key}
          x={barPercentX(segment.start)}
          y={box.top}
          width={(segment.end - segment.start) * (box.width / 100)}
          height={box.height}
          fill={graph.fills[segment.key] || 'rgba(255,255,255,0)'}
          stroke="none"
          clipPath="url(#bar-graph-clip)"
        />
      ))}
      {segments.map((segment) => (
        segment.key === previewSegmentKey ? (
          <rect
            key={`preview-${segment.key}`}
            className="graph-preview-segment"
            x={barPercentX(segment.start)}
            y={box.top}
            width={(segment.end - segment.start) * (box.width / 100)}
            height={box.height}
            fill="none"
            clipPath="url(#bar-graph-clip)"
          />
        ) : null
      ))}
      <rect className="bar-graph-outline" x={box.left} y={box.top} width={box.width} height={box.height} rx={barRadius} />
      {minorTicks.map((tick) => (
        <g key={tick}>
          <line className="graph-minor-tick" x1={barPercentX(tick)} x2={barPercentX(tick)} y1={box.top - 2.8} y2={box.top - 0.7} />
          <line className="graph-minor-tick" x1={barPercentX(tick)} x2={barPercentX(tick)} y1={box.top + box.height + 0.7} y2={box.top + box.height + 2.8} />
        </g>
      ))}
      {labelTicks.map((tick) => (
        <g key={`label-${tick}`}>
          <line className="graph-major-tick" x1={barPercentX(tick)} x2={barPercentX(tick)} y1={box.top - 3.6} y2={box.top - 0.6} />
          <line className="graph-major-tick" x1={barPercentX(tick)} x2={barPercentX(tick)} y1={box.top + box.height + 0.6} y2={box.top + box.height + 4.2} />
          <text className="graph-tick-label" x={barPercentX(tick)} y="33" textAnchor="middle" fontSize="3.1">{tick}%</text>
        </g>
      ))}
      {Number.isFinite(previewDivider) && (
        <line className="graph-preview-line" x1={barPercentX(previewDivider)} x2={barPercentX(previewDivider)} y1={box.top - 1.4} y2={box.top + box.height + 1.4} />
      )}
      {graph.dividers.map((divider) => (
        <line key={divider} x1={barPercentX(divider)} x2={barPercentX(divider)} y1={box.top} y2={box.top + box.height} stroke="#1f2d3d" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function barPercentX(percent) {
  return BAR_GRAPH_BOX.left + percent * (BAR_GRAPH_BOX.width / 100);
}

function PieGraph({ graph, segments, previewDivider, previewSegmentKey }) {
  const scale = normalizeGraphScale(graph.scale);
  const labelTicks = makePercentLabelTicks(scale, 'pie');
  const minorTicks = makeGraphTicks(scale).filter((tick) => !labelTicks.includes(tick));
  return (
    <svg className="pie-svg" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="38" fill="#ffffff" stroke="#1f2d3d" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
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
      <circle cx="50" cy="50" r="38" fill="none" stroke="#1f2d3d" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
      <line className="pie-zero-divider" x1="50" y1="50" x2={polarPoint(50, 50, 38, 0).x} y2={polarPoint(50, 50, 38, 0).y} stroke="#1f2d3d" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
      {minorTicks.map((tick) => {
        const inner = polarPoint(50, 50, PIE_MINOR_TICK_INNER_RADIUS, tick);
        const outer = polarPoint(50, 50, PIE_MINOR_TICK_OUTER_RADIUS, tick);
        return (
          <g key={tick}>
            <line className="graph-minor-tick" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
          </g>
        );
      })}
      {labelTicks.map((tick) => {
        const inner = polarPoint(50, 50, PIE_MAJOR_TICK_INNER_RADIUS, tick);
        const outer = polarPoint(50, 50, PIE_MAJOR_TICK_OUTER_RADIUS, tick);
        const label = getPieTickLabelPosition(tick);
        return (
          <g key={`label-${tick}`}>
            <line className="graph-major-tick" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
            <text className="graph-tick-label" x={label.x} y={label.y} textAnchor={label.textAnchor} dominantBaseline="middle" fontSize="4">{tick}%</text>
          </g>
        );
      })}
      {Number.isFinite(previewDivider) && (
        <line className="graph-preview-line" x1="50" y1="50" x2={polarPoint(50, 50, 40, previewDivider).x} y2={polarPoint(50, 50, 40, previewDivider).y} />
      )}
      {graph.dividers.map((divider) => {
        const point = polarPoint(50, 50, 38, divider);
        return <line key={divider} x1="50" y1="50" x2={point.x} y2={point.y} stroke="#1f2d3d" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}

function ShareDialog({ state, onClose, onImport }) {
  const [qrSrc, setQrSrc] = useState('');
  const [activeQrIndex, setActiveQrIndex] = useState(0);
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

  function handleScannedText(text) {
    const result = parseImportTextResult(text);
    if (!result.state) {
      setMessage(result.message || '읽은 QR을 적용할 수 없습니다.');
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
            <X size={18} aria-hidden="true" />
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
          </div>

          <div className="import-card">
            <CameraQrScanner onScan={handleScannedText} />
          </div>
        </div>
        {message && <p className="dialog-message">{message}</p>}
      </div>
    </div>
  );
}

function CameraQrScanner({ onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onScanRef = useRef(onScan);
  const lastScanRef = useRef({ text: '', time: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!isScanning) return undefined;

    let stream = null;
    let frameId = 0;
    let stopped = false;

    function stopStream() {
      if (frameId) window.cancelAnimationFrame(frameId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    function scanFrame() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(video, 0, 0, width, height);
          const imageData = context.getImageData(0, 0, width, height);
          const result = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
          const text = result && typeof result.data === 'string' ? result.data.trim() : '';
          const now = Date.now();
          if (text && (text !== lastScanRef.current.text || now - lastScanRef.current.time > 1800)) {
            lastScanRef.current = { text, time: now };
            setScannerMessage('QR을 읽었습니다.');
            onScanRef.current(text);
          }
        }
      }
      frameId = window.requestAnimationFrame(scanFrame);
    }

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScannerMessage('이 브라우저는 카메라를 지원하지 않습니다.');
        setIsScanning(false);
        return;
      }

      setScannerMessage('카메라를 여는 중입니다.');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScannerMessage('QR 대기 중');
        frameId = window.requestAnimationFrame(scanFrame);
      } catch (error) {
        if (!stopped) {
          setScannerMessage('카메라를 열 수 없습니다. 권한 또는 HTTPS/localhost를 확인하세요.');
          setIsScanning(false);
        }
      }
    }

    startCamera();

    return () => {
      stopped = true;
      stopStream();
    };
  }, [isScanning]);

  function toggleScanner() {
    if (isScanning) {
      setScannerMessage('');
      setIsScanning(false);
      return;
    }
    lastScanRef.current = { text: '', time: 0 };
    setScannerMessage('');
    setIsScanning(true);
  }

  return (
    <div className={`qr-scanner ${isScanning ? 'is-active' : ''}`}>
      <button className={`icon-text-button ${isScanning ? 'secondary' : ''}`} type="button" onClick={toggleScanner}>
        {isScanning ? <X size={18} aria-hidden="true" /> : <QrCode size={18} aria-hidden="true" />}
        <span>{isScanning ? '카메라 닫기' : '카메라로 받기'}</span>
      </button>
      {isScanning && (
        <div className="qr-scanner-preview">
          <video ref={videoRef} muted playsInline />
          <canvas ref={canvasRef} aria-hidden="true" />
        </div>
      )}
      {scannerMessage && <p className="qr-scanner-message" aria-live="polite">{scannerMessage}</p>}
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

function normalizeGraphScale(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_GRAPH_SCALE;
  const scale = Math.round(Number(value));
  if (!Number.isFinite(scale)) return DEFAULT_GRAPH_SCALE;
  return clamp(scale, MIN_GRAPH_SCALE, MAX_GRAPH_SCALE);
}

function makeGraphTicks(scale, includeEnd = false) {
  const safeScale = normalizeGraphScale(scale);
  const ticks = [];
  for (let value = 0; value < 100; value += safeScale) ticks.push(value);
  if (includeEnd && ticks[ticks.length - 1] !== 100) ticks.push(100);
  return ticks;
}

function makePercentLabelTicks(scale, graphType) {
  const safeScale = normalizeGraphScale(scale);
  const labelStep = LABEL_TICK_STEPS_BY_SCALE[safeScale] || LABEL_TICK_STEPS_BY_SCALE[DEFAULT_GRAPH_SCALE];
  const ticks = [];
  for (let value = 0; value < 100; value += labelStep) ticks.push(value);
  if (graphType === 'bar' && ticks[ticks.length - 1] !== 100) ticks.push(100);
  return ticks;
}

function getGraphPointValue(graph, point) {
  return graph.type === 'bar' ? point.graphX : point.percentAngle;
}

function getSnappedDividerValue(graph, point) {
  const raw = getGraphPointValue(graph, point);
  const scale = normalizeGraphScale(graph.scale);
  const maxDivider = Math.floor(99 / scale) * scale;
  return clamp(Math.round(raw / scale) * scale, scale, maxDivider);
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

function getPieTickLabelPosition(tick) {
  const point = polarPoint(50, 50, PIE_TICK_LABEL_RADIUS, tick);
  return { x: point.x, y: point.y, textAnchor: 'middle' };
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
  const tableWidth = getTableWidthForItemCount(itemCount);

  const planPayload = {};
  const title = typeof plan.title === 'string' ? plan.title : '';
  const itemPayload = packRowForShare(plan.items, itemCount);
  if (title) planPayload.t = title;
  if (itemPayload) planPayload.i = itemPayload;
  if (itemCount !== DEFAULT_PLAN_ITEM_COUNT) planPayload.c = itemCount;
  if (hasObjectKeys(planPayload)) packed.p = planPayload;

  const tablePayload = {};
  const headerPayload = packRowForShare(buildHeaderRow(plan.items, table.headerRow, tableWidth), tableWidth);
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
  const scale = normalizeGraphScale(graph.scale);
  const dividers = sanitizeDividers(Array.isArray(graph.dividers) ? graph.dividers : []);
  const fillPayload = packFillsForShare(graph.fills, dividers);
  const labelPayload = packLabelsForShare(graph.labels);
  const mode = GRAPH_MODE_CODES[normalizeStoredGraphMode(graph.mode)] || GRAPH_MODE_CODES.divide;
  const activeColor = normalizeGraphActiveColor(graph.activeColor);

  if (type === 'pie') packed.t = 'p';
  if (scale !== DEFAULT_GRAPH_SCALE) packed.s = scale;
  if (dividers.length) packed.d = encodeDividersForShare(dividers);
  if (fillPayload) packed.f = fillPayload;
  if (labelPayload) packed.l = labelPayload;
  if (mode !== GRAPH_MODE_CODES.divide) packed.m = mode;
  if (activeColor !== GRAPH_COLORS[0]) packed.a = encodeColorForShare(activeColor, GRAPH_COLOR_SHARE_PALETTE);

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
    const code = encodeColorForShare(color, GRAPH_COLOR_SHARE_PALETTE);
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
  return labels.map((rawLabel) => {
    const label = normalizeGraphLabel(rawLabel);
    return [
      label.text,
      quantizePercent(label.x),
      quantizePercent(label.y),
      label.width,
      label.fontSize,
      encodeColorForShare(label.color, LABEL_COLORS),
      label.manualSize ? 1 : 0
    ];
  });
}

function unpackShareState(packed) {
  if (!packed || packed.v !== SHARE_VERSION) return null;
  const tablePayload = asPlainObject(packed.t);
  const planPayload = asPlainObject(packed.p);
  const itemCount = normalizePlanItemCount(planPayload.c, getPlanItemCount(planPayload.i, tablePayload.h));
  const tableWidth = getTableWidthForItemCount(itemCount);

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
  const scale = normalizeGraphScale(graph.s);
  return {
    type: graph.t === 'p' ? 'pie' : 'bar',
    scale,
    mode: GRAPH_MODES_BY_CODE[graph.m] || 'divide',
    activeColor: decodeColorForShare(graph.a, GRAPH_COLOR_SHARE_PALETTE, GRAPH_COLORS[0]),
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
      fills[segments[index].key] = decodeColorForShare(code, GRAPH_COLOR_SHARE_PALETTE, GRAPH_COLORS[0]);
    });
    return fills;
  }
  if (!Array.isArray(encoded)) return fills;
  encoded.forEach((entry) => {
    if (!Array.isArray(entry)) return;
    const index = Number(entry[0]);
    if (!segments[index]) return;
    fills[segments[index].key] = decodeColorForShare(entry[1], GRAPH_COLOR_SHARE_PALETTE, GRAPH_COLORS[0]);
  });
  return fills;
}

function decodeLabelsForShare(encoded) {
  if (!Array.isArray(encoded)) return [];
  return encoded
    .filter((label) => Array.isArray(label))
    .map((label) => normalizeGraphLabel({
      id: makeId('label'),
      text: typeof label[0] === 'string' ? label[0] : '',
      x: decodeQuantizedPercent(label[1]),
      y: decodeQuantizedPercent(label[2]),
      width: label[3],
      fontSize: label[4],
      color: decodeColorForShare(label[5], LABEL_COLORS, LABEL_COLORS[0]),
      manualSize: label[6] === 1
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
  return normalizeGraphColor(value) || fallback;
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
