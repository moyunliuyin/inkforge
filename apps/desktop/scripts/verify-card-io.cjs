#!/usr/bin/env node
/**
 * A.2 验收脚本：PNG tEXt codec roundtrip（SillyTavern 卡导入导出的编解码层）
 * 通过 typescript.transpileModule 直接加载真实源码，避免实现漂移。
 *
 * 运行：pnpm --filter @inkforge/desktop run verify:card-io
 */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
  } else {
    console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
    failed += 1;
  }
}

function loadTsModule(relPath) {
  const srcPath = path.resolve(__dirname, relPath);
  const source = fs.readFileSync(srcPath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const m = new Module(srcPath);
  m.filename = srcPath;
  m.paths = Module._nodeModulePaths(path.dirname(srcPath));
  m._compile(js, srcPath);
  return m.exports;
}

function main() {
  const { createSolidPng, extractTextChunk, replaceTextChunk, PngFormatError } = loadTsModule(
    "../src/main/services/png-text-chunk.ts",
  );

  console.log("\n[verify-card-io] PNG tEXt codec");

  const base = createSolidPng({ width: 4, height: 4, rgba: [200, 120, 40, 255] });
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(base.subarray(0, 8).equals(SIG), "createSolidPng 生成合法 PNG 签名");
  assert(extractTextChunk(base, "chara") === null, "新合成 PNG 无 chara 块返回 null");

  const cardJson = JSON.stringify({ spec: "chara_card_v2", data: { name: "林晚", description: "温和内敛" } });
  const payload = Buffer.from(cardJson, "utf8").toString("base64");
  const first = replaceTextChunk(base, "chara", payload);
  assert(first.replaced === 0, "首次嵌入无旧块可替换");
  const extracted = extractTextChunk(first.png, "chara");
  assert(extracted === payload, "roundtrip：抽取内容与嵌入 base64 一致");
  const decoded = JSON.parse(Buffer.from(extracted, "base64").toString("utf8"));
  assert(decoded.data.name === "林晚", "Unicode JSON roundtrip（林晚）");

  const second = replaceTextChunk(first.png, "chara", payload);
  assert(second.replaced === 1, "二次嵌入替换掉旧 chara 块（不累积）");
  const third = replaceTextChunk(second.png, "chara", payload);
  assert(third.replaced === 1, "三次嵌入仍只有一个 chara 块");

  let threw = false;
  try {
    extractTextChunk(Buffer.from("definitely not a png"), "chara");
  } catch (err) {
    threw = err instanceof PngFormatError;
  }
  assert(threw, "非 PNG 输入抛 PngFormatError");

  if (failed > 0) {
    console.error(`\n\x1b[31m${failed} 项断言失败\x1b[0m`);
    process.exit(1);
  }
  console.log("\n\x1b[32mcard-io codec 验证通过\x1b[0m");
}

main();
