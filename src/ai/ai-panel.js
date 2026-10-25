(function () {
  "use strict";

  var SOURCE_KEY = "taskflow.ai.sources.v1";
  var taskFlow = window.TaskFlow;
  var host = document.createElement("section");
  host.className = "card ai-card";
  host.setAttribute("aria-label", "AI 信息提取");
  host.innerHTML = '<h2>AI 信息提取</h2>' +
    '<p>粘贴聊天记录或通知正文，调用千问提取后先预览再保存。原消息时间可帮助解析“明天”等表达。</p>' +
    '<div class="ai-grid">' +
      '<label class="ai-field wide">原文<textarea id="ai-text" maxlength="20000" placeholder="在这里粘贴聊天记录或通知正文"></textarea></label>' +
      '<label class="ai-field">来源类型<select id="ai-source"><option value="chat">聊天</option><option value="notice">通知</option></select></label>' +
      '<label class="ai-field">原消息时间（可选）<input id="ai-received" type="datetime-local"></label>' +
      '<label class="ai-field wide">时区<input id="ai-timezone" value="Asia/Shanghai" spellcheck="false"></label>' +
    '</div>' +
    '<div class="ai-actions"><button type="button" class="ai-btn primary" id="ai-extract">调用千问提取</button></div>' +
    '<div id="ai-status" class="ai-status" role="status" aria-live="polite"></div>' +
    '<div id="ai-preview" class="ai-preview" hidden></div>' +
    '<div id="ai-history" class="ai-history"></div>';
  var footer = document.querySelector("main.shell footer");
  footer.parentNode.insertBefore(host, footer);

  function byId(id) { return document.getElementById(id); }
  var textEl = byId("ai-text");
  var sourceEl = byId("ai-source");
  var receivedEl = byId("ai-received");
  var timezoneEl = byId("ai-timezone");
  var statusEl = byId("ai-status");
  var previewEl = byId("ai-preview");
  var historyEl = byId("ai-history");
  var extractBtn = byId("ai-extract");
  var candidates = [];
  var extractionContext = null;

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function zonedParts(date) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezoneEl.value.trim() || "Asia/Shanghai", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).formatToParts(date);
    var values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return values;
  }

  function zonedValue(iso) {
    if (!iso) return "";
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    var p = zonedParts(date);
    return p.year + "-" + p.month + "-" + p.day + "T" + p.hour + ":" + p.minute;
  }

  function fromZoned(value) {
    if (!value) return null;
    var wallTime = Date.parse(value + ":00Z");
    if (isNaN(wallTime)) throw new Error("日期时间格式无效");
    var instant = wallTime;
    for (var i = 0; i < 3; i++) {
      var p = zonedParts(new Date(instant));
      var actualWall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
      instant += wallTime - actualWall;
    }
    return new Date(instant).toISOString();
  }
  function uuid() { return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "ai-" + Date.now() + "-" + Math.random().toString(36).slice(2); }
  function field(label, type, value, onChange, options) {
    var wrapper = document.createElement("label");
    wrapper.className = "ai-field";
    wrapper.appendChild(document.createTextNode(label));
    var input = document.createElement(type === "select" ? "select" : "input");
    if (type !== "select") input.type = type;
    if (options) options.forEach(function (pair) {
      var option = document.createElement("option");
      option.value = pair[0]; option.textContent = pair[1]; input.appendChild(option);
    });
    input.value = value == null ? "" : value;
    input.addEventListener("change", function () { onChange(input.value); });
    wrapper.appendChild(input);
    return wrapper;
  }

  function renderPreview() {
    previewEl.replaceChildren();
    previewEl.hidden = false;
    var heading = document.createElement("h3");
    heading.textContent = "候选结果（" + candidates.length + " 条）";
    previewEl.appendChild(heading);
    if (!candidates.length) {
      var empty = document.createElement("p"); empty.textContent = "没有发现可保存的信息。"; previewEl.appendChild(empty); return;
    }
    candidates.forEach(function (candidate, index) {
      var item = candidate.item;
      var card = document.createElement("div");
      card.className = "ai-candidate" + (item.needs_review ? " review" : "");
      var head = document.createElement("div"); head.className = "ai-candidate-head";
      var check = document.createElement("input"); check.type = "checkbox"; check.checked = candidate.selected;
      check.setAttribute("aria-label", "保存第 " + (index + 1) + " 条候选");
      check.addEventListener("change", function () { candidate.selected = check.checked; });
      var title = document.createElement("strong"); title.textContent = "候选 " + (index + 1);
      var tag = document.createElement("span"); tag.textContent = item.needs_review ? "需要核对" : "请核对后保存";
      head.append(check, title, tag); card.appendChild(head);
      var grid = document.createElement("div"); grid.className = "ai-grid";
      grid.appendChild(field("类型", "select", item.type, function (v) { item.type = v; }, [["task", "待办"], ["event", "日程"], ["note", "备忘"]]));
      grid.appendChild(field("优先级", "select", item.priority, function (v) { item.priority = v; }, [["high", "高"], ["normal", "中"], ["low", "低"]]));
      grid.appendChild(field("标题", "text", item.title, function (v) { item.title = v.trim(); }));
      grid.appendChild(field("时间精度", "select", item.time_precision, function (v) { item.time_precision = v; }, [["minute", "具体时间"], ["day", "仅日期"], ["unknown", "未知"]]));
      grid.appendChild(field("开始时间（所选时区）", "datetime-local", zonedValue(item.start_at), function (v) { item.start_at = fromZoned(v); }));
      grid.appendChild(field("截止时间（所选时区）", "datetime-local", zonedValue(item.due_at), function (v) { item.due_at = fromZoned(v); }));
      grid.appendChild(field("地点", "text", item.location, function (v) { item.location = v.trim() || null; }));
      grid.appendChild(field("负责人", "text", item.assignee, function (v) { item.assignee = v.trim() || null; }));
      card.appendChild(grid);
      var evidence = document.createElement("blockquote"); evidence.className = "ai-evidence";
      evidence.textContent = "原文证据：" + item.evidence; card.appendChild(evidence);
      previewEl.appendChild(card);
    });
    var hint = document.createElement("p"); hint.className = "ai-hint";
    hint.textContent = "“需要核对”的候选默认不勾选。确认前不会写入任务；原文证据会保存在本机 AI 来源记录中。";
    previewEl.appendChild(hint);
    var save = document.createElement("button"); save.type = "button"; save.className = "ai-btn primary";
    save.textContent = "确认保存选中项"; save.addEventListener("click", confirmSelection); previewEl.appendChild(save);
  }

  function validateCandidate(item, text) {
    if (["task", "event", "note"].indexOf(item.type) < 0) throw new Error("候选类型无效");
    if (["high", "normal", "low"].indexOf(item.priority) < 0) throw new Error("候选优先级无效");
    if (!item.title || !item.title.trim() || item.title.length > 200) throw new Error("候选标题必须为 1–200 字符");
    if (!item.evidence || text.indexOf(item.evidence) < 0) throw new Error("原文证据无法在输入中找到");
    if (item.start_at && isNaN(new Date(item.start_at).getTime())) throw new Error("开始时间无效");
    if (item.due_at && isNaN(new Date(item.due_at).getTime())) throw new Error("截止时间无效");
    if (item.time_precision === "unknown" && (item.start_at || item.due_at)) throw new Error("有时间的候选不能选择“未知”精度");
  }

  function renderHistory() {
    historyEl.replaceChildren();
    var records;
    try { records = JSON.parse(localStorage.getItem(SOURCE_KEY) || "[]"); }
    catch (err) { return; }
    if (!Array.isArray(records) || !records.length) return;
    var heading = document.createElement("h3"); heading.textContent = "已保存的来源（" + records.length + "）";
    historyEl.appendChild(heading);
    records.slice(-10).reverse().forEach(function (record) {
      var details = document.createElement("details");
      var summary = document.createElement("summary");
      var sourceLabel = record.sourceType === "chat" ? "聊天" : "通知";
      summary.textContent = sourceLabel + " · " + (record.items || []).length + " 条 · " + (record.receivedAt || record.capturedAt || "未知时间");
      details.appendChild(summary);
      (record.items || []).forEach(function (entry) {
        var p = document.createElement("p"); p.textContent = entry.item.title + "｜证据：" + entry.item.evidence; details.appendChild(p);
      });
      var source = document.createElement("pre"); source.textContent = record.text || "";
      details.appendChild(source); historyEl.appendChild(details);
    });
  }

  function projection(item, id) {
    var when = item.type === "event" ? item.start_at : item.type === "task" ? item.due_at : null;
    if (when && item.type === "task" && item.time_precision === "day") {
      var match = when.match(/^(\d{4}-\d{2}-\d{2})T.*?([+-]\d{2}:\d{2}|Z)$/);
      if (match) when = match[1] + "T23:59:00" + match[2];
    }
    return {
      id: id, title: (item.type === "event" ? "[日程] " : item.type === "note" ? "[备忘] " : "") + item.title,
      completed: false, priority: {high: 1, normal: 2, low: 3}[item.priority] || 2,
      dueAt: when, dueHasTime: Boolean(when && item.time_precision === "minute"), createdAt: new Date().toISOString(), updatedAt: null
    };
  }

  function confirmSelection() {
    var selected = candidates.filter(function (c) { return c.selected; });
    if (!selected.length) { setStatus("请先勾选至少一条候选。", true); return; }
    var previousSources = null;
    var sourceSaved = false;
    try {
      selected.forEach(function (c) { validateCandidate(c.item, extractionContext.text); });
      var sourceId = uuid();
      var storedItems = selected.map(function (c) { return { taskId: uuid(), item: c.item }; });
      var source = {
        id: sourceId, text: extractionContext.text, sourceType: extractionContext.sourceType,
        receivedAt: extractionContext.receivedAt, capturedAt: extractionContext.capturedAt,
        timezone: extractionContext.timezone, referenceTime: extractionContext.referenceTime,
        items: storedItems
      };
      previousSources = localStorage.getItem(SOURCE_KEY);
      var records = JSON.parse(previousSources || "[]");
      if (!Array.isArray(records)) throw new Error("AI 来源记录格式错误");
      records.push(source);
      localStorage.setItem(SOURCE_KEY, JSON.stringify(records));
      sourceSaved = true;
      taskFlow.addTasks(storedItems.map(function (entry) { return projection(entry.item, entry.taskId); }));
      var ids = new Set(taskFlow.getTasks().map(function (task) { return task.id; }));
      if (!storedItems.every(function (entry) { return ids.has(entry.taskId); })) throw new Error("任务写入失败");
      if (taskFlow.version === "0.2.1") {
        var persisted = JSON.parse(localStorage.getItem(taskFlow.getStorageKey()) || "[]");
        var persistedIds = new Set(persisted.map(function (task) { return task.id; }));
        if (!storedItems.every(function (entry) { return persistedIds.has(entry.taskId); })) throw new Error("任务未能持久化");
      }
      candidates = []; previewEl.hidden = true; previewEl.replaceChildren();
      renderHistory();
      setStatus("已保存 " + storedItems.length + " 条到任务列表；原文证据保存在本机。", false);
    } catch (err) {
      if (sourceSaved) {
        try {
          if (previousSources === null) localStorage.removeItem(SOURCE_KEY);
          else localStorage.setItem(SOURCE_KEY, previousSources);
        } catch (_) { /* The browser may have disabled storage. */ }
      }
      setStatus("保存失败：" + err.message, true);
    }
  }

  async function extract() {
    var text = textEl.value.trim();
    if (!text || text.length > 20000) { setStatus("请输入 1–20000 字的原文。", true); return; }
    extractBtn.disabled = true; candidates = []; previewEl.hidden = true; setStatus("正在提取…", false);
    try {
      var payload = { text: text, sourceType: sourceEl.value, receivedAt: fromZoned(receivedEl.value),
        capturedAt: new Date().toISOString(), timezone: timezoneEl.value.trim() || "Asia/Shanghai" };
      var response = await fetch("/api/extract", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(payload) });
      if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error("当前站点未部署提取接口，请通过 AI 服务启动页面。");
      var result = await response.json();
      if (!response.ok) throw new Error(result.error && result.error.message || "接口调用失败");
      if (!Array.isArray(result.items)) throw new Error("接口未返回 items 数组");
      result.items.forEach(function (item) { validateCandidate(item, text); });
      extractionContext = Object.assign({}, payload, {referenceTime: result.referenceTime || payload.receivedAt || payload.capturedAt});
      candidates = result.items.map(function (item) { return { item: item, selected: !item.needs_review }; });
      renderPreview();
      setStatus("提取完成：" + result.items.length + " 条候选（" + result.model + "）。参考时间：" + zonedValue(extractionContext.referenceTime) + " " + extractionContext.timezone + "。", false);
    } catch (err) { setStatus("提取失败：" + err.message, true); }
    finally { extractBtn.disabled = false; }
  }

  extractBtn.addEventListener("click", extract);
  renderHistory();
}());
