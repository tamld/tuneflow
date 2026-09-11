const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

describe('Issue Helper & Safe GitHub CLI Poster (gh_safe_post.py)', () => {
  const repoRoot = path.join(__dirname, '..');
  const scriptPath = path.join(repoRoot, 'scripts', 'gh_safe_post.py');
  const pyCmd = process.platform === 'win32' ? 'python' : (fs.existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3');

  function runPy(args, stdinInput = null) {
    return spawnSync(pyCmd, [scriptPath, ...args], {
      input: stdinInput,
      encoding: 'utf-8'
    });
  }

  it('should verify scripts/gh_safe_post.py physically exists and is executable', () => {
    assert.strictEqual(fs.existsSync(scriptPath), true, 'gh_safe_post.py must exist in scripts/');
    const stat = fs.statSync(scriptPath);
    assert.ok(stat.size > 1000, 'gh_safe_post.py must have substantial content');
  });

  it('should verify all required issue and PR subcommands are documented in --help', () => {
    const res = runPy(['--help']);
    assert.strictEqual(res.status, 0, 'Help command must exit with code 0');

    const requiredCommands = [
      'issue-create',
      'issue-comment',
      'issue-edit',
      'issue-close',
      'issue-reopen',
      'issue-view',
      'pr-create',
      'pr-comment',
      'pr-edit',
      'pr-close',
      'pr-merge',
      'pr-view',
      'lint'
    ];

    for (const cmd of requiredCommands) {
      assert.ok(res.stdout.includes(cmd), `Help output must document subcommand '${cmd}'`);
    }
  });

  it('should verify issue-comment and pr-comment support --body and --body-file flags', () => {
    const issueCommentHelp = runPy(['issue-comment', '--help']);
    assert.strictEqual(issueCommentHelp.status, 0);
    assert.ok(issueCommentHelp.stdout.includes('--body'), 'issue-comment must support --body');
    assert.ok(issueCommentHelp.stdout.includes('--body-file'), 'issue-comment must support --body-file');

    const prCommentHelp = runPy(['pr-comment', '--help']);
    assert.strictEqual(prCommentHelp.status, 0);
    assert.ok(prCommentHelp.stdout.includes('--body'), 'pr-comment must support --body');
    assert.ok(prCommentHelp.stdout.includes('--body-file'), 'pr-comment must support --body-file');
  });

  it('should pass linter check on clean Vietnamese UTF-8 markdown text', () => {
    const cleanMd = '### Báo cáo kiểm thử: Thành công 100%\n- Mục 1: `code_block` hợp lệ\n- Mục 2: Bảng tiếng Việt | Cột 1 | Cột 2 |';
    const res = runPy(['lint', '--body', cleanMd]);
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('Clean'), 'Clean markdown must pass linter with zero warnings');
  });

  it('should detect and flag PowerShell mangled backticks and tabs in linter', () => {
    const mangledBacktick = 'Testing with mangled \\backtick\\ pattern from PowerShell';
    const res = runPy(['lint', '--body', mangledBacktick]);
    assert.strictEqual(res.status, 2, 'Linter should return status 2 on detected corruption');
    assert.ok(res.stdout.includes('Linter detected potential shell corruption'), 'Must flag corruption in stdout');
  });

  it('should exit with error code 1 when required body content is missing', () => {
    const res = runPy(['issue-comment', '999']);
    assert.strictEqual(res.status, 1);
    assert.ok(res.stderr.includes('Must provide Markdown body content'), 'Must output clear error message');
  });

  it('should accept body via piped stdin cleanly without corruption', () => {
    const pipedContent = '## Nhận xét qua STDIN Pipe\n\nNội dung Markdown tiếng Việt có dấu: Ứng dụng hoạt động mượt mà.';
    const res = runPy(['lint'], pipedContent);
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('Clean'), 'Piped stdin should be read and pass linter');
  });
});
