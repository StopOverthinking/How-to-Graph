import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const baseUrl = (process.env.DEMO_BASE_URL || 'http://127.0.0.1:5173/').replace(/\/$/, '/');
const scenario = getScenarioName();
const outputSize = {
  width: Number(process.env.DEMO_WIDTH || 1280),
  height: Number(process.env.DEMO_HEIGHT || 720)
};
const demoZoom = parsePositiveNumber(process.env.DEMO_ZOOM, 1);
const layoutViewport = {
  width: Math.max(320, Math.round(outputSize.width / demoZoom)),
  height: Math.max(240, Math.round(outputSize.height / demoZoom))
};
const captureMode = (process.env.DEMO_CAPTURE || 'video').trim();
const frameCaptureFps = parsePositiveNumber(process.env.DEMO_FPS, 15);
const frameCaptureUsesDeviceScale = captureMode === 'frames' && demoZoom > 1;
const videoCaptureUsesCssZoom = captureMode !== 'frames' && demoZoom > 1;
const viewport = frameCaptureUsesDeviceScale ? layoutViewport : outputSize;
const contextDeviceScaleFactor = frameCaptureUsesDeviceScale ? demoZoom : 1;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(rootDir, 'output', 'playwright', 'demo', scenario, timestamp);
const demoUrl = `${baseUrl}?demo=1&demoReset=1`;
const seededDemoUrl = `${baseUrl}?demo=1`;
const demoSoundFiles = {
  typing: path.join(rootDir, 'public', 'demo-sounds', 'typing.ogg'),
  click: path.join(rootDir, 'public', 'demo-sounds', 'click.ogg'),
  highlight: path.join(rootDir, 'public', 'demo-sounds', 'highlight.ogg')
};
const soundVolumeMultiplier = 1.5;
const beveragePlanTitle = '우리 반 학생이 좋아하는 음료수 종류의 비율';
const beveragePlanItems = ['탄산음료', '과일주스', '차/커피', '기타'];
const beverageCounts = ['8', '6', '4', '2', '20'];
const beveragePercents = ['40', '30', '20', '10', '100'];
const demoGraphColors = ['#8fe6d2', '#ffd37a', '#ff9b9b', '#8fc2ff'];
const tableExplanationMs = 3000;
const tableFillTiming = {
  delay: 28,
  after: 500,
  moveDuration: 110,
  clickDuration: 90
};
const tableFillFinalAfterMs = 500;
const tableFillEndAfterMs = 500;
const tableCalloutGap = 6;
const tableCalloutHeight = 116;
const graphExplanationMs = 3000;
const graphStepAfterMs = 360;
const graphDemoTimingScale = 0.75;
const defaultGraphLabelWidth = 88;
const mainGraphLabelWidth = 112;
const barGraphViewBoxHeight = 36;
const barGraphBox = { left: 8, top: 10, width: 84, height: 14 };
const pieGraphCircle = { cx: 50, cy: 50, radius: 38 };
const graphSegments = [
  { label: '탄산음료', percent: 40, start: 0, end: 40, colorIndex: 0 },
  { label: '과일주스', percent: 30, start: 40, end: 70, colorIndex: 1 },
  { label: '차/커피', percent: 20, start: 70, end: 90, colorIndex: 2 },
  { label: '기타', percent: 10, start: 90, end: 100, colorIndex: 3 }
];
const graphDividers = [40, 70, 90];

let devServer = null;
let videoStartedAt = 0;
let recordingTrimStartMs = 0;
let recordingTrimmedDurationMs = 0;
let recordingCaptureActive = false;
let reportDownloadPath = null;
let stepLogPath = null;
const soundEvents = [];
const graphAnnotationState = {
  bar: { labels: [], arrows: [] },
  pie: { labels: [], arrows: [] }
};

async function logStep(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  if (!stepLogPath) return;
  await fs.appendFile(stepLogPath, `${line}\n`, 'utf8').catch(() => {});
}

function resetGraphAnnotationState() {
  graphAnnotationState.bar = { labels: [], arrows: [] };
  graphAnnotationState.pie = { labels: [], arrows: [] };
}

function getScenarioName() {
  const scenarioArg = process.argv.find((arg) => arg.startsWith('--scenario='));
  const requested = (scenarioArg ? scenarioArg.split('=')[1] : process.env.DEMO_SCENARIO || 'full').trim();
  return ['plan', 'table', 'graph', 'interpret', 'full'].includes(requested) ? requested : 'full';
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canReach(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1400) });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function startDevServerIfNeeded() {
  if (await canReach(baseUrl)) return false;

  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm run dev -- --host 127.0.0.1 --port 5173']
    : ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'];

  devServer = spawn(command, args, {
    cwd: rootDir,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  devServer.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  devServer.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

  const startedAt = Date.now();
  while (Date.now() - startedAt < 60000) {
    if (await canReach(baseUrl)) return true;
    await wait(500);
  }

  throw new Error(`Vite dev server did not respond at ${baseUrl}`);
}

async function waitForDemoReady(page) {
  await page.waitForFunction(() => window.HowToGraphDemo && window.HowToGraphDemo.ready, { timeout: 10000 });
  await page.evaluate(async () => {
    if (!document.fonts || !document.fonts.ready) return;
    try {
      await document.fonts.ready;
    } catch (error) {
      // The readiness wait is only a visual warmup; the demo can still run if a browser rejects it.
    }
  });
  await page.waitForTimeout(250);
}

async function applyDemoViewportZoom(page) {
  if (!videoCaptureUsesCssZoom) return;
  const scaledWidth = layoutViewport.width * demoZoom;
  const scaledHeight = layoutViewport.height * demoZoom;
  const offsetX = Math.max(0, Math.round((outputSize.width - scaledWidth) / 2));
  const offsetY = Math.max(0, Math.round((outputSize.height - scaledHeight) / 2));
  await page.evaluate((zoom) => {
    window.__HOW_TO_GRAPH_DEMO_VIEWPORT_ZOOM = zoom;
  }, demoZoom);
  await page.addStyleTag({
    content: `
      :root {
        --app-height: ${layoutViewport.height}px !important;
      }

      html,
      body,
      #root {
        width: ${outputSize.width}px !important;
        height: ${outputSize.height}px !important;
        min-height: ${outputSize.height}px !important;
        overflow: hidden !important;
        background: var(--page) !important;
      }

      .app-shell[data-demo-mode="true"] {
        width: ${layoutViewport.width}px !important;
        height: ${layoutViewport.height}px !important;
        max-width: none !important;
        margin: 0 !important;
        position: fixed !important;
        left: ${offsetX}px !important;
        top: ${offsetY}px !important;
        transform: none !important;
        zoom: ${demoZoom};
      }
    `
  });
}

async function warmDemoPage(browser) {
  const warmContext = await browser.newContext({
    viewport,
    deviceScaleFactor: contextDeviceScaleFactor,
    locale: 'ko-KR'
  });
  const warmPage = await warmContext.newPage();
  if (scenario === 'plan') await seedTwoItemPlanState(warmPage);
  if (scenario === 'table') await seedBeveragePlanState(warmPage);
  if (scenario === 'graph') await seedBeverageTableState(warmPage);
  if (scenario === 'interpret') await seedCompletedBeverageGraphState(warmPage);
  const warmUrl = scenario === 'table' || scenario === 'plan'
    ? seededDemoUrl
    : scenario === 'graph'
      ? `${seededDemoUrl}&demoTab=table`
      : scenario === 'interpret'
        ? `${seededDemoUrl}&demoTab=graph`
      : demoUrl;
  await warmPage.goto(warmUrl, { waitUntil: 'networkidle' });
  await applyDemoViewportZoom(warmPage);
  await waitForDemoReady(warmPage);
  await warmContext.close();
}

function stopDevServer() {
  if (!devServer || devServer.killed) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(devServer.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    devServer.kill('SIGTERM');
  }
}

function selectorForDemoId(id) {
  return `[data-demo-id="${id}"]`;
}

function recordSound(kind, offsetMs = 0) {
  if (!videoStartedAt || !demoSoundFiles[kind]) return;
  soundEvents.push({
    kind,
    at: Math.max(0, Date.now() - videoStartedAt + offsetMs)
  });
}

function markDemoStart() {
  recordingTrimStartMs = Math.max(0, Date.now() - videoStartedAt);
  recordingCaptureActive = true;
}

function recordTypingSounds(text, keyDelay) {
  const characters = Array.from(String(text || ''));
  const spacing = Math.max(32, Number(keyDelay) || 35);
  characters.forEach((character, index) => {
    if (!character.trim()) return;
    recordSound('typing', index * spacing);
  });
}

function normalizeDemoGraphLabelText(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n+$/g, '');
}

function assertNoTrailingGraphLabelNewline(type) {
  const graphState = graphAnnotationState[type];
  const badLabel = graphState.labels.find((label) => /[\r\n]$/.test(String(label.text || '')));
  if (badLabel) {
    throw new Error(`Graph demo label has a trailing newline: ${type} ${badLabel.id}`);
  }
}

async function assertRenderedGraphLabelsHaveNoTrailingNewline(page, type) {
  const selector = `${graphCanvasSelector(type)} .graph-floating-label`;
  const values = await page.locator(selector).evaluateAll((labels) => (
    labels.map((label) => label.value || label.textContent || '')
  ));
  const badIndex = values.findIndex((value) => /[\r\n]$/.test(String(value || '')));
  if (badIndex !== -1) {
    throw new Error(`Rendered graph demo label has a trailing newline: ${type} label ${badIndex + 1}`);
  }
}

async function assertRenderedGraphLabelsUseExpectedRows(page, type) {
  const selector = `${graphCanvasSelector(type)} .graph-floating-label`;
  const rows = await page.locator(selector).evaluateAll((labels) => (
    labels.map((label, index) => {
      const value = label.value || label.textContent || '';
      const expectedRows = value ? value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').length : 1;
      return {
        index: index + 1,
        value,
        expectedRows,
        actualRows: label.rows || 1
      };
    })
  ));
  const badLabel = rows.find((label) => label.value && label.actualRows > label.expectedRows);
  if (badLabel) {
    throw new Error(`Rendered graph demo label uses extra rows: ${type} label ${badLabel.index} expected ${badLabel.expectedRows}, got ${badLabel.actualRows}`);
  }
}

function timingScale(options = {}) {
  return parsePositiveNumber(options.timingScale, 1);
}

function scaledTiming(value, options = {}, minimum = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return Math.max(minimum, Math.round(numeric * timingScale(options)));
}

function scalePlainTimingOptions(options = {}, scaleOptions = {}) {
  const next = { ...options };
  ['after', 'moveDuration', 'clickDuration', 'dragDuration', 'delay', 'duration'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(options, key)) {
      next[key] = scaledTiming(options[key], scaleOptions, 0);
    }
  });
  return next;
}

function createTwoItemPlanState() {
  const graphDrawing = (type) => ({
    type,
    dividers: [],
    fills: {},
    undoStack: [],
    labels: [],
    arrows: []
  });
  return {
    plan: {
      title: '',
      items: ['', '']
    },
    table: {
      headerRow: ['', '', '', ''],
      rows: [
        ['인원(명)', '', '', ''],
        ['백분율(%)', '', '', '']
      ],
      tableDefaultsCleared: true
    },
    graph: {
      scale: 5,
      mode: 'divide',
      activeColor: '#8fe6d2',
      activeType: 'bar',
      bar: graphDrawing('bar'),
      pie: graphDrawing('pie')
    }
  };
}

function createBeveragePlanState() {
  const state = createTwoItemPlanState();
  return {
    ...state,
    plan: {
      title: beveragePlanTitle,
      items: beveragePlanItems
    },
    table: {
      headerRow: ['', ...beveragePlanItems, '합계'],
      rows: [
        ['인원(명)', '', '', '', '', ''],
        ['백분율(%)', '', '', '', '', '']
      ],
      tableDefaultsCleared: true
    }
  };
}

function createBeverageTableState() {
  const state = createBeveragePlanState();
  return {
    ...state,
    table: {
      ...state.table,
      rows: [
        ['인원(명)', ...beverageCounts],
        ['백분율(%)', ...beveragePercents]
      ],
      tableDefaultsCleared: true
    },
    graph: {
      ...state.graph,
      scale: 5,
      mode: 'divide',
      activeType: 'bar'
    }
  };
}

function createDemoGraphFills() {
  return graphSegments.reduce((fills, segment) => {
    fills[`${segment.start}-${segment.end}`] = demoGraphColors[segment.colorIndex] || demoGraphColors[0];
    return fills;
  }, {});
}

function createCompletedGraphDrawing(type) {
  return {
    type,
    dividers: graphDividers,
    fills: createDemoGraphFills(),
    undoStack: [],
    labels: [],
    arrows: []
  };
}

function createCompletedBeverageGraphState() {
  const state = createBeverageTableState();
  return {
    ...state,
    graph: {
      ...state.graph,
      scale: 5,
      mode: 'arrow',
      activeColor: demoGraphColors[0],
      activeType: 'pie',
      bar: createCompletedGraphDrawing('bar'),
      pie: createCompletedGraphDrawing('pie')
    }
  };
}

async function seedTwoItemPlanState(page) {
  await page.addInitScript((state) => {
    window.localStorage.setItem('how-to-graph-state', JSON.stringify(state));
    window.localStorage.removeItem('how-to-graph-interpretation');
  }, createTwoItemPlanState());
}

async function seedBeveragePlanState(page) {
  await page.addInitScript((state) => {
    window.localStorage.setItem('how-to-graph-state', JSON.stringify(state));
    window.localStorage.removeItem('how-to-graph-interpretation');
  }, createBeveragePlanState());
}

async function seedBeverageTableState(page) {
  await page.addInitScript((state) => {
    window.localStorage.setItem('how-to-graph-state', JSON.stringify(state));
    window.localStorage.removeItem('how-to-graph-interpretation');
  }, createBeverageTableState());
}

async function seedCompletedBeverageGraphState(page) {
  await page.addInitScript((state) => {
    window.localStorage.setItem('how-to-graph-state', JSON.stringify(state));
    window.localStorage.removeItem('how-to-graph-interpretation');
  }, createCompletedBeverageGraphState());
}

async function callDemo(page, method, args = {}) {
  await page.evaluate(
    ({ methodName, payload }) => window.HowToGraphDemo[methodName](payload),
    { methodName: method, payload: args }
  );
}

async function spotlight(page, target, title, text, placement = 'auto') {
  await showDemoSpotlight(page, {
    selector: target ? selectorForDemoId(target) : undefined,
    title,
    text,
    placement
  });
  await page.waitForTimeout(720);
}

async function showDemoSpotlight(page, options) {
  recordSound('highlight');
  await callDemo(page, 'showSpotlight', options);
}

async function clickDemoId(page, id, options = {}) {
  const selector = selectorForDemoId(id);
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible', timeout: 8000 });
  await locator.scrollIntoViewIfNeeded();
  if (options.title || options.text) {
    await spotlight(page, id, options.title || '', options.text || '', options.placement || 'auto');
  }
  if (options.moveDuration || options.clickDuration || options.clickXRatio || options.clickYRatio) {
    await clickLocatorWithDemoPointer(page, locator, {
      xRatio: options.clickXRatio,
      yRatio: options.clickYRatio,
      moveDuration: options.moveDuration,
      clickDuration: options.clickDuration
    });
  } else {
    recordSound('click');
    await callDemo(page, 'clickTarget', { selector });
    await locator.click({ timeout: 8000 });
  }
  await page.waitForTimeout(options.after ?? 300);
}

async function clickLocatorWithDemoPointer(page, locator, options = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Could not read element bounds for demo pointer click.');
  const xRatio = options.xRatio ?? 0.5;
  const yRatio = options.yRatio ?? 0.5;
  const x = box.x + box.width * xRatio;
  const y = box.y + box.height * yRatio;
  await callDemo(page, 'movePointer', { x, y, duration: options.moveDuration ?? 220 });
  recordSound('click');
  await callDemo(page, 'clickAt', { x, y, duration: options.clickDuration ?? 180 });
  await locator.click({
    timeout: 8000,
    position: {
      x: box.width * xRatio,
      y: box.height * yRatio
    }
  });
}

async function fillDemoId(page, id, value, options = {}) {
  const selector = selectorForDemoId(id);
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible', timeout: 8000 });
  await locator.scrollIntoViewIfNeeded();
  if (options.title || options.text) {
    await spotlight(page, id, options.title || '', options.text || '', options.placement || 'auto');
  }
  if (options.clickXRatio || options.clickYRatio) {
    await clickLocatorWithDemoPointer(page, locator, {
      xRatio: options.clickXRatio,
      yRatio: options.clickYRatio,
      moveDuration: options.moveDuration,
      clickDuration: options.clickDuration
    });
  } else {
    await callDemo(page, 'clickTarget', { selector });
    await locator.click({ timeout: 8000 });
  }
  await page.keyboard.press('Control+A');
  const keyDelay = options.delay ?? 35;
  recordTypingSounds(value, keyDelay);
  await page.keyboard.type(value, { delay: keyDelay });
  await page.waitForTimeout(options.after ?? 260);
}

async function clickCanvasPercent(page, percent, options = {}) {
  const selector = selectorForDemoId(options.canvas || 'graph-canvas-bar');
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible', timeout: 8000 });
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Could not read graph canvas bounds for ${selector}`);
  const x = box.x + box.width * (0.08 + 0.84 * percent);
  const y = box.y + box.height * (options.yRatio ?? 0.48);
  await callDemo(page, 'movePointer', { x, y, duration: 260 });
  recordSound('click');
  await callDemo(page, 'clickAt', { x, y, duration: 180 });
  await page.mouse.click(x, y);
  await page.waitForTimeout(options.after ?? 260);
}

async function typeInFirstGraphLabel(page, text) {
  const label = page.locator('.graph-floating-label').last();
  await label.waitFor({ state: 'visible', timeout: 8000 });
  await label.fill(text);
  await page.waitForTimeout(360);
}

function graphCanvasSelector(type) {
  return selectorForDemoId(`graph-canvas-${type}`);
}

function graphSvgSelector(type) {
  return `${graphCanvasSelector(type)} ${type === 'pie' ? '.pie-svg' : '.bar-svg'}`;
}

async function spotlightSelector(page, selector, title, options = {}) {
  recordSound('highlight');
  await callDemo(page, 'showSpotlight', {
    selector,
    title,
    placement: options.placement || 'auto',
    padding: options.padding,
    radius: options.radius,
    calloutGap: options.calloutGap,
    calloutHeight: options.calloutHeight,
    calloutWidth: options.calloutWidth
  });
  await page.waitForTimeout(options.duration ?? graphExplanationMs);
}

async function clearDemoSpotlight(page, delay = 180) {
  await callDemo(page, 'clearSpotlight');
  if (delay) await page.waitForTimeout(delay);
}

async function spotlightDemoId(page, id, title, options = {}) {
  await spotlightSelector(page, selectorForDemoId(id), title, options);
}

async function clickClientPoint(page, point, options = {}) {
  if (options.debugLabel) await logStep(`graph: click point start ${options.debugLabel} (${Math.round(point.x)}, ${Math.round(point.y)})`);
  await callDemo(page, 'movePointer', {
    x: point.x,
    y: point.y,
    duration: options.moveDuration ?? 220
  });
  if (options.debugLabel) await logStep(`graph: click point moved ${options.debugLabel}`);
  recordSound('click');
  await callDemo(page, 'clickAt', {
    x: point.x,
    y: point.y,
    duration: options.clickDuration ?? 160
  });
  if (options.debugLabel) await logStep(`graph: click point animated ${options.debugLabel}`);
  await page.mouse.click(point.x, point.y);
  if (options.debugLabel) await logStep(`graph: click point dom-clicked ${options.debugLabel}`);
  await page.waitForTimeout(options.after ?? graphStepAfterMs);
}

async function animateClientPointClick(page, point, options = {}) {
  await callDemo(page, 'movePointer', {
    x: point.x,
    y: point.y,
    duration: options.moveDuration ?? 180
  });
  recordSound('click');
  await callDemo(page, 'clickAt', {
    x: point.x,
    y: point.y,
    duration: options.clickDuration ?? 140
  });
  await page.waitForTimeout(options.after ?? 120);
}

async function getGraphClientPoint(page, type, location = {}) {
  if (location.canvas) {
    const canvas = page.locator(graphCanvasSelector(type));
    await canvas.waitFor({ state: 'visible', timeout: 8000 });
    return canvas.evaluate((element, canvasLocation) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width * (canvasLocation.x / 100),
        y: rect.top + rect.height * (canvasLocation.y / 100)
      };
    }, location.canvas);
  }

  const svg = page.locator(graphSvgSelector(type));
  await svg.waitFor({ state: 'visible', timeout: 8000 });
  return svg.evaluate((element, payload) => {
    const rect = element.getBoundingClientRect();
    if (payload.type === 'pie') {
      const angle = payload.percent / 100 * 360 - 90;
      const radians = angle * Math.PI / 180;
      const radius = Number.isFinite(Number(payload.radius)) ? Number(payload.radius) : payload.circle.radius * 0.72;
      const rawX = payload.circle.cx + radius * Math.cos(radians);
      const rawY = payload.circle.cy + radius * Math.sin(radians);
      return {
        x: rect.left + rect.width * (rawX / 100),
        y: rect.top + rect.height * (rawY / 100)
      };
    }

    const rawX = payload.box.left + payload.box.width * (payload.percent / 100);
    const yRatio = Number.isFinite(Number(payload.yRatio)) ? Number(payload.yRatio) : 0.5;
    const rawY = payload.box.top + payload.box.height * yRatio;
    return {
      x: rect.left + rect.width * (rawX / 100),
      y: rect.top + rect.height * (rawY / payload.viewBoxHeight)
    };
  }, {
    type,
    percent: location.percent,
    radius: location.radius,
    yRatio: location.yRatio,
    box: barGraphBox,
    viewBoxHeight: barGraphViewBoxHeight,
    circle: pieGraphCircle
  });
}

async function getCanvasPercentFromClientPoint(page, type, point) {
  const canvas = page.locator(graphCanvasSelector(type));
  await canvas.waitFor({ state: 'visible', timeout: 8000 });
  return canvas.evaluate((element, clientPoint) => {
    const rect = element.getBoundingClientRect();
    return {
      x: ((clientPoint.x - rect.left) / rect.width) * 100,
      y: ((clientPoint.y - rect.top) / rect.height) * 100
    };
  }, point);
}

async function getGraphLocationPoints(page, type, location) {
  const client = await getGraphClientPoint(page, type, location);
  const canvas = await getCanvasPercentFromClientPoint(page, type, client);
  return { client, canvas };
}

async function clickGraphLocation(page, type, location, options = {}) {
  const point = await getGraphClientPoint(page, type, location);
  await clickClientPoint(page, point, options);
}

async function setGraphAnnotations(page, type, options = {}) {
  await page.waitForFunction(
    () => window.HowToGraphAppDemo && typeof window.HowToGraphAppDemo.setGraphAnnotations === 'function',
    undefined,
    { timeout: 8000 }
  );
  await page.evaluate(({ graphType, annotations }) => {
    window.HowToGraphAppDemo.setGraphAnnotations(graphType, annotations);
  }, {
    graphType: type,
    annotations: graphAnnotationState[type]
  });
  const after = options.after ?? 80;
  if (after > 0) await page.waitForTimeout(after);
}

async function waitForLatestGraphLabelText(page, type, text) {
  const selector = `${graphCanvasSelector(type)} .graph-floating-label`;
  await page.waitForFunction(({ labelSelector, expectedText }) => {
    const labels = Array.from(document.querySelectorAll(labelSelector));
    const latest = labels[labels.length - 1];
    return latest && latest.value === expectedText;
  }, { labelSelector: selector, expectedText: text }, { timeout: 4000 });
}

async function typeLatestGraphLabel(page, type, text, options = {}) {
  const selector = `${graphCanvasSelector(type)} .graph-floating-label`;
  const label = page.locator(selector).last();
  await label.waitFor({ state: 'visible', timeout: 8000 });
  await typeGraphLabelLocator(page, label, text, options);
}

async function typeGraphLabelLocator(page, label, text, options = {}) {
  const labelText = normalizeDemoGraphLabelText(text);
  await logStep(`graph: type label start "${labelText.replace(/\n/g, ' / ')}"`);
  const keyDelay = options.delay ?? 38;
  recordTypingSounds(labelText, keyDelay);
  let current = '';
  for (const character of Array.from(labelText)) {
    current += character;
    if (/[\r\n]$/.test(current)) {
      await wait(keyDelay);
      continue;
    }
    await label.evaluate((element, value) => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      const previousValue = element.value;
      descriptor.set.call(element, value);
      const tracker = element._valueTracker;
      if (tracker) tracker.setValue(previousValue);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, current);
    await wait(keyDelay);
  }

  await page.waitForTimeout(30);
  const typedValue = await label.evaluate((element) => element.value);
  if (typedValue !== labelText) throw new Error(`Graph label typing failed: expected "${labelText}", got "${typedValue}".`);
  if (/[\r\n]$/.test(typedValue)) throw new Error(`Graph label typing left a trailing newline: "${typedValue}".`);
  await logStep(`graph: type label done "${labelText.replace(/\n/g, ' / ')}"`);
  await page.waitForTimeout(options.after ?? 240);
}

async function addGraphLabel(page, type, location, text, options = {}) {
  const labelText = normalizeDemoGraphLabelText(text);
  if (/[\r\n]$/.test(labelText)) {
    throw new Error(`Graph demo label text still ends with a newline: ${labelText}`);
  }
  await logStep(`graph: add label ${type} "${labelText.replace(/\n/g, ' / ')}"`);
  const point = await getGraphLocationPoints(page, type, location);
  await animateClientPointClick(page, point.client, {
    after: scaledTiming(80, options, 20),
    moveDuration: scaledTiming(options.moveDuration ?? 180, options, 40),
    clickDuration: scaledTiming(options.clickDuration ?? 140, options, 40)
  });
  const keyDelay = scaledTiming(options.delay ?? 64, options, 22);
  const label = {
    id: `${type}-label-${graphAnnotationState[type].labels.length + 1}`,
    text: '',
    x: point.canvas.x,
    y: point.canvas.y,
    width: options.width || defaultGraphLabelWidth,
    fontSize: options.fontSize || 20,
    color: options.color || '#1f2d3d'
  };
  graphAnnotationState[type].labels.push(label);

  let current = '';
  for (const character of Array.from(labelText)) {
    current += character;
    if (/[\r\n]$/.test(current)) {
      await assertRenderedGraphLabelsHaveNoTrailingNewline(page, type);
      await wait(keyDelay);
      continue;
    }
    label.text = current;
    if (character.trim()) recordSound('typing');
    await setGraphAnnotations(page, type, { after: 0 });
    await waitForLatestGraphLabelText(page, type, current);
    await wait(keyDelay);
  }

  await setGraphAnnotations(page, type, { after: 0 });
  assertNoTrailingGraphLabelNewline(type);
  await assertRenderedGraphLabelsHaveNoTrailingNewline(page, type);
  await assertRenderedGraphLabelsUseExpectedRows(page, type);
  await page.waitForTimeout(scaledTiming(options.after ?? 220, options, 40));
}

async function dragGraphArrow(page, type, startLocation, endLocation, options = {}) {
  const start = await getGraphLocationPoints(page, type, startLocation);
  const end = await getGraphLocationPoints(page, type, endLocation);
  await callDemo(page, 'movePointer', {
    x: start.client.x,
    y: start.client.y,
    duration: scaledTiming(options.moveDuration ?? 220, options, 50)
  });
  recordSound('click');
  await callDemo(page, 'clickAt', {
    x: start.client.x,
    y: start.client.y,
    duration: scaledTiming(options.clickDuration ?? 120, options, 40)
  });
  await callDemo(page, 'movePointer', {
    x: end.client.x,
    y: end.client.y,
    duration: scaledTiming(options.dragDuration ?? 520, options, 90)
  });
  graphAnnotationState[type].arrows.push({
    id: `${type}-arrow-${graphAnnotationState[type].arrows.length + 1}`,
    x1: start.canvas.x,
    y1: start.canvas.y,
    x2: end.canvas.x,
    y2: end.canvas.y
  });
  await setGraphAnnotations(page, type);
  await page.waitForTimeout(scaledTiming(options.after ?? 420, options, 80));
}

async function drawGraphDividers(page, type, options = {}) {
  for (const divider of graphDividers) {
    await clickGraphLocation(page, type, {
      percent: divider,
      radius: pieGraphCircle.radius * 0.78,
      yRatio: 0.5
    }, {
      after: scaledTiming(graphStepAfterMs, options, 80),
      moveDuration: scaledTiming(220, options, 60),
      clickDuration: scaledTiming(160, options, 45)
    });
  }
}

async function paintGraphSegments(page, type, options = {}) {
  for (const segment of graphSegments) {
    await clickDemoId(page, `graph-color-${segment.colorIndex}`, {
      after: scaledTiming(100, options, 35),
      moveDuration: scaledTiming(120, options, 40),
      clickDuration: scaledTiming(80, options, 35)
    });
    await clickGraphLocation(page, type, {
      percent: (segment.start + segment.end) / 2,
      radius: pieGraphCircle.radius * 0.56,
      yRatio: 0.5
    }, {
      after: scaledTiming(220, options, 70),
      moveDuration: scaledTiming(180, options, 50),
      clickDuration: scaledTiming(140, options, 40)
    });
  }
}

async function addMainGraphLabels(page, type, options = {}) {
  const mainSegments = graphSegments.slice(0, 3);
  for (const segment of mainSegments) {
    await addGraphLabel(page, type, getMainGraphLabelLocation(type, segment), `${segment.label}\n(${segment.percent}%)`, { ...options, width: options.width || mainGraphLabelWidth });
  }
}

function getMainGraphLabelLocation(type, segment) {
  if (type === 'pie' && segment.label === '과일주스') {
    return { canvas: { x: 46.5, y: 67 } };
  }
  return {
    percent: (segment.start + segment.end) / 2,
    radius: type === 'pie' ? pieGraphCircle.radius * 0.42 : undefined,
    yRatio: 0.46
  };
}

async function addNarrowSegmentLabelAndArrow(page, type, options = {}) {
  const outsideLocation = type === 'pie'
    ? { canvas: { x: 38, y: 8 } }
    : { canvas: { x: 96, y: 25 } };
  const arrowStart = type === 'pie'
    ? { canvas: { x: 43, y: 14 } }
    : { canvas: { x: 94, y: 30 } };
  const arrowEnd = type === 'pie'
    ? { canvas: { x: 46.5, y: 28 } }
    : { percent: 96, yRatio: 0.5 };

  await addGraphLabel(page, type, outsideLocation, '기타\n(10%)', { ...options, width: defaultGraphLabelWidth });
  await clickDemoId(page, 'graph-mode-control-arrow', {
    after: scaledTiming(240, options, 60),
    moveDuration: scaledTiming(180, options, 50),
    clickDuration: scaledTiming(120, options, 40)
  });
  await dragGraphArrow(page, type, arrowStart, arrowEnd, options);
}

function makePreparedGraphLabel(type, index, text, point, options = {}) {
  const labelText = normalizeDemoGraphLabelText(text);
  return {
    id: `${type}-label-${index + 1}`,
    text: labelText,
    x: point.canvas.x,
    y: point.canvas.y,
    width: options.width || defaultGraphLabelWidth,
    fontSize: options.fontSize || 20,
    color: options.color || '#1f2d3d'
  };
}

async function prepareCompletedGraphAnnotations(page) {
  resetGraphAnnotationState();
  for (const type of ['bar', 'pie']) {
    const labels = [];
    const mainSegments = graphSegments.slice(0, 3);

    await logStep(`interpret: activate ${type} graph`);
    graphAnnotationState[type] = { labels: [], arrows: [] };
    await setGraphAnnotations(page, type, { after: 160 });
    await page.locator(graphCanvasSelector(type)).waitFor({ state: 'visible', timeout: 8000 });
    await logStep(`interpret: ${type} graph ready`);

    for (const segment of mainSegments) {
      const point = await getGraphLocationPoints(page, type, getMainGraphLabelLocation(type, segment));
      labels.push(makePreparedGraphLabel(
        type,
        labels.length,
        `${segment.label}\n(${segment.percent}%)`,
        point,
        { width: mainGraphLabelWidth }
      ));
      await logStep(`interpret: ${type} label ${segment.label}`);
    }

    const outsideLocation = type === 'pie'
      ? { canvas: { x: 38, y: 8 } }
      : { canvas: { x: 96, y: 25 } };
    const outsidePoint = await getGraphLocationPoints(page, type, outsideLocation);
    labels.push(makePreparedGraphLabel(type, labels.length, '기타\n(10%)', outsidePoint));

    const arrowStart = type === 'pie'
      ? await getGraphLocationPoints(page, type, { canvas: { x: 43, y: 14 } })
      : await getGraphLocationPoints(page, type, { canvas: { x: 94, y: 30 } });
    const arrowEnd = type === 'pie'
      ? await getGraphLocationPoints(page, type, { canvas: { x: 46.5, y: 28 } })
      : await getGraphLocationPoints(page, type, { percent: 96, yRatio: 0.5 });

    graphAnnotationState[type] = {
      labels,
      arrows: [{
        id: `${type}-arrow-1`,
        x1: arrowStart.canvas.x,
        y1: arrowStart.canvas.y,
        x2: arrowEnd.canvas.x,
        y2: arrowEnd.canvas.y
      }]
    };
    await setGraphAnnotations(page, type, { after: 160 });
    await assertRenderedGraphLabelsUseExpectedRows(page, type);
    await logStep(`interpret: ${type} annotations applied`);
  }
  await page.waitForTimeout(240);
  await page.locator('.graph-presentation-bar').click({ position: { x: 12, y: 12 }, timeout: 8000 });
  await page.waitForTimeout(160);
}

async function saveReportDownload(page, options = {}) {
  const downloadPromise = page.waitForEvent('download', { timeout: 12000 }).catch(() => null);
  await clickDemoId(page, 'report-save', scalePlainTimingOptions({ after: 600 }, options));
  const download = await downloadPromise;
  if (!download) throw new Error('Report image download did not start.');

  const suggestedName = download.suggestedFilename() || 'graph-report.png';
  reportDownloadPath = path.join(outputDir, suggestedName);
  await download.saveAs(reportDownloadPath);

  for (const candidate of page.context().pages()) {
    if (candidate !== page && !candidate.isClosed()) await candidate.close().catch(() => {});
  }
  await page.bringToFront();
  await page.waitForTimeout(scaledTiming(500, options, 0));
}

async function makeMp4WithSound(webmPath, events) {
  if (!ffmpegPath || !events.length) return null;
  const mp4Path = webmPath.replace(/\.webm$/i, '.mp4');
  const audioPath = webmPath.replace(/\.webm$/i, '.audio.m4a');
  const soundEventsPath = webmPath.replace(/\.webm$/i, '.sound-events.json');
  const trimStartSeconds = Math.max(0, recordingTrimStartMs / 1000);
  const silenceDurationSeconds = Math.max(1, recordingTrimmedDurationMs / 1000 + 1);
  await fs.writeFile(soundEventsPath, JSON.stringify(events, null, 2), 'utf8');

  const audioArgs = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error'
  ];
  events.forEach((event) => {
    audioArgs.push('-i', demoSoundFiles[event.kind]);
  });

  const filters = [
    `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${silenceDurationSeconds.toFixed(3)}[silence]`
  ];
  events.forEach((event, index) => {
    const delay = Math.max(0, Math.round(event.at - recordingTrimStartMs));
    const baseVolume = event.kind === 'typing' ? 0.28 : event.kind === 'highlight' ? 0.46 : 0.34;
    const volume = Math.min(1, Number((baseVolume * soundVolumeMultiplier).toFixed(3)));
    filters.push(`[${index}:a]volume=${volume},adelay=${delay}:all=1,aformat=sample_fmts=fltp:channel_layouts=stereo[s${index}]`);
  });
  filters.push(`[silence]${events.map((_, index) => `[s${index}]`).join('')}amix=inputs=${events.length + 1}:duration=first:dropout_transition=0:normalize=0[a]`);

  audioArgs.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[a]',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    audioPath
  );

  const audioResult = spawnSync(ffmpegPath, audioArgs, { encoding: 'utf8', timeout: 120000 });
  if (audioResult.status !== 0) {
    console.warn(`Audio mix failed: ${audioResult.stderr || audioResult.error?.message || 'unknown ffmpeg error'}`);
    return null;
  }

  const videoArgs = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    webmPath,
    '-i',
    audioPath,
    '-filter_complex',
    `[0:v]trim=start=${trimStartSeconds.toFixed(3)},setpts=PTS-STARTPTS[v]`,
    '-map',
    '[v]',
    '-map',
    '1:a',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '15',
    '-movflags',
    '+faststart',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'copy',
    '-shortest',
    mp4Path
  ];

  const result = spawnSync(ffmpegPath, videoArgs, { encoding: 'utf8', timeout: 180000 });
  if (result.status !== 0) {
    console.warn(`MP4 mux failed: ${result.stderr || result.error?.message || 'unknown ffmpeg error'}`);
    return null;
  }
  return result.status === 0 ? mp4Path : null;
}

async function captureFrames(page, frameDir, state) {
  await fs.mkdir(frameDir, { recursive: true });
  while (!recordingCaptureActive && !state.stop) {
    await wait(10);
  }

  const startedAt = Date.now();
  let nextAt = startedAt;
  let frameCount = 0;
  while (!state.stop) {
    const framePath = path.join(frameDir, `frame-${String(frameCount).padStart(6, '0')}.jpg`);
    await page.screenshot({
      path: framePath,
      type: 'jpeg',
      quality: 100,
      fullPage: false,
      scale: 'device'
    });
    frameCount += 1;
    nextAt += 1000 / frameCaptureFps;
    await wait(Math.max(0, nextAt - Date.now()));
  }

  const durationMs = Math.max(1000, Date.now() - startedAt);
  return {
    frameDir,
    frameCount,
    durationMs,
    frameRate: frameCount / (durationMs / 1000)
  };
}

async function makeAudioTrack(audioPath, events, durationMs, soundEventsPath) {
  if (!ffmpegPath || !events.length) return null;
  await fs.writeFile(soundEventsPath, JSON.stringify(events, null, 2), 'utf8');
  const silenceDurationSeconds = Math.max(1, durationMs / 1000 + 1);
  const audioArgs = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error'
  ];
  events.forEach((event) => {
    audioArgs.push('-i', demoSoundFiles[event.kind]);
  });

  const filters = [
    `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${silenceDurationSeconds.toFixed(3)}[silence]`
  ];
  events.forEach((event, index) => {
    const delay = Math.max(0, Math.round(event.at - recordingTrimStartMs));
    const baseVolume = event.kind === 'typing' ? 0.28 : event.kind === 'highlight' ? 0.46 : 0.34;
    const volume = Math.min(1, Number((baseVolume * soundVolumeMultiplier).toFixed(3)));
    filters.push(`[${index}:a]volume=${volume},adelay=${delay}:all=1,aformat=sample_fmts=fltp:channel_layouts=stereo[s${index}]`);
  });
  filters.push(`[silence]${events.map((_, index) => `[s${index}]`).join('')}amix=inputs=${events.length + 1}:duration=first:dropout_transition=0:normalize=0[a]`);

  audioArgs.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[a]',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    audioPath
  );

  const audioResult = spawnSync(ffmpegPath, audioArgs, { encoding: 'utf8', timeout: 120000 });
  if (audioResult.status !== 0) {
    console.warn(`Audio mix failed: ${audioResult.stderr || audioResult.error?.message || 'unknown ffmpeg error'}`);
    return null;
  }
  return audioPath;
}

async function makeMp4FromFramesWithSound(frameResult, events) {
  if (!ffmpegPath || !frameResult.frameCount) return null;
  const videoOnlyPath = path.join(outputDir, 'frames-video.mp4');
  const audioPath = path.join(outputDir, 'frames.audio.m4a');
  const mp4Path = path.join(outputDir, 'frames-hq.mp4');
  const soundEventsPath = path.join(outputDir, 'frames.sound-events.json');

  const videoArgs = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-framerate',
    String(Number(frameResult.frameRate.toFixed(6))),
    '-start_number',
    '0',
    '-i',
    path.join(frameResult.frameDir, 'frame-%06d.jpg'),
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '10',
    '-movflags',
    '+faststart',
    '-pix_fmt',
    'yuv420p',
    videoOnlyPath
  ];
  const videoResult = spawnSync(ffmpegPath, videoArgs, { encoding: 'utf8', timeout: 180000 });
  if (videoResult.status !== 0) {
    console.warn(`Frame video encode failed: ${videoResult.stderr || videoResult.error?.message || 'unknown ffmpeg error'}`);
    return null;
  }

  const mixedAudioPath = await makeAudioTrack(audioPath, events, frameResult.durationMs, soundEventsPath);
  if (!mixedAudioPath) return videoOnlyPath;

  const muxArgs = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    videoOnlyPath,
    '-i',
    mixedAudioPath,
    '-c',
    'copy',
    '-shortest',
    mp4Path
  ];
  const muxResult = spawnSync(ffmpegPath, muxArgs, { encoding: 'utf8', timeout: 120000 });
  if (muxResult.status !== 0) {
    console.warn(`Frame MP4 mux failed: ${muxResult.stderr || muxResult.error?.message || 'unknown ffmpeg error'}`);
    return videoOnlyPath;
  }
  return mp4Path;
}

async function runPlanDemo(page) {
  await seedTwoItemPlanState(page);
  await page.goto(seededDemoUrl, { waitUntil: 'networkidle' });
  await applyDemoViewportZoom(page);
  await waitForDemoReady(page);
  markDemoStart();

  await clickLocatorWithDemoPointer(page, page.locator(selectorForDemoId('plan-item-0')), { xRatio: 0.86 });
  await showDemoSpotlight(page, {
    selector: selectorForDemoId('plan-item-0'),
    title: '표로 정리할 항목 정하기',
    placement: 'right'
  });
  await page.waitForTimeout(3000);
  await callDemo(page, 'clearSpotlight');

  await fillDemoId(page, 'plan-item-0', '탄산음료', { delay: 28, after: 500, clickXRatio: 0.86, moveDuration: 110, clickDuration: 90 });
  await fillDemoId(page, 'plan-item-1', '과일주스', { delay: 28, after: 500, clickXRatio: 0.86, moveDuration: 110, clickDuration: 90 });
  await clickDemoId(page, 'plan-add-item', { after: 500, moveDuration: 110, clickDuration: 90 });
  await clickDemoId(page, 'plan-add-item', { after: 500, moveDuration: 110, clickDuration: 90 });
  await fillDemoId(page, 'plan-item-2', '차/커피', { delay: 28, after: 500, clickXRatio: 0.86, moveDuration: 110, clickDuration: 90 });
  await fillDemoId(page, 'plan-item-3', '기타', { delay: 28, after: 500, clickXRatio: 0.86, moveDuration: 110, clickDuration: 90 });
  await clickDemoId(page, 'plan-next-items', { after: 1200 });

  await showDemoSpotlight(page, {
    selector: selectorForDemoId('plan-title'),
    title: '표의 이름 정하기',
    placement: 'bottom'
  });
  await page.waitForTimeout(3000);
  await callDemo(page, 'clearSpotlight');
  await fillDemoId(page, 'plan-title', '우리 반 학생이 좋아하는 음료수 종류의 비율', { delay: 45, after: 1500 });

  await clickDemoId(page, 'plan-next-title', { after: 1000 });
  await showDemoSpotlight(page, {
    selector: '.plan-sheet-screen',
    title: '계획 확인',
    placement: 'bottom'
  });
  await page.waitForTimeout(3000);
  await callDemo(page, 'clearSpotlight');
  await page.waitForTimeout(300);
}

async function runTableDemo(page) {
  await seedBeveragePlanState(page);
  await page.goto(seededDemoUrl, { waitUntil: 'networkidle' });
  await applyDemoViewportZoom(page);
  await waitForDemoReady(page);
  await page.locator(selectorForDemoId('plan-next-items')).click({ timeout: 8000 });
  await page.locator(selectorForDemoId('plan-next-title')).click({ timeout: 8000 });
  await page.locator('.plan-sheet-screen').waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(250);
  markDemoStart();

  await showDemoSpotlight(page, {
    selector: selectorForDemoId('tab-table'),
    title: '표로 정리하기 시작',
    placement: 'bottom'
  });
  await page.waitForTimeout(tableExplanationMs);
  await callDemo(page, 'clearSpotlight');
  await clickDemoId(page, 'tab-table', { after: 1000 });

  await showDemoSpotlight(page, {
    selector: selectorForDemoId('manual-cell-0-1'),
    title: '조사한 자료를 표로 정리',
    placement: 'top',
    calloutGap: tableCalloutGap,
    calloutHeight: tableCalloutHeight
  });
  await page.waitForTimeout(tableExplanationMs);
  await callDemo(page, 'clearSpotlight');

  for (let index = 0; index < beverageCounts.length - 1; index += 1) {
    await fillDemoId(page, `manual-cell-0-${index + 1}`, beverageCounts[index], {
      ...tableFillTiming
    });
  }
  await fillDemoId(page, `manual-cell-0-${beverageCounts.length}`, beverageCounts[beverageCounts.length - 1], {
    delay: tableFillTiming.delay,
    after: tableFillFinalAfterMs,
    moveDuration: tableFillTiming.moveDuration,
    clickDuration: tableFillTiming.clickDuration
  });

  await showDemoSpotlight(page, {
    selector: selectorForDemoId('manual-cell-1-1'),
    title: '각 항목의 백분율 구하기',
    placement: 'top',
    calloutGap: tableCalloutGap,
    calloutHeight: tableCalloutHeight
  });
  await page.waitForTimeout(tableExplanationMs);
  await callDemo(page, 'clearSpotlight');

  for (let index = 0; index < beveragePercents.length - 1; index += 1) {
    await fillDemoId(page, `manual-cell-1-${index + 1}`, beveragePercents[index], {
      ...tableFillTiming
    });
  }

  await showDemoSpotlight(page, {
    selector: selectorForDemoId(`manual-cell-1-${beveragePercents.length}`),
    title: '백분율의 합이 100인지 확인',
    placement: 'top',
    calloutGap: tableCalloutGap,
    calloutHeight: tableCalloutHeight
  });
  await page.waitForTimeout(tableExplanationMs);
  await callDemo(page, 'clearSpotlight');

  await fillDemoId(page, `manual-cell-1-${beveragePercents.length}`, beveragePercents[beveragePercents.length - 1], {
    delay: tableFillTiming.delay,
    after: tableFillEndAfterMs,
    moveDuration: tableFillTiming.moveDuration,
    clickDuration: tableFillTiming.clickDuration
  });
  await page.evaluate(() => {
    if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
  });
  await callDemo(page, 'setPointerVisible', false);
  await page.waitForTimeout(300);
}

async function runGraphDemo(page) {
  resetGraphAnnotationState();
  const graphTiming = { timingScale: graphDemoTimingScale };
  const pieFastTiming = { timingScale: graphDemoTimingScale * 0.5 };
  const clickGraphDemoId = (id, options = {}) => clickDemoId(page, id, scalePlainTimingOptions(options, graphTiming));
  const spotlightGraphSelector = (selector, title, options = {}) => spotlightSelector(page, selector, title, {
    ...options,
    duration: scaledTiming(options.duration ?? graphExplanationMs, graphTiming, 0)
  });
  const spotlightGraphDemoId = (id, title, options = {}) => spotlightGraphSelector(selectorForDemoId(id), title, options);
  const clearGraphSpotlight = () => clearDemoSpotlight(page, scaledTiming(180, graphTiming, 0));
  await logStep('graph: seed and open table tab');
  await seedBeverageTableState(page);
  await page.goto(`${seededDemoUrl}&demoTab=table`, { waitUntil: 'networkidle' });
  await applyDemoViewportZoom(page);
  await waitForDemoReady(page);
  await page.locator(selectorForDemoId('tab-table')).waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(scaledTiming(300, graphTiming, 0));
  markDemoStart();

  await logStep('graph: open graph tab');
  await spotlightGraphDemoId('tab-graph', '그래프 그리기 시작', { placement: 'bottom' });
  await clearGraphSpotlight();
  await clickGraphDemoId('tab-graph', { after: 1000 });

  await logStep('graph: explain type');
  await spotlightGraphSelector('.graph-type-control', '그래프 종류 선택', { placement: 'right' });
  await clearGraphSpotlight();

  await logStep('graph: draw bar dividers');
  await spotlightGraphDemoId('graph-mode-control-divide', '그래프 칸 나누기', { placement: 'right' });
  await clearGraphSpotlight();
  await clickGraphDemoId('graph-mode-control-divide', { after: 260 });
  await drawGraphDividers(page, 'bar', graphTiming);

  await logStep('graph: paint bar');
  await spotlightGraphDemoId('graph-mode-control-paint', '색칠하기', { placement: 'right' });
  await clearGraphSpotlight();
  await clickGraphDemoId('graph-mode-control-paint', { after: 320 });
  await paintGraphSegments(page, 'bar', graphTiming);

  await logStep('graph: label bar');
  await spotlightGraphDemoId('graph-mode-control-text', '항목 이름과 백분율 적기', { placement: 'right' });
  await clearGraphSpotlight();
  await clickGraphDemoId('graph-mode-control-text', { after: 260 });
  await addMainGraphLabels(page, 'bar', graphTiming);

  await logStep('graph: arrow bar');
  await spotlightGraphDemoId('graph-mode-control-arrow', '좁은 칸은 화살표 사용', { placement: 'right' });
  await clearGraphSpotlight();
  await addNarrowSegmentLabelAndArrow(page, 'bar', graphTiming);

  await logStep('graph: draw pie');
  await clickDemoId(page, 'graph-type-control-pie', {
    after: scaledTiming(900, pieFastTiming, 180),
    moveDuration: scaledTiming(180, pieFastTiming, 50),
    clickDuration: scaledTiming(120, pieFastTiming, 40)
  });
  await clickDemoId(page, 'graph-mode-control-divide', {
    after: scaledTiming(240, pieFastTiming, 60),
    moveDuration: scaledTiming(180, pieFastTiming, 50),
    clickDuration: scaledTiming(120, pieFastTiming, 40)
  });
  await drawGraphDividers(page, 'pie', pieFastTiming);
  await clickDemoId(page, 'graph-mode-control-paint', {
    after: scaledTiming(260, pieFastTiming, 70),
    moveDuration: scaledTiming(180, pieFastTiming, 50),
    clickDuration: scaledTiming(120, pieFastTiming, 40)
  });
  await paintGraphSegments(page, 'pie', pieFastTiming);
  await clickDemoId(page, 'graph-mode-control-text', {
    after: scaledTiming(260, pieFastTiming, 70),
    moveDuration: scaledTiming(180, pieFastTiming, 50),
    clickDuration: scaledTiming(120, pieFastTiming, 40)
  });
  await addMainGraphLabels(page, 'pie', pieFastTiming);
  await addNarrowSegmentLabelAndArrow(page, 'pie', pieFastTiming);
  await page.waitForTimeout(scaledTiming(2000, graphTiming, 0));

  await logStep('graph: download report image');
  await spotlightGraphDemoId('graph-report', '완성 후 보고서 다운로드', { placement: 'right' });
  await clearGraphSpotlight();
  await clickGraphDemoId('graph-report', { after: 1000 });
  await saveReportDownload(page, graphTiming);
  await clickGraphDemoId('report-close', { after: 700 });

}

async function runInterpretDemo(page) {
  await logStep('interpret: seed completed graph and open graph tab');
  await seedCompletedBeverageGraphState(page);
  await page.goto(`${seededDemoUrl}&demoTab=graph`, { waitUntil: 'domcontentloaded' });
  await applyDemoViewportZoom(page);
  await waitForDemoReady(page);
  await page.locator(selectorForDemoId('tab-graph')).waitFor({ state: 'visible', timeout: 8000 });
  await page.locator(graphCanvasSelector('pie')).waitFor({ state: 'visible', timeout: 8000 });
  await logStep('interpret: prepare graph labels');
  await prepareCompletedGraphAnnotations(page);
  await page.waitForTimeout(300);
  markDemoStart();

  await logStep('interpret: open interpret tab');
  await spotlightDemoId(page, 'tab-interpret', '해석하기 시작', { placement: 'bottom' });
  await clearDemoSpotlight(page);
  await clickDemoId(page, 'tab-interpret', { after: 1000 });

  await logStep('interpret: explain sentence list');
  await page.locator(selectorForDemoId('interpret-sentence-list')).waitFor({ state: 'visible', timeout: 8000 });
  await callDemo(page, 'setPointerVisible', false);
  await spotlightDemoId(
    page,
    'interpret-sentence-list',
    '자신의 모둠 번호에 맞는 해석하기 문장을 채워넣기',
    { placement: 'left', calloutWidth: 520 }
  );
  await page.waitForTimeout(700);
}

async function runDemo(page) {
  await page.goto(demoUrl, { waitUntil: 'networkidle' });
  await applyDemoViewportZoom(page);
  await waitForDemoReady(page);
  markDemoStart();

  await callDemo(page, 'setCallout', {
    title: '발표용 데모 모드',
    text: '화면 조작은 실제 앱에서 진행하고, 포인터와 설명 레이어만 녹화용으로 더합니다.',
    placement: 'center'
  });
  await page.waitForTimeout(1400);
  await callDemo(page, 'clearSpotlight');

  await fillDemoId(page, 'plan-item-0', '축구', {
    title: '1. 항목 정하기',
    text: '조사한 내용을 그래프 항목으로 입력합니다.'
  });
  await fillDemoId(page, 'plan-item-1', '줄넘기');
  await fillDemoId(page, 'plan-item-2', '독서');
  await fillDemoId(page, 'plan-item-3', '그림');
  await clickDemoId(page, 'plan-next-items', {
    title: '다음 단계로 이동',
    text: '입력이 끝나면 다음 버튼으로 표 이름을 정합니다.'
  });

  await fillDemoId(page, 'plan-title', '좋아하는 쉬는 시간 활동', {
    title: '2. 표 이름 정하기',
    text: '표와 그래프에 함께 쓰일 제목을 입력합니다.',
    placement: 'bottom'
  });
  await clickDemoId(page, 'plan-next-title');

  await clickDemoId(page, 'tab-table', {
    title: '3. 표로 정리하기',
    text: '계획에서 정한 항목이 표 머리글로 이어집니다.'
  });
  const counts = ['8', '6', '4', '2', '20'];
  const percents = ['40', '30', '20', '10', '100'];
  for (let index = 0; index < counts.length; index += 1) {
    await fillDemoId(page, `manual-cell-0-${index + 1}`, counts[index], index === 0 ? {
      title: '인원과 백분율 입력',
      text: '각 항목의 인원과 백분율을 표에 채웁니다.',
      placement: 'top'
    } : {});
  }
  for (let index = 0; index < percents.length; index += 1) {
    await fillDemoId(page, `manual-cell-1-${index + 1}`, percents[index], { after: 160 });
  }

  await clickDemoId(page, 'tab-graph', {
    title: '4. 그래프 그리기',
    text: '표 자료를 보면서 띠그래프나 원그래프를 직접 나눕니다.'
  });
  await spotlight(page, 'graph-canvas-bar', '나누기', '비율에 맞춰 그래프를 나누는 장면을 보여줍니다.');
  await clickCanvasPercent(page, 0.4);
  await clickCanvasPercent(page, 0.7);
  await clickCanvasPercent(page, 0.9);

  await clickDemoId(page, 'graph-mode-control-paint', {
    title: '색칠하기',
    text: '작업 모드를 바꾸면 같은 그래프 위에서 색칠할 수 있습니다.'
  });
  await clickDemoId(page, 'graph-color-0');
  await clickCanvasPercent(page, 0.2);
  await clickDemoId(page, 'graph-color-1');
  await clickCanvasPercent(page, 0.55);
  await clickDemoId(page, 'graph-color-2');
  await clickCanvasPercent(page, 0.8);
  await clickDemoId(page, 'graph-color-3');
  await clickCanvasPercent(page, 0.95);

  await clickDemoId(page, 'graph-mode-control-text', {
    title: '글자 넣기',
    text: '필요한 곳을 눌러 라벨을 넣고 발표에서 강조할 내용을 적습니다.'
  });
  await clickCanvasPercent(page, 0.2, { yRatio: 0.26 });
  await typeInFirstGraphLabel(page, '40%');

  await clickDemoId(page, 'tab-interpret', {
    title: '5. 해석하기',
    text: '완성한 그래프를 보며 문장 틀에 맞춰 결과를 해석합니다.'
  });
  await fillDemoId(page, 'sentence-blank-1번-행동', '좋아');
  await fillDemoId(page, 'sentence-blank-1번-대상', '활동');
  await fillDemoId(page, 'sentence-blank-1번-답', '축구', {
    title: '발표에 바로 쓸 문장',
    text: '그래프에서 알 수 있는 사실을 짧은 문장으로 정리합니다.',
    placement: 'top'
  });

  await callDemo(page, 'setCallout', {
    title: '녹화 완료',
    text: '이 스크립트는 같은 순서와 같은 화면 크기로 다시 실행할 수 있습니다.',
    placement: 'center'
  });
  await page.waitForTimeout(1500);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  stepLogPath = path.join(outputDir, 'recording-steps.log');
  await logStep(`start scenario=${scenario}`);
  await fs.writeFile(path.join(outputDir, 'recording-meta.json'), JSON.stringify({
    scenario,
    baseUrl,
    outputSize,
    viewport,
    layoutViewport,
    demoZoom,
    captureMode,
    frameCaptureFps: captureMode === 'frames' ? frameCaptureFps : undefined,
    deviceScaleFactor: contextDeviceScaleFactor,
    scaleMethod: frameCaptureUsesDeviceScale
      ? 'frame-device-scale-factor'
      : videoCaptureUsesCssZoom
        ? 'video-css-zoom'
        : 'none'
  }, null, 2), 'utf8');
  const startedServer = await startDevServerIfNeeded();
  const browser = await chromium.launch({ headless: process.env.DEMO_HEADED !== '1' });
  await warmDemoPage(browser);
  const contextOptions = {
    viewport,
    deviceScaleFactor: contextDeviceScaleFactor,
    locale: 'ko-KR',
    acceptDownloads: true
  };
  if (captureMode !== 'frames') {
    contextOptions.recordVideo = {
      dir: outputDir,
      size: viewport
    };
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  videoStartedAt = Date.now();
  recordingTrimStartMs = 0;
  recordingTrimmedDurationMs = 0;
  recordingCaptureActive = false;
  reportDownloadPath = null;
  soundEvents.length = 0;
  const frameState = { stop: false };
  const frameCapturePromise = captureMode === 'frames'
    ? captureFrames(page, path.join(outputDir, 'frames'), frameState)
    : null;
  const browserMessages = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      browserMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => browserMessages.push(`pageerror: ${error.message}`));

  try {
    if (scenario === 'plan') {
      await runPlanDemo(page);
    } else if (scenario === 'table') {
      await runTableDemo(page);
    } else if (scenario === 'graph') {
      await runGraphDemo(page);
    } else if (scenario === 'interpret') {
      await runInterpretDemo(page);
    } else {
      await runDemo(page);
    }
    const screenshotPath = path.join(outputDir, `${scenario}-final.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false, scale: 'device' });
    recordingTrimmedDurationMs = Math.max(1000, Date.now() - videoStartedAt - recordingTrimStartMs);
    let webmPath = null;
    let frameResult = null;
    let mp4Path = null;
    if (captureMode === 'frames') {
      frameState.stop = true;
      frameResult = await frameCapturePromise;
      await context.close();
      await browser.close();
      mp4Path = await makeMp4FromFramesWithSound(frameResult, soundEvents);
    } else {
      const video = page.video();
      await context.close();
      await browser.close();
      webmPath = await video.path();
      mp4Path = await makeMp4WithSound(webmPath, soundEvents);
    }

    console.log('');
    console.log(`Demo scenario: ${scenario}`);
    if (webmPath) console.log(`Demo recording saved: ${webmPath}`);
    if (frameResult) console.log(`Demo frames saved: ${frameResult.frameDir} (${frameResult.frameCount} frames @ ${frameResult.frameRate.toFixed(3)} fps)`);
    console.log(`Final screenshot saved: ${screenshotPath}`);
    if (reportDownloadPath) console.log(`Report image downloaded: ${reportDownloadPath}`);
    console.log(`Sound events mixed: ${soundEvents.length}`);
    if (mp4Path) console.log(`MP4 with sound saved: ${mp4Path}`);
    if (!mp4Path) console.log('MP4 sound mix skipped: ffmpeg-static was not available or no sound events were recorded.');
    if (browserMessages.length) {
      console.log('');
      console.log('Browser warnings/errors captured during recording:');
      browserMessages.forEach((entry) => console.log(`- ${entry}`));
    }
    if (startedServer) console.log('Temporary Vite dev server was started for this recording.');
  } finally {
    stopDevServer();
  }
}

main().catch((error) => {
  stopDevServer();
  console.error(error);
  process.exitCode = 1;
});
