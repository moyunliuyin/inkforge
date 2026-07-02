#!/usr/bin/env node
/**
 * M3-E 验收脚本：tavern-engine 纯逻辑验证
 * 无 Electron，仅对 BudgetTracker / ContextBuilder 做自断言。
 *
 * 运行：pnpm --filter @inkforge/desktop run verify:engine
 * 前置：先跑 pnpm build 确保 packages/tavern-engine/dist 就绪。
 */
const {
  BudgetTracker,
  ContextBuilder,
  RoundOrchestrator,
  buildOpeningSeedMessages,
  estimateTokensFromText,
  renderCardText,
} = require("@inkforge/tavern-engine");

let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
  } else {
    console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
    failed += 1;
  }
}

function testEstimate() {
  const cjk = estimateTokensFromText("林晚望向远处");
  const ascii = estimateTokensFromText("Hello world!");
  assert(cjk > 0 && ascii > 0, "estimateTokensFromText 对中英文都返回正数");
  assert(cjk >= 6, `中文 6 字估算不低于 6 tokens（实际 ${cjk}）`);
  assert(ascii <= 6, `英文短句估算不超过 6 tokens（实际 ${ascii}）`);
  assert(estimateTokensFromText("") === 0, "空串返回 0");
}

function testBudget() {
  const t = new BudgetTracker({ sessionId: "s1", budgetTokens: 1000 });
  assert(t.getState().remainingTokens === 1000, "初始 remaining = budget");
  t.recordUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 });
  const s1 = t.getState();
  assert(s1.usedTokens === 150, `usage 累加正确（${s1.usedTokens}）`);
  assert(!s1.shouldWarn, "80%+ 剩余时不发警告");

  t.recordUsage({ inputTokens: 500, outputTokens: 200, totalTokens: 700 });
  const s2 = t.getState();
  assert(s2.shouldWarn, "剩余 15% 时发出警告");

  assert(
    t.shouldCompactBeforeNextRound(1200),
    "剩余 150 token 且预计下一轮 1200 时应压缩",
  );

  const fresh = new BudgetTracker({ sessionId: "s2", budgetTokens: 10_000 });
  fresh.seed(200);
  assert(fresh.getState().usedTokens === 200, "seed 可预设已用量");
  assert(
    !fresh.shouldCompactBeforeNextRound(100),
    "余量充足时不触发压缩",
  );
}

function testContextBuilder() {
  const builder = new ContextBuilder();
  const speaker = {
    id: "card-a",
    name: "林晚",
    persona: "温和内敛，剑法精湛",
    firstMes: "",
    scenario: "{{char}}与陆九在暴雨夜的酒馆对峙",
    mesExample: "{{char}}：例句台词",
    avatarPath: null,
    providerId: "p1",
    model: "m1",
    temperature: 0.8,
    maxTokens: null,
    linkedNovelCharacterId: null,
    syncMode: "two-way",
    createdAt: "",
    updatedAt: "",
  };
  const other = { ...speaker, id: "card-b", name: "陆九" };
  const history = [
    {
      id: "msg-1",
      sessionId: "s1",
      characterId: null,
      role: "summary",
      content: "已发生：林晚抗命；陆九施压。",
      tokensIn: 0,
      tokensOut: 0,
      createdAt: "2026-04-20T10:00:00Z",
    },
    {
      id: "msg-2",
      sessionId: "s1",
      characterId: "card-a",
      role: "character",
      content: "我不会接这趟任务。",
      tokensIn: 50,
      tokensOut: 20,
      createdAt: "2026-04-20T10:05:00Z",
    },
    {
      id: "msg-3",
      sessionId: "s1",
      characterId: "card-b",
      role: "character",
      content: "江湖风波将起，此刻你我别无选择。",
      tokensIn: 60,
      tokensOut: 25,
      createdAt: "2026-04-20T10:06:00Z",
    },
  ];

  const built = builder.build({
    speakerCard: speaker,
    allCards: [speaker, other],
    topic: "师门任务",
    mode: "director",
    history,
    lastK: 6,
    directorMessage: "请林晚解释自己的理由",
  });

  assert(
    built.systemPrompt.includes("林晚") && built.systemPrompt.includes("温和内敛"),
    "system 包含说话者名与 persona",
  );
  assert(
    built.systemPrompt.includes("陆九"),
    "system 提到同场角色",
  );
  assert(
    built.messages.some((m) => m.role === "user" && m.content.includes("历史摘要")) ||
      built.messages.some((m) => m.role === "user" && m.content.includes("此前对话的摘要")),
    "摘要被并入 user 段",
  );
  const selfAssistant = built.messages.find(
    (m) => m.role === "assistant" && m.content.includes("我不会接这趟任务"),
  );
  assert(!!selfAssistant, "说话者过往发言标 assistant");
  const otherAsUser = built.messages.find(
    (m) => m.role === "user" && m.content.includes("陆九") && m.content.includes("江湖风波"),
  );
  assert(!!otherAsUser, "其他角色发言以 [名字] 前缀的 user 段呈现");
  const directorInjected = built.messages.find(
    (m) => m.role === "user" && m.content.startsWith("[导演]"),
  );
  assert(!!directorInjected, "director 模式将 directorMessage 注入末尾 user 段");

  assert(
    built.systemPrompt.includes("场景设定：林晚与陆九在暴雨夜的酒馆对峙"),
    "scenario 注入且 {{char}} 已替换",
  );
  assert(
    built.systemPrompt.includes("示例对白") && built.systemPrompt.includes("林晚：例句台词"),
    "mesExample 注入且 {{char}} 已替换",
  );
  const pPersona = built.systemPrompt.indexOf("角色设定");
  const pScenario = built.systemPrompt.indexOf("场景设定");
  const pExample = built.systemPrompt.indexOf("示例对白");
  const pTopic = built.systemPrompt.indexOf("会话议题");
  assert(
    pPersona !== -1 && pPersona < pScenario && pScenario < pExample && pExample < pTopic,
    "system prompt 顺序：persona < scenario < mesExample < topic",
  );
  assert(!built.systemPrompt.includes("{{char}}"), "system prompt 无 {{char}} 残留");
  assert(!built.systemPrompt.includes("用户角色"), "无 userName 时不出现用户角色行");

  const withUser = builder.build({
    speakerCard: speaker,
    allCards: [speaker, other],
    topic: "师门任务",
    mode: "auto",
    history: [
      ...history,
      {
        id: "msg-u",
        sessionId: "s1",
        characterId: null,
        role: "user",
        content: "我有话要说",
        tokensIn: 0,
        tokensOut: 0,
        createdAt: "2026-04-20T10:08:00Z",
      },
    ],
    lastK: 6,
    userName: "苏牧",
    userPersona: "一位路过的旅人",
  });
  assert(
    withUser.systemPrompt.includes("用户角色：苏牧") &&
      withUser.systemPrompt.includes("一位路过的旅人"),
    "userName+userPersona 进入 system prompt",
  );
  assert(
    withUser.messages.some((m) => m.role === "user" && m.content.startsWith("[苏牧]：我有话要说")),
    "user 消息以 [用户名] 前缀的 user 段呈现",
  );
  assert(
    renderCardText("{{char}}对{{user}}微笑", "林晚", "苏牧") === "林晚对苏牧微笑",
    "{{user}} 宏替换为用户名",
  );
  assert(renderCardText("{{user}}你好", "林晚") === "User你好", "无用户时 {{user}} 回落 User");

  const autoDirector = builder.build({
    speakerCard: speaker,
    allCards: [speaker, other],
    topic: "师门任务",
    mode: "auto",
    history,
    lastK: 6,
    directorMessage: "推动冲突升级",
  });
  assert(
    autoDirector.messages.some((m) => m.role === "user" && m.content.startsWith("[导演]")),
    "auto 模式同样注入 directorMessage（Issue 3）",
  );

  const truncated = builder.build({
    speakerCard: speaker,
    allCards: [speaker, other],
    topic: "师门任务",
    mode: "auto",
    history: [
      ...history,
      {
        id: "msg-4",
        sessionId: "s1",
        characterId: "card-a",
        role: "character",
        content: "尾句",
        tokensIn: 0,
        tokensOut: 0,
        createdAt: "2026-04-20T10:07:00Z",
      },
    ],
    lastK: 1,
  });
  const nonSummaryUser = truncated.messages.filter(
    (m) => !(m.role === "user" && m.content.includes("此前对话的摘要")),
  );
  assert(
    nonSummaryUser.length <= 2,
    `lastK=1 时只保留 1 条对话 + 可能的摘要段（实际 ${nonSummaryUser.length}）`,
  );
}

function makeCard(id, name) {
  return {
    id,
    name,
    persona: "",
    firstMes: "",
    scenario: "",
    mesExample: "",
    avatarPath: null,
    providerId: "p",
    model: "m",
    temperature: 0.7,
    maxTokens: null,
    linkedNovelCharacterId: null,
    syncMode: "two-way",
    createdAt: "",
    updatedAt: "",
  };
}

function testOpeningSeeder() {
  const a = { ...makeCard("a", "甲"), firstMes: "大家好，我是{{char}}。" };
  const b = { ...makeCard("b", "乙"), firstMes: "   " };
  const c = makeCard("c", "丙");
  const d = { ...makeCard("d", "丁"), firstMes: "开场" };

  const seeds = buildOpeningSeedMessages({
    participants: [a, b, c, d],
    history: [],
    baseTimeMs: 1000,
  });
  assert(seeds.length === 2, `空对话时仅非空 firstMes 卡产生 seed（实际 ${seeds.length}）`);
  assert(
    seeds[0].characterId === "a" && seeds[0].content === "大家好，我是甲。",
    "seed 内容完成 {{char}} 替换",
  );
  assert(seeds[0].createdAt < seeds[1].createdAt, "seed createdAt 按参与者顺序递增");

  const nonEmpty = buildOpeningSeedMessages({
    participants: [a],
    history: [
      {
        id: "m1",
        sessionId: "s",
        characterId: "a",
        role: "character",
        content: "已有发言",
        tokensIn: 0,
        tokensOut: 0,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ],
  });
  assert(nonEmpty.length === 0, "对话非空时不再 seed");

  const asHistory = seeds.map((s, i) => ({
    id: `h${i}`,
    sessionId: "s",
    characterId: s.characterId,
    role: "character",
    content: s.content,
    tokensIn: 0,
    tokensOut: 0,
    createdAt: s.createdAt,
  }));
  assert(
    buildOpeningSeedMessages({ participants: [a, d], history: asHistory }).length === 0,
    "seed 落库后再次调用不重复（幂等）",
  );

  const e2 = { ...makeCard("e", "戊"), firstMes: "欢迎，{{user}}！" };
  const seedsUser = buildOpeningSeedMessages({
    participants: [e2],
    history: [],
    userName: "苏牧",
    baseTimeMs: 2000,
  });
  assert(seedsUser[0]?.content === "欢迎，苏牧！", "firstMes 中 {{user}} 替换为用户名");
}

async function testRoundOrchestrator() {
  const participants = [makeCard("a", "甲"), makeCard("b", "乙")];
  const idleBudget = {
    sessionId: "s1",
    budgetTokens: 1000,
    usedTokens: 0,
    remainingTokens: 1000,
    shouldWarn: false,
    warnAt: null,
  };

  const buildCalls = [];
  const buildUserNames = [];
  const turnDones = [];
  let roundDones = 0;
  let compactCalls = 0;
  let appendN = 0;

  const orch = new RoundOrchestrator({
    loadHistory: async () => [],
    appendMessage: async (input) => {
      appendN += 1;
      return { id: `m${appendN}`, ...input };
    },
    buildContext: (i) => {
      buildCalls.push(i.directorMessage);
      buildUserNames.push(i.userName);
      return { systemPrompt: "sys", messages: [{ role: "user", content: "hi" }] };
    },
    resolveSpeakerRuntime: async (c) => ({ providerId: c.providerId, model: c.model }),
    streamCompletion: async function* () {
      yield { type: "delta", textDelta: "台词" };
      yield { type: "done", usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } };
    },
    estimateTokens: () => 100,
    recordUsage: () => idleBudget,
    shouldCompactBeforeNextRound: () => true, // force the compaction path on every inter-round gap
    getBudgetState: () => idleBudget,
    compactBeforeNextRound: async () => {
      compactCalls += 1;
      return { status: "compacted", budgetState: idleBudget };
    },
    onChunk: () => {},
    onTurnDone: (e) =>
      turnDones.push({ roundIndex: e.roundIndex, turnIndex: e.turnIndex, status: e.status }),
    onRoundDone: (e) => {
      if (e.status === "completed") roundDones += 1;
    },
  });

  await orch.run({
    roundId: "r1",
    sessionId: "s1",
    mode: "auto",
    participants,
    lastK: 6,
    topic: "题",
    autoRounds: 3,
    directorMessage: "推动剧情",
    userName: "苏牧",
  });

  assert(turnDones.length === 6, `auto 3 轮 × 2 角色 → 6 个 turn done（实际 ${turnDones.length}）`);
  assert(roundDones === 1, `completed 时恰好发 1 个 round done（实际 ${roundDones}）`);
  assert(
    turnDones[0].roundIndex === 0 && turnDones[0].turnIndex === 0,
    "首个 turn done 索引为 (0,0)",
  );
  assert(
    turnDones[5].roundIndex === 2 && turnDones[5].turnIndex === 1,
    "末个 turn done 索引为 (2,1)",
  );
  assert(
    buildCalls.length > 0 && buildCalls.every((d) => d === "推动剧情"),
    "导演指令在每回合每角色注入（Issue 3，跨轮持续）",
  );
  assert(
    buildUserNames.length > 0 && buildUserNames.every((u) => u === "苏牧"),
    "userName 透传到每次 buildContext（含估算路径）",
  );
  assert(
    compactCalls === 1,
    `auto 压缩封顶 maxAutoCompactionsPerRun=1（2 个轮间隙仅压 1 次，实际 ${compactCalls}）`,
  );
}

async function testStreamIdleTimeout() {
  const participants = [makeCard("a", "甲")];
  const idleBudget = {
    sessionId: "s1",
    budgetTokens: 1000,
    usedTokens: 0,
    remainingTokens: 1000,
    shouldWarn: false,
    warnAt: null,
  };
  let turnStatus = null;
  let roundStatus = null;

  const orch = new RoundOrchestrator({
    loadHistory: async () => [],
    appendMessage: async (input) => ({ id: "m1", ...input }),
    buildContext: () => ({ systemPrompt: "sys", messages: [{ role: "user", content: "hi" }] }),
    resolveSpeakerRuntime: async (c) => ({ providerId: c.providerId, model: c.model }),
    // A stream that never yields and never returns → would hang forever w/o the watchdog.
    streamCompletion: async function* () {
      await new Promise(() => {});
    },
    estimateTokens: () => 100,
    recordUsage: () => idleBudget,
    shouldCompactBeforeNextRound: () => false,
    getBudgetState: () => idleBudget,
    streamPollMs: 10,
    streamIdleTimeoutMs: 60,
    onChunk: () => {},
    onTurnDone: (e) => {
      turnStatus = e.status;
    },
    onRoundDone: (e) => {
      roundStatus = e.status;
    },
  });

  await orch.run({
    roundId: "rIdle",
    sessionId: "s1",
    mode: "director",
    participants,
    lastK: 6,
    topic: "题",
    autoRounds: 1,
  });

  assert(turnStatus === "failed", `挂死流经空闲超时判 turn 失败（实际 ${turnStatus}）`);
  assert(
    roundStatus === "failed",
    `挂死流 → round done(failed) 触发、run() 不永久阻塞（实际 ${roundStatus}）`,
  );
}

async function testStreamStopDuringHang() {
  const participants = [makeCard("a", "甲")];
  const idleBudget = {
    sessionId: "s1",
    budgetTokens: 1000,
    usedTokens: 0,
    remainingTokens: 1000,
    shouldWarn: false,
    warnAt: null,
  };
  let turnStatus = null;
  let roundStatus = null;

  const orch = new RoundOrchestrator({
    loadHistory: async () => [],
    appendMessage: async (input) => ({ id: "m1", ...input }),
    buildContext: () => ({ systemPrompt: "sys", messages: [{ role: "user", content: "hi" }] }),
    resolveSpeakerRuntime: async (c) => ({ providerId: c.providerId, model: c.model }),
    streamCompletion: async function* () {
      await new Promise(() => {});
    },
    estimateTokens: () => 100,
    recordUsage: () => idleBudget,
    shouldCompactBeforeNextRound: () => false,
    getBudgetState: () => idleBudget,
    streamPollMs: 10,
    streamIdleTimeoutMs: 100000, // idle timeout won't fire; stop() must be what ends it
    onChunk: () => {},
    onTurnDone: (e) => {
      turnStatus = e.status;
    },
    onRoundDone: (e) => {
      roundStatus = e.status;
    },
  });

  const runP = orch.run({
    roundId: "rStop",
    sessionId: "s1",
    mode: "director",
    participants,
    lastK: 6,
    topic: "题",
    autoRounds: 1,
  });
  await new Promise((r) => setTimeout(r, 40));
  orch.stop("rStop");
  await runP;

  assert(turnStatus === "stopped", `stop() 能中断挂死流（turn 实际 ${turnStatus}）`);
  assert(roundStatus === "stopped", `stop 后 round done(stopped) 触发（实际 ${roundStatus}）`);
}

async function main() {
  console.log("\n[verify-engine] BudgetTracker estimate");
  testEstimate();
  console.log("\n[verify-engine] BudgetTracker record/warn/compact");
  testBudget();
  console.log("\n[verify-engine] ContextBuilder build");
  testContextBuilder();
  console.log("\n[verify-engine] OpeningSeeder");
  testOpeningSeeder();
  console.log("\n[verify-engine] RoundOrchestrator run (auto + compaction DI)");
  await testRoundOrchestrator();
  console.log("\n[verify-engine] RoundOrchestrator stream watchdog");
  await testStreamIdleTimeout();
  await testStreamStopDuringHang();

  if (failed > 0) {
    console.error(`\n\x1b[31m${failed} 项断言失败\x1b[0m`);
    process.exit(1);
  }
  console.log("\n\x1b[32mtavern-engine 纯逻辑验证通过\x1b[0m");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
