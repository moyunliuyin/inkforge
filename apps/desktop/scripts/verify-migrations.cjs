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

const EXPECTED_MAX_VERSION = 22;
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
    console.log("\x1b[32m迁移回放验证通过\x1b[0m");
  }
}

main();
