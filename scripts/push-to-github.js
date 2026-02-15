#!/usr/bin/env node
/**
 * Push this repo to GitHub. Uses GITHUB_TOKEN env var (never commit the token).
 * Run: set GITHUB_TOKEN=your_pat && node scripts/push-to-github.js
 * Or:  $env:GITHUB_TOKEN="your_pat"; node scripts/push-to-github.js   (PowerShell)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPO = 'https://github.com/kiran797979/CodeblueAI.git';
const USER = 'kiran797979';

function run(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  console.log('>', cmd);
  try {
    return execSync(cmd, { cwd, stdio: 'inherit', shell: true });
  } catch (e) {
    if (opts.ignoreExit) return;
    process.exit(e.status || 1);
  }
}

function hasGit() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token || token.length < 10) {
    console.error('Missing GITHUB_TOKEN. Set it first:');
    console.error('  PowerShell: $env:GITHUB_TOKEN="your_personal_access_token"; node scripts/push-to-github.js');
    console.error('  CMD:        set GITHUB_TOKEN=your_personal_access_token && node scripts/push-to-github.js');
    process.exit(1);
  }

  if (!hasGit()) {
    console.error('Git is not installed or not on PATH. Install from https://git-scm.com/download/win');
    process.exit(1);
  }

  const remoteUrl = `https://${USER}:${token}@github.com/kiran797979/CodeblueAI.git`;

  const gitDir = path.join(ROOT, '.git');
  if (!fs.existsSync(gitDir)) {
    run('git init');
    run('git add .');
    run('git commit -m "Initial commit: CodeBlue AI - ambulance-to-hospital coordination system"', { ignoreExit: true });
    run('git branch -M main');
    run(`git remote add origin ${remoteUrl}`);
  } else {
    run('git add .');
    run('git status');
    run('git commit -m "Update: CodeBlue AI project"', { ignoreExit: true });
    try {
      run('git remote get-url origin');
    } catch {
      run(`git remote add origin ${remoteUrl}`);
    }
    run(`git remote set-url origin ${remoteUrl}`);
  }

  run('git push -u origin main');
  console.log('Done. Pushed to https://github.com/kiran797979/CodeblueAI');
}

main();
