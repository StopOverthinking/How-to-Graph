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
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eraser,
  FileText,
  Maximize2,
  Megaphone,
  MousePointer2,
  PaintBucket,
  PenLine,
  PieChart,
  Plus,
  QrCode,
  RectangleHorizontal,
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
const MAX_PLAN_STEP = 3;
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
const GRAPH_LINE_COLOR = '#1f2d3d';
const GRAPH_ARROW_OUTLINE_COLOR = '#ffffff';
const MIN_GRAPH_ARROW_LENGTH = 2.5;
const MAX_GRAPH_ARROWS = 80;
const DEFAULT_LABEL_WIDTH = 88;
const MIN_LABEL_WIDTH = 40;
const MAX_LABEL_WIDTH = 640;
const LABEL_AUTO_PADDING = 32;
const LABEL_FRAME_MARGIN = 12;
const LABEL_LINE_HEIGHT = 1.18;
const LABEL_BOX_VERTICAL_PADDING_EM = 0.75;
const LABEL_BOX_VERTICAL_GUARD_PX = 2;
const LABEL_SELECTION_INSET_EM = 0.3;
const LABEL_PREVENT_SCROLL_SAFE_VIEWPORT_RATIO = 0.58;
const GRAPH_LABEL_KEYBOARD_MODE_CLASS = 'is-graph-label-keyboard-editing';
const GRAPH_LABEL_KEYBOARD_PAN_VAR = '--graph-label-keyboard-pan-y';
const GRAPH_LABEL_KEYBOARD_PAN_GAP = 12;
const DEFAULT_LABEL_FONT_SIZE = 20;
const MIN_LABEL_FONT_SIZE = 12;
const MAX_LABEL_FONT_SIZE = 34;
const COUNT_ROW_LABEL = '인원(명)';
const PERCENTAGE_ROW_LABEL = '백분율(%)';
const TOTAL_COLUMN_LABEL = '합계';
const DEFAULT_GRAPH_SCALE = 5;
const MIN_GRAPH_SCALE = 1;
const MAX_GRAPH_SCALE = 20;
const DIVIDER_DRAG_BAR_TOLERANCE = 8;
const DIVIDER_DRAG_PIE_TOLERANCE = 10;
const SHARE_VERSION = 4;
const LEGACY_SHARE_VERSION = 2;
const PREVIOUS_SCOPED_SHARE_VERSION = 3;
const QR_SHARING_ENABLED = false;
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
const GRAPH_MODE_CODES = { divide: 'd', paint: 'p', text: 't', arrow: 'a' };
const GRAPH_MODES_BY_CODE = { d: 'divide', p: 'paint', t: 'text', a: 'arrow' };
const GRAPH_HISTORY_LIMIT = 80;
const SHARE_SCOPE_CODES = { plan: 'p', table: 't', graph: 'g', interpret: 'i', full: 'a' };
const SHARE_SCOPES_BY_CODE = { p: 'plan', t: 'table', g: 'graph', i: 'interpret', a: 'full' };
const SHARE_SCOPE_LABELS = {
  plan: '계획하기',
  table: '표 그리기',
  graph: '그래프 그리기',
  interpret: '해석하기',
  full: '전체'
};
const SELF_ASSESSMENT_QUESTIONS = [
  { id: 'percentageTable', text: '자료를 보고 백분율을 올바르게 구해 표를 만들었나요?' },
  { id: 'graphs', text: '표를 보고 띠그래프와 원그래프를 올바르게 그렸나요?' },
  { id: 'facts', text: '그래프를 보고 알 수 있는 사실을 올바르게 찾았나요?' }
];
const SELF_ASSESSMENT_OPTIONS = [
  { id: 'good', label: '잘함' },
  { id: 'normal', label: '보통' },
  { id: 'needsPractice', label: '노력 요함' }
];
const SHARE_GRAPH_TYPE_CODES = { bar: 'b', pie: 'p' };
const SHARE_GRAPH_TYPES_BY_CODE = { b: 'bar', p: 'pie' };
const BAR_GRAPH_VIEWBOX = { width: 100, height: 36 };
const BAR_GRAPH_BOX = { left: 8, top: 10, width: 84, height: 14 };
const PIE_GRAPH_CIRCLE = { cx: 50, cy: 50, radius: 38 };
const PIE_MINOR_TICK_INNER_RADIUS = PIE_GRAPH_CIRCLE.radius + 1.2;
const PIE_MINOR_TICK_OUTER_RADIUS = PIE_GRAPH_CIRCLE.radius + 4;
const PIE_MAJOR_TICK_INNER_RADIUS = PIE_GRAPH_CIRCLE.radius + 0.9;
const PIE_MAJOR_TICK_OUTER_RADIUS = PIE_GRAPH_CIRCLE.radius + 2.8;
const PIE_TICK_LABEL_RADIUS = PIE_GRAPH_CIRCLE.radius + 7.5;
const GRAPH_DISPLAY_TYPES = ['bar', 'pie'];
const GRAPH_DISPLAY_ASPECT_RATIO = 48 / 25;
const BAR_GRAPH_DISPLAY_WIDTH_RATIO = 0.99;
const PIE_GRAPH_DISPLAY_WIDTH_RATIO = 0.9;
const EDIT_GRAPH_DISPLAY_WIDTH_RATIOS = { bar: 0.88, pie: 0.74 };
const REPORT_GRAPH_DISPLAY_WIDTH_RATIOS = { bar: BAR_GRAPH_DISPLAY_WIDTH_RATIO, pie: PIE_GRAPH_DISPLAY_WIDTH_RATIO };
const GRAPH_DISPLAY_MAX_HEIGHT_INSET = 12;
const REPORT_IMAGE_WIDTH = 1600;
const REPORT_IMAGE_HEIGHT = 1200;
const REPORT_IMAGE_MARGIN = 72;
const REPORT_IMAGE_GRAPH_OVERLAP = 38;
const REPORT_IMAGE_LOGICAL_WIDTH = 760;
const REPORT_GRAPH_CONTENT_PADDING = 6;
const REPORT_GRAPH_ARROW_PADDING_UNITS = 6;
const DISPLAY_GRAPH_MIN_VISUAL_SCALE = 0.34;
const DISPLAY_GRAPH_MAX_VISUAL_SCALE = 1;
const REPORT_IMAGE_FONT_FAMILY = 'Inter, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif';
const REPORT_IMAGE_TITLE_FONT_FAMILY = '"Jua", "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif';
const REPORT_IMAGE_TITLE_FONT_LOAD = '400 72px "Jua"';
const chunkMemory = new Map();
const DEMO_API_NAME = 'HowToGraphDemo';
const DEMO_APP_API_NAME = 'HowToGraphAppDemo';

let idSeed = 1;
function makeId(prefix) {
  idSeed += 1;
  return `${prefix}-${Date.now()}-${idSeed}`;
}

function createDefaultSelfAssessmentAnswers() {
  return SELF_ASSESSMENT_QUESTIONS.reduce((answers, question) => ({
    ...answers,
    [question.id]: ''
  }), {});
}

function hasQueryFlag(name) {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has(name);
  } catch (error) {
    return false;
  }
}

function isDemoModeEnabled() {
  return hasQueryFlag('demo') || hasQueryFlag('recordDemo');
}

function isDemoResetRequested() {
  return hasQueryFlag('demoReset');
}

function getInitialDemoTab() {
  if (!isDemoModeEnabled() || typeof window === 'undefined') return null;
  try {
    const tabId = new URLSearchParams(window.location.search).get('demoTab');
    return TABS.some((tab) => tab.id === tabId) ? tabId : null;
  } catch (error) {
    return null;
  }
}

function createDefaultGraphDrawing(type) {
  return {
    type,
    dividers: [],
    fills: {},
    undoStack: [],
    labels: [],
    arrows: []
  };
}

function createDefaultGraphState() {
  return {
    scale: DEFAULT_GRAPH_SCALE,
    mode: 'divide',
    activeColor: GRAPH_COLORS[0],
    activeType: 'bar',
    bar: createDefaultGraphDrawing('bar'),
    pie: createDefaultGraphDrawing('pie')
  };
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
    graph: createDefaultGraphState()
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
    compareMoreLeftItem: '',
    compareMoreLeftAction: '',
    compareMoreRightItem: '',
    compareMoreRightAction: '',
    compareLessLeftItem: '',
    compareLessLeftAction: '',
    compareLessRightItem: '',
    compareLessRightAction: ''
  };
}

function normalizeInterpretationAnswers(raw) {
  const defaults = createDefaultInterpretationAnswers();
  if (!raw || typeof raw !== 'object') return defaults;
  const answers = Object.keys(defaults).reduce((normalizedAnswers, key) => {
    normalizedAnswers[key] = typeof raw[key] === 'string' ? raw[key] : defaults[key];
    return normalizedAnswers;
  }, { ...defaults });
  const legacyCompareKeys = ['compareLeftItem', 'compareLeftAction', 'compareRightItem', 'compareRightAction'];
  const hasLegacyCompare = legacyCompareKeys.some((key) => typeof raw[key] === 'string' && raw[key]);
  if (hasLegacyCompare) {
    const prefix = raw.compareRelation === '적습니다' ? 'compareLess' : 'compareMore';
    const legacyMap = {
      [`${prefix}LeftItem`]: raw.compareLeftItem,
      [`${prefix}LeftAction`]: raw.compareLeftAction,
      [`${prefix}RightItem`]: raw.compareRightItem,
      [`${prefix}RightAction`]: raw.compareRightAction
    };
    Object.entries(legacyMap).forEach(([key, value]) => {
      if (!answers[key] && typeof value === 'string') answers[key] = value;
    });
  }
  return answers;
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
  return ['paint', 'text', 'arrow'].includes(value) ? value : 'divide';
}

function normalizeGraphType(value, fallback = 'bar') {
  if (value === 'bar' || value === 'pie') return value;
  return fallback === 'pie' ? 'pie' : 'bar';
}

function normalizeOptionalGraphType(value) {
  return value === 'bar' || value === 'pie' ? value : null;
}

function decodeGraphTypeForShare(value) {
  return SHARE_GRAPH_TYPES_BY_CODE[value] || normalizeOptionalGraphType(value);
}

function normalizeGraphDrawing(raw, type) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    type,
    dividers: Array.isArray(source.dividers) ? sanitizeDividers(source.dividers) : [],
    fills: source.fills ? cloneGraphFills(source.fills) : {},
    undoStack: sanitizeGraphUndoStack(source.undoStack),
    labels: sanitizeLabels(source.labels),
    arrows: sanitizeGraphArrows(source.arrows)
  };
}

function normalizeGraphState(raw) {
  const fallback = createDefaultGraphState();
  const source = raw && typeof raw === 'object' ? raw : {};
  const hasSplitGraph = source.bar || source.pie;
  const legacyType = normalizeGraphType(source.type, 'bar');
  const legacyDrawing = normalizeGraphDrawing(source, legacyType);

  return {
    scale: normalizeGraphScale(source.scale),
    mode: normalizeStoredGraphMode(source.mode),
    activeColor: normalizeGraphActiveColor(source.activeColor, fallback.activeColor),
    activeType: normalizeGraphType(source.activeType, 'bar'),
    bar: normalizeGraphDrawing(hasSplitGraph ? source.bar : (legacyType === 'bar' ? legacyDrawing : null), 'bar'),
    pie: normalizeGraphDrawing(hasSplitGraph ? source.pie : (legacyType === 'pie' ? legacyDrawing : null), 'pie')
  };
}

function getGraphDrawing(graph, type) {
  const graphState = normalizeGraphState(graph);
  return type === 'pie' ? graphState.pie : graphState.bar;
}

function getRenderableGraph(graph, type) {
  const graphState = normalizeGraphState(graph);
  const drawing = type === 'pie' ? graphState.pie : graphState.bar;
  return {
    ...drawing,
    type,
    scale: graphState.scale,
    mode: graphState.mode,
    activeColor: graphState.activeColor
  };
}

function getActiveGraphType(graph) {
  return normalizeGraphType(normalizeGraphState(graph).activeType, 'bar');
}

function getGraphTypeLabel(type) {
  return type === 'pie' ? '원그래프' : '띠그래프';
}

function getSharePayloadLabel(payload) {
  if (payload && payload.scope === 'graph') {
    const graphType = normalizeOptionalGraphType(payload.graphType);
    if (graphType) return getGraphTypeLabel(graphType);
  }
  return SHARE_SCOPE_LABELS[payload && payload.scope] || 'QR';
}

function getSharePayloadDescription(payload) {
  const scope = payload && payload.scope;
  if (scope === 'plan') return '계획';
  if (scope === 'table') return '표 그리기';
  if (scope === 'graph') return '그래프 그리기';
  if (scope === 'interpret') return '해석';
  if (scope === 'full') return '전체';
  return 'QR';
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
    graph: normalizeGraphState(raw.graph)
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
  if (!itemsComplete) return 1;
  if (!titleComplete) return 2;
  return 3;
}

function getPlanMaxStep(titleComplete, itemsComplete) {
  if (!itemsComplete) return 1;
  if (!titleComplete) return 2;
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
    fills: cloneGraphFills(graph && graph.fills),
    arrows: sanitizeGraphArrows(graph && graph.arrows)
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
  if (!areGraphFillsEqual(left.fills, right.fills)) return false;
  return areGraphArrowsEqual(left.arrows, right.arrows);
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
      context.font = `700 ${fontSize}px ${fontFamily}`;
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

function getDisplayGraphVisualScale(frameSize) {
  const width = frameSize && Number(frameSize.width);
  if (!Number.isFinite(width) || width <= 0) return DISPLAY_GRAPH_MAX_VISUAL_SCALE;
  return roundLabelMetric(clamp(
    width / REPORT_IMAGE_LOGICAL_WIDTH,
    DISPLAY_GRAPH_MIN_VISUAL_SCALE,
    DISPLAY_GRAPH_MAX_VISUAL_SCALE
  ));
}

function getGraphViewBoxSize(type) {
  return type === 'pie'
    ? { width: 100, height: 100 }
    : BAR_GRAPH_VIEWBOX;
}

function getGraphSvgRectInFrame(type, frameSize, widthRatio, options = {}) {
  const frameWidth = Number(frameSize && frameSize.width);
  const frameHeight = Number(frameSize && frameSize.height);
  if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || frameWidth <= 0 || frameHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const viewBox = getGraphViewBoxSize(type);
  const safeRatio = Number.isFinite(Number(widthRatio)) && Number(widthRatio) > 0 ? Number(widthRatio) : 1;
  let width = frameWidth * safeRatio;
  let height = width * (viewBox.height / viewBox.width);
  const maxHeight = Number.isFinite(Number(options.maxHeightRatio))
    ? frameHeight * Number(options.maxHeightRatio)
    : frameHeight - (Number.isFinite(Number(options.maxHeightInset)) ? Number(options.maxHeightInset) : 0);

  if (Number.isFinite(maxHeight) && maxHeight > 0 && height > maxHeight) {
    height = maxHeight;
    width = height * (viewBox.width / viewBox.height);
  }

  return {
    x: (frameWidth - width) / 2,
    y: (frameHeight - height) / 2,
    width,
    height
  };
}

function getCanonicalGraphEditFrame() {
  return {
    width: REPORT_IMAGE_LOGICAL_WIDTH,
    height: REPORT_IMAGE_LOGICAL_WIDTH / GRAPH_DISPLAY_ASPECT_RATIO
  };
}

function getSourceGraphSvgRect(type) {
  return getGraphSvgRectInFrame(type, getCanonicalGraphEditFrame(), EDIT_GRAPH_DISPLAY_WIDTH_RATIOS[type], {
    maxHeightInset: GRAPH_DISPLAY_MAX_HEIGHT_INSET
  });
}

function getReportPreviewGraphSvgRect(type, frameSize, graph = null) {
  if (graph) {
    return getAdaptiveReportGraphSvgRect(type, frameSize, REPORT_GRAPH_DISPLAY_WIDTH_RATIOS[type], graph, {
      maxHeightInset: GRAPH_DISPLAY_MAX_HEIGHT_INSET
    });
  }
  return getGraphSvgRectInFrame(type, frameSize, REPORT_GRAPH_DISPLAY_WIDTH_RATIOS[type], {
    maxHeightInset: GRAPH_DISPLAY_MAX_HEIGHT_INSET
  });
}

function getReportImageGraphSvgRect(type, frameSize, graph = null) {
  if (graph) {
    return getAdaptiveReportGraphSvgRect(type, frameSize, REPORT_GRAPH_DISPLAY_WIDTH_RATIOS[type], graph, {
      maxHeightRatio: type === 'pie' ? 0.92 : 0.78
    });
  }
  return getGraphSvgRectInFrame(type, frameSize, REPORT_GRAPH_DISPLAY_WIDTH_RATIOS[type], {
    maxHeightRatio: type === 'pie' ? 0.92 : 0.78
  });
}

function getGraphViewBoxBounds(type) {
  const viewBox = getGraphViewBoxSize(type);
  return {
    left: 0,
    top: 0,
    right: viewBox.width,
    bottom: viewBox.height
  };
}

function expandGraphContentBounds(bounds, left, top, right, bottom) {
  if (![left, top, right, bottom].every(Number.isFinite)) return bounds;
  return {
    left: Math.min(bounds.left, left),
    top: Math.min(bounds.top, top),
    right: Math.max(bounds.right, right),
    bottom: Math.max(bounds.bottom, bottom)
  };
}

function getGraphPointInViewBox(type, xPercent, yPercent) {
  const sourceFrame = getCanonicalGraphEditFrame();
  const sourceSvgRect = getSourceGraphSvgRect(type);
  const viewBox = getGraphViewBoxSize(type);
  if (!sourceSvgRect.width || !sourceSvgRect.height) {
    return {
      x: viewBox.width * (normalizeCanvasPercent(xPercent) / 100),
      y: viewBox.height * (normalizeCanvasPercent(yPercent) / 100)
    };
  }

  const sourceX = sourceFrame.width * (normalizeCanvasPercent(xPercent) / 100);
  const sourceY = sourceFrame.height * (normalizeCanvasPercent(yPercent) / 100);
  return {
    x: ((sourceX - sourceSvgRect.x) / sourceSvgRect.width) * viewBox.width,
    y: ((sourceY - sourceSvgRect.y) / sourceSvgRect.height) * viewBox.height
  };
}

function getGraphReportContentBounds(graph, type) {
  const sourceFrame = getCanonicalGraphEditFrame();
  const sourceSvgRect = getSourceGraphSvgRect(type);
  const viewBox = getGraphViewBoxSize(type);
  let bounds = getGraphViewBoxBounds(type);
  if (!sourceSvgRect.width || !sourceSvgRect.height) return bounds;

  const unitPerSourceX = viewBox.width / sourceSvgRect.width;
  const unitPerSourceY = viewBox.height / sourceSvgRect.height;
  const labels = Array.isArray(graph && graph.labels) ? graph.labels : [];
  labels.forEach((rawLabel) => {
    const label = normalizeGraphLabel(rawLabel);
    if (!label.text.trim()) return;

    const sourceWidth = getSafeLabelWidth(label.text, label.fontSize, label.width, null, getCanvasLabelMaxWidth(sourceFrame));
    const sourceHeight = getLabelBoxHeightForText(label.text, label.fontSize, sourceWidth, null);
    const point = getGraphPointInViewBox(type, label.x, label.y);
    const halfWidth = (sourceWidth * unitPerSourceX) / 2;
    const halfHeight = (sourceHeight * unitPerSourceY) / 2;
    bounds = expandGraphContentBounds(
      bounds,
      point.x - halfWidth,
      point.y - halfHeight,
      point.x + halfWidth,
      point.y + halfHeight
    );
  });

  sanitizeGraphArrows(graph && graph.arrows).forEach((arrow) => {
    [getGraphPointInViewBox(type, arrow.x1, arrow.y1), getGraphPointInViewBox(type, arrow.x2, arrow.y2)]
      .forEach((point) => {
        bounds = expandGraphContentBounds(
          bounds,
          point.x - REPORT_GRAPH_ARROW_PADDING_UNITS,
          point.y - REPORT_GRAPH_ARROW_PADDING_UNITS,
          point.x + REPORT_GRAPH_ARROW_PADDING_UNITS,
          point.y + REPORT_GRAPH_ARROW_PADDING_UNITS
        );
      });
  });

  return bounds;
}

function getAdaptiveReportGraphSvgRect(type, frameSize, widthRatio, graph, options = {}) {
  const baseRect = getGraphSvgRectInFrame(type, frameSize, widthRatio, options);
  const frameWidth = Number(frameSize && frameSize.width);
  const frameHeight = Number(frameSize && frameSize.height);
  const viewBox = getGraphViewBoxSize(type);
  if (
    !baseRect.width
    || !baseRect.height
    || !Number.isFinite(frameWidth)
    || !Number.isFinite(frameHeight)
    || frameWidth <= 0
    || frameHeight <= 0
    || !viewBox.width
    || !viewBox.height
  ) {
    return baseRect;
  }

  const bounds = getGraphReportContentBounds(graph, type);
  const contentWidth = Math.max(1, bounds.right - bounds.left);
  const contentHeight = Math.max(1, bounds.bottom - bounds.top);
  const padding = Math.max(0, Number.isFinite(Number(options.contentPadding))
    ? Number(options.contentPadding)
    : REPORT_GRAPH_CONTENT_PADDING);
  const availableWidth = Math.max(1, frameWidth - padding * 2);
  const availableHeight = Math.max(1, frameHeight - padding * 2);
  const baseScale = baseRect.width / viewBox.width;
  const scale = Math.min(
    baseScale,
    availableWidth / contentWidth,
    availableHeight / contentHeight
  );
  if (!Number.isFinite(scale) || scale <= 0) return baseRect;

  const renderedContentWidth = contentWidth * scale;
  const renderedContentHeight = contentHeight * scale;
  return {
    x: padding + (availableWidth - renderedContentWidth) / 2 - bounds.left * scale,
    y: padding + (availableHeight - renderedContentHeight) / 2 - bounds.top * scale,
    width: viewBox.width * scale,
    height: viewBox.height * scale
  };
}

function projectGraphCanvasPoint(type, xPercent, yPercent, targetFrameSize, targetSvgRect) {
  const sourceFrame = getCanonicalGraphEditFrame();
  const sourceSvgRect = getSourceGraphSvgRect(type);
  const targetWidth = Number(targetFrameSize && targetFrameSize.width);
  const targetHeight = Number(targetFrameSize && targetFrameSize.height);
  if (
    !sourceSvgRect.width
    || !sourceSvgRect.height
    || !targetSvgRect
    || !targetSvgRect.width
    || !targetSvgRect.height
    || !Number.isFinite(targetWidth)
    || !Number.isFinite(targetHeight)
    || targetWidth <= 0
    || targetHeight <= 0
  ) {
    return {
      x: targetWidth * (normalizeCanvasPercent(xPercent) / 100),
      y: targetHeight * (normalizeCanvasPercent(yPercent) / 100)
    };
  }

  const sourceX = sourceFrame.width * (normalizeCanvasPercent(xPercent) / 100);
  const sourceY = sourceFrame.height * (normalizeCanvasPercent(yPercent) / 100);
  const relativeX = (sourceX - sourceSvgRect.x) / sourceSvgRect.width;
  const relativeY = (sourceY - sourceSvgRect.y) / sourceSvgRect.height;
  return {
    x: targetSvgRect.x + relativeX * targetSvgRect.width,
    y: targetSvgRect.y + relativeY * targetSvgRect.height
  };
}

function projectGraphCanvasPointPercent(type, xPercent, yPercent, targetFrameSize, targetSvgRect) {
  const targetWidth = Number(targetFrameSize && targetFrameSize.width);
  const targetHeight = Number(targetFrameSize && targetFrameSize.height);
  const projected = projectGraphCanvasPoint(type, xPercent, yPercent, targetFrameSize, targetSvgRect);
  return {
    x: targetWidth > 0 ? (projected.x / targetWidth) * 100 : normalizeCanvasPercent(xPercent),
    y: targetHeight > 0 ? (projected.y / targetHeight) * 100 : normalizeCanvasPercent(yPercent)
  };
}

function getReportGraphObjectScale(type, targetFrameSize, targetSvgRect) {
  const sourceSvgRect = getSourceGraphSvgRect(type);
  if (!sourceSvgRect.width || !targetSvgRect || !targetSvgRect.width) {
    return getDisplayGraphVisualScale(targetFrameSize);
  }
  return roundLabelMetric(clamp(
    targetSvgRect.width / sourceSvgRect.width,
    DISPLAY_GRAPH_MIN_VISUAL_SCALE,
    DISPLAY_GRAPH_MAX_VISUAL_SCALE * 1.6
  ));
}

function getDisplayLabelMetrics(rawLabel, frameSize, options = {}) {
  const label = normalizeGraphLabel(rawLabel);
  const overrideScale = Number(options.visualScale);
  const visualScale = Number.isFinite(overrideScale) && overrideScale > 0
    ? overrideScale
    : getDisplayGraphVisualScale(frameSize);
  const logicalCanvasSize = options.sourceFrameSize || (frameSize && visualScale > 0
    ? { width: frameSize.width / visualScale, height: frameSize.height / visualScale }
    : frameSize);
  const sourceMaxLabelWidth = getCanvasLabelMaxWidth(logicalCanvasSize);
  const sourceLabelWidth = getSafeLabelWidth(label.text, label.fontSize, label.width, null, sourceMaxLabelWidth);
  const sourceLabelHeight = getLabelBoxHeightForText(label.text, label.fontSize, sourceLabelWidth, null);
  return {
    label,
    visualScale,
    labelWidth: roundLabelMetric(sourceLabelWidth * visualScale),
    labelHeight: roundLabelMetric(sourceLabelHeight * visualScale),
    fontSize: roundLabelMetric(label.fontSize * visualScale)
  };
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
      const demoScale = getDemoOverlayScale();
      setSize((currentSize) => {
        const width = roundLabelMetric(rect.width / demoScale);
        const height = roundLabelMetric(rect.height / demoScale);
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

function normalizeCanvasPercent(value, fallback = 50) {
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number : fallback, 0, 100);
}

function getGraphArrowLength(arrow) {
  if (!arrow) return 0;
  return Math.hypot(Number(arrow.x2) - Number(arrow.x1), Number(arrow.y2) - Number(arrow.y1));
}

function normalizeGraphArrow(arrow) {
  const source = arrow && typeof arrow === 'object' ? arrow : {};
  const x1 = normalizeCanvasPercent(source.x1, 50);
  const y1 = normalizeCanvasPercent(source.y1, 50);
  const defaultX2 = x1 > 90 ? x1 - 10 : x1 + 10;
  const x2 = normalizeCanvasPercent(source.x2, defaultX2);
  const y2 = normalizeCanvasPercent(source.y2, y1);
  return {
    id: source.id || makeId('arrow'),
    x1,
    y1,
    x2,
    y2
  };
}

function sanitizeGraphArrows(arrows) {
  if (!Array.isArray(arrows)) return [];
  return arrows
    .map((arrow) => normalizeGraphArrow(arrow))
    .filter((arrow) => getGraphArrowLength(arrow) >= MIN_GRAPH_ARROW_LENGTH)
    .slice(-MAX_GRAPH_ARROWS);
}

function areGraphArrowsEqual(left, right) {
  const leftArrows = sanitizeGraphArrows(left);
  const rightArrows = sanitizeGraphArrows(right);
  if (leftArrows.length !== rightArrows.length) return false;
  return leftArrows.every((arrow, index) => {
    const other = rightArrows[index];
    return arrow.x1 === other.x1
      && arrow.y1 === other.y1
      && arrow.x2 === other.x2
      && arrow.y2 === other.y2;
  });
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

function applyScopedStateImport(currentState, payload, options = {}) {
  if (!payload || typeof payload !== 'object') return normalizeLoadedState(currentState);
  if (payload.scope === 'full') return normalizeLoadedState(payload.state);
  if (payload.scope === 'plan') {
    return normalizeLoadedState({
      ...currentState,
      plan: payload.plan || {}
    });
  }
  if (payload.scope === 'table') {
    return normalizeLoadedState({
      ...currentState,
      table: {
        ...(payload.table || {}),
        tableDefaultsCleared: true
      }
    });
  }
  if (payload.scope === 'graph') {
    const graphType = normalizeOptionalGraphType(payload.graphType);
    if (graphType) {
      const currentGraph = normalizeGraphState(currentState && currentState.graph);
      const incomingGraph = normalizeGraphState(payload.graph);
      const nextGraph = {
        ...currentGraph,
        activeType: graphType,
        [graphType]: getGraphDrawing(incomingGraph, graphType)
      };
      if (!options.preserveGraphSettings) {
        nextGraph.scale = incomingGraph.scale;
        nextGraph.mode = incomingGraph.mode;
        nextGraph.activeColor = incomingGraph.activeColor;
      }
      return normalizeLoadedState({
        ...(currentState || {}),
        graph: nextGraph
      });
    }
    return normalizeLoadedState({
      ...currentState,
      graph: payload.graph || createDefaultGraphState()
    });
  }
  return normalizeLoadedState(currentState);
}

function App() {
  const demoMode = isDemoModeEnabled();
  const [state, setState] = useState(() => {
    try {
      if (isDemoResetRequested()) {
        window.localStorage.removeItem('how-to-graph-state');
        return createDefaultState();
      }
      const hashState = readStateFromHash();
      if (hashState) return hashState;
      const saved = window.localStorage.getItem('how-to-graph-state');
      return saved ? normalizeLoadedState(JSON.parse(saved)) : createDefaultState();
    } catch (error) {
      return createDefaultState();
    }
  });
  const [activeTab, setActiveTab] = useState(() => getInitialDemoTab() || 'plan');
  const [lastPlanStep, setLastPlanStep] = useState(null);
  const [toast, setToast] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selfAssessmentOpen, setSelfAssessmentOpen] = useState(false);
  const [selfAssessmentAnswers, setSelfAssessmentAnswers] = useState(createDefaultSelfAssessmentAnswers);
  const [interpretationAnswers, setInterpretationAnswers] = useState(() => {
    try {
      if (isDemoResetRequested()) {
        window.localStorage.removeItem(INTERPRETATION_STORAGE_KEY);
        return createDefaultInterpretationAnswers();
      }
      const hashAnswers = readInterpretationFromHash();
      if (hashAnswers) return hashAnswers;
      const saved = window.localStorage.getItem(INTERPRETATION_STORAGE_KEY);
      return saved ? normalizeInterpretationAnswers(JSON.parse(saved)) : createDefaultInterpretationAnswers();
    } catch (error) {
      return createDefaultInterpretationAnswers();
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    let frameId = 0;

    function applyAppHeight() {
      if (root.classList.contains(GRAPH_LABEL_KEYBOARD_MODE_CLASS)) return;
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        if (root.classList.contains(GRAPH_LABEL_KEYBOARD_MODE_CLASS)) return;
        const viewportHeight = window.visualViewport && window.visualViewport.height
          ? window.visualViewport.height
          : window.innerHeight;
        if (viewportHeight) root.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
      });
    }

    applyAppHeight();
    window.addEventListener('resize', applyAppHeight);
    window.addEventListener('orientationchange', applyAppHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', applyAppHeight, { passive: true });
      window.visualViewport.addEventListener('scroll', applyAppHeight, { passive: true });
    }

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', applyAppHeight);
      window.removeEventListener('orientationchange', applyAppHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', applyAppHeight);
        window.visualViewport.removeEventListener('scroll', applyAppHeight);
      }
      root.style.removeProperty('--app-height');
      root.style.removeProperty(GRAPH_LABEL_KEYBOARD_PAN_VAR);
      root.classList.remove(GRAPH_LABEL_KEYBOARD_MODE_CLASS);
    };
  }, []);

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

  useEffect(() => {
    if (!demoMode || typeof window === 'undefined') return undefined;
    const api = {
      setGraphAnnotations(type, annotations = {}) {
        const graphType = normalizeGraphType(type, 'bar');
        setState((previous) => {
          const graphState = normalizeGraphState(previous.graph);
          const drawing = getGraphDrawing(graphState, graphType);
          const labels = Array.isArray(annotations.labels)
            ? annotations.labels.map((label) => normalizeGraphLabel({
              id: label.id || makeId('label'),
              text: label.text,
              x: label.x,
              y: label.y,
              width: label.width,
              fontSize: label.fontSize,
              color: label.color,
              manualSize: label.manualSize
            }))
            : drawing.labels;
          const arrows = Array.isArray(annotations.arrows)
            ? sanitizeGraphArrows(annotations.arrows.map((arrow) => ({
              id: arrow.id || makeId('arrow'),
              x1: arrow.x1,
              y1: arrow.y1,
              x2: arrow.x2,
              y2: arrow.y2
            })))
            : drawing.arrows;

          return {
            ...previous,
            graph: normalizeGraphState({
              ...graphState,
              activeType: graphType,
              [graphType]: {
                ...drawing,
                labels,
                arrows,
                type: graphType
              }
            })
          };
        });
      }
    };

    window[DEMO_APP_API_NAME] = api;
    return () => {
      if (window[DEMO_APP_API_NAME] === api) delete window[DEMO_APP_API_NAME];
    };
  }, [demoMode]);

  function patchState(section, patch) {
    setState((previous) => ({
      ...previous,
      [section]: typeof patch === 'function' ? patch(previous[section], previous) : { ...previous[section], ...patch }
    }));
  }

  function patchInterpretationAnswers(patch) {
    setInterpretationAnswers((previous) => normalizeInterpretationAnswers({ ...previous, ...patch }));
  }

  function setSelfAssessmentAnswer(questionId, value) {
    setSelfAssessmentAnswers((previous) => ({
      ...previous,
      [questionId]: value
    }));
  }

  function openSelfAssessment() {
    setShareOpen(false);
    setReportOpen(false);
    setSelfAssessmentOpen(true);
  }

  function closeSelfAssessment() {
    setActiveTab('interpret');
    setSelfAssessmentOpen(false);
  }

  function applyImportedPayload(payload) {
    if (payload.scope === 'interpret') {
      setInterpretationAnswers(normalizeInterpretationAnswers(payload.interpretation));
    } else {
      setState((previous) => applyScopedStateImport(previous, payload, {
        preserveGraphSettings: payload.scope === 'graph' && !!payload.graphType
      }));
      if (payload.scope === 'full' && payload.interpretation) {
        setInterpretationAnswers(normalizeInterpretationAnswers(payload.interpretation));
      }
    }
    setToast(`${getSharePayloadLabel(payload)} 자료를 적용했습니다.`);
    window.setTimeout(() => setToast(''), 2200);
  }

  if (selfAssessmentOpen) {
    return (
      <div className="app-shell is-self-assessment-shell">
        <main className="finish-stage">
          <SelfAssessmentScreen
            answers={selfAssessmentAnswers}
            onAnswerChange={setSelfAssessmentAnswer}
            onBack={closeSelfAssessment}
          />
        </main>

        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="app-shell" data-demo-mode={demoMode ? 'true' : undefined}>
      <div className="navigation-row">
        <nav className="tabbar" aria-label="작업 단계">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'is-active' : ''}`}
                type="button"
                data-demo-id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          {(QR_SHARING_ENABLED || demoMode) && (
            <button className="icon-button qr-nav-button" type="button" data-demo-id="qr-button" onClick={() => setShareOpen(true)} title="QR 보내기 / 받기" aria-label="QR 보내기 / 받기">
              <QrCode size={21} aria-hidden="true" />
            </button>
          )}
        </nav>
      </div>

      <main className="stage">
        <section className="tab-panel" key={activeTab}>
          {activeTab === 'plan' && (
            <PlanWorkspace
              plan={state.plan}
              table={state.table}
              initialStep={lastPlanStep}
              onChange={(patch) => patchState('plan', patch)}
              onTableChange={(patch) => patchState('table', patch)}
              onStepChange={setLastPlanStep}
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
              onFinish={openSelfAssessment}
            />
          )}
        </section>
      </main>

      {(QR_SHARING_ENABLED || demoMode) && shareOpen && (
        <ShareDialog
          state={state}
          activeTab={activeTab}
          interpretationAnswers={interpretationAnswers}
          onClose={() => setShareOpen(false)}
          onImport={applyImportedPayload}
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
      {demoMode && <DemoOverlay />}
    </div>
  );
}

function getDemoOverlayScale() {
  if (typeof window === 'undefined') return 1;
  const value = Number(window.__HOW_TO_GRAPH_DEMO_VIEWPORT_ZOOM);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function DemoOverlay() {
  const clickIdRef = useRef(0);
  const [pointer, setPointer] = useState({ x: 86, y: 86, visible: true, pressed: false, duration: 0 });
  const [clicks, setClicks] = useState([]);
  const [spotlight, setSpotlight] = useState(null);
  const [callout, setCallout] = useState(null);
  const [targetGlow, setTargetGlow] = useState(null);

  useEffect(() => {
    const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, Math.max(0, duration || 0)));
    const toOverlayPoint = (point) => {
      const scale = getDemoOverlayScale();
      return {
        x: point.x / scale,
        y: point.y / scale
      };
    };
    const toOverlayRect = (rect) => {
      if (!rect) return null;
      const scale = getDemoOverlayScale();
      return {
        left: rect.left / scale,
        top: rect.top / scale,
        width: rect.width / scale,
        height: rect.height / scale
      };
    };

    function getTargetRect(target, padding = 10) {
      let element = null;
      if (typeof target === 'string') element = document.querySelector(target);
      if (target && typeof target === 'object' && typeof target.getBoundingClientRect === 'function') element = target;
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const left = clamp(rect.left - padding, 8, window.innerWidth - 16);
      const top = clamp(rect.top - padding, 8, window.innerHeight - 16);
      const right = clamp(rect.right + padding, left + 8, window.innerWidth - 8);
      const bottom = clamp(rect.bottom + padding, top + 8, window.innerHeight - 8);
      return {
        left,
        top,
        width: right - left,
        height: bottom - top
      };
    }

    function getPointFromTarget(target) {
      const rect = getTargetRect(target, 0);
      if (!rect) return null;
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    const api = {
      ready: true,
      async movePointer({ x, y, duration = 360, visible = true }) {
        const point = toOverlayPoint({ x, y });
        setPointer((current) => ({ ...current, ...point, duration, visible }));
        await wait(duration);
      },
      async pointTo({ selector, x, y, duration = 360 }) {
        const point = selector ? getPointFromTarget(selector) : { x, y };
        if (!point) return false;
        await api.movePointer({ ...point, duration });
        return point;
      },
      async clickAt({ x, y, duration = 260 }) {
        const clickId = clickIdRef.current + 1;
        clickIdRef.current = clickId;
        const point = toOverlayPoint({ x, y });
        setPointer((current) => ({ ...current, ...point, visible: true, pressed: true, duration: 80 }));
        setClicks((current) => current.concat({ id: clickId, ...point }));
        window.setTimeout(() => {
          setClicks((current) => current.filter((click) => click.id !== clickId));
        }, 720);
        await wait(120);
        setPointer((current) => ({ ...current, pressed: false, duration: 120 }));
        await wait(duration);
      },
      async clickTarget({ selector, duration = 260 }) {
        const point = getPointFromTarget(selector);
        const rect = getTargetRect(selector, 8);
        if (!point) return false;
        if (rect) setTargetGlow({ ...toOverlayRect(rect), id: clickIdRef.current + 1 });
        await api.movePointer({ ...point, duration: 220 });
        await api.clickAt({ ...point, duration });
        window.setTimeout(() => setTargetGlow(null), 560);
        return point;
      },
      showSpotlight({ selector, rect, title = '', text = '', placement = 'auto', padding = 12, radius = 10, calloutGap, calloutHeight } = {}) {
        const targetRect = rect || getTargetRect(selector, padding);
        const nextRect = toOverlayRect(targetRect);
        setSpotlight(nextRect ? { ...nextRect, radius } : null);
        setCallout(text || title ? { title, text, placement, gap: calloutGap, height: calloutHeight } : null);
        return nextRect;
      },
      setCallout({ title = '', text = '', placement = 'center', calloutGap, calloutHeight } = {}) {
        setCallout(text || title ? { title, text, placement, gap: calloutGap, height: calloutHeight } : null);
      },
      clearSpotlight() {
        setSpotlight(null);
        setCallout(null);
        setTargetGlow(null);
      },
      setPointerVisible(visible) {
        setPointer((current) => ({ ...current, visible: !!visible, duration: 120 }));
      },
      reset() {
        setPointer({ x: 86, y: 86, visible: true, pressed: false, duration: 0 });
        setClicks([]);
        setSpotlight(null);
        setCallout(null);
        setTargetGlow(null);
      }
    };

    window[DEMO_API_NAME] = api;
    return () => {
      if (window[DEMO_API_NAME] === api) delete window[DEMO_API_NAME];
    };
  }, []);

  const calloutStyle = getDemoCalloutStyle(callout, spotlight);

  return (
    <div className="demo-overlay" aria-hidden="true">
      {spotlight && (
        <div
          className="demo-spotlight-frame"
          style={{
            left: `${spotlight.left}px`,
            top: `${spotlight.top}px`,
            width: `${spotlight.width}px`,
            height: `${spotlight.height}px`,
            borderRadius: `${spotlight.radius || 10}px`
          }}
        />
      )}
      {targetGlow && (
        <div
          className="demo-target-glow"
          style={{
            left: `${targetGlow.left}px`,
            top: `${targetGlow.top}px`,
            width: `${targetGlow.width}px`,
            height: `${targetGlow.height}px`
          }}
        />
      )}
      {callout && (
        <div className="demo-callout" style={calloutStyle}>
          {callout.title && <strong>{callout.title}</strong>}
          {callout.text && <span>{callout.text}</span>}
        </div>
      )}
      {clicks.map((click) => (
        <span
          key={click.id}
          className="demo-click-ring"
          style={{ left: `${click.x}px`, top: `${click.y}px` }}
        />
      ))}
      <div
        className={`demo-pointer ${pointer.visible ? 'is-visible' : ''}${pointer.pressed ? ' is-pressed' : ''}`}
        style={{
          left: `${pointer.x}px`,
          top: `${pointer.y}px`,
          transitionDuration: `${pointer.duration}ms`
        }}
      >
        <MousePointer2 size={44} aria-hidden="true" />
        <span className="demo-pointer-dot" />
      </div>
    </div>
  );
}

function getDemoCalloutStyle(callout, spotlight) {
  if (!callout) return undefined;
  const margin = 18;
  const scale = getDemoOverlayScale();
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth / scale;
  const viewportHeight = typeof window === 'undefined' ? 720 : window.innerHeight / scale;
  const width = Math.min(360, Math.max(260, viewportWidth - margin * 2));
  const requestedHeight = Number(callout.height);
  const height = Number.isFinite(requestedHeight) ? Math.max(44, requestedHeight) : 104;
  const placement = callout.placement || 'auto';
  const requestedGap = Number(callout.gap);
  const targetGap = Number.isFinite(requestedGap) ? Math.max(0, requestedGap) : margin;
  let left = (viewportWidth - width) / 2;
  let top = viewportHeight - height - margin;

  if (spotlight && placement !== 'center') {
    const prefersRight = placement === 'right' || (placement === 'auto' && spotlight.left + spotlight.width / 2 < viewportWidth / 2);
    const prefersBottom = placement === 'bottom';
    const prefersTop = placement === 'top';
    if (prefersRight) {
      left = spotlight.left + spotlight.width + targetGap;
      top = spotlight.top + spotlight.height / 2 - height / 2;
    } else if (placement === 'left' || placement === 'auto') {
      left = spotlight.left - width - targetGap;
      top = spotlight.top + spotlight.height / 2 - height / 2;
    }
    if (prefersBottom) {
      left = spotlight.left + spotlight.width / 2 - width / 2;
      top = spotlight.top + spotlight.height + targetGap;
    }
    if (prefersTop) {
      left = spotlight.left + spotlight.width / 2 - width / 2;
      top = spotlight.top - height - targetGap;
    }
  } else if (placement === 'center') {
    top = viewportHeight / 2 - height / 2;
  }

  return {
    left: `${clamp(left, margin, viewportWidth - width - margin)}px`,
    top: `${clamp(top, margin, viewportHeight - height - margin)}px`,
    maxWidth: `${width}px`
  };
}

function PlanWorkspace({
  plan,
  table,
  initialStep,
  onChange,
  onTableChange,
  onStepChange
}) {
  const itemsRef = useRef(null);
  const titleRef = useRef(null);
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

  function summaryText(value, fallback) {
    return value && value.trim() ? value.trim() : fallback;
  }

  return (
    <div className="plan-screen">
      <div className="plan-flow">
        {activeStep === 1 ? (
          <section className="panel-block plan-step is-active" ref={itemsRef}>
            <div className="plan-step-head">
              <span className="plan-step-index">1</span>
              <Table2 size={18} aria-hidden="true" />
              <span>표의 항목 정하기</span>
            </div>
            <div className="plan-items-grid">
              {items.map((item, index) => (
                <div className="plan-item-control" key={index}>
                  <input
                    className="text-input compact plan-item-input"
                    value={item}
                    data-demo-id={`plan-item-${index}`}
                    onChange={(event) => updateItem(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && itemsComplete) goToStep(2, titleRef);
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
                className="plan-add-button"
                type="button"
                data-demo-id="plan-add-item"
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
                data-demo-id="plan-next-items"
                onClick={() => goToStep(2, titleRef)}
                onPointerDown={(event) => {
                  if (!itemsComplete) return;
                  event.preventDefault();
                  goToStep(2, titleRef);
                }}
                onKeyDown={(event) => handleAdvanceKey(event, 2, titleRef)}
                disabled={!itemsComplete}
                title="다음"
                aria-label="다음: 표 이름"
              >
                <span>다음</span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : activeStep < 3 ? (
          <div className="plan-summary-row" ref={itemsRef}>
            <Table2 size={18} aria-hidden="true" />
            <span>{items.map((item, index) => summaryText(item, `항목 ${index + 1}`)).join(', ')}</span>
          </div>
        ) : null}

        {activeStep === 2 && visibleStep >= 2 && (
          <section className="panel-block plan-step is-active" ref={titleRef}>
            <div className="plan-step-head">
              <span className="plan-step-index">2</span>
              <PenLine size={18} aria-hidden="true" />
              <span>표의 이름 정하기</span>
            </div>
            <div className="plan-title-row">
              <input
                className="text-input plan-title-input"
                value={title}
                data-demo-id="plan-title"
                onChange={(event) => updateTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && titleComplete) goToStep(3, planSheetRef);
                }}
                placeholder="표 이름"
                aria-label="표 이름"
              />
              <button
                className="plan-next-button"
                type="button"
                data-demo-id="plan-next-title"
                onClick={() => goToStep(3, planSheetRef)}
                onPointerDown={(event) => {
                  if (!titleComplete) return;
                  event.preventDefault();
                  goToStep(3, planSheetRef);
                }}
                onKeyDown={(event) => handleAdvanceKey(event, 3, planSheetRef)}
                disabled={!titleComplete}
                title="다음"
                aria-label="다음: 자료 정리 계획서"
              >
                <span>다음</span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="plan-step-actions">
              <button
                className="plan-previous-button"
                type="button"
                onClick={() => goToStep(1, itemsRef)}
                title="이전"
                aria-label="이전: 항목"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>이전</span>
              </button>
            </div>
          </section>
        )}

        {activeStep === 3 && visibleStep >= 3 && (
          <section className="panel-block plan-sheet-screen" ref={planSheetRef}>
            <h2 className="plan-sheet-title">&lt;자료 정리 계획서&gt;</h2>
            <div className="plan-sheet-list">
              <div className="plan-sheet-row">
                <Table2 size={18} aria-hidden="true" />
                <span>항목</span>
                <strong>{items.map((item, index) => summaryText(item, `항목 ${index + 1}`)).join(', ')}</strong>
              </div>
              <div className="plan-sheet-row">
                <PenLine size={18} aria-hidden="true" />
                <span>표 이름</span>
                <strong>{summaryText(title, '표 이름')}</strong>
              </div>
            </div>
            <div className="plan-step-actions">
              <button
                className="plan-previous-button"
                type="button"
                onClick={() => goToStep(2, titleRef)}
                title="이전"
                aria-label="이전: 표 이름"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>이전</span>
              </button>
            </div>
          </section>
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
              <th key={cellIndex} className={readOnly ? undefined : 'is-static-cell'}>
                <span className="manual-table-cell-text" data-demo-id={`manual-header-${cellIndex}`}><span>{cell}</span></span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => {
                const cellReadOnly = readOnly || cellIndex === 0;
                const cellClassName = [
                  cellIndex === 0 ? 'title-column-cell' : '',
                  !readOnly && cellReadOnly ? 'is-static-cell' : ''
                ].filter(Boolean).join(' ');
                return (
                  <td key={cellIndex} className={cellClassName || undefined}>
                    {cellReadOnly ? (
                      <span className="manual-table-cell-text" data-demo-id={`manual-cell-text-${rowIndex}-${cellIndex}`}><span>{cell}</span></span>
                    ) : (
                      <input
                        value={cell}
                        onChange={cellReadOnly ? undefined : (event) => onCellChange(rowIndex, cellIndex, event.target.value)}
                        readOnly={cellReadOnly}
                        aria-label={`${rowIndex + 1}행 ${cellIndex + 1}열`}
                        data-demo-id={`manual-cell-${rowIndex}-${cellIndex}`}
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

function makeGraphPresentationSentence(plan, table) {
  const itemCount = getPlanItemCount(plan && plan.items, table && table.headerRow);
  const tableWidth = getTableWidthForItemCount(itemCount);
  const headerRow = buildHeaderRow(plan && plan.items, table && table.headerRow, tableWidth);
  const rows = fitRows(table && table.rows, tableWidth);
  const graphTitle = getPresentationText(plan && plan.title, '(그래프 제목)');
  const items = headerRow
    .slice(1, tableWidth - 1)
    .map((item, index) => getPresentationText(item, `(항목${index + 1})`));
  const total = getPresentationTotalText(rows[0] && rows[0][tableWidth - 1]);

  return `저희 모둠은 우리 반 ${total}명의 학생을 대상으로, ${graphTitle}을 조사하여 그래프로 만들었습니다. ${items.join(', ')}의 ${items.length}개 항목으로 나눠 정리했습니다.`;
}

function getPresentationText(value, fallback) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text || fallback;
}

function getPresentationTotalText(value) {
  const text = getPresentationText(value, '(합계)');
  return text.replace(/\s*명\s*$/, '').trim() || '(합계)';
}

function GraphScaleControl({ scale, onConfirm }) {
  const currentScale = normalizeGraphScale(scale);
  const canDecrease = currentScale > MIN_GRAPH_SCALE;
  const canIncrease = currentScale < MAX_GRAPH_SCALE;

  function changeScale(delta) {
    const nextScale = normalizeGraphScale(currentScale + delta);
    if (nextScale !== currentScale) onConfirm(nextScale);
  }

  return (
    <div className="scale-control">
      <div className="scale-control-top">
        <span>눈금 크기</span>
        <div className="scale-stepper" role="group" aria-label={`눈금 크기 ${currentScale}%`}>
          <button
            className="scale-step-button"
            type="button"
            data-demo-id="scale-decrease"
            onClick={() => changeScale(-1)}
            disabled={!canDecrease}
            title="눈금 줄이기"
            aria-label="눈금 줄이기"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <output className="scale-value" aria-live="polite">{currentScale}%</output>
          <button
            className="scale-step-button"
            type="button"
            data-demo-id="scale-increase"
            onClick={() => changeScale(1)}
            disabled={!canIncrease}
            title="눈금 키우기"
            aria-label="눈금 키우기"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
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

  async function saveReportImage() {
    if (saving) return;
    setSaving(true);
    setMessage('');

    try {
      // iOS Safari can block share/window fallbacks if an await consumes the tap activation.
      if (!isIosSafari()) await ensureReportFontsReady();
      const image = makeReportImage({ title, headerRow, rows, tableWidth, graph });
      const nextMessage = await saveReportImageFile(image);
      if (nextMessage) setMessage(nextMessage);
    } catch (error) {
      setMessage('이미지를 만들지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop report-backdrop" role="presentation">
      <div className="report-dialog" role="dialog" aria-modal="true" aria-label="최종 보고서">
        <div className="report-toolbar">
          <button className="icon-text-button report-save-button" type="button" data-demo-id="report-save" onClick={saveReportImage} disabled={saving}>
            <Download size={18} aria-hidden="true" />
            <span>{saving ? '준비 중' : '이미지 저장'}</span>
          </button>
          <button className="icon-button" type="button" data-demo-id="report-close" onClick={onClose} title="닫기" aria-label="닫기">
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
  return (
    <div className="report-graph-frame" aria-label="보고서 그래프">
      {GRAPH_DISPLAY_TYPES.map((type) => (
        <ReportGraphCanvas key={type} graph={graph} type={type} />
      ))}
    </div>
  );
}

function ReportGraphCanvas({ graph, type }) {
  const [frameRef, frameSize] = useElementSize();
  const renderGraph = getRenderableGraph(graph, type);
  const segments = getSegments(renderGraph.dividers);
  const targetSvgRect = getReportPreviewGraphSvgRect(type, frameSize, renderGraph);
  const visualScale = getReportGraphObjectScale(type, frameSize, targetSvgRect);
  const sourceFrameSize = getCanonicalGraphEditFrame();
  const projectReportPoint = (x, y) => projectGraphCanvasPointPercent(type, x, y, frameSize, targetSvgRect);

  return (
    <div className={`report-graph-canvas is-${type}`} ref={frameRef} aria-label={getGraphTypeLabel(type)}>
      <SingleGraphDisplay graph={renderGraph} segments={segments} svgRect={targetSvgRect} />
      <GraphArrowLayer arrows={renderGraph.arrows} visualScale={visualScale} pointProjector={projectReportPoint} />
      {(Array.isArray(renderGraph.labels) ? renderGraph.labels : []).map((rawLabel) => {
        const {
          label,
          labelWidth,
          labelHeight,
          fontSize
        } = getDisplayLabelMetrics(rawLabel, frameSize, { visualScale, sourceFrameSize });
        const projectedLabel = projectReportPoint(label.x, label.y);
        if (!label.text.trim()) return null;
        return (
          <div
            key={label.id}
            className="graph-label-frame report-label-frame"
            style={{
              left: `clamp(${labelWidth / 2}px, ${projectedLabel.x}%, calc(100% - ${labelWidth / 2}px))`,
              top: `clamp(${labelHeight / 2}px, ${projectedLabel.y}%, calc(100% - ${labelHeight / 2}px))`,
              minWidth: `${labelWidth}px`,
              width: `${labelWidth}px`,
              height: `${labelHeight}px`
            }}
          >
            <div
              className="graph-floating-label report-floating-label"
              style={{
                color: label.color,
                fontSize: `${fontSize}px`,
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

  const imageBounds = drawReportImage(context, report);
  const outputCanvas = cropReportImageCanvas(canvas, imageBounds);
  const dataUrl = outputCanvas.toDataURL('image/png');
  return {
    dataUrl,
    blob: dataUrlToBlob(dataUrl),
    fileName: makeReportFileName(report.title),
    title: report.title || '그래프 보고서'
  };
}

async function ensureReportFontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await document.fonts.load(REPORT_IMAGE_TITLE_FONT_LOAD);
    await document.fonts.ready;
  } catch {
    // The report still saves with the fallback font if the web font is unavailable.
  }
}

function drawReportImage(context, report) {
  const titleRect = {
    x: REPORT_IMAGE_MARGIN,
    y: 42,
    width: REPORT_IMAGE_WIDTH - REPORT_IMAGE_MARGIN * 2,
    height: 112
  };
  const tableRect = {
    x: REPORT_IMAGE_MARGIN,
    y: 176,
    width: REPORT_IMAGE_WIDTH - REPORT_IMAGE_MARGIN * 2,
    height: 186
  };
  const graphRect = {
    x: REPORT_IMAGE_MARGIN,
    y: tableRect.y + tableRect.height + 14,
    width: REPORT_IMAGE_WIDTH - REPORT_IMAGE_MARGIN * 2,
    height: REPORT_IMAGE_HEIGHT - (tableRect.y + tableRect.height + 14) - REPORT_IMAGE_MARGIN
  };
  const graphLayout = getReportImageGraphLayout(graphRect);

  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, REPORT_IMAGE_WIDTH, REPORT_IMAGE_HEIGHT);
  drawCanvasTextBox(context, report.title || '최종 보고서', titleRect, {
    align: 'center',
    fontSize: 76,
    minFontSize: 44,
    weight: 700,
    fontFamily: REPORT_IMAGE_TITLE_FONT_FAMILY,
    maxLines: 2
  });
  drawReportImageTable(context, report.headerRow, report.rows, tableRect);
  drawReportImageGraph(context, report.graph, graphRect, graphLayout);
  context.restore();
  return {
    bottom: Math.max(
      titleRect.y + titleRect.height,
      tableRect.y + tableRect.height,
      getReportImageGraphLayoutBottom(graphLayout)
    )
  };
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
        weight: isHeader || cellIndex === 0 ? 600 : 400,
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

function drawReportImageGraph(context, graph, rect, layout = getReportImageGraphLayout(rect)) {
  const safeGraph = graph || {};
  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(rect.x, rect.y, rect.width, rect.height);

  layout.forEach(({ type, graphRect }) => {
    drawReportImageSingleGraph(context, safeGraph, type, graphRect);
  });
  context.restore();
}

function getReportImageGraphLayoutBottom(layout) {
  if (!Array.isArray(layout) || layout.length === 0) return 0;
  return layout.reduce((bottom, item) => {
    const rect = item && item.graphRect;
    if (!rect) return bottom;
    const nextBottom = Number(rect.y) + Number(rect.height);
    return Number.isFinite(nextBottom) ? Math.max(bottom, nextBottom) : bottom;
  }, 0);
}

function cropReportImageCanvas(sourceCanvas, bounds) {
  const cropHeight = Math.max(
    1,
    Math.min(sourceCanvas.height, Math.ceil(Number(bounds && bounds.bottom) || sourceCanvas.height))
  );
  if (cropHeight >= sourceCanvas.height) return sourceCanvas;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = sourceCanvas.width;
  outputCanvas.height = cropHeight;
  const context = outputCanvas.getContext('2d');
  if (!context) return sourceCanvas;
  context.drawImage(sourceCanvas, 0, 0);
  return outputCanvas;
}

function getReportImageGraphLayout(rect) {
  const pieSize = Math.min(rect.height * 0.76, rect.width * 0.39);
  const barWidth = Math.min(rect.width * 0.58, rect.width - pieSize * 0.55);
  const barHeight = Math.min(rect.height * 0.62, barWidth / GRAPH_DISPLAY_ASPECT_RATIO);
  const overlap = Math.min(REPORT_IMAGE_GRAPH_OVERLAP, pieSize * 0.08);
  const totalWidth = barWidth + pieSize - overlap;
  const startX = rect.x + Math.max(0, (rect.width - totalWidth) / 2);
  return [
    {
      type: 'bar',
      graphRect: {
        x: startX,
        y: rect.y,
        width: barWidth,
        height: barHeight
      }
    },
    {
      type: 'pie',
      graphRect: {
        x: startX + barWidth - overlap,
        y: rect.y,
        width: pieSize,
        height: pieSize
      }
    }
  ];
}

function drawReportImageSingleGraph(context, graph, type, rect) {
  const renderGraph = getRenderableGraph(graph, type);
  const segments = getSegments(renderGraph.dividers);
  const targetSvgRect = getReportImageGraphSvgRect(type, rect, renderGraph);
  if (type === 'pie') {
    drawReportPieImage(context, renderGraph, segments, rect, targetSvgRect);
  } else {
    drawReportBarImage(context, renderGraph, segments, rect, targetSvgRect);
  }
  drawReportImageArrows(context, renderGraph, rect, targetSvgRect);
  drawReportImageLabels(context, renderGraph, rect, targetSvgRect);
}

function fitAspectRect(rect, aspectRatio) {
  let width = rect.width;
  let height = width / aspectRatio;
  if (height > rect.height) {
    height = rect.height;
    width = height * aspectRatio;
  }
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height
  };
}

function drawReportBarImage(context, graph, segments, rect, targetSvgRect = getReportImageGraphSvgRect('bar', rect, graph)) {
  const scale = targetSvgRect.width / BAR_GRAPH_VIEWBOX.width;
  const originX = rect.x + targetSvgRect.x;
  const originY = rect.y + targetSvgRect.y;
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
    drawCanvasLine(context, x, viewY(BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + 0.7), x, viewY(BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + 2.8), '#aebaca', 1.6);
  });
  labelTicks.forEach((tick) => {
    const x = barX(tick);
    drawCanvasLine(context, x, viewY(BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + 0.6), x, viewY(BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + 4.2), '#52606f', 2);
    setReportCanvasFont(context, 3.1 * scale, 600);
    context.fillStyle = '#52606f';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${tick}%`, x, viewY(33));
  });
  sanitizeDividers(graph.dividers).forEach((divider) => {
    drawCanvasLine(context, barX(divider), box.y, barX(divider), box.y + box.height, '#1f2d3d', 2.4);
  });
}

function drawReportPieImage(context, graph, segments, rect, targetSvgRect = getReportImageGraphSvgRect('pie', rect, graph)) {
  const scale = targetSvgRect.width / 100;
  const centerX = rect.x + targetSvgRect.x + targetSvgRect.width / 2;
  const centerY = rect.y + targetSvgRect.y + targetSvgRect.height / 2;
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
    setReportCanvasFont(context, 4 * scale, 600);
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

function drawReportImageLabels(context, graph, rect, targetSvgRect = getReportImageGraphSvgRect(graph.type, rect, graph)) {
  const frameSize = { width: rect.width, height: rect.height };
  const labelScale = getReportGraphObjectScale(graph.type, frameSize, targetSvgRect);
  const sourceFrameSize = getCanonicalGraphEditFrame();
  const labels = Array.isArray(graph.labels) ? graph.labels : [];
  labels.forEach((rawLabel) => {
    const label = normalizeGraphLabel(rawLabel);
    if (!label.text.trim()) return;

    const sourceWidth = getSafeLabelWidth(label.text, label.fontSize, label.width, null, getCanvasLabelMaxWidth(sourceFrameSize));
    const sourceHeight = getLabelBoxHeightForText(label.text, label.fontSize, sourceWidth, null);
    const labelWidth = sourceWidth * labelScale;
    const labelHeight = sourceHeight * labelScale;
    const projectedLabel = projectGraphCanvasPoint(graph.type, label.x, label.y, frameSize, targetSvgRect);
    const centerX = rect.x + projectedLabel.x;
    const centerY = rect.y + projectedLabel.y;
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
      weight: 500,
      lineHeight: LABEL_LINE_HEIGHT,
      maxLines: Math.max(1, Math.floor(labelHeight / (label.fontSize * labelScale * LABEL_LINE_HEIGHT)))
    });
    context.restore();
  });
}

function drawReportImageArrows(context, graph, rect, targetSvgRect = getReportImageGraphSvgRect(graph.type, rect, graph)) {
  const frameSize = { width: rect.width, height: rect.height };
  const visualScale = getReportGraphObjectScale(graph.type, frameSize, targetSvgRect);
  sanitizeGraphArrows(graph.arrows).forEach((arrow) => {
    const start = projectGraphCanvasPoint(graph.type, arrow.x1, arrow.y1, frameSize, targetSvgRect);
    const end = projectGraphCanvasPoint(graph.type, arrow.x2, arrow.y2, frameSize, targetSvgRect);
    drawCanvasArrow(
      context,
      rect.x + start.x,
      rect.y + start.y,
      rect.x + end.x,
      rect.y + end.y,
      visualScale
    );
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
  const weight = options.weight || 700;
  const align = options.align || 'center';
  const lineHeightRatio = options.lineHeight || 1.18;
  const explicitMaxLines = options.maxLines || null;
  let fontSize = maxFontSize;
  let lines = [];

  for (; fontSize >= minFontSize; fontSize -= 1) {
    setReportCanvasFont(context, fontSize, weight, options.fontFamily);
    const lineHeight = fontSize * lineHeightRatio;
    const maxLines = explicitMaxLines || Math.max(1, Math.floor(rect.height / lineHeight));
    const wrapped = wrapCanvasText(context, cleanText, rect.width);
    if (wrapped.length <= maxLines && wrapped.length * lineHeight <= rect.height + 0.5) {
      lines = wrapped;
      break;
    }
  }

  fontSize = Math.max(fontSize, minFontSize);
  setReportCanvasFont(context, fontSize, weight, options.fontFamily);
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

function setReportCanvasFont(context, fontSize, weight, fontFamily = REPORT_IMAGE_FONT_FAMILY) {
  context.font = `${weight} ${fontSize}px ${fontFamily}`;
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

function drawCanvasArrow(context, x1, y1, x2, y2, visualScale = 1) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const arrowScale = Number.isFinite(Number(visualScale)) && Number(visualScale) > 0 ? Number(visualScale) : 1;

  context.save();
  context.translate(x1, y1);
  context.rotate(Math.atan2(dy, dx));

  const outlineHeadLength = clamp(length * 0.34, 18 * arrowScale, 32 * arrowScale);
  const fillHeadLength = Math.max(12 * arrowScale, outlineHeadLength - 7 * arrowScale);
  drawCanvasHorizontalArrow(context, length, GRAPH_ARROW_OUTLINE_COLOR, 10 * arrowScale, outlineHeadLength, 13 * arrowScale);
  drawCanvasHorizontalArrow(context, length, GRAPH_LINE_COLOR, 4.8 * arrowScale, fillHeadLength, 6.5 * arrowScale);
  context.restore();
}

function drawCanvasHorizontalArrow(context, length, color, lineWidth, headLength, headHalfHeight) {
  const headBase = Math.max(0, length - headLength);
  const shaftEnd = Math.max(0, length - headLength * 0.58);

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(shaftEnd, 0);
  context.stroke();
  context.beginPath();
  context.moveTo(length, 0);
  context.lineTo(headBase, -headHalfHeight);
  context.lineTo(headBase, headHalfHeight);
  context.closePath();
  context.fill();
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

  if (isDemoModeEnabled()) {
    return downloadDataUrl(dataUrl, fileName)
      ? '이미지 파일을 저장했습니다.'
      : '이미지를 열지 못했습니다.';
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
  const graphState = normalizeGraphState(graph);
  const activeType = normalizeGraphType(graphState.activeType, 'bar');
  const activeDrawing = getGraphDrawing(graphState, activeType);
  const activeRenderGraph = getRenderableGraph(graphState, activeType);
  const activeGraphLabel = getGraphTypeLabel(activeType);
  const canUndoGraphAction = Array.isArray(activeDrawing.undoStack) && activeDrawing.undoStack.length > 0;
  const presentationSentence = makeGraphPresentationSentence(plan, table);
  const demoMode = isDemoModeEnabled();

  function setGraph(patch) {
    onChange((currentGraph) => {
      const currentState = normalizeGraphState(currentGraph);
      const nextPatch = typeof patch === 'function' ? patch(currentState) : patch;
      return normalizeGraphState({ ...currentState, ...nextPatch });
    });
  }

  function updateGraphDrawing(type, patch) {
    setGraph((currentGraph) => {
      const drawing = getGraphDrawing(currentGraph, type);
      const nextPatch = typeof patch === 'function' ? patch(drawing, currentGraph) : patch;
      return {
        activeType: type,
        [type]: {
          ...drawing,
          ...nextPatch,
          type
        }
      };
    });
  }

  function handleGraphPoint(type, point, options = {}) {
    if ((graphState.mode === 'divide' || graphState.mode === 'paint') && !point.insideGraph) return;

    if (graphState.mode === 'divide') {
      updateGraphDrawing(type, (currentDrawing, currentGraph) => {
        const renderGraph = { ...currentDrawing, scale: currentGraph.scale, mode: currentGraph.mode, activeColor: currentGraph.activeColor };
        const snapped = getSnappedDividerValue(renderGraph, point);
        const currentDividers = Array.isArray(currentDrawing.dividers) ? currentDrawing.dividers : [];
        const hasDivider = currentDividers.indexOf(snapped) !== -1;
        const dividers = hasDivider
          ? currentDividers.filter((value) => value !== snapped)
          : sanitizeDividers(currentDividers.concat(snapped));
        return withGraphUndo(currentDrawing, { dividers });
      });
      return;
    }

    if (graphState.mode === 'paint') {
      updateGraphDrawing(type, (currentDrawing, currentGraph) => {
        const renderGraph = { ...currentDrawing, scale: currentGraph.scale, mode: currentGraph.mode, activeColor: currentGraph.activeColor };
        const currentSegments = getSegments(currentDrawing.dividers);
        const segment = findSegmentFromPoint(renderGraph, currentSegments, point);
        if (!segment) return {};
        const activeColor = normalizeGraphActiveColor(currentGraph.activeColor);
        if (activeColor === GRAPH_ERASER_COLOR) {
          if (!currentDrawing.fills || !currentDrawing.fills[segment.key]) return {};
          const fills = cloneGraphFills(currentDrawing.fills);
          delete fills[segment.key];
          return withGraphUndo(currentDrawing, { fills });
        }
        if (currentDrawing.fills && currentDrawing.fills[segment.key] === activeColor) return {};
        return withGraphUndo(currentDrawing, {
          fills: { ...cloneGraphFills(currentDrawing.fills), [segment.key]: activeColor }
        });
      });
      return;
    }

    if (graphState.mode !== 'text') return;

    const labelId = options && options.labelId ? options.labelId : makeId('label');
    updateGraphDrawing(type, (currentDrawing) => ({
      labels: currentDrawing.labels.concat({
        id: labelId,
        text: '',
        x: point.canvasX,
        y: point.canvasY,
        width: DEFAULT_LABEL_WIDTH,
        fontSize: DEFAULT_LABEL_FONT_SIZE,
        color: LABEL_COLORS[0]
      })
    }));
  }

  function addArrow(type, startPoint, endPoint) {
    updateGraphDrawing(type, (currentDrawing) => {
      const arrow = normalizeGraphArrow({
        id: makeId('arrow'),
        x1: startPoint.canvasX,
        y1: startPoint.canvasY,
        x2: endPoint.canvasX,
        y2: endPoint.canvasY
      });
      if (getGraphArrowLength(arrow) < MIN_GRAPH_ARROW_LENGTH) return {};
      return withGraphUndo(currentDrawing, {
        arrows: sanitizeGraphArrows((currentDrawing.arrows || []).concat(arrow))
      });
    });
  }

  function undoGraphAction() {
    if (!canUndoGraphAction) return;
    updateGraphDrawing(activeType, (currentDrawing) => {
      const undoStack = sanitizeGraphUndoStack(currentDrawing.undoStack);
      const previousSnapshot = undoStack[undoStack.length - 1];
      if (!previousSnapshot) return {};
      return {
        dividers: previousSnapshot.dividers.slice(),
        fills: { ...previousSnapshot.fills },
        arrows: sanitizeGraphArrows(previousSnapshot.arrows),
        undoStack: undoStack.slice(0, -1)
      };
    });
  }

  function updateLabel(type, labelId, patch) {
    updateGraphDrawing(type, (currentDrawing) => ({
      labels: currentDrawing.labels.map((label) => (label.id === labelId ? { ...label, ...patch } : label))
    }));
  }

  function removeLabel(type, labelId) {
    updateGraphDrawing(type, (currentDrawing) => ({
      labels: currentDrawing.labels.filter((label) => label.id !== labelId)
    }));
  }

  function updateArrow(type, arrowId, patch) {
    updateGraphDrawing(type, (currentDrawing) => ({
      arrows: sanitizeGraphArrows((currentDrawing.arrows || []).map((arrow) => (
        arrow.id === arrowId ? { ...arrow, ...patch, id: arrow.id } : arrow
      )))
    }));
  }

  function removeArrow(type, arrowId) {
    updateGraphDrawing(type, (currentDrawing) => ({
      arrows: (currentDrawing.arrows || []).filter((arrow) => arrow.id !== arrowId)
    }));
  }

  function resetGraph() {
    if (window.confirm('두 그래프에 그린 선, 색, 글자를 모두 지울까요?')) {
      setGraph({
        bar: createDefaultGraphDrawing('bar'),
        pie: createDefaultGraphDrawing('pie')
      });
    }
  }

  return (
    <div className="graph-workspace">
      <GraphTablePreview plan={plan} table={table} />

      <div className="workspace-grid graph-layout">
        <aside className="tool-rail">
          <SectionTitle icon={PieChart} title="그래프 종류" />
          <SegmentedControl
            className="graph-type-control"
            value={activeType}
            onChange={(value) => setGraph({ activeType: value })}
            items={[
              { value: 'bar', label: '띠그래프', icon: RectangleHorizontal },
              { value: 'pie', label: '원그래프', icon: Circle }
            ]}
          />

          {demoMode && (
            <GraphScaleControl
              scale={graphState.scale}
              onConfirm={(nextScale) => {
                if (nextScale !== normalizeGraphScale(graphState.scale)) {
                  setGraph({ scale: nextScale });
                }
              }}
            />
          )}

          <SectionTitle icon={MousePointer2} title="작업 모드" />
          <SegmentedControl
            className="graph-mode-control"
            value={graphState.mode}
            onChange={(value) => setGraph({ mode: value })}
            items={[
              { value: 'divide', label: '나누기', icon: PenLine },
              { value: 'paint', label: '색칠하기', icon: PaintBucket },
              { value: 'text', label: '글자', icon: ALargeSmall },
              { value: 'arrow', label: '화살표', icon: ArrowUpRight }
            ]}
          />

          {graphState.mode === 'paint' && (
            <div className="swatch-block graph-swatches" aria-label="그래프 색">
              {GRAPH_COLORS.map((color, index) => (
                <button
                  key={color}
                  type="button"
                  className={`swatch ${graphState.activeColor === color ? 'is-active' : ''}`}
                  style={{ backgroundColor: color }}
                  data-demo-id={`graph-color-${index}`}
                  onClick={() => setGraph({ activeColor: color })}
                  title="색 선택"
                  aria-label="색 선택"
                />
              ))}
              <button
                type="button"
                className={`swatch is-eraser ${graphState.activeColor === GRAPH_ERASER_COLOR ? 'is-active' : ''}`}
                style={{ backgroundColor: GRAPH_ERASER_COLOR }}
                data-demo-id="graph-color-eraser"
                onClick={() => setGraph({ activeColor: GRAPH_ERASER_COLOR })}
                title="색 지우개"
                aria-label="색 지우개"
              >
                <Eraser size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="graph-action-row">
            <button className="icon-text-button secondary graph-action-button" type="button" data-demo-id="graph-undo" onClick={undoGraphAction} disabled={!canUndoGraphAction} title="실행 취소">
              <Undo2 size={17} aria-hidden="true" />
              <span>실행 취소</span>
            </button>
            <button className="icon-text-button secondary graph-action-button" type="button" data-demo-id="graph-reset" onClick={resetGraph} title="그래프 지우기">
              <Eraser size={17} aria-hidden="true" />
              <span>초기화</span>
            </button>
          </div>

          <button className="icon-text-button graph-report-button" type="button" data-demo-id="graph-report" onClick={onOpenReport}>
            <FileText size={18} aria-hidden="true" />
            <span>보고서 이미지</span>
          </button>
          <a
            className="icon-text-button graph-share-button"
            data-demo-id="graph-share-link"
            href="https://b.tkbell.co.kr/tkboard/woi/1277778/nk4z42ORf8.do?pageSeq=2431822"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 size={18} aria-hidden="true" />
            <span>공유하기</span>
          </a>
        </aside>

        <div className="graph-main">
          <div className="graph-canvas-grid">
            <div className={`graph-canvas-panel is-${activeType}`}>
              <span className="graph-canvas-label">{activeGraphLabel}</span>
              <GraphCanvas
                graph={activeRenderGraph}
                segments={getSegments(activeRenderGraph.dividers)}
                onActivate={() => setGraph({ activeType })}
                onPoint={(point, options) => handleGraphPoint(activeType, point, options)}
                onArrowAdd={(startPoint, endPoint) => addArrow(activeType, startPoint, endPoint)}
                onArrowChange={(arrowId, patch) => updateArrow(activeType, arrowId, patch)}
                onArrowRemove={(arrowId) => removeArrow(activeType, arrowId)}
                onLabelChange={(labelId, patch) => updateLabel(activeType, labelId, patch)}
                onLabelRemove={(labelId) => removeLabel(activeType, labelId)}
              />
            </div>
          </div>
        </div>
      </div>

      <section className="graph-presentation-bar" aria-label="발표 문장" aria-live="polite">
        <span className="graph-presentation-label">
          <Megaphone size={17} aria-hidden="true" />
          <span>발표 문장</span>
        </span>
        <p className="graph-presentation-text">{presentationSentence}</p>
      </section>
    </div>
  );
}

function InterpretationWorkspace({ graph, answers, onAnswerChange, onFinish }) {
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
            <span>가장 많은 학생이 좋아하는</span>
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
            <span>가장 적은 학생이 좋아하는</span>
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
              value={currentAnswers.compareMoreLeftItem}
              onChange={(value) => setAnswer('compareMoreLeftItem', value)}
              label="3번 첫 번째 항목"
            />
            <span>을 좋아하는 학생은</span>
            <SentenceBlank
              value={currentAnswers.compareMoreRightItem}
              onChange={(value) => setAnswer('compareMoreRightItem', value)}
              label="3번 두 번째 항목"
            />
            <span>을 좋아하는 학생보다</span>
            <span>많습니다.</span>
          </li>

          <li className="interpret-sentence">
            <span className="sentence-number">4</span>
            <SentenceBlank
              value={currentAnswers.compareLessLeftItem}
              onChange={(value) => setAnswer('compareLessLeftItem', value)}
              label="4번 첫 번째 항목"
            />
            <span>을 좋아하는 학생은</span>
            <SentenceBlank
              value={currentAnswers.compareLessRightItem}
              onChange={(value) => setAnswer('compareLessRightItem', value)}
              label="4번 두 번째 항목"
            />
            <span>을 좋아하는 학생보다</span>
            <span>적습니다.</span>
          </li>
        </ol>

        <div className="interpret-finish-row">
          <button className="icon-text-button interpret-finish-button" type="button" onClick={onFinish}>
            <ChevronRight size={18} aria-hidden="true" />
            <span>수업 마무리하기</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function SelfAssessmentScreen({ answers, onAnswerChange, onBack }) {
  const currentAnswers = {
    ...createDefaultSelfAssessmentAnswers(),
    ...(answers && typeof answers === 'object' ? answers : {})
  };

  return (
    <div className="self-assessment-screen">
      <div className="self-assessment-actions">
        <button className="icon-text-button secondary self-assessment-back-button" type="button" onClick={onBack}>
          <ChevronLeft size={18} aria-hidden="true" />
          <span>이전</span>
        </button>
      </div>

      <form className="self-assessment-form" aria-label="수업 마무리 자기평가" onSubmit={(event) => event.preventDefault()}>
        <table className="self-assessment-table">
          <colgroup>
            <col className="self-assessment-question-col" />
            {SELF_ASSESSMENT_OPTIONS.map((option) => (
              <col key={option.id} className="self-assessment-choice-col" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col">질문</th>
              {SELF_ASSESSMENT_OPTIONS.map((option) => (
                <th key={option.id} scope="col">{option.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SELF_ASSESSMENT_QUESTIONS.map((question, index) => (
              <tr key={question.id}>
                <th scope="row">
                  <span className="self-assessment-number">{index + 1}</span>
                  <span>{question.text}</span>
                </th>
                {SELF_ASSESSMENT_OPTIONS.map((option) => (
                  <td key={option.id}>
                    <label className={`self-assessment-option ${currentAnswers[question.id] === option.id ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name={`self-assessment-${question.id}`}
                        value={option.id}
                        checked={currentAnswers[question.id] === option.id}
                        onChange={() => onAnswerChange(question.id, option.id)}
                      />
                      <span>{option.label}</span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </form>
    </div>
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
        data-demo-id={`sentence-blank-${label.replace(/\s+/g, '-')}`}
        inputMode={inputMode}
        autoComplete="off"
      />
    </span>
  );
}

function StaticGraphCanvas({ graph }) {
  return (
    <div className="static-graph-stack" aria-label="해석할 그래프">
      {GRAPH_DISPLAY_TYPES.map((type) => (
        <StaticSingleGraphCanvas key={type} graph={graph} type={type} />
      ))}
    </div>
  );
}

function StaticSingleGraphCanvas({ graph, type }) {
  const [frameRef, frameSize] = useElementSize();
  const renderGraph = getRenderableGraph(graph, type);
  const segments = getSegments(renderGraph.dividers);
  const visualScale = getDisplayGraphVisualScale(frameSize);

  return (
    <div className={`static-graph-canvas is-${type}`} ref={frameRef} aria-label={getGraphTypeLabel(type)}>
      <SingleGraphDisplay graph={renderGraph} segments={segments} />
      <GraphArrowLayer arrows={renderGraph.arrows} visualScale={visualScale} />
      {(Array.isArray(renderGraph.labels) ? renderGraph.labels : []).map((rawLabel) => {
        const {
          label,
          labelWidth,
          labelHeight,
          fontSize
        } = getDisplayLabelMetrics(rawLabel, frameSize);
        if (!label.text.trim()) return null;
        return (
          <div
            key={label.id}
            className="static-graph-label-frame"
            style={{
              left: `clamp(${labelWidth / 2}px, ${label.x}%, calc(100% - ${labelWidth / 2}px))`,
              top: `clamp(${labelHeight / 2}px, ${label.y}%, calc(100% - ${labelHeight / 2}px))`,
              minWidth: `${labelWidth}px`,
              width: `${labelWidth}px`,
              height: `${labelHeight}px`
            }}
          >
            <div
              className="static-graph-label"
              style={{
                color: label.color,
                fontSize: `${fontSize}px`,
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

const GraphCanvas = React.forwardRef(function GraphCanvas({ graph, segments, onActivate, onPoint, onArrowAdd, onArrowChange, onArrowRemove, onLabelChange, onLabelRemove }, ref) {
  const canvasElementRef = useRef(null);
  const activeDividerDragRef = useRef(null);
  const activeArrowDragRef = useRef(null);
  const arrowActionRef = useRef(null);
  const labelActionRef = useRef(null);
  const labelInputRefs = useRef(new Map());
  const onArrowChangeRef = useRef(onArrowChange);
  const onLabelChangeRef = useRef(onLabelChange);
  const previousArrowIds = useRef(new Set(graph.arrows.map((arrow) => arrow.id)));
  const previousLabelIds = useRef(new Set(graph.labels.map((label) => label.id)));
  const [hoverPoint, setHoverPoint] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedArrowId, setSelectedArrowId] = useState(null);
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [dividerDragInput, setDividerDragInput] = useState(null);
  const [previewArrow, setPreviewArrow] = useState(null);
  const previewDivider = hoverPoint && hoverPoint.insideGraph && graph.mode === 'divide'
    ? getSnappedDividerValue(graph, hoverPoint)
    : null;
  const previewSegment = hoverPoint && hoverPoint.insideGraph && graph.mode === 'paint'
    ? findSegmentFromPoint(graph, segments, hoverPoint)
    : null;
  const readoutText = hoverPoint && hoverPoint.insideGraph && ['divide', 'paint'].includes(graph.mode)
    ? getPointReadout(graph, segments, hoverPoint)
    : '';
  const readoutStyle = hoverPoint
    ? {
      left: `${clamp(hoverPoint.canvasX, 9, 91)}%`,
      top: `${clamp(hoverPoint.canvasY - (dividerDragInput === 'touch' && graph.mode === 'divide' ? 13 : 8), 7, 93)}%`
    }
    : null;

  useEffect(() => {
    onArrowChangeRef.current = onArrowChange;
  }, [onArrowChange]);

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
    const previousIds = previousArrowIds.current;
    const nextArrow = graph.arrows.find((arrow) => arrow.id && !previousIds.has(arrow.id));
    if (nextArrow && nextArrow.id) setSelectedArrowId(nextArrow.id);
    previousArrowIds.current = new Set(graph.arrows.map((arrow) => arrow.id));
  }, [graph.arrows]);

  useEffect(() => {
    const previousIds = previousLabelIds.current;
    const nextLabel = graph.labels.find((label) => label.id && !previousIds.has(label.id));
    if (nextLabel && nextLabel.id) {
      setSelectedLabelId(nextLabel.id);
      if (!nextLabel.text) setEditingLabelId(nextLabel.id);
    }
    previousLabelIds.current = new Set(graph.labels.map((label) => label.id));
  }, [graph.labels]);

  useEffect(() => {
    if (selectedArrowId && !graph.arrows.some((arrow) => arrow.id === selectedArrowId)) {
      setSelectedArrowId(null);
    }
  }, [graph.arrows, selectedArrowId]);

  useEffect(() => {
    if (selectedLabelId && !graph.labels.some((label) => label.id === selectedLabelId)) {
      setSelectedLabelId(null);
      setEditingLabelId(null);
    }
  }, [graph.labels, selectedLabelId]);

  useEffect(() => {
    if (editingLabelId && !graph.labels.some((label) => label.id === editingLabelId)) {
      setEditingLabelId(null);
    }
  }, [editingLabelId, graph.labels]);

  useEffect(() => {
    if (!editingLabelId) return;
    focusLabelById(editingLabelId);
  }, [editingLabelId]);

  useEffect(() => {
    if (!editingLabelId || !isIosSafari() || !window.visualViewport) return undefined;
    let frameId = 0;

    function scheduleKeyboardPanUpdate() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateGraphLabelKeyboardPan(labelInputRefs.current.get(editingLabelId));
      });
    }

    scheduleKeyboardPanUpdate();
    window.visualViewport.addEventListener('resize', scheduleKeyboardPanUpdate, { passive: true });
    window.visualViewport.addEventListener('scroll', scheduleKeyboardPanUpdate, { passive: true });

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.visualViewport.removeEventListener('resize', scheduleKeyboardPanUpdate);
      window.visualViewport.removeEventListener('scroll', scheduleKeyboardPanUpdate);
      endGraphLabelKeyboardMode();
    };
  }, [editingLabelId]);

  useEffect(() => {
    if (!selectedLabelId && !selectedArrowId) return undefined;

    function handleDocumentPointerDown(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.graph-label-frame')) return;
      if (target.closest('.graph-arrow-item')) return;
      if (target.closest('.graph-canvas')) return;
      releaseLabelSelection();
      releaseArrowSelection();
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  }, [graph.arrows, graph.labels, selectedArrowId, selectedLabelId]);

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

  useEffect(() => {
    function handleDocumentArrowActionMove(event) {
      if (!arrowActionRef.current) return;
      event.preventDefault();
      updateArrowAction(event.clientX, event.clientY);
    }

    function handleDocumentArrowActionEnd() {
      if (arrowActionRef.current) arrowActionRef.current = null;
    }

    document.addEventListener('pointermove', handleDocumentArrowActionMove, true);
    document.addEventListener('pointerup', handleDocumentArrowActionEnd, true);
    document.addEventListener('pointercancel', handleDocumentArrowActionEnd, true);
    return () => {
      document.removeEventListener('pointermove', handleDocumentArrowActionMove, true);
      document.removeEventListener('pointerup', handleDocumentArrowActionEnd, true);
      document.removeEventListener('pointercancel', handleDocumentArrowActionEnd, true);
    };
  }, []);

  function removeLabelIfEmpty(labelId) {
    const label = graph.labels.find((candidate) => candidate.id === labelId);
    if (label && label.text.trim() === '') onLabelRemove(labelId);
  }

  function getGraphLabelKeyboardRoot() {
    return typeof document === 'undefined' ? null : document.documentElement;
  }

  function getCurrentGraphLabelKeyboardPan(root) {
    if (!root) return 0;
    const currentPan = Number.parseFloat(root.style.getPropertyValue(GRAPH_LABEL_KEYBOARD_PAN_VAR));
    return Number.isFinite(currentPan) ? currentPan : 0;
  }

  function beginGraphLabelKeyboardMode() {
    if (!isIosSafari() || typeof window === 'undefined' || !window.visualViewport) return false;
    const root = getGraphLabelKeyboardRoot();
    if (!root) return false;
    const appShell = document.querySelector('.app-shell');
    const frozenHeight = appShell && appShell.getBoundingClientRect().height
      ? appShell.getBoundingClientRect().height
      : window.innerHeight;
    if (frozenHeight) root.style.setProperty('--app-height', `${Math.round(frozenHeight)}px`);
    root.classList.add(GRAPH_LABEL_KEYBOARD_MODE_CLASS);
    root.style.setProperty(GRAPH_LABEL_KEYBOARD_PAN_VAR, '0px');
    return true;
  }

  function refreshAppHeightAfterGraphLabelKeyboard() {
    if (typeof window === 'undefined') return;
    const root = getGraphLabelKeyboardRoot();
    const viewportHeight = window.visualViewport && window.visualViewport.height
      ? window.visualViewport.height
      : window.innerHeight;
    if (root && viewportHeight) root.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
  }

  function endGraphLabelKeyboardMode() {
    const root = getGraphLabelKeyboardRoot();
    if (!root) return;
    root.classList.remove(GRAPH_LABEL_KEYBOARD_MODE_CLASS);
    root.style.setProperty(GRAPH_LABEL_KEYBOARD_PAN_VAR, '0px');
    window.requestAnimationFrame(refreshAppHeightAfterGraphLabelKeyboard);
  }

  function updateGraphLabelKeyboardPan(input) {
    if (!input || !isIosSafari() || typeof window === 'undefined' || !window.visualViewport) return;
    const root = getGraphLabelKeyboardRoot();
    if (!root || !root.classList.contains(GRAPH_LABEL_KEYBOARD_MODE_CLASS)) return;

    const viewport = window.visualViewport;
    const viewportBottom = (viewport.offsetTop || 0) + viewport.height;
    const currentPan = getCurrentGraphLabelKeyboardPan(root);
    const labelRect = input.getBoundingClientRect();
    const unpannedLabelBottom = labelRect.bottom - currentPan;
    const nextPan = Math.min(0, viewportBottom - GRAPH_LABEL_KEYBOARD_PAN_GAP - unpannedLabelBottom);
    const keyboardHeight = Math.max(0, window.innerHeight - viewportBottom);
    const maxPan = -Math.min(Math.max(keyboardHeight, 0), window.innerHeight * 0.55);
    const boundedPan = clamp(nextPan, maxPan, 0);
    root.style.setProperty(GRAPH_LABEL_KEYBOARD_PAN_VAR, `${Math.round(boundedPan)}px`);
  }

  function canPreventGraphLabelFocusScroll(input) {
    if (typeof window === 'undefined' || !window.visualViewport) return false;
    const rect = input.getBoundingClientRect();
    const viewportHeight = window.visualViewport.height || window.innerHeight;
    if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return false;
    if (rect.top < 0 || rect.height <= 0) return false;
    return rect.bottom <= viewportHeight * LABEL_PREVENT_SCROLL_SAFE_VIEWPORT_RATIO;
  }

  function focusGraphLabelInput(input) {
    const keyboardModeStarted = beginGraphLabelKeyboardMode();
    if (!canPreventGraphLabelFocusScroll(input)) {
      input.focus();
      if (keyboardModeStarted) window.requestAnimationFrame(() => updateGraphLabelKeyboardPan(input));
      return;
    }
    try {
      input.focus({ preventScroll: true });
    } catch (error) {
      input.focus();
    }
    if (keyboardModeStarted) window.requestAnimationFrame(() => updateGraphLabelKeyboardPan(input));
  }

  function focusLabelById(labelId) {
    const input = labelInputRefs.current.get(labelId);
    if (!input) return false;
    focusGraphLabelInput(input);
    const caretPosition = input.value.length;
    input.setSelectionRange(caretPosition, caretPosition);
    return true;
  }

  function releaseLabelSelection(nextLabelId = null) {
    if (selectedLabelId && selectedLabelId !== nextLabelId) {
      const input = labelInputRefs.current.get(selectedLabelId);
      if (input && document.activeElement === input) input.blur();
      removeLabelIfEmpty(selectedLabelId);
    }
    if (selectedLabelId !== nextLabelId) setEditingLabelId(null);
    setSelectedLabelId(nextLabelId);
  }

  function releaseArrowSelection(nextArrowId = null) {
    setSelectedArrowId(nextArrowId);
  }

  function selectLabel(labelId) {
    releaseArrowSelection();
    releaseLabelSelection(labelId);
  }

  function selectArrow(arrowId) {
    releaseLabelSelection();
    releaseArrowSelection(arrowId);
  }

  function editLabelImmediately(labelId) {
    flushSync(() => {
      onActivate();
      selectLabel(labelId);
      setEditingLabelId(labelId);
    });
    focusLabelById(labelId);
  }

  function beginLabelEditing(event, labelId) {
    event.preventDefault();
    event.stopPropagation();
    editLabelImmediately(labelId);
  }

  function createAndEditTextLabel(point) {
    if (!onPoint) return;
    const labelId = makeId('label');
    flushSync(() => {
      onPoint(point, { labelId });
      releaseArrowSelection();
      setSelectedLabelId(labelId);
      setEditingLabelId(labelId);
    });
    focusLabelById(labelId);
  }

  function pointFromEvent(clientX, clientY, target, options = {}) {
    const rect = target.getBoundingClientRect();
    const canvasX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const canvasY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    const graphElement = target.querySelector(graph.type === 'pie' ? '.pie-svg' : '.bar-svg');
    const graphRect = graphElement ? graphElement.getBoundingClientRect() : rect;
    const svgHeight = graph.type === 'pie' ? 100 : BAR_GRAPH_VIEWBOX.height;
    const rawSvgX = graphRect.width ? ((clientX - graphRect.left) / graphRect.width) * 100 : 0;
    const rawSvgY = graphRect.height ? ((clientY - graphRect.top) / graphRect.height) * svgHeight : 0;
    const svgX = clamp(rawSvgX, 0, 100);
    const svgY = clamp(rawSvgY, 0, svgHeight);
    const graphX = clamp(((svgX - BAR_GRAPH_BOX.left) / BAR_GRAPH_BOX.width) * 100, 0, 100);
    const graphY = clamp(((svgY - BAR_GRAPH_BOX.top) / BAR_GRAPH_BOX.height) * 100, 0, 100);
    const pieDistance = Math.hypot(rawSvgX - PIE_GRAPH_CIRCLE.cx, rawSvgY - PIE_GRAPH_CIRCLE.cy);
    const barTolerance = options.relaxedDivider ? DIVIDER_DRAG_BAR_TOLERANCE : 0;
    const pieTolerance = options.relaxedDivider ? DIVIDER_DRAG_PIE_TOLERANCE : 0;
    const insideGraph = graph.type === 'pie'
      ? pieDistance <= PIE_GRAPH_CIRCLE.radius + pieTolerance
      : rawSvgX >= BAR_GRAPH_BOX.left
        && rawSvgX <= BAR_GRAPH_BOX.left + BAR_GRAPH_BOX.width
        && rawSvgY >= BAR_GRAPH_BOX.top - barTolerance
        && rawSvgY <= BAR_GRAPH_BOX.top + BAR_GRAPH_BOX.height + barTolerance;
    const percentAngle = pointToPiePercent(rawSvgX, rawSvgY);
    return {
      canvasX,
      canvasY,
      svgX,
      svgY,
      graphX,
      graphY,
      percentAngle,
      insideGraph
    };
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

  function makePreviewArrow(startPoint, endPoint) {
    return normalizeGraphArrow({
      id: 'preview-arrow',
      x1: startPoint.canvasX,
      y1: startPoint.canvasY,
      x2: endPoint.canvasX,
      y2: endPoint.canvasY
    });
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
    onActivate();
    if (selectedLabelId || selectedArrowId) {
      event.preventDefault();
      releaseLabelSelection();
      releaseArrowSelection();
      setHoverPoint(null);
      return;
    }

    const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget);
    setHoverPoint(point.insideGraph ? point : null);

    if (graph.mode === 'arrow') {
      event.preventDefault();
      activeArrowDragRef.current = {
        pointerId: event.pointerId,
        startPoint: point,
        lastPoint: point
      };
      setPreviewArrow(makePreviewArrow(point, point));
      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Some synthetic or interrupted pointer events cannot be captured.
        }
      }
      return;
    }

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

    if (graph.mode === 'text') {
      createAndEditTextLabel(point);
      return;
    }

    onPoint(point);
  }

  function handlePointerMove(event) {
    if (activeArrowDragRef.current && activeArrowDragRef.current.pointerId === event.pointerId) {
      event.preventDefault();
      const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget);
      activeArrowDragRef.current.lastPoint = point;
      setPreviewArrow(makePreviewArrow(activeArrowDragRef.current.startPoint, point));
      setHoverPoint(null);
      return;
    }

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
    if (activeArrowDragRef.current && activeArrowDragRef.current.pointerId === event.pointerId) {
      event.preventDefault();
      const dragState = activeArrowDragRef.current;
      const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget);
      activeArrowDragRef.current = null;
      setPreviewArrow(null);
      releaseDividerPointer(event);
      setHoverPoint(null);
      if (onArrowAdd) onArrowAdd(dragState.startPoint, point);
      return;
    }

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
    if (activeArrowDragRef.current && activeArrowDragRef.current.pointerId === event.pointerId) {
      activeArrowDragRef.current = null;
      setPreviewArrow(null);
      releaseDividerPointer(event);
      setHoverPoint(null);
      return;
    }

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

  function startArrowAction(event, arrow, action) {
    event.preventDefault();
    event.stopPropagation();
    onActivate();
    const safeArrow = normalizeGraphArrow(arrow);
    selectArrow(safeArrow.id);
    const canvasRect = event.currentTarget.closest('.graph-canvas').getBoundingClientRect();
    arrowActionRef.current = {
      action,
      arrowId: safeArrow.id,
      startX: event.clientX,
      startY: event.clientY,
      canvasRect,
      arrow: safeArrow
    };
    if (event.currentTarget.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture can fail for synthetic or interrupted events.
      }
    }
  }

  function updateArrowAction(clientX, clientY) {
    const action = arrowActionRef.current;
    if (!action) return;
    const dxPercent = (clientX - action.startX) / action.canvasRect.width * 100;
    const dyPercent = (clientY - action.startY) / action.canvasRect.height * 100;

    if (action.action === 'move') {
      const minX = Math.min(action.arrow.x1, action.arrow.x2);
      const maxX = Math.max(action.arrow.x1, action.arrow.x2);
      const minY = Math.min(action.arrow.y1, action.arrow.y2);
      const maxY = Math.max(action.arrow.y1, action.arrow.y2);
      const boundedDx = clamp(dxPercent, -minX, 100 - maxX);
      const boundedDy = clamp(dyPercent, -minY, 100 - maxY);
      applyArrowActionPatch(action.arrowId, {
        x1: action.arrow.x1 + boundedDx,
        y1: action.arrow.y1 + boundedDy,
        x2: action.arrow.x2 + boundedDx,
        y2: action.arrow.y2 + boundedDy
      });
      return;
    }

    const nextX2 = normalizeCanvasPercent(action.arrow.x2 + dxPercent, action.arrow.x2);
    const nextY2 = normalizeCanvasPercent(action.arrow.y2 + dyPercent, action.arrow.y2);
    const nextArrow = normalizeGraphArrow({
      ...action.arrow,
      x2: nextX2,
      y2: nextY2
    });
    if (getGraphArrowLength(nextArrow) < MIN_GRAPH_ARROW_LENGTH) return;
    applyArrowActionPatch(action.arrowId, {
      x2: nextArrow.x2,
      y2: nextArrow.y2
    });
  }

  function applyArrowActionPatch(arrowId, patch) {
    flushSync(() => {
      if (onArrowChangeRef.current) onArrowChangeRef.current(arrowId, patch);
    });
  }

  function endArrowAction(event) {
    const action = arrowActionRef.current;
    if (!action || action.arrowId !== event.currentTarget.dataset.arrowId) return;
    arrowActionRef.current = null;
    if (event.currentTarget.releasePointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released.
      }
    }
  }

  function startLabelAction(event, label, action) {
    event.preventDefault();
    event.stopPropagation();
    if (editingLabelId === label.id && action === 'resize') return;
    onActivate();
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
      className={`graph-canvas is-${graph.type} mode-${graph.mode}${dividerDragInput === 'touch' ? ' is-divider-touching' : ''}`}
      ref={setGraphCanvasRef}
      data-demo-id={`graph-canvas-${graph.type}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={() => {
        if (!activeDividerDragRef.current && !activeArrowDragRef.current) setHoverPoint(null);
      }}
      role="button"
      aria-label="그래프 그리기 영역"
    >
      <SingleGraphDisplay graph={graph} segments={segments} previewDivider={previewDivider} previewSegmentKey={previewSegment && previewSegment.key} />
      <GraphArrowLayer
        arrows={graph.arrows}
        previewArrow={previewArrow}
        interactive
        selectedArrowId={selectedArrowId}
        onArrowActionStart={startArrowAction}
        onArrowActionEnd={endArrowAction}
        onArrowRemove={(arrowId) => {
          if (selectedArrowId === arrowId) releaseArrowSelection();
          if (onArrowRemove) onArrowRemove(arrowId);
        }}
      />

      {readoutText && <div className="graph-readout" style={readoutStyle}>{readoutText}</div>}

      {graph.labels.map((rawLabel) => {
        const label = normalizeGraphLabel(rawLabel);
        const isSelected = selectedLabelId === label.id;
        const isEditing = editingLabelId === label.id;
        const inputElement = labelInputRefs.current.get(label.id);
        const maxLabelWidth = getCanvasLabelMaxWidth(canvasSize);
        const labelWidth = getSafeLabelWidth(label.text, label.fontSize, label.width, inputElement, maxLabelWidth);
        const labelHeight = getLabelBoxHeightForText(label.text, label.fontSize, labelWidth, inputElement);
        const labelRows = getLabelVisualRowCount(label.text, label.fontSize, labelWidth, inputElement);
        const displayLabel = { ...label, width: labelWidth };
        return (
          <div
            key={label.id}
            className={`graph-label-frame ${isSelected ? 'is-selected' : ''}${isEditing ? ' is-editing' : ''}`}
            data-label-id={label.id}
            style={{
              left: `clamp(${labelWidth / 2}px, ${label.x}%, calc(100% - ${labelWidth / 2}px))`,
              top: `clamp(${labelHeight / 2}px, ${label.y}%, calc(100% - ${labelHeight / 2}px))`,
              minWidth: `${labelWidth}px`,
              width: `${labelWidth}px`,
              height: `${labelHeight}px`,
              '--label-selection-inset': `${getLabelSelectionInset(label.fontSize)}px`
            }}
            onPointerDown={(event) => startLabelAction(event, displayLabel, 'move')}
            onPointerUp={endLabelAction}
            onPointerCancel={endLabelAction}
          >
            <textarea
              ref={(node) => {
                if (node) {
                  labelInputRefs.current.set(label.id, node);
                } else {
                  labelInputRefs.current.delete(label.id);
                }
              }}
              className={`graph-floating-label ${isEditing ? 'is-editing' : ''}`}
              value={label.text}
              rows={labelRows}
              wrap="soft"
              spellCheck="false"
              readOnly={!isEditing}
              tabIndex={isEditing ? 0 : -1}
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
              }}
              onBlur={() => {
                if (isEditing) endGraphLabelKeyboardMode();
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
                  <button
                    key={area}
                    type="button"
                    className={`label-border-move-hit ${area}`}
                    title="이동"
                    aria-label="텍스트 상자 이동"
                    tabIndex={-1}
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
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={() => onLabelChange(label.id, { color })}
                    />
                  ))}
                </div>
                <button
                  className={`label-handle edit ${isEditing ? 'is-active' : ''}`}
                  type="button"
                  title="편집"
                  aria-label="텍스트 편집"
                  data-label-id={label.id}
                  onPointerDown={(event) => beginLabelEditing(event, label.id)}
                >
                  <PenLine size={12} aria-hidden="true" />
                </button>
                {!isEditing && (
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
                )}
                <button
                  className="label-handle delete"
                  type="button"
                  title="글자 지우기"
                  aria-label="텍스트 지우기"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    endGraphLabelKeyboardMode();
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

function GraphArrowLayer({
  arrows,
  previewArrow = null,
  visualScale = 1,
  pointProjector = null,
  interactive = false,
  selectedArrowId = null,
  onArrowActionStart,
  onArrowActionEnd,
  onArrowRemove
}) {
  const [layerRef, layerSize] = useElementSize();
  const savedArrows = sanitizeGraphArrows(arrows);
  const preview = previewArrow && getGraphArrowLength(previewArrow) >= 0.3
    ? { ...normalizeGraphArrow(previewArrow), id: 'preview-arrow', isPreview: true }
    : null;
  const visibleArrows = preview ? savedArrows.concat(preview) : savedArrows;

  return (
    <div className="graph-arrow-layer" ref={layerRef} aria-hidden={interactive ? undefined : true}>
      {layerSize.width > 0 && layerSize.height > 0 && visibleArrows.map((arrow) => {
        const displayArrow = typeof pointProjector === 'function'
          ? projectGraphArrowForDisplay(arrow, pointProjector)
          : arrow;
        return (
          <GraphArrowItem
            key={arrow.id || `${arrow.x1}-${arrow.y1}-${arrow.x2}-${arrow.y2}`}
            arrow={displayArrow}
            layerSize={layerSize}
            preview={arrow.isPreview}
            visualScale={visualScale}
            interactive={interactive && !arrow.isPreview}
            selected={selectedArrowId === arrow.id}
            onArrowActionStart={onArrowActionStart}
            onArrowActionEnd={onArrowActionEnd}
            onArrowRemove={onArrowRemove}
          />
        );
      })}
    </div>
  );
}

function projectGraphArrowForDisplay(arrow, pointProjector) {
  const start = pointProjector(arrow.x1, arrow.y1);
  const end = pointProjector(arrow.x2, arrow.y2);
  return {
    ...arrow,
    x1: normalizeCanvasPercent(start && start.x, arrow.x1),
    y1: normalizeCanvasPercent(start && start.y, arrow.y1),
    x2: normalizeCanvasPercent(end && end.x, arrow.x2),
    y2: normalizeCanvasPercent(end && end.y, arrow.y2)
  };
}

function GraphArrowItem({
  arrow,
  layerSize,
  preview,
  visualScale,
  interactive,
  selected,
  onArrowActionStart,
  onArrowActionEnd,
  onArrowRemove
}) {
  const x1 = layerSize.width * (arrow.x1 / 100);
  const y1 = layerSize.height * (arrow.y1 / 100);
  const x2 = layerSize.width * (arrow.x2 / 100);
  const y2 = layerSize.height * (arrow.y2 / 100);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1) return null;

  const angle = Math.atan2(dy, dx);
  const arrowScale = Number.isFinite(Number(visualScale)) && Number(visualScale) > 0 ? Number(visualScale) : 1;
  const arrowHeight = roundLabelMetric(24 * arrowScale);
  const arrowCenter = arrowHeight / 2;
  const outlineHeadLength = clamp(length * 0.34, 12 * arrowScale, 22 * arrowScale);
  const fillHeadLength = Math.max(8 * arrowScale, outlineHeadLength - 4 * arrowScale);
  const outlineBase = Math.max(0, length - outlineHeadLength);
  const fillBase = Math.max(0, length - fillHeadLength);
  const outlineShaftEnd = Math.max(0, length - outlineHeadLength * 0.58);
  const fillShaftEnd = Math.max(0, length - fillHeadLength * 0.58);
  const outlineHeadHalfHeight = 9 * arrowScale;
  const fillHeadHalfHeight = 5.5 * arrowScale;
  const handleSize = 24;
  const handleOffset = handleSize / 2;
  const counterRotation = `rotate(${-angle}rad)`;

  return (
    <span
      className={`graph-arrow-item ${preview ? 'is-preview' : ''}${interactive ? ' is-interactive' : ''}${selected ? ' is-selected' : ''}`}
      data-arrow-id={arrow.id}
      style={{
        left: `${x1}px`,
        top: `${y1}px`,
        width: `${length}px`,
        transform: `rotate(${angle}rad)`
      }}
    >
      <svg
        className="graph-arrow-svg"
        viewBox={`0 0 ${Math.max(1, length)} ${arrowHeight}`}
        width={length}
        height={arrowHeight}
        style={{ transform: `translateY(-${arrowCenter}px)` }}
        focusable="false"
      >
        <line
          x1="0"
          y1={arrowCenter}
          x2={outlineShaftEnd}
          y2={arrowCenter}
          stroke={GRAPH_ARROW_OUTLINE_COLOR}
          strokeWidth={7 * arrowScale}
          strokeLinecap="round"
        />
        <polygon
          points={`${outlineBase},${arrowCenter - outlineHeadHalfHeight} ${length},${arrowCenter} ${outlineBase},${arrowCenter + outlineHeadHalfHeight}`}
          fill={GRAPH_ARROW_OUTLINE_COLOR}
          stroke={GRAPH_ARROW_OUTLINE_COLOR}
          strokeLinejoin="round"
        />
        <line
          x1="0"
          y1={arrowCenter}
          x2={fillShaftEnd}
          y2={arrowCenter}
          stroke={GRAPH_LINE_COLOR}
          strokeWidth={3.2 * arrowScale}
          strokeLinecap="round"
        />
        <polygon
          points={`${fillBase},${arrowCenter - fillHeadHalfHeight} ${length},${arrowCenter} ${fillBase},${arrowCenter + fillHeadHalfHeight}`}
          fill={GRAPH_LINE_COLOR}
          stroke={GRAPH_LINE_COLOR}
          strokeLinejoin="round"
        />
      </svg>
      {interactive && (
        <span
          className="graph-arrow-move-hit"
          data-arrow-id={arrow.id}
          title="이동"
          aria-hidden="true"
          style={{
            width: `${length}px`,
            height: `${Math.max(24, arrowHeight)}px`,
            top: `-${Math.max(24, arrowHeight) / 2}px`
          }}
          onPointerDown={(event) => onArrowActionStart && onArrowActionStart(event, arrow, 'move')}
          onPointerUp={onArrowActionEnd}
          onPointerCancel={onArrowActionEnd}
        />
      )}
      {interactive && selected && (
        <>
          <button
            className="graph-arrow-handle resize"
            type="button"
            title="크기 변경"
            aria-label="화살표 크기 변경"
            data-arrow-id={arrow.id}
            style={{
              left: `${length - handleOffset}px`,
              top: `-${handleOffset}px`,
              transform: counterRotation
            }}
            onPointerDown={(event) => onArrowActionStart && onArrowActionStart(event, arrow, 'resize')}
            onPointerUp={onArrowActionEnd}
            onPointerCancel={onArrowActionEnd}
          >
            <Maximize2 size={12} aria-hidden="true" />
          </button>
          <button
            className="graph-arrow-handle delete"
            type="button"
            title="화살표 지우기"
            aria-label="화살표 지우기"
            style={{
              left: `${length - handleOffset}px`,
              top: `-${handleSize + handleOffset + 4}px`,
              transform: counterRotation
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (onArrowRemove) onArrowRemove(arrow.id);
            }}
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </>
      )}
    </span>
  );
}

function getGraphSvgRectStyle(svgRect) {
  if (!svgRect || !svgRect.width || !svgRect.height) return undefined;
  return {
    left: `${svgRect.x}px`,
    top: `${svgRect.y}px`,
    width: `${svgRect.width}px`,
    height: `${svgRect.height}px`,
    maxHeight: 'none',
    transform: 'none'
  };
}

function SingleGraphDisplay({ graph, segments, previewDivider = null, previewSegmentKey = null, svgRect = null }) {
  return graph.type === 'pie' ? (
    <PieGraph graph={graph} segments={segments} previewDivider={previewDivider} previewSegmentKey={previewSegmentKey} svgRect={svgRect} />
  ) : (
    <BarGraph graph={graph} segments={segments} previewDivider={previewDivider} previewSegmentKey={previewSegmentKey} svgRect={svgRect} />
  );
}

function BarGraph({ graph, segments, previewDivider, previewSegmentKey, svgRect }) {
  const scale = normalizeGraphScale(graph.scale);
  const labelTicks = makePercentLabelTicks(scale, 'bar');
  const minorTicks = makeGraphTicks(scale, true).filter((tick) => !labelTicks.includes(tick));
  const box = BAR_GRAPH_BOX;
  const barRadius = 2.2;
  return (
    <svg className="bar-svg" style={getGraphSvgRectStyle(svgRect)} viewBox={`0 0 ${BAR_GRAPH_VIEWBOX.width} ${BAR_GRAPH_VIEWBOX.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
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
          <line className="graph-minor-tick" x1={barPercentX(tick)} x2={barPercentX(tick)} y1={box.top + box.height + 0.7} y2={box.top + box.height + 2.8} />
        </g>
      ))}
      {labelTicks.map((tick) => (
        <g key={`label-${tick}`}>
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

function PieGraph({ graph, segments, previewDivider, previewSegmentKey, svgRect }) {
  const scale = normalizeGraphScale(graph.scale);
  const labelTicks = makePercentLabelTicks(scale, 'pie');
  const minorTicks = makeGraphTicks(scale).filter((tick) => !labelTicks.includes(tick));
  return (
    <svg className="pie-svg" style={getGraphSvgRectStyle(svgRect)} viewBox="0 0 100 100" aria-hidden="true">
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

function ShareDialog({ state, activeTab, interpretationAnswers, onClose, onImport }) {
  const [qrSrc, setQrSrc] = useState('');
  const [activeQrIndex, setActiveQrIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [graphShareType, setGraphShareType] = useState(() => getActiveGraphType(state && state.graph));
  const shareScope = getShareScopeForTab(activeTab);
  const sharePayload = useMemo(
    () => makeSharePayload({
      state,
      scope: shareScope,
      interpretationAnswers,
      graphType: graphShareType
    }),
    [graphShareType, interpretationAnswers, shareScope, state]
  );
  const activeQrItem = sharePayload.items[Math.min(activeQrIndex, sharePayload.items.length - 1)] || sharePayload.items[0];
  const shareLabel = getSharePayloadLabel(sharePayload);
  const shareDescription = getSharePayloadDescription(sharePayload);

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
    if (!result.payload) {
      setMessage(result.message || '읽은 QR을 적용할 수 없습니다.');
      return;
    }
    onImport(result.payload);
    onClose();
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="share-dialog" role="dialog" aria-modal="true" aria-label="QR 보내기 받기">
        <div className="section-heading with-action">
          <SectionTitle icon={Share2} title="QR 보내기 / 받기" />
          <button className="icon-button" type="button" data-demo-id="share-close" onClick={onClose} title="닫기">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="share-grid">
          <div className="qr-card">
            <p className="qr-scope-label" aria-live="polite">{shareDescription}</p>
            {sharePayload.scope === 'graph' && (
              <SegmentedControl
                className="qr-graph-type-control"
                value={graphShareType}
                onChange={setGraphShareType}
                items={[
                  { value: 'bar', label: '띠그래프', icon: RectangleHorizontal },
                  { value: 'pie', label: '원그래프', icon: Circle }
                ]}
              />
            )}
            {qrSrc ? <img src={qrSrc} alt={`${shareLabel} QR 코드`} /> : <div className="qr-placeholder" />}
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

function SegmentedControl({ value, onChange, items, className = '' }) {
  return (
    <div className={`segmented-control ${className}`.trim()}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            className={value === item.value ? 'is-active' : ''}
            data-demo-id={className ? `${className}-${item.value}` : undefined}
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

function normalizeGraphScale(value, fallback = DEFAULT_GRAPH_SCALE) {
  if (!isDemoModeEnabled()) return DEFAULT_GRAPH_SCALE;
  const safeFallback = clamp(Math.round(Number(fallback)) || DEFAULT_GRAPH_SCALE, MIN_GRAPH_SCALE, MAX_GRAPH_SCALE);
  const scale = Math.round(Number(value));
  if (!Number.isFinite(scale)) return safeFallback;
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
  return graph.type === 'pie' ? point.percentAngle : point.graphX;
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

function makeSharePayload({ state, scope, interpretationAnswers, graphType }) {
  const base = getShareBaseUrl();
  const shareScope = getShareScopeForTab(scope);
  const shareGraphType = shareScope === 'graph'
    ? normalizeGraphType(graphType, getActiveGraphType(state && state.graph))
    : null;
  const packed = packScopedShareState(state, shareScope, interpretationAnswers, shareGraphType);
  const candidates = makeShareCandidates(base, packed);
  const single = chooseBestQrCandidate(candidates);
  const label = getSharePayloadLabel({ scope: shareScope, graphType: shareGraphType });
  if (single) {
    return {
      cacheKey: single.url,
      copyText: single.url,
      items: [{ url: single.url }],
      mode: 'single',
      scope: shareScope,
      graphType: shareGraphType,
      label
    };
  }
  return {
    ...chooseBestChunkPayload(base, candidates),
    scope: shareScope,
    graphType: shareGraphType,
    label
  };
}

function getShareScopeForTab(tab) {
  if (tab === 'table') return 'table';
  if (tab === 'graph') return 'graph';
  if (tab === 'interpret') return 'interpret';
  if (tab === 'full') return 'full';
  return 'plan';
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

function packScopedShareState(state, scope, interpretationAnswers, graphType) {
  const shareScope = getShareScopeForTab(scope);
  const packed = {
    v: SHARE_VERSION,
    q: SHARE_SCOPE_CODES[shareScope] || SHARE_SCOPE_CODES.plan
  };
  const plan = state && state.plan ? state.plan : {};
  const table = state && state.table ? state.table : {};

  if (shareScope === 'plan' || shareScope === 'full') {
    const planPayload = packPlanForShare(plan, table);
    if (hasObjectKeys(planPayload)) packed.p = planPayload;
  }
  if (shareScope === 'table' || shareScope === 'full') {
    const tablePayload = packTableForShare(plan, table);
    if (hasObjectKeys(tablePayload)) packed.t = tablePayload;
  }
  if (shareScope === 'graph' || shareScope === 'full') {
    const graphPayload = packGraphForShare(
      state && state.graph ? state.graph : {},
      shareScope === 'graph' ? graphType : null
    );
    if (graphPayload) packed.g = graphPayload;
  }
  if (shareScope === 'interpret' || shareScope === 'full') {
    const interpretationPayload = packInterpretationForShare(interpretationAnswers);
    if (hasObjectKeys(interpretationPayload)) packed.i = interpretationPayload;
  }

  return packed;
}

function packShareState(state) {
  const packed = { v: LEGACY_SHARE_VERSION };
  const planPayload = packPlanForShare(state && state.plan ? state.plan : {}, state && state.table ? state.table : {});
  const tablePayload = packTableForShare(state && state.plan ? state.plan : {}, state && state.table ? state.table : {});
  const graphPayload = packGraphForShare(state && state.graph ? state.graph : {});
  if (hasObjectKeys(planPayload)) packed.p = planPayload;
  if (hasObjectKeys(tablePayload)) packed.t = tablePayload;
  if (graphPayload) packed.g = graphPayload;
  return packed;
}

function packPlanForShare(plan, table) {
  const payload = {};
  const itemCount = getPlanItemCount(plan && plan.items, table && table.headerRow);
  const title = typeof (plan && plan.title) === 'string' ? plan.title : '';
  const itemPayload = packRowForShare(plan && plan.items, itemCount);
  if (title) payload.t = title;
  if (itemPayload) payload.i = itemPayload;
  if (itemCount !== DEFAULT_PLAN_ITEM_COUNT) payload.c = itemCount;
  return payload;
}

function packTableForShare(plan, table) {
  const payload = {};
  const itemCount = getPlanItemCount(plan && plan.items, table && table.headerRow);
  const tableWidth = getTableWidthForItemCount(itemCount);
  const rowPayload = packRowsForShare(table && table.rows, tableWidth);
  if (itemCount !== DEFAULT_PLAN_ITEM_COUNT) payload.c = itemCount;
  if (rowPayload) {
    if (rowPayload.length === 1) {
      payload.r = rowPayload[0];
    } else {
      payload.rs = rowPayload;
    }
  }
  return payload;
}

function packInterpretationForShare(answers) {
  const payload = {};
  const normalized = normalizeInterpretationAnswers(answers);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value) payload[key] = value;
  });
  return payload;
}

function isDefaultShareState(packed) {
  return packed && Object.keys(packed).length === 1 && packed.v === LEGACY_SHARE_VERSION;
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

function packGraphForShare(graph, graphType = null) {
  const packed = {};
  const graphState = normalizeGraphState(graph);
  const mode = GRAPH_MODE_CODES[normalizeStoredGraphMode(graphState.mode)] || GRAPH_MODE_CODES.divide;
  const activeColor = normalizeGraphActiveColor(graphState.activeColor);
  const scopedGraphType = normalizeOptionalGraphType(graphType);

  if (scopedGraphType) {
    const drawingPayload = packGraphDrawingForShare(getGraphDrawing(graphState, scopedGraphType));
    if (drawingPayload) Object.assign(packed, drawingPayload);
    packed.y = SHARE_GRAPH_TYPE_CODES[scopedGraphType];
    if (mode !== GRAPH_MODE_CODES.divide) packed.m = mode;
    if (activeColor !== GRAPH_COLORS[0]) packed.a = encodeColorForShare(activeColor, GRAPH_COLOR_SHARE_PALETTE);
    return packed;
  }

  const activeType = normalizeGraphType(graphState.activeType, 'bar');
  const barPayload = packGraphDrawingForShare(graphState.bar);
  const piePayload = packGraphDrawingForShare(graphState.pie);

  if (mode !== GRAPH_MODE_CODES.divide) packed.m = mode;
  if (activeColor !== GRAPH_COLORS[0]) packed.a = encodeColorForShare(activeColor, GRAPH_COLOR_SHARE_PALETTE);
  if (activeType !== 'bar') packed.x = 'p';
  if (barPayload) packed.b = barPayload;
  if (piePayload) packed.p = piePayload;

  return hasObjectKeys(packed) ? packed : null;
}

function packGraphDrawingForShare(drawing) {
  const graph = normalizeGraphDrawing(drawing, drawing && drawing.type === 'pie' ? 'pie' : 'bar');
  const packed = {};
  const dividers = sanitizeDividers(Array.isArray(graph.dividers) ? graph.dividers : []);
  const fillPayload = packFillsForShare(graph.fills, dividers);
  const labelPayload = packLabelsForShare(graph.labels);
  const arrowPayload = packArrowsForShare(graph.arrows);
  if (dividers.length) packed.d = encodeDividersForShare(dividers);
  if (fillPayload) packed.f = fillPayload;
  if (labelPayload) packed.l = labelPayload;
  if (arrowPayload) packed.r = arrowPayload;
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

function packArrowsForShare(arrows) {
  const safeArrows = sanitizeGraphArrows(arrows);
  if (!safeArrows.length) return null;
  return safeArrows.map((arrow) => [
    quantizePercent(arrow.x1),
    quantizePercent(arrow.y1),
    quantizePercent(arrow.x2),
    quantizePercent(arrow.y2)
  ]);
}

function unpackSharePayload(packed) {
  if (!packed || !isSupportedShareVersion(packed.v)) return null;
  if (packed.v === LEGACY_SHARE_VERSION) {
    return { scope: 'full', state: unpackLegacyShareState(packed) };
  }

  const scope = SHARE_SCOPES_BY_CODE[packed.q] || 'plan';
  if (scope === 'plan') return { scope, plan: unpackPlanForShare(packed.p) };
  if (scope === 'table') return { scope, table: unpackTableForShare(packed.t) };
  if (scope === 'graph') return { scope, ...unpackGraphScopeForShare(packed.g) };
  if (scope === 'interpret') return { scope, interpretation: unpackInterpretationForShare(packed.i) };
  return {
    scope: 'full',
    state: unpackLegacyShareState(packed),
    interpretation: unpackInterpretationForShare(packed.i)
  };
}

function isSupportedShareVersion(version) {
  return version === SHARE_VERSION || version === PREVIOUS_SCOPED_SHARE_VERSION || version === LEGACY_SHARE_VERSION;
}

function unpackLegacyShareState(packed) {
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

function unpackShareState(packed) {
  const payload = unpackSharePayload(packed);
  if (!payload) return null;
  if (payload.scope === 'full') return normalizeLoadedState(payload.state);
  if (payload.scope === 'interpret') return createDefaultState();
  return applyScopedStateImport(createDefaultState(), payload);
}

function unpackPlanForShare(encoded) {
  const planPayload = asPlainObject(encoded);
  const itemCount = normalizePlanItemCount(planPayload.c, getPlanItemCount(planPayload.i, null));
  return {
    title: typeof planPayload.t === 'string' ? planPayload.t : '',
    items: unpackRowForShare(planPayload.i, itemCount)
  };
}

function unpackTableForShare(encoded) {
  const tablePayload = asPlainObject(encoded);
  const itemCount = normalizePlanItemCount(tablePayload.c, DEFAULT_PLAN_ITEM_COUNT);
  const tableWidth = getTableWidthForItemCount(itemCount);
  return {
    headerRow: fitHeaderRow([], tableWidth),
    rows: unpackRowsForShare(tablePayload, tableWidth),
    tableDefaultsCleared: true
  };
}

function unpackInterpretationForShare(encoded) {
  return normalizeInterpretationAnswers(asPlainObject(encoded));
}

function unpackGraphScopeForShare(encoded) {
  const graph = asPlainObject(encoded);
  const graphType = decodeGraphTypeForShare(graph.y);
  if (!graphType) return { graph: unpackGraphForShare(encoded) };
  return {
    graphType,
    graph: {
      scale: normalizeGraphScale(graph.s),
      mode: GRAPH_MODES_BY_CODE[graph.m] || 'divide',
      activeColor: decodeColorForShare(graph.a, GRAPH_COLOR_SHARE_PALETTE, GRAPH_COLORS[0]),
      activeType: graphType,
      [graphType]: unpackGraphDrawingForShare(graph, graphType)
    }
  };
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
  const hasSplitGraph = graph.b || graph.p;
  const scale = normalizeGraphScale(graph.s);
  const legacyType = graph.t === 'p' ? 'pie' : 'bar';
  return {
    scale,
    mode: GRAPH_MODES_BY_CODE[graph.m] || 'divide',
    activeColor: decodeColorForShare(graph.a, GRAPH_COLOR_SHARE_PALETTE, GRAPH_COLORS[0]),
    activeType: graph.x === 'p' ? 'pie' : 'bar',
    bar: unpackGraphDrawingForShare(hasSplitGraph ? graph.b : (legacyType === 'bar' ? graph : null), 'bar'),
    pie: unpackGraphDrawingForShare(hasSplitGraph ? graph.p : (legacyType === 'pie' ? graph : null), 'pie')
  };
}

function unpackGraphDrawingForShare(encoded, type) {
  const graph = asPlainObject(encoded);
  const dividers = decodeDividersForShare(graph.d);
  return {
    type,
    dividers,
    fills: decodeFillsForShare(graph.f, dividers),
    labels: decodeLabelsForShare(graph.l),
    arrows: decodeArrowsForShare(graph.r),
    undoStack: []
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

function decodeArrowsForShare(encoded) {
  if (!Array.isArray(encoded)) return [];
  return sanitizeGraphArrows(encoded
    .filter((arrow) => Array.isArray(arrow))
    .map((arrow) => ({
      id: makeId('arrow'),
      x1: decodeQuantizedPercent(arrow[0]),
      y1: decodeQuantizedPercent(arrow[1]),
      x2: decodeQuantizedPercent(arrow[2]),
      y2: decodeQuantizedPercent(arrow[3])
    })));
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
  const payload = readImportPayloadFromHash();
  if (!payload || payload.scope === 'interpret') return null;
  return applyScopedStateImport(createDefaultState(), payload);
}

function readInterpretationFromHash() {
  const payload = readImportPayloadFromHash();
  if (!payload) return null;
  if (payload.scope === 'interpret') return normalizeInterpretationAnswers(payload.interpretation);
  if (payload.scope === 'full' && payload.interpretation) return normalizeInterpretationAnswers(payload.interpretation);
  return null;
}

function readImportPayloadFromHash() {
  return parseImportTextResult(window.location.hash || '').payload;
}

function parseImportText(text) {
  const payload = parseImportTextResult(text).payload;
  if (!payload || payload.scope === 'interpret') return null;
  return applyScopedStateImport(createDefaultState(), payload);
}

function parseImportTextResult(text) {
  if (!text || !text.trim()) return { payload: null };
  const extracted = extractSharePayload(text);
  if (!extracted) return { payload: null };
  if (extracted.kind === 'p') return parseShareChunk(extracted.value);
  return { payload: decodeShareToken(extracted.kind, extracted.value) };
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
      if (clean === SHARE_DEFAULT_TOKEN) return unpackSharePayload({ v: LEGACY_SHARE_VERSION });
      return parseShareJson(decompressFromEncodedURIComponent(clean));
    }
    if (kind === 'u') {
      const bytes = decodeBase32(clean);
      return bytes ? parseShareJson(decompressFromUint8Array(bytes)) : null;
    }
    const json = decompressFromEncodedURIComponent(clean);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (parsed && isSupportedShareVersion(parsed.v)) {
      return unpackSharePayload(parsed);
    }
    return { scope: 'full', state: normalizeLoadedState(parsed.state || parsed) };
  } catch (error) {
    return null;
  }
}

function parseShareJson(json) {
  if (!json) return null;
  const parsed = JSON.parse(json);
  if (parsed && isSupportedShareVersion(parsed.v)) {
    return unpackSharePayload(parsed);
  }
  return { scope: 'full', state: normalizeLoadedState(parsed.state || parsed) };
}

function parseShareChunk(value) {
  const parts = value.split('.');
  if (parts.length < 5) return { payload: null, message: '가져올 수 없는 QR 내용입니다.' };
  const [kindCode, batchId, indexCode, totalCode, ...chunkParts] = parts;
  const kind = kindCode.toLowerCase();
  const index = Number.parseInt(indexCode, 36);
  const total = Number.parseInt(totalCode, 36);
  const chunk = chunkParts.join('.');
  if (!['g', 'u'].includes(kind) || !batchId || !Number.isInteger(index) || !Number.isInteger(total) || index < 0 || index >= total || total < 1) {
    return { payload: null, message: '가져올 수 없는 QR 내용입니다.' };
  }

  const key = `${SHARE_CHUNK_PREFIX}${kind}:${batchId}:${total}`;
  const chunks = readShareChunks(key, total);
  chunks[index] = chunk;
  writeShareChunks(key, chunks);

  const received = chunks.filter((part) => part).length;
  if (received < total) {
    return { payload: null, message: `QR ${received}/${total} 받았습니다.` };
  }

  const payload = decodeShareToken(kind, chunks.join(''));
  clearShareChunks(key);
  return payload ? { payload } : { payload: null, message: '가져올 수 없는 QR 내용입니다.' };
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
