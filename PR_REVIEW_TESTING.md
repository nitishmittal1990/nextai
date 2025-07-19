# PR Review Script Testing Guide

This guide explains how to test the PR review script locally before deploying it to GitHub Actions.

## Prerequisites

1. **GitHub Personal Access Token**

   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create a new token with `repo` permissions
   - This allows the script to read PRs and post reviews

2. **OpenAI API Key** (optional, for spelling checks)
   - Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - This enables AI-powered spelling and naming checks

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set environment variables:**
   ```bash
   export GITHUB_TOKEN="your-github-token-here"
   export OPENAI_API_KEY="your-openai-api-key-here"  # Optional
   export PR_NUMBER="1"  # The PR number you want to test
   export REPOSITORY="your-username/your-repo"  # Your repository
   ```

## Running Tests

### Option 1: Test the full PR review script

```bash
node test-pr-review.js
```

This will:

- Check if environment variables are set correctly
- Run the actual PR review script against your specified PR
- Test the spelling check functionality (if OpenAI key is provided)

### Option 2: Test just the spelling check function

```bash
node test-pr-review.js
```

The script will automatically test the spelling check if an OpenAI API key is provided.

## What to Expect

### Successful Run

```
🚀 Starting PR Review Tests...

🧪 Testing PR Review Script...
Environment variables:
  GITHUB_TOKEN: ✅ Set
  OPENAI_API_KEY: ✅ Set
  PR_NUMBER: 1
  REPOSITORY: your-username/your-repo

🔍 Reviewing PR #1 in your-username/your-repo...
🔍 Analyzing 3 changed files...
📄 Processing file: src/app/page.tsx (modified)
🔤 Checking spelling in src/app/page.tsx...
🔤 Found 2 spelling issues in src/app/page.tsx
📍 Found 'usrName' on line 5 in src/app/page.tsx
📍 Found 'userAdress' on line 6 in src/app/page.tsx
📝 Added file comment for src/app/page.tsx:5
📝 Added file comment for src/app/page.tsx:6

📊 Review summary: 0 summary comments, 2 file comments
📋 File comments to be posted:
  1. src/app/page.tsx:5 - 🔤 **Spelling Issue:** `usrName` → `userName`...
  2. src/app/page.tsx:6 - 🔤 **Spelling Issue:** `userAdress` → `userAddress`...

📝 Posted review with 0 summary comments and 2 file/line comments.

🔤 Testing Spelling Check Function...
Testing with sample code:
const usrName = "test";
const userAdress = "123 Main St";
const isLogedIn = true;
const configuraton = { theme: "dark" };
const authentification = "token123";

Found 5 spelling issues:
  1. usrName → userName (misspelling)
  2. userAdress → userAddress (misspelling)
  3. isLogedIn → isLoggedIn (misspelling)
  4. configuraton → configuration (misspelling)
  5. authentification → authentication (misspelling)

✅ Tests completed!
```

### Common Issues

1. **"GITHUB_TOKEN not set"**

   - Make sure you've set the environment variable correctly
   - Verify the token has the necessary permissions

2. **"Repository not found"**

   - Check that the REPOSITORY format is correct: `username/repo-name`
   - Ensure the token has access to the repository

3. **"PR not found"**

   - Verify the PR_NUMBER exists in your repository
   - Make sure the PR is not draft or closed

4. **"OpenAI API errors"**
   - Check that your OpenAI API key is valid
   - Ensure you have sufficient credits in your OpenAI account

## Testing Different Scenarios

### Test with a PR that has spelling issues:

1. Create a PR with intentionally misspelled variable names
2. Set `PR_NUMBER` to that PR's number
3. Run the test script
4. Check that file comments are posted on the correct lines

### Test with a large PR:

1. Set `PR_NUMBER` to a PR with many changes (>500 lines)
2. Run the test script
3. Verify that it requests changes due to size

### Test without OpenAI:

1. Don't set the `OPENAI_API_KEY` environment variable
2. Run the test script
3. Verify that it skips spelling checks but still works

## Cleanup

After testing, you may want to:

1. Delete any test reviews posted to your PRs
2. Remove the test files:
   ```bash
   rm test-pr-review.js
   rm PR_REVIEW_TESTING.md
   ```

## Troubleshooting

- **Module import errors**: Make sure you're using Node.js 18+ for ES modules
- **Permission errors**: Check that your GitHub token has the right permissions
- **Rate limiting**: GitHub has rate limits; wait a few minutes between tests
- **API errors**: Check the console output for detailed error messages
