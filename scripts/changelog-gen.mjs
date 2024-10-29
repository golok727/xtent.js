import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// https://github.com/conventional-changelog/commitlint/tree/master/@commitlint/config-conventional#type-enum
const commitTypes = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
  'other',
];

const CHANGE_SET_DIR = path.resolve(process.cwd(), '.changeset');
const CHANGE_LOG_MD_REGEX = /^[a-z]+-[a-z]+-[a-z]+\.md$/;

function getChangelogFile() {
  if (!existsSync(CHANGE_SET_DIR)) {
    console.error('no .changeset dir found');
    process.exit(1);
  }

  // Get all markdown files matching the regex in the .changeset directory
  const changelogFiles = readdirSync(CHANGE_SET_DIR, {
    withFileTypes: true,
    encoding: 'utf-8',
  }).filter(item => item.isFile() && CHANGE_LOG_MD_REGEX.test(item.name));

  if (changelogFiles.length === 0) return null;

  // Sort files by creation time (most recent first)
  const sortedFiles = changelogFiles.sort((a, b) => {
    const aStat = statSync(path.join(CHANGE_SET_DIR, a.name));
    const bStat = statSync(path.join(CHANGE_SET_DIR, b.name));
    return bStat.ctimeMs - aStat.ctimeMs;
  });

  // Return the most recently created file
  return path.join(CHANGE_SET_DIR, sortedFiles[0].name);
}

function processLog(log, groups) {
  const lines = log.split('\n');

  for (const line of lines) {
    if (line.startsWith('chore: version packages')) return true;

    const match = line.match(/^(\w+)(?:\(.+\))?:/);
    if (match && commitTypes.includes(match[1])) {
      groups[match[1]].push(line);
    } else {
      groups['other'].push(line);
    }
  }

  return false;
}
function readGitCommits(chunks = 20) {
  return new Promise(resolve => {
    const groupedCommits = commitTypes.reduce((g, type) => {
      g[type] = [];
      return g;
    }, Object.create(null));

    let start = 0;
    let done = false;

    while (!done) {
      const log = execSync(
        `git --no-pager log --pretty=format:%s --skip=${start} -n ${chunks}`,
        { encoding: 'utf-8' }
      );
      done = processLog(log, groupedCommits);
      start += chunks;
    }

    resolve(groupedCommits);
  });
}

readGitCommits().then(groups => {
  const markdown = generateMarkdown(groups);
  const changeSetFile = getChangelogFile();
  if (!changeSetFile) {
    console.warn('No changeset file found! Exiting');
    process.exit(0);
  }
  appendFileSync(changeSetFile, markdown, { encoding: 'utf-8' });
});

function generateMarkdown(groups) {
  let markdown = '';

  for (const [type, commits] of Object.entries(groups)) {
    if (commits.length > 0) {
      markdown += `## ${type.charAt(0).toUpperCase() + type.slice(1)}\n`;
      markdown += commits.map(msg => `- ${msg}`).join('\n');
      markdown += '\n';
    }
  }

  return markdown;
}
