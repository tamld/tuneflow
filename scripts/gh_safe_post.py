#!/usr/bin/env python3
"""
gh_safe_post.py - Safe GitHub CLI Wrapper with Zero-Mangled Markdown Invariant

Authority: R-GitHub-CLI-Safe-Posting-Protocol
Purpose: Enforce mandatory File-First (--body-file) pattern for all GitHub CLI
operations to eliminate PowerShell/CMD backtick, variable expansion, quotation,
and tab escape corruption on Windows, while providing a unified cross-platform
interface for Issue and Pull Request operations.
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile

# Force UTF-8 encoding across all standard streams to eliminate Windows CP1252 / OEM corruption
if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

MANGLED_BACKTICK_PATTERN = re.compile(r'\\[a-zA-Z0-9_\.]+\\')
MANGLED_TAB_PATTERN = re.compile(r'\\\s{2,}[a-zA-Z0-9_\./]+')


def lint_markdown(content: str) -> list:
    """Check for obvious signs of shell-mangled markdown (e.g. PowerShell backtick/escape corruption)."""
    warnings = []
    lines = content.splitlines()
    for idx, line in enumerate(lines, 1):
        if MANGLED_BACKTICK_PATTERN.search(line):
            warnings.append(f"Line {idx}: Detected possible mangled backtick sequence (e.g. \\word\\): {line.strip()[:60]}")
        if MANGLED_TAB_PATTERN.search(line):
            warnings.append(f"Line {idx}: Detected possible mangled tab sequence (e.g. \\   path): {line.strip()[:60]}")
    return warnings


def run_gh_command(args: list) -> str:
    """Run gh command directly via subprocess without intermediate shell expansion."""
    try:
        cmd = ['gh'] + args
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            encoding='utf-8',
            errors='replace'
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"❌ GitHub CLI Error (exit code {e.returncode}):\n{e.stderr}\n")
        raise e
    except FileNotFoundError:
        sys.stderr.write("❌ 'gh' CLI executable not found in PATH. Please install GitHub CLI (https://cli.github.com).\n")
        sys.exit(1)


def execute_safe_post(
    gh_subcommand: list,
    body_content: str = None,
    title: str = None,
    extra_flags: list = None
) -> str:
    """
    Execute gh command using an atomic temporary UTF-8 file to guarantee 100% fidelity.
    Eliminates all command line quoting issues, escapes, and encoding mismatches.
    """
    temp_path = None
    try:
        full_args = list(gh_subcommand)
        if title:
            full_args.extend(['--title', title])

        if body_content is not None:
            warnings = lint_markdown(body_content)
            if warnings:
                sys.stderr.write("⚠️ WARNING: Pre-flight Markdown linter detected potential shell corruption:\n")
                for w in warnings:
                    sys.stderr.write(f"   - {w}\n")
                sys.stderr.write("Proceeding with atomic UTF-8 body delivery...\n\n")

            temp_fd, temp_path = tempfile.mkstemp(prefix='gh_safe_', suffix='.md')
            with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                f.write(body_content)
            full_args.extend(['--body-file', temp_path])

        if extra_flags:
            full_args.extend(extra_flags)

        output = run_gh_command(full_args)
        return output
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


def resolve_body_content(args, required=True):
    """
    Resolve Markdown body from:
    1. --body-file <path> (highest priority, recommended)
    2. --body <string>
    3. Piped stdin (when required=True and not sys.stdin.isatty())
    Returns None if optional and none provided.
    """
    if getattr(args, 'body_file', None):
        with open(args.body_file, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()
    elif getattr(args, 'body', None) is not None:
        return args.body
    elif required and not sys.stdin.isatty():
        try:
            content = sys.stdin.read()
            if content:
                return content
        except Exception:
            pass

    if required:
        sys.stderr.write(
            "❌ Error: Must provide Markdown body content via:\n"
            "   1. --body \"Your Markdown text\"\n"
            "   2. --body-file path/to/content.md\n"
            "   3. Piped stdin: e.g. cat content.md | python scripts/gh_safe_post.py ...\n"
        )
        sys.exit(1)
    return None


def main():
    parser = argparse.ArgumentParser(
        description="Safe GitHub CLI poster with mandatory --body-file UTF-8 invariant for Windows & Unix."
    )
    subparsers = parser.add_subparsers(dest='action', required=True)

    # -------------------------------------------------------------------------
    # ISSUE ACTIONS
    # -------------------------------------------------------------------------
    # Issue Create
    p_issue_create = subparsers.add_parser('issue-create', help="Create an issue with safe multiline UTF-8 body")
    p_issue_create.add_argument('--title', required=True, help="Issue title")
    p_issue_create.add_argument('--body', help="Markdown body content as string")
    p_issue_create.add_argument('--body-file', help="Path to Markdown body file")
    p_issue_create.add_argument('--repo', help="Repository in OWNER/REPO format")
    p_issue_create.add_argument('--label', action='append', help="Label to attach (can specify multiple)")
    p_issue_create.add_argument('--assignee', action='append', help="Assignee username")
    p_issue_create.add_argument('--milestone', help="Milestone name or number")

    # Issue Comment
    p_issue_comment = subparsers.add_parser('issue-comment', help="Post a comment on an existing issue safely")
    p_issue_comment.add_argument('issue_id', help="Issue number or URL")
    p_issue_comment.add_argument('--body', help="Markdown comment content as string")
    p_issue_comment.add_argument('--body-file', help="Path to Markdown comment file")
    p_issue_comment.add_argument('--repo', help="Repository in OWNER/REPO format")

    # Issue Edit
    p_issue_edit = subparsers.add_parser('issue-edit', help="Edit an existing issue title or body")
    p_issue_edit.add_argument('issue_id', help="Issue number or URL")
    p_issue_edit.add_argument('--title', help="Updated issue title")
    p_issue_edit.add_argument('--body', help="Updated Markdown body content as string")
    p_issue_edit.add_argument('--body-file', help="Path to Markdown body file")
    p_issue_edit.add_argument('--repo', help="Repository in OWNER/REPO format")
    p_issue_edit.add_argument('--add-label', action='append', help="Label to add")
    p_issue_edit.add_argument('--remove-label', action='append', help="Label to remove")

    # Issue Close
    p_issue_close = subparsers.add_parser('issue-close', help="Close an issue with optional closing comment and reason")
    p_issue_close.add_argument('issue_id', help="Issue number or URL")
    p_issue_close.add_argument('--body', help="Closing comment content as string")
    p_issue_close.add_argument('--body-file', help="Path to closing comment file")
    p_issue_close.add_argument('--reason', choices=['completed', 'not planned'], default='completed', help="Reason for closing")
    p_issue_close.add_argument('--repo', help="Repository in OWNER/REPO format")

    # Issue Reopen
    p_issue_reopen = subparsers.add_parser('issue-reopen', help="Reopen a closed issue with optional comment")
    p_issue_reopen.add_argument('issue_id', help="Issue number or URL")
    p_issue_reopen.add_argument('--body', help="Reopening comment content as string")
    p_issue_reopen.add_argument('--body-file', help="Path to reopening comment file")
    p_issue_reopen.add_argument('--repo', help="Repository in OWNER/REPO format")

    # Issue View
    p_issue_view = subparsers.add_parser('issue-view', help="View an issue and its comments")
    p_issue_view.add_argument('issue_id', help="Issue number or URL")
    p_issue_view.add_argument('--comments', action='store_true', help="Include issue comments")
    p_issue_view.add_argument('--repo', help="Repository in OWNER/REPO format")
    p_issue_view.add_argument('--web', action='store_true', help="Open in web browser")

    # -------------------------------------------------------------------------
    # PULL REQUEST ACTIONS
    # -------------------------------------------------------------------------
    # PR Create
    p_pr_create = subparsers.add_parser('pr-create', help="Create a pull request with safe multiline UTF-8 body")
    p_pr_create.add_argument('--title', required=True, help="PR title")
    p_pr_create.add_argument('--base', default='master', help="Base branch (default: master)")
    p_pr_create.add_argument('--head', help="Head branch (default: current branch)")
    p_pr_create.add_argument('--body', help="Markdown body content as string")
    p_pr_create.add_argument('--body-file', help="Path to Markdown body file")
    p_pr_create.add_argument('--draft', action='store_true', help="Create as draft PR")
    p_pr_create.add_argument('--repo', help="Repository in OWNER/REPO format")
    p_pr_create.add_argument('--label', action='append', help="Label to attach (can specify multiple)")
    p_pr_create.add_argument('--reviewer', action='append', help="Reviewer username")
    p_pr_create.add_argument('--assignee', action='append', help="Assignee username")

    # PR Comment
    p_pr_comment = subparsers.add_parser('pr-comment', help="Post a comment on an existing PR safely")
    p_pr_comment.add_argument('pr_id', help="PR number or URL")
    p_pr_comment.add_argument('--body', help="Markdown comment content as string")
    p_pr_comment.add_argument('--body-file', help="Path to Markdown comment file")
    p_pr_comment.add_argument('--repo', help="Repository in OWNER/REPO format")

    # PR Edit
    p_pr_edit = subparsers.add_parser('pr-edit', help="Edit an existing pull request")
    p_pr_edit.add_argument('pr_id', help="PR number or URL")
    p_pr_edit.add_argument('--title', help="Updated PR title")
    p_pr_edit.add_argument('--body', help="Updated Markdown body content as string")
    p_pr_edit.add_argument('--body-file', help="Path to Markdown body file")
    p_pr_edit.add_argument('--base', help="Updated base branch")
    p_pr_edit.add_argument('--repo', help="Repository in OWNER/REPO format")

    # PR Close
    p_pr_close = subparsers.add_parser('pr-close', help="Close a pull request with optional comment")
    p_pr_close.add_argument('pr_id', help="PR number or URL")
    p_pr_close.add_argument('--body', help="Closing comment content as string")
    p_pr_close.add_argument('--body-file', help="Path to closing comment file")
    p_pr_close.add_argument('--delete-branch', action='store_true', help="Delete branch after close")
    p_pr_close.add_argument('--repo', help="Repository in OWNER/REPO format")

    # PR Merge
    p_pr_merge = subparsers.add_parser('pr-merge', help="Merge a pull request safely")
    p_pr_merge.add_argument('pr_id', help="PR number or URL")
    p_pr_merge.add_argument('--squash', action='store_true', default=True, help="Squash merge (default)")
    p_pr_merge.add_argument('--merge', action='store_true', help="Create merge commit")
    p_pr_merge.add_argument('--rebase', action='store_true', help="Rebase merge")
    p_pr_merge.add_argument('--delete-branch', action='store_true', default=True, help="Delete head branch after merge")
    p_pr_merge.add_argument('--auto', action='store_true', help="Enable auto-merge")
    p_pr_merge.add_argument('--body', help="Commit message / body as string")
    p_pr_merge.add_argument('--body-file', help="Path to commit message / body file")
    p_pr_merge.add_argument('--repo', help="Repository in OWNER/REPO format")

    # PR View
    p_pr_view = subparsers.add_parser('pr-view', help="View a pull request")
    p_pr_view.add_argument('pr_id', help="PR number or URL")
    p_pr_view.add_argument('--comments', action='store_true', help="Include comments")
    p_pr_view.add_argument('--repo', help="Repository in OWNER/REPO format")
    p_pr_view.add_argument('--web', action='store_true', help="Open in web browser")

    # -------------------------------------------------------------------------
    # UTILITY: LINT
    # -------------------------------------------------------------------------
    p_lint = subparsers.add_parser('lint', help="Lint Markdown for PowerShell/CMD escape corruption without posting")
    p_lint.add_argument('--body', help="Markdown content string to check")
    p_lint.add_argument('--body-file', help="Path to Markdown file to check")

    args = parser.parse_args()

    # Common extra flags
    repo_flags = ['--repo', args.repo] if getattr(args, 'repo', None) else []

    # 1. ISSUE CREATE
    if args.action == 'issue-create':
        body_content = resolve_body_content(args, required=True)
        extra = list(repo_flags)
        if args.label:
            for l in args.label:
                extra.extend(['--label', l])
        if args.assignee:
            for a in args.assignee:
                extra.extend(['--assignee', a])
        if args.milestone:
            extra.extend(['--milestone', args.milestone])

        url = execute_safe_post(['issue', 'create'], body_content=body_content, title=args.title, extra_flags=extra)
        print(f"✅ Issue created successfully: {url}")

    # 2. ISSUE COMMENT
    elif args.action == 'issue-comment':
        body_content = resolve_body_content(args, required=True)
        url = execute_safe_post(['issue', 'comment', str(args.issue_id)], body_content=body_content, extra_flags=repo_flags)
        print(f"✅ Comment posted successfully on Issue #{args.issue_id}: {url}")

    # 3. ISSUE EDIT
    elif args.action == 'issue-edit':
        body_content = resolve_body_content(args, required=False)
        extra = list(repo_flags)
        if args.add_label:
            for l in args.add_label:
                extra.extend(['--add-label', l])
        if args.remove_label:
            for l in args.remove_label:
                extra.extend(['--remove-label', l])

        gh_cmd = ['issue', 'edit', str(args.issue_id)]
        url = execute_safe_post(gh_cmd, body_content=body_content, title=args.title, extra_flags=extra)
        print(f"✅ Issue #{args.issue_id} updated successfully: {url}")

    # 4. ISSUE CLOSE
    elif args.action == 'issue-close':
        body_content = resolve_body_content(args, required=False)
        if body_content:
            # Post comment first via safe file-first pattern
            execute_safe_post(['issue', 'comment', str(args.issue_id)], body_content=body_content, extra_flags=repo_flags)
        extra = list(repo_flags)
        if args.reason:
            extra.extend(['--reason', args.reason])
        output = run_gh_command(['issue', 'close', str(args.issue_id)] + extra)
        print(f"✅ Issue #{args.issue_id} closed successfully ({args.reason}). {output}")

    # 5. ISSUE REOPEN
    elif args.action == 'issue-reopen':
        body_content = resolve_body_content(args, required=False)
        if body_content:
            execute_safe_post(['issue', 'comment', str(args.issue_id)], body_content=body_content, extra_flags=repo_flags)
        output = run_gh_command(['issue', 'reopen', str(args.issue_id)] + repo_flags)
        print(f"✅ Issue #{args.issue_id} reopened successfully. {output}")

    # 6. ISSUE VIEW
    elif args.action == 'issue-view':
        extra = list(repo_flags)
        if args.comments:
            extra.append('--comments')
        if args.web:
            extra.append('--web')
        output = run_gh_command(['issue', 'view', str(args.issue_id)] + extra)
        print(output)

    # 7. PR CREATE
    elif args.action == 'pr-create':
        body_content = resolve_body_content(args, required=True)
        extra = list(repo_flags)
        extra.extend(['--base', args.base])
        if args.head:
            extra.extend(['--head', args.head])
        if args.draft:
            extra.append('--draft')
        if args.label:
            for l in args.label:
                extra.extend(['--label', l])
        if args.reviewer:
            for r in args.reviewer:
                extra.extend(['--reviewer', r])
        if args.assignee:
            for a in args.assignee:
                extra.extend(['--assignee', a])

        url = execute_safe_post(['pr', 'create'], body_content=body_content, title=args.title, extra_flags=extra)
        print(f"✅ Pull Request created successfully: {url}")

    # 8. PR COMMENT
    elif args.action == 'pr-comment':
        body_content = resolve_body_content(args, required=True)
        url = execute_safe_post(['pr', 'comment', str(args.pr_id)], body_content=body_content, extra_flags=repo_flags)
        print(f"✅ Comment posted successfully on Pull Request #{args.pr_id}: {url}")

    # 9. PR EDIT
    elif args.action == 'pr-edit':
        body_content = resolve_body_content(args, required=False)
        extra = list(repo_flags)
        if args.base:
            extra.extend(['--base', args.base])
        gh_cmd = ['pr', 'edit', str(args.pr_id)]
        url = execute_safe_post(gh_cmd, body_content=body_content, title=args.title, extra_flags=extra)
        print(f"✅ Pull Request #{args.pr_id} updated successfully: {url}")

    # 10. PR CLOSE
    elif args.action == 'pr-close':
        body_content = resolve_body_content(args, required=False)
        if body_content:
            execute_safe_post(['pr', 'comment', str(args.pr_id)], body_content=body_content, extra_flags=repo_flags)
        extra = list(repo_flags)
        if args.delete_branch:
            extra.append('--delete-branch')
        output = run_gh_command(['pr', 'close', str(args.pr_id)] + extra)
        print(f"✅ Pull Request #{args.pr_id} closed successfully. {output}")

    # 11. PR MERGE
    elif args.action == 'pr-merge':
        body_content = resolve_body_content(args, required=False)
        extra = list(repo_flags)
        if args.merge:
            extra.append('--merge')
        elif args.rebase:
            extra.append('--rebase')
        else:
            extra.append('--squash')
        if args.delete_branch:
            extra.append('--delete-branch')
        if args.auto:
            extra.append('--auto')

        gh_cmd = ['pr', 'merge', str(args.pr_id)]
        output = execute_safe_post(gh_cmd, body_content=body_content, extra_flags=extra)
        print(f"✅ Pull Request #{args.pr_id} merged successfully. {output}")

    # 12. PR VIEW
    elif args.action == 'pr-view':
        extra = list(repo_flags)
        if args.comments:
            extra.append('--comments')
        if args.web:
            extra.append('--web')
        output = run_gh_command(['pr', 'view', str(args.pr_id)] + extra)
        print(output)

    # 13. LINT
    elif args.action == 'lint':
        body_content = resolve_body_content(args, required=True)
        warnings = lint_markdown(body_content)
        if warnings:
            print("⚠️ Linter detected potential shell corruption warnings:")
            for w in warnings:
                print(f"  - {w}")
            sys.exit(2)
        else:
            print("✅ Clean: No shell mangling or escape corruption detected.")


if __name__ == '__main__':
    main()
