// .github/scripts/pr-review.js
// Automated PR Review with GitHub API Line Comments
//
// This script implements GitHub's Pull Request Review API to add inline comments
// to specific lines in changed files. It follows the GitHub API documentation:
// https://docs.github.com/en/rest/guides/working-with-comments?apiVersion=2022-11-28#pull-request-comments-on-a-line
//
// Key features:
// - Line-specific comments using the correct "side": "RIGHT" parameter
// - AI-powered spelling detection for variable and function names
// - Code quality checks (console statements, TODO comments)
// - Proper error handling and debugging output

import { Octokit } from "@octokit/rest";
import OpenAI from "openai";

async function run() {
  const githubToken = process.env.GITHUB_TOKEN;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const prNumber = process.env.PR_NUMBER;
  const repository = process.env.REPOSITORY; // e.g., "owner/repo-name"

  if (!githubToken || !prNumber || !repository) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  const [owner, repo] = repository.split("/");
  const octokit = new Octokit({ auth: githubToken });

  // Initialize OpenAI client if API key is provided
  let openai = null;
  if (openaiApiKey) {
    openai = new OpenAI({ apiKey: openaiApiKey });
    console.log("🤖 OpenAI API initialized for spelling checks.");
  } else {
    console.log("⚠️ OpenAI API key not provided. Skipping spelling checks.");
  }

  console.log(`🔍 Reviewing PR #${prNumber} in ${owner}/${repo}...`);

  try {
    // 1. Get PR details
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // 2. Get changed files
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    // 3. Get the diff to understand which lines are actually changed
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: "diff",
      },
    });

    // Parse diff to get changed line ranges
    const diffLines = parseDiffForChangedLines(diff);
    console.log("📊 Diff analysis:");
    console.log(`  Total files in diff: ${diffLines.size}`);
    for (const [file, lines] of diffLines.entries()) {
      console.log(
        `  ${file}: ${lines.length} changed lines (${lines
          .slice(0, 5)
          .join(", ")}${lines.length > 5 ? "..." : ""})`
      );
    }

    let reviewComments = [];
    let shouldRequestChanges = false;
    let autoApprove = true;
    let fileLineComments = [];

    // --- Enhanced Review Logic ---

    // Check 1: PR size
    const additions = pullRequest.additions;
    const deletions = pullRequest.deletions;
    const totalChanges = additions + deletions;

    if (totalChanges > 500) {
      reviewComments.push(
        `🚨 **Large Pull Request:** This PR has ${totalChanges} lines changed (+${additions}, -${deletions}). Consider breaking it down into smaller, more focused PRs for easier review.`
      );
      shouldRequestChanges = true;
      autoApprove = false;
    } else if (totalChanges > 200) {
      reviewComments.push(
        `⚠️ **Medium-sized PR:** This PR has ${totalChanges} lines changed (+${additions}, -${deletions}). Please ensure thorough testing.`
      );
    } else {
      console.log(`✅ PR size (${totalChanges} lines) is within limits.`);
    }

    // Check 2: PR description quality
    if (!pullRequest.body || pullRequest.body.trim().length < 50) {
      reviewComments.push(
        `📝 **Missing/Short Description:** Please provide a comprehensive description including:\n` +
          `• What changes were made\n` +
          `• Why these changes are needed\n` +
          `• Any relevant context or linked issues\n` +
          `• Testing steps (if applicable)`
      );
      shouldRequestChanges = true;
      autoApprove = false;
    } else {
      console.log("✅ PR description is sufficient.");
    }

    // Check 4: File naming and structure
    const suspiciousFiles = files.filter(
      (file) =>
        file.filename.includes("temp") ||
        file.filename.includes("tmp") ||
        file.filename.includes("debug") ||
        file.filename.includes("TODO")
    );

    if (suspiciousFiles.length > 0) {
      reviewComments.push(
        `⚠️ **Suspicious File Names:** The following files have concerning names:\n` +
          suspiciousFiles.map((f) => `• \`${f.filename}\``).join("\n") +
          `\nPlease ensure these are intentional and properly named.`
      );
    }

    // Check 5: Large files
    const largeFiles = files.filter((file) => file.changes > 300);
    if (largeFiles.length > 0) {
      reviewComments.push(
        `📏 **Large Files:** The following files have many changes:\n` +
          largeFiles
            .map((f) => `• \`${f.filename}\` (${f.changes} changes)`)
            .join("\n") +
          `\nPlease ensure these changes are necessary and well-tested.`
      );
    }

    // Check 6: Check for common issues in file content
    console.log(`🔍 Analyzing ${files.length} changed files...`);
    for (const file of files.slice(0, 5)) {
      // Limit to first 5 files to avoid rate limits
      console.log(`📄 Processing file: ${file.filename} (${file.status})`);
      if (file.status === "added" || file.status === "modified") {
        try {
          const { data: content } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: pullRequest.head.ref,
          });

          if (content.type === "file" && content.content) {
            const fileContent = Buffer.from(
              content.content,
              "base64"
            ).toString();

            // Check for console statements in production code
            if (
              (file.filename.endsWith(".ts") ||
                file.filename.endsWith(".tsx") ||
                file.filename.endsWith(".js") ||
                file.filename.endsWith(".jsx")) &&
              !file.filename.includes(".test.") &&
              !file.filename.includes(".spec.")
            ) {
              const consoleMatches = fileContent.match(
                /console\.(log|warn|error|debug)/g
              );
              if (consoleMatches) {
                // Find line numbers for console statements and add line comments
                const lines = fileContent.split("\n");
                for (let i = 0; i < lines.length; i++) {
                  if (/console\.(log|warn|error|debug)/.test(lines[i])) {
                    addLineComment(
                      fileLineComments,
                      file.filename,
                      i + 1,
                      "console",
                      {},
                      diffLines
                    );
                  }
                }
              }
            }

            // Check for TODO/FIXME comments
            const todoMatches = fileContent.match(/TODO|FIXME|HACK/gi);
            if (todoMatches) {
              // Find line numbers for TODO comments and add line comments
              const lines = fileContent.split("\n");
              for (let i = 0; i < lines.length; i++) {
                if (/TODO|FIXME|HACK/gi.test(lines[i])) {
                  addLineComment(
                    fileLineComments,
                    file.filename,
                    i + 1,
                    "todo",
                    {},
                    diffLines
                  );
                }
              }
              shouldRequestChanges = true;
              autoApprove = false;
            }

            // Check 7: OpenAI spelling check for variable names and code elements
            if (
              openai &&
              (file.filename.endsWith(".ts") ||
                file.filename.endsWith(".tsx") ||
                file.filename.endsWith(".js") ||
                file.filename.endsWith(".jsx"))
            ) {
              console.log(`🔤 Checking spelling in ${file.filename}...`);

              // Debug: Show what identifiers are being extracted
              const identifiers = extractIdentifiers(fileContent);
              console.log(
                `  Found ${identifiers.length} identifiers: ${identifiers
                  .slice(0, 10)
                  .join(", ")}${identifiers.length > 10 ? "..." : ""}`
              );

              try {
                const spellingIssues = await checkSpellingWithOpenAI(
                  openai,
                  fileContent,
                  file.filename
                );
                if (spellingIssues.length > 0) {
                  console.log(
                    `🔤 Found ${spellingIssues.length} spelling issues in ${file.filename}`
                  );
                  console.log(
                    `  Issues:`,
                    spellingIssues
                      .map(
                        (issue) => `${issue.identifier} → ${issue.suggestion}`
                      )
                      .join(", ")
                  );
                  // For each issue, try to find the line number and add a file/line comment
                  for (const issue of spellingIssues) {
                    const { identifier, suggestion, reason } = issue;
                    const lines = fileContent.split("\n");
                    let lineNumber = null;
                    for (let i = 0; i < lines.length; i++) {
                      // Look for the identifier as a whole word in the line
                      const regex = new RegExp(`\\b${identifier}\\b`);
                      if (regex.test(lines[i])) {
                        lineNumber = i + 1; // GitHub API uses 1-based line numbers
                        console.log(
                          `📍 Found '${identifier}' on line ${lineNumber} in ${file.filename}`
                        );
                        console.log(`    Line content: "${lines[i].trim()}"`);
                        break;
                      }
                    }
                    if (lineNumber) {
                      // Create line comment following GitHub API best practices
                      console.log(
                        `🔤 Adding spelling comment for '${identifier}' on line ${lineNumber}`
                      );
                      addLineComment(
                        fileLineComments,
                        file.filename,
                        lineNumber,
                        "spelling",
                        {
                          identifier,
                          suggestion,
                          reason,
                        },
                        diffLines
                      );
                    } else {
                      // If line not found, add to summary
                      console.log(
                        `⚠️ Could not find line number for '${identifier}' in ${file.filename}`
                      );
                      reviewComments.push(
                        `🔤 **Spelling Issue in \`${
                          file.filename
                        }\`:** \`${identifier}\` → \`${suggestion}\` (${
                          reason || "spelling issue"
                        })`
                      );
                    }
                  }
                }
              } catch (error) {
                console.log(
                  `Could not check spelling for ${file.filename}: ${error.message}`
                );
              }
            }
          }
        } catch (error) {
          console.log(
            `Could not analyze content of ${file.filename}: ${error.message}`
          );
        }
      }
    }

    // --- End of Review Logic ---

    // Create review summary
    let reviewBody = `## 🤖 Automated PR Review\n\n`;

    if (reviewComments.length > 0) {
      reviewBody += reviewComments.join("\n\n");
    } else {
      reviewBody +=
        "✅ **All checks passed!** This PR looks good and meets our quality standards.";
    }

    // Post the review
    console.log(
      `📊 Review summary: ${reviewComments.length} summary comments, ${fileLineComments.length} file comments`
    );

    if (fileLineComments.length > 0) {
      console.log("📋 File comments to be posted:");
      fileLineComments.forEach((comment, index) => {
        console.log(
          `  ${index + 1}. ${comment.path}:${
            comment.line
          } - ${comment.body.substring(0, 50)}...`
        );
        // Debug: Show full comment structure
        console.log(`    Comment structure:`, {
          path: comment.path,
          line: comment.line,
          side: comment.side,
          bodyLength: comment.body.length,
        });
      });
    }

    if (reviewComments.length > 0 || fileLineComments.length > 0) {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        body: reviewBody,
        event: shouldRequestChanges ? "REQUEST_CHANGES" : "COMMENT",
        comments: fileLineComments,
      });
      console.log(
        `📝 Posted review with ${reviewComments.length} summary comments and ${fileLineComments.length} file/line comments.`
      );
    } else if (autoApprove) {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event: "APPROVE",
        body: reviewBody,
      });
      console.log("✅ Automatically approved the PR.");
    } else if (fileLineComments.length > 0 && reviewComments.length === 0) {
      // If we only have file comments but no summary comments, still post them
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        body: "## 🤖 Automated PR Review\n\n✅ **Code quality check completed.** Found some minor issues in the code that have been highlighted inline.",
        event: "COMMENT",
        comments: fileLineComments,
      });
      console.log(
        `📝 Posted review with ${fileLineComments.length} file/line comments only.`
      );
    }
  } catch (error) {
    console.error("❌ Error during PR review:", error);
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body: `❌ **Review Error:** An error occurred during automated review: ${error.message}`,
      event: "COMMENT",
    });
    process.exit(1);
  }
}

// Function to check spelling using OpenAI API
async function checkSpellingWithOpenAI(openai, fileContent, filename) {
  const issues = [];
  try {
    // Extract variable names, function names, and other identifiers
    const identifiers = extractIdentifiers(fileContent);
    if (identifiers.length === 0) return issues;
    const prompt = `Please analyze the following code identifiers and string literals for potential spelling mistakes, typos, or naming issues. \n\nItems to check:\n${identifiers
      .map((id) => `- ${id}`)
      .join(
        "\n"
      )}\n\nPlease respond with a JSON array of issues found, where each issue has:\n- "identifier": the misspelled identifier or string\n- "suggestion": the suggested correction\n- "reason": brief explanation of the issue\n\nFocus on:\n- Variable names, function names, and code identifiers\n- String literals that appear to be user-facing text or category names\n- Clear spelling mistakes and typos\n\nIgnore valid technical terms, abbreviations, or intentional naming conventions.\nRespond only with valid JSON, no other text.`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a code review assistant that checks for spelling mistakes in variable names, code identifiers, and string literals. Focus on user-facing text and clear typos. Respond only with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });
    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        const spellingIssues = JSON.parse(content);
        if (Array.isArray(spellingIssues)) {
          spellingIssues.forEach((issue) => {
            if (issue.identifier && issue.suggestion) {
              issues.push(issue);
            }
          });
        }
      } catch (parseError) {
        console.log(
          `Could not parse OpenAI response for ${filename}: ${parseError.message}`
        );
      }
    }
  } catch (error) {
    console.log(`OpenAI API error for ${filename}: ${error.message}`);
  }
  return issues;
}

// Function to parse diff and get changed line ranges
function parseDiffForChangedLines(diff) {
  const changedLines = new Map();
  const lines = diff.split("\n");
  let currentFile = null;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      // Extract filename from diff header
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (match) {
        currentFile = match[2]; // Use the 'b' side (new file)
      }
    } else if (line.startsWith("@@")) {
      // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const hunkMatch = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (hunkMatch && currentFile) {
        const newStart = parseInt(hunkMatch[3]);
        const newCount = parseInt(hunkMatch[4] || "1");

        if (!changedLines.has(currentFile)) {
          changedLines.set(currentFile, []);
        }

        // Add range of changed lines
        for (let i = newStart; i < newStart + newCount; i++) {
          changedLines.get(currentFile).push(i);
        }
      }
    }
  }

  return changedLines;
}

// Function to check if a line is in the diff
function isLineInDiff(diffLines, filename, lineNumber) {
  const fileLines = diffLines.get(filename);
  return fileLines && fileLines.includes(lineNumber);
}

// Function to add line comment with proper formatting
function addLineComment(
  fileLineComments,
  filename,
  lineNumber,
  type,
  details,
  diffLines
) {
  const commentTemplates = {
    spelling: {
      body: `🔤 **Spelling Issue:** \`${details.identifier}\` → \`${
        details.suggestion
      }\`\n\n**Reason:** ${
        details.reason || "Possible typo in variable or identifier name."
      }\n\n**Suggestion:** Consider renaming to \`${
        details.suggestion
      }\` for better code clarity.`,
    },
    console: {
      body: `💡 **Console Statement Detected**\n\n**Issue:** Console statements should be removed in production code.\n\n**Suggestion:** Consider using a proper logging library or removing this debug statement.`,
    },
    todo: {
      body: `⚠️ **TODO/FIXME Comment Detected**\n\n**Issue:** This comment indicates incomplete work or technical debt.\n\n**Suggestion:** Please address this before merging, or create an issue to track it.`,
    },
    largeFile: {
      body: `📏 **Large File Warning**\n\n**Issue:** This file has many changes (${details.changes} lines).\n\n**Suggestion:** Consider breaking this into smaller, more focused changes for easier review.`,
    },
  };

  const template = commentTemplates[type];
  if (template) {
    // For spelling issues, we want to comment on the line where the identifier is found
    // For other issues (console, todo), we only comment if the line is in the diff
    if (
      type !== "spelling" &&
      diffLines &&
      !isLineInDiff(diffLines, filename, lineNumber)
    ) {
      console.log(
        `⚠️ Skipping ${type} comment for ${filename}:${lineNumber} - line not in diff`
      );
      return;
    }

    fileLineComments.push({
      path: filename,
      line: lineNumber,
      side: "RIGHT", // Correct side for line comments per GitHub API (RIGHT for new code)
      body: template.body,
      // Note: GitHub API requires 'line' for line comments, not 'position'
    });
    console.log(`📝 Added ${type} comment for ${filename}:${lineNumber}`);
    console.log(`    Comment body: ${template.body.substring(0, 100)}...`);
  }
}

// Function to extract identifiers from code
function extractIdentifiers(code) {
  const identifiers = new Set();

  // Extract variable declarations (const, let, var)
  const varPattern = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let match;
  while ((match = varPattern.exec(code)) !== null) {
    identifiers.add(match[1]);
  }

  // Extract function declarations
  const funcPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = funcPattern.exec(code)) !== null) {
    identifiers.add(match[1]);
  }

  // Extract arrow function assignments
  const arrowFuncPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>/g;
  while ((match = arrowFuncPattern.exec(code)) !== null) {
    identifiers.add(match[1]);
  }

  // Extract class names
  const classPattern = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = classPattern.exec(code)) !== null) {
    identifiers.add(match[1]);
  }

  // Extract interface names
  const interfacePattern = /interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = interfacePattern.exec(code)) !== null) {
    identifiers.add(match[1]);
  }

  // Extract type names
  const typePattern = /type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = typePattern.exec(code)) !== null) {
    identifiers.add(match[1]);
  }

  // Extract string literals (quoted strings) - NEW!
  const stringPattern = /["'`]([^"'`]+)["'`]/g;
  while ((match = stringPattern.exec(code)) !== null) {
    const stringContent = match[1];
    // Only add strings that look like words/identifiers (not URLs, paths, etc.)
    if (/^[a-zA-Z\s&]+$/.test(stringContent) && stringContent.length > 2) {
      identifiers.add(stringContent);
    }
  }

  // Filter out common technical terms and short names
  const filteredIdentifiers = Array.from(identifiers).filter(
    (id) =>
      id.length > 2 &&
      ![
        "id",
        "url",
        "api",
        "ui",
        "ux",
        "db",
        "http",
        "https",
        "json",
        "xml",
        "css",
        "html",
        "js",
        "ts",
        "tsx",
      ].includes(id.toLowerCase())
  );
  return filteredIdentifiers.slice(0, 20); // Limit to 20 identifiers to avoid API limits
}

// Export functions for testing
export { run, checkSpellingWithOpenAI, extractIdentifiers };

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
