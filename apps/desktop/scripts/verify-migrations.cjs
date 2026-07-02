#!/usr/bin/env node
/**
 * M3-E 验收脚本：迁移回放
 * 步骤：
 *   1) 在临时目录创建空 SQLite 文件
 *   2) 运行 runMigrations 两次（第二次应为 0，幂等）
 *   3) 断言所有关键表/索引存在
 *   4) 打印结果 + 清理
 *
 * 运行：pnpm --filter @inkforge/desktop run verify:migrations
 * 前置：先跑 pnpm build 确保 packages/storage/dist 就绪。
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { openDatabase, runMigrations } = require("@inkforge/storage");

const EXPECTED_TABLES = [
  "projects",
  "chapters",
  "providers",
  "ai_feedbacks",
  "outline_cards",
  "daily_logs",
  "app_settings",
  "skills",
  "tavern_cards",
  "characters",
  "character_sync_log",
  "tavern_sessions",
  "tavern_messages",
  "world_entries",
  "research_notes",
  "review_dimensions",
  "review_reports",
  "review_findings",
  "provider_keys",
  "schema_migrations",
  // ----- M7 · Bookshelf (v14) -----
  "book_covers",
  "chapter_origin_tags",
  "chapter_logs",
  "chapter_log_entries",
  "chapter_snapshots",
  "auto_writer_runs",
  // ----- M8 · 活人感 (v15) -----
  "achievements_unlocked",
  "character_letters",
  // ----- Scene Bindings (v16, ported from ainovel) -----
  "scene_bindings_basic",
  "scene_bindings_advanced",
  // ----- Sample Library + RAG (v17, ported from ainovel) -----
  "sample_libs",
  "sample_chunks",
  // ----- World Relationships (v18, ported from ainovel) -----
  "world_relationships",
];

const EXPECTED_INDEXES = [
  "idx_chapters_project",
  "idx_chapters_project_updated",
  "idx_feedbacks_chapter",
  "idx_feedbacks_project",
  "idx_outline_project",
  "idx_daily_project",
  "idx_skills_scope_enabled",
  "idx_tavern_cards_name",
  "idx_characters_project_name",
  "idx_character_sync_log_novel_at",
  "idx_tavern_sessions_project_created",
  "idx_tavern_messages_session_created",
  "idx_tavern_messages_session_role_created",
  "uidx_tavern_cards_linked_novel_character",
  "uidx_characters_linked_tavern_card",
  "idx_world_project",
  "idx_world_updated",
  "idx_research_project_created",
  "idx_research_topic",
  "idx_review_dim_project",
  "idx_review_reports_project_started",
  "idx_findings_report_severity",
  "idx_provider_keys_provider",
  // ----- M7 · Bookshelf (v14) -----
  "uidx_book_covers_project",
  "idx_chapter_origin_tags_origin",
  "idx_chapter_logs_project",
  "idx_chapter_log_entries_chapter_created",
  "idx_chapter_snapshots_chapter_created",
  "idx_chapter_snapshots_run",
  "idx_auto_writer_runs_chapter",
  "idx_auto_writer_runs_project",
  // ----- M8 · 活人感 (v15) -----
  "uidx_achievements_project_aid",
  "idx_achievements_project_unlocked",
  "idx_character_letters_project_generated",
  "idx_character_letters_character",
  // ----- Sample Library + RAG (v17, ported from ainovel) -----
  "idx_sample_libs_project",
  "idx_sample_chunks_lib",
  // ----- World Relationships (v18, ported from ainovel) -----
  "idx_world_rel_project",
  "idx_world_rel_src",
  "idx_world_rel_dst",
];

const EXPECTED_MAX_VERSION = 23;
const EXPECTED_VERSIONS = Array.from(
  { length: EXPECTED_MAX_VERSION },
  (_, i) => i + 1,
);

function fail(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
}

function fixtureV22Upgrade() {
  console.log("[verify-migrations] v22 → v23 upgrade fixture");
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "inkforge-verify-v22-"));
  let db;
  try {
    db = openDatabase({ workspaceDir });
    // Minimal v22-era schema for the tables v23 touches (+ schema_migrations 1..22 marked applied).
    db.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL, created_at TEXT NOT NULL, daily_goal INTEGER NOT NULL DEFAULT 1000, last_opened TEXT);
      CREATE TABLE tavern_cards (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE tavern_sessions (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, topic TEXT NOT NULL,
        mode TEXT NOT NULL CHECK(mode IN ('director', 'auto')),
        budget_tokens INTEGER NOT NULL CHECK(budget_tokens > 0),
        summary_provider_id TEXT, summary_model TEXT,
        last_k INTEGER NOT NULL DEFAULT 6 CHECK(last_k > 0),
        created_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
      CREATE TABLE tavern_messages (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, character_id TEXT,
        role TEXT NOT NULL CHECK(role IN ('director', 'character', 'summary')),
        content TEXT NOT NULL,
        tokens_in INTEGER NOT NULL DEFAULT 0 CHECK(tokens_in >= 0),
        tokens_out INTEGER NOT NULL DEFAULT 0 CHECK(tokens_out >= 0),
        created_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES tavern_sessions(id) ON DELETE CASCADE
      );
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);
      INSERT INTO projects VALUES ('p1', 'P', '/tmp/p', '2026-01-01T00:00:00Z', 1000, NULL);
      INSERT INTO tavern_sessions (id, project_id, title, topic, mode, budget_tokens, created_at)
        VALUES ('s1', 'p1', 'T', '议题', 'auto', 20000, '2026-01-01T00:00:00Z');
      INSERT INTO tavern_messages VALUES ('m1', 's1', NULL, 'director', '指令', 0, 0, '2026-01-01T00:00:01Z');
      INSERT INTO tavern_messages VALUES ('m2', 's1', NULL, 'character', '台词', 12, 34, '2026-01-01T00:00:02Z');
      INSERT INTO tavern_messages VALUES ('m3', 's1', NULL, 'summary', '摘要', 0, 0, '2026-01-01T00:00:03Z');
    `);
    const mark = db.prepare(`INSERT INTO schema_migrations VALUES (?, ?, ?)`);
    for (let v = 1; v <= 22; v += 1) mark.run(v, `fixture_v${v}`, "2026-01-01T00:00:00Z");

    const applied = runMigrations(db);
    if (applied === 1) {
      ok("v22 库上仅追加 1 个迁移（v23）");
    } else {
      fail(`expected exactly 1 migration on a v22 DB, applied ${applied}`);
    }

    const rows = db
      .prepare(`SELECT * FROM tavern_messages ORDER BY created_at ASC`)
      .all();
    const preserved =
      rows.length === 3 &&
      rows[0].id === "m1" && rows[0].role === "director" && rows[0].content === "指令" &&
      rows[1].id === "m2" && rows[1].role === "character" && rows[1].tokens_in === 12 && rows[1].tokens_out === 34 &&
      rows[2].id === "m3" && rows[2].role === "summary";
    if (preserved) {
      ok("重建后 3 条历史消息字段级保真");
    } else {
      fail(`rebuild lost data: ${JSON.stringify(rows)}`);
    }

    db.prepare(
      `INSERT INTO tavern_messages VALUES ('m4', 's1', NULL, 'user', '玩家发言', 0, 0, '2026-01-01T00:00:04Z')`,
    ).run();
    ok("重建后可插入 role='user' 行");
    let rejected = false;
    try {
      db.prepare(
        `INSERT INTO tavern_messages VALUES ('m5', 's1', NULL, 'bogus', 'x', 0, 0, '2026-01-01T00:00:05Z')`,
      ).run();
    } catch {
      rejected = true;
    }
    if (rejected) {
      ok("role CHECK 仍拒绝非法值");
    } else {
      fail("role CHECK no longer rejects invalid values");
    }
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
    try {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function main() {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "inkforge-verify-"));
  console.log(`[verify-migrations] workspace: ${workspaceDir}`);
  let db;
  try {
    db = openDatabase({ workspaceDir });
    const first = runMigrations(db);
    if (first < EXPECTED_MAX_VERSION) {
      fail(`first run applied ${first} migrations, expected >= ${EXPECTED_MAX_VERSION}`);
    } else {
      ok(`first run applied ${first} migrations`);
    }
    const second = runMigrations(db);
    if (second !== 0) {
      fail(`second run applied ${second}, expected 0 (idempotency broken)`);
    } else {
      ok("second run applied 0 migrations (idempotent)");
    }

    const tableRows = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .all()
      .map((r) => r.name);
    const missingTables = EXPECTED_TABLES.filter((t) => !tableRows.includes(t));
    if (missingTables.length > 0) {
      fail(`missing tables: ${missingTables.join(", ")}`);
    } else {
      ok(`all ${EXPECTED_TABLES.length} expected tables present`);
    }

    const indexRows = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'index'`)
      .all()
      .map((r) => r.name);
    const missingIdx = EXPECTED_INDEXES.filter((i) => !indexRows.includes(i));
    if (missingIdx.length > 0) {
      fail(`missing indexes: ${missingIdx.join(", ")}`);
    } else {
      ok(`all ${EXPECTED_INDEXES.length} expected indexes present`);
    }

    const appliedVersions = db
      .prepare(`SELECT version FROM schema_migrations ORDER BY version ASC`)
      .all()
      .map((r) => r.version);
    const mismatched = EXPECTED_VERSIONS.filter((v) => !appliedVersions.includes(v));
    if (mismatched.length > 0) {
      fail(`schema_migrations missing versions: ${mismatched.join(", ")}`);
    } else {
      ok(`schema_migrations rows = ${appliedVersions.join(",")}`);
    }

    // v21/v22 · tavern_cards column upgrades
    const cardCols = db
      .prepare(`PRAGMA table_info(tavern_cards)`)
      .all()
      .map((r) => r.name);
    const expectedCardCols = ["max_tokens", "first_mes", "scenario", "mes_example"];
    const missingCardCols = expectedCardCols.filter((c) => !cardCols.includes(c));
    if (missingCardCols.length > 0) {
      fail(`tavern_cards missing columns: ${missingCardCols.join(", ")}`);
    } else {
      ok("tavern_cards has v21/v22 columns (max_tokens, first_mes, scenario, mes_example)");
    }

    // v23 · user persona columns + tavern_messages role CHECK includes 'user'
    const sessionCols = db
      .prepare(`PRAGMA table_info(tavern_sessions)`)
      .all()
      .map((r) => r.name);
    const missingSessionCols = ["user_name", "user_persona"].filter((c) => !sessionCols.includes(c));
    if (missingSessionCols.length > 0) {
      fail(`tavern_sessions missing columns: ${missingSessionCols.join(", ")}`);
    } else {
      ok("tavern_sessions has v23 columns (user_name, user_persona)");
    }
    const msgSql = db
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tavern_messages'`)
      .get()?.sql;
    if (msgSql && /CHECK\s*\(\s*role\s+IN\s*\([^)]*'user'/i.test(msgSql)) {
      ok("tavern_messages role CHECK includes 'user'");
    } else {
      fail("tavern_messages role CHECK does not include 'user'");
    }
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
    try {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  if (process.exitCode && process.exitCode !== 0) {
    console.error("\x1b[31m迁移回放验证失败\x1b[0m");
  } else {
    fixtureV22Upgrade();
    if (process.exitCode && process.exitCode !== 0) {
      console.error("\x1b[31m迁移回放验证失败\x1b[0m");
    } else {
      console.log("\x1b[32m迁移回放验证通过\x1b[0m");
    }
  }
}

main();
