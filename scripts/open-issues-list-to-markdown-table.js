// Usage: node scripts/open-issues-list-to-markdown-table.js
// This script fetches all open issues from a GitHub repository and saves them to a Markdown file with a table.

const https = require('https');
const fs = require('fs');
const path = require('path');

// Replace with your GitHub organization and repository
const GITHUB_ORG = 'twbs'
const GITHUB_REPOSITORY = 'bootstrap';
const OUTPUT_FILE = `open_issues_${GITHUB_ORG}_${GITHUB_REPOSITORY}.md`

// Replace with your GitHub Personal Access Token (optional)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''; // Set in env or leave blank for unauthenticated

const options = {
  hostname: 'api.github.com',
  path: `/repos/${GITHUB_ORG}/${GITHUB_REPOSITORY}/issues?state=open&per_page=100`, // Fetch 100 issues per page
  method: 'GET',
  headers: {
    'User-Agent': 'node.js', // Required by GitHub API
    'Accept': 'application/vnd.github.v3+json', // Ensure v3 of GitHub API is used
  },
};

if (GITHUB_TOKEN) {
  options.headers['Authorization'] = `token ${GITHUB_TOKEN}`;
}

// Function to write issues to a Markdown file with a table
function writeToMarkdownFile(issues) {
  const filePath = path.join(__dirname, OUTPUT_FILE);
  
  // Create the table header
  const markdownContent = [
    '| Issue Number | Title | |',
    '| --- | --- | --- |',
    ...issues.map(issue => `| [#${issue.number}](${issue.html_url}) | ${issue.title} | |`), // Format each row
  ].join('\n');

  fs.writeFile(filePath, markdownContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log(`Issues saved to ${OUTPUT_FILE}`);
    }
  });
}

// Function to extract 'next' link from headers
function getNextPageLink(linkHeader) {
  const links = linkHeader.split(',').map(part => part.trim());
  const nextLink = links.find(link => link.includes('rel="next"'));
  return nextLink ? nextLink.split(';')[0].slice(1, -1) : null;
}

// Function to make the API request and handle pagination
function fetchIssues(pageUrl = options.path, collectedIssues = []) {
  const currentOptions = { ...options, path: pageUrl };

  https.get(currentOptions, (res) => {
    let data = '';

    // Collect the data chunks
    res.on('data', (chunk) => {
      data += chunk;
    });

    // On response end, parse and proceed
    res.on('end', () => {
      if (res.statusCode === 200) {
        const issues = JSON.parse(data).filter(issue => !issue.pull_request); // Filter out pull requests
        const allIssues = collectedIssues.concat(issues);

        // Check if there's a "next" link for pagination
        const linkHeader = res.headers['link'];
        const nextPageUrl = linkHeader ? getNextPageLink(linkHeader) : null;

        if (nextPageUrl) {
          // Fetch the next page
          fetchIssues(nextPageUrl, allIssues);
        } else {
          // All pages are fetched, write to file
          writeToMarkdownFile(allIssues);
        }
      } else {
        console.error(`Failed to fetch issues: ${res.statusCode}`);
        console.error(data);
      }
    });
  }).on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });
}

// Start fetching the issues
fetchIssues();
