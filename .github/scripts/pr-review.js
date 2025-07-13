// .github/workflows/pr-review-logic.js
import { Octokit } from "@octokit/rest";

async function run() {
  const githubToken = process.env.GITHUB_TOKEN;
  const prNumber = process.env.PR_NUMBER;
  const repository = process.env.REPOSITORY; // e.g., "owner/repo-name"

  if (!githubToken || !prNumber || !repository) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  const [owner, repo] = repository.split("/");
  const octokit = new Octokit({ auth: githubToken });

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

    let reviewComments = [];
    let shouldRequestChanges = false;
    let autoApprove = true;

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

    // Check 3: Test coverage
    const codeFilesChanged = files.some(
      (file) =>
        (file.status === "added" || file.status === "modified") &&
        (file.filename.endsWith(".ts") ||
          file.filename.endsWith(".tsx") ||
          file.filename.endsWith(".js") ||
          file.filename.endsWith(".jsx")) &&
        !file.filename.includes(".test.") &&
        !file.filename.includes(".spec.") &&
        !file.filename.includes("__tests__")
    );

    const testFilesChanged = files.some(
      (file) =>
        file.filename.includes(".test.") ||
        file.filename.includes(".spec.") ||
        file.filename.includes("__tests__")
    );

    if (codeFilesChanged && !testFilesChanged) {
      reviewComments.push(
        `🧪 **Missing Tests:** Code files were changed but no corresponding test files were modified. Please ensure adequate test coverage for your changes.`
      );
      shouldRequestChanges = true;
      autoApprove = false;
    } else if (codeFilesChanged && testFilesChanged) {
      console.log("✅ Test coverage detected.");
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
    for (const file of files.slice(0, 5)) {
      // Limit to first 5 files to avoid rate limits
      if (file.status === "added" || file.status === "modified") {
        try {
          const { data: content } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: pullRequest.head.sha,
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
                reviewComments.push(
                  `💡 **Console Statements:** \`${file.filename}\` contains ${consoleMatches.length} console statements. Consider removing them for production.`
                );
              }
            }

            // Check for TODO/FIXME comments
            const todoMatches = fileContent.match(/TODO|FIXME|HACK/gi);
            if (todoMatches) {
              reviewComments.push(
                `⚠️ **TODO Comments:** \`${file.filename}\` contains ${todoMatches.length} TODO/FIXME/HACK comments. Please address these before merging.`
              );
              shouldRequestChanges = true;
              autoApprove = false;
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
    if (reviewComments.length > 0) {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        body: reviewBody,
        event: shouldRequestChanges ? "REQUEST_CHANGES" : "COMMENT",
      });
      console.log(`📝 Posted review with ${reviewComments.length} comments.`);
    } else if (autoApprove) {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event: "APPROVE",
        body: reviewBody,
      });
      console.log("✅ Automatically approved the PR.");
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

run();
