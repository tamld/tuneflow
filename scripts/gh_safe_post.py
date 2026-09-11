#!/usr/bin/env python3
"""
gh_safe_post.py - Safe GitHub CLI Wrapper with Zero-Mangled Markdown Invariant

Authority: R-GitHub-CLI-Safe-Posting-Protocol
Purpose: Enforce mandatory File-First (--body-file) pattern for all GitHub CLI
operations to eliminate PowerShell backtick, variable expansion, and tab escape corruption.
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

MANGLED_BACKTICK_PATTERN = re.compile(r'\\[a-zA-Z0-9_\.]+\\')
MANGLED_TAB_PATTERN = re.compile(r'\\\s{2,}[a-zA-Z0-9_\./]+')


def lint_markdown(content: str) -> list:
    """Check for obvious signs of shell-mangled markdown."""
    warnings = []
    lines = content.splitlines()
    for idx, line in enumerate(lines, 1):
        if MANGLED_BACKTICK_PATTERN.search(line):
            warnings.append(f"Line {idx}: Detected possible mangled backtick sequence (e.g. \\word\\): {line.strip()[:60]}")
        if MANGLED_TAB_PATTERN.search(line):
            warnings.append(f"Line {idx}: Detected possible mangled tab sequence (e.g. \\   path): {line.strip()[:60]}")
    return warnings


def run_gh_command(args: list) -> str:
    """Run gh command and capture output safely."""
    try:
        cmd = ['gh'] + args
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, encoding='utf-8')
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"❌ GitHub CLI Error (exit code {e.returncode}):\n{e.stderr}\n")
        raise e
    except FileNotFoundError:
        sys.stderr.write("❌ 'gh' CLI executable not found in PATH.\n")
        sys.exit(1)


def execute_safe_post(gh_subcommand: list, body_content: str, title: str = None, extra_flags: list = None) -> str:
    """
    Execute gh command using an atomic temporary UTF-8 file to guarantee 100% fidelity.
    """
    warnings = lint_markdown(body_content)
    if warnings:
        sys.stderr.write("⚠️ WARNING: Pre-flight Markdown linter detected potential shell corruption:\n")
        for w in warnings:
            sys.stderr.write(f"   - {w}\n")
        sys.stderr.write("Proceeding with caution...\n\n")

    # Atomic temp file with explicit UTF-8 encoding
    temp_fd, temp_path = tempfile.mkstemp(prefix='gh_safe_', suffix='.md')
    try:
        with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
            f.write(body_content)

        full_args = list(gh_subcommand)
        if title:
            full_args.extend(['--title', title])
        full_args.extend(['--body-file', temp_path])
        if extra_flags:
            full_args.extend(extra_flags)

        output = run_gh_command(full_args)
        return output
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


def main():
    parser = argparse.ArgumentParser(description="Safe GitHub CLI poster with mandatory --body-file invariant.")
    subparsers = parser.add_subparsers(dest='action', required=True)

    # Issue Create
    p_issue_create = subparsers.add_parser('issue-create', help="Create an issue")
    p_issue_create.add_argument('--title', required=True, help="Issue title")
    p_issue_create.add_argument('--body', help="Markdown body content as string")
    p_issue_create.add_argument('--body-file', help="Path to Markdown body file")
    p_issue_create.add_argument('--repo', help="Repository in OWNER/REPO format")
    p_issue_create.add_argument('--label', action='append', help="Labels to attach")

    # Issue Edit
    p_issue_edit = subparsers.add_parser('issue-edit', help="Edit an existing issue")
    p_issue_edit.add_argument('issue_id', help="Issue number")
    p_issue_edit.add_argument('--title', help="Updated issue title")
    p_issue_edit.add_argument('--body', help="Markdown body content as string")
    p_issue_edit.add_argument('--body-file', help="Path to Markdown body file")
    p_issue_edit.add_argument('--repo', help="Repository in OWNER/REPO format")

    # PR Create
    p_pr_create = subparsers.add_parser('pr-create', help="Create a pull request")
    p_pr_create.add_argument('--title', required=True, help="PR title")
    p_pr_create.add_argument('--base', default='master', help="Base branch (default: master)")
    p_pr_create.add_argument('--head', help="Head branch (default: current branch)")
    p_pr_create.add_argument('--body', help="Markdown body content as string")
    p_pr_create.add_argument('--body-file', help="Path to Markdown body file")
    p_pr_create.add_argument('--draft', action='store_true', help="Create as draft PR")
    p_pr_create.add_argument('--repo', help="Repository in OWNER/REPO format")

    # PR Edit
    p_pr_edit = subparsers.add_parser('pr-edit', help="Edit a pull request")
    p_pr_edit.add_argument('pr_id', help="PR number")
    p_pr_edit.add_argument('--title', help="Updated PR title")
    p_pr_edit.add_argument('--body', help="Markdown body content as string")
    p_pr_edit.add_argument('--body-file', help="Path to Markdown body file")
    p_pr_edit.add_argument('--repo', help="Repository in OWNER/REPO format")

    args = parser.parse_args()

    # Determine body content
    body_content = ""
    if getattr(args, 'body_file', None):
        with open(args.body_file, 'r', encoding='utf-8') as f:
            body_content = f.read()
    elif getattr(args, 'body', None):
        body_content = args.body
    elif not sys.stdin.isatty():
        body_content = sys.stdin.read()
    else:
        sys.stderr.write("❌ Error: Must provide either --body, --body-file, or pipe body via stdin.\n")
        sys.exit(1)

    extra_flags = []
    if getattr(args, 'repo', None):
        extra_flags.extend(['--repo', args.repo])

    if args.action == 'issue-create':
        if args.label:
            for l in args.label:
                extra_flags.extend(['--label', l])
        url = execute_safe_post(['issue', 'create'], body_content, title=args.title, extra_flags=extra_flags)
        print(f"✅ Issue created successfully: {url}")

    elif args.action == 'issue-edit':
        gh_cmd = ['issue', 'edit', str(args.issue_id)]
        url = execute_safe_post(gh_cmd, body_content, title=args.title, extra_flags=extra_flags)
        print(f"✅ Issue #{args.issue_id} updated successfully: {url}")

    elif args.action == 'pr-create':
        extra_flags.extend(['--base', args.base])
        if args.head:
            extra_flags.extend(['--head', args.head])
        if args.draft:
            extra_flags.append('--draft')
        url = execute_safe_post(['pr', 'create'], body_content, title=args.title, extra_flags=extra_flags)
        print(f"✅ Pull Request created successfully: {url}")

    elif args.action == 'pr-edit':
        gh_cmd = ['pr', 'edit', str(args.pr_id)]
        url = execute_safe_post(gh_cmd, body_content, title=args.title, extra_flags=extra_flags)
        print(f"✅ Pull Request #{args.pr_id} updated successfully: {url}")


if __name__ == '__main__':
    main()
