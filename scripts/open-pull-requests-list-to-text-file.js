// Usage: node scripts/open-pull-requests-list-to-text-file.js
// This script fetches all open pull requests from a GitHub repository and saves them to a text file.

const https = require('https');
const fs = require('fs');
const path = require('path');

// Replace with your GitHub organization and repository
const GITHUB_ORG = 'twbs'
const GITHUB_REPOSITORY = 'bootstrap';
const OUTPUT_FILE = `open_pull_requests_${GITHUB_ORG}_${GITHUB_REPOSITORY}.txt`

// Replace with your GitHub Personal Access Token (optional)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''; // Set in env or leave blank for unauthenticated

const options = {
  hostname: 'api.github.com',
  path: `/repos/${GITHUB_ORG}/${GITHUB_REPOSITORY}/pulls?state=open&per_page=100`, // Fetch 100 PRs per page
  method: 'GET',
  headers: {
    'User-Agent': 'node.js', // Required by GitHub API
    'Accept': 'application/vnd.github.v3+json', // Ensure v3 of GitHub API is used
  },
};

if (GITHUB_TOKEN) {
  options.headers['Authorization'] = `token ${GITHUB_TOKEN}`;
}

// Function to write pull requests to a file
function writeToFile(pullRequests) {
  const filePath = path.join(__dirname, OUTPUT_FILE);
  const fileContent = pullRequests
    .map(pr => `${pr.title} - ${pr.html_url}`)
    .join('\n');

  fs.writeFile(filePath, fileContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log(`Pull requests saved to ${OUTPUT_FILE}`);
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
function fetchPullRequests(pageUrl = options.path, collectedPRs = []) {
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
        const pullRequests = JSON.parse(data);
        const allPRs = collectedPRs.concat(pullRequests);

        // Check if there's a "next" link for pagination
        const linkHeader = res.headers['link'];
        const nextPageUrl = linkHeader ? getNextPageLink(linkHeader) : null;

        if (nextPageUrl) {
          // Fetch the next page
          fetchPullRequests(nextPageUrl, allPRs);
        } else {
          // All pages are fetched, write to file
          writeToFile(allPRs);
        }
      } else {
        console.error(`Failed to fetch pull requests: ${res.statusCode}`);
        console.error(data);
      }
    });
  }).on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });
}

// Start fetching the pull requests
fetchPullRequests();
