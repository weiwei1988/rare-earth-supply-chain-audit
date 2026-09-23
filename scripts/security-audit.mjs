// 公開対象としてGit管理されるファイルだけを走査し、認証情報・個人情報・
// ローカル環境固有のパスが混入していないかを検査する。
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";

const listed = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
if (listed.status !== 0) {
  console.error(listed.stderr || "git ls-files に失敗しました");
  process.exit(1);
}

const files = listed.stdout.split("\0").filter(Boolean);
const self = "scripts/security-audit.mjs";
const findings = [];

const rules = [
  ["macOS/Linuxのローカル絶対パス", /(?:^|[\s"'=(])\/(?:Users|home)\/[A-Za-z0-9._-]+(?:\/|(?=[\s"'<]))/gm],
  ["Windowsのローカル絶対パス", /(?:^|[\s"'=(])[A-Za-z]:\\Users\\[^\\\s"']+/gm],
  ["ローカルファイルURL", /file:\/\/\/(?:Users|home|[A-Za-z]:\/)[^\s"'<]+/gim],
  ["秘密鍵", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["OpenAI APIキー", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g],
  ["GitHubトークン", /\b(?:gh[opusr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g],
  ["AWSアクセスキー", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["Google APIキー", /\bAIza[A-Za-z0-9_-]{35}\b/g],
  ["Slackトークン", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g],
  ["資格情報を含むURL", /https?:\/\/[^\s/:@]+:[^\s/@]+@[^\s"'<]+/gim],
  ["認証値を含むURLクエリ", /https?:\/\/[^\s"'<]+[?&](?:access_token|api_key|apikey|auth|password|signature|token)=[^&\s"'<]+/gim],
  ["公開対象外のGoogle Spreadsheet URL", /https?:\/\/docs\.google\.com\/spreadsheets\/[^\s"'<]+/gim],
];

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gim;
const allowedEmailDomains = new Set(["example.com", "example.org", "users.noreply.github.com"]);

function lineNumber(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

for (const file of files) {
  // このファイルには検出用シグネチャそのものが含まれる。
  if (file === self) continue;
  const buffer = await fs.readFile(file);
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");

  for (const [label, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push({ file, line: lineNumber(text, match.index), label });
    }
  }

  emailPattern.lastIndex = 0;
  for (const match of text.matchAll(emailPattern)) {
    const domain = match[0].split("@").pop().toLowerCase();
    if (!allowedEmailDomains.has(domain)) {
      findings.push({ file, line: lineNumber(text, match.index), label: "メールアドレス" });
    }
  }
}

if (findings.length) {
  console.error("セキュリティ監査で公開前に確認が必要な記述を検出しました:");
  for (const finding of findings) console.error(` - ${finding.file}:${finding.line} ${finding.label}`);
  process.exit(1);
}

console.log(JSON.stringify({
  securityAudit: "ok",
  trackedFilesScanned: files.length - Number(files.includes(self)),
  checks: ["local-paths", "credentials", "credentialed-urls", "email-addresses", "spreadsheet-urls"],
}, null, 2));
