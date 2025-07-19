import { checkSpellingWithOpenAI } from "./.github/scripts/pr-review.js";
import OpenAI from "openai";
import fs from "fs";

async function debugWorkflowIssue() {
  console.log("🔍 Debugging workflow issue...");

  // Read the current file content
  const fileContent = fs.readFileSync("./src/app/page.tsx", "utf8");

  // Test 1: Check if we can simulate the exact workflow logic
  console.log("\n📋 Test 1: Simulating Workflow Logic");

  // Simulate the workflow environment
  const mockEnv = {
    GITHUB_TOKEN: "mock-token",
    OPENAI_API_KEY: "mock-openai-key",
    PR_NUMBER: "14",
    REPOSITORY: "nitishmittal1990/nextai",
    PR_TITLE: "feat: add spell mistake",
    PR_BODY: "Testing spelling detection",
    PR_AUTHOR: "nitishmittal1990",
  };

  // Set environment variables for testing
  Object.entries(mockEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });

  console.log("✅ Environment variables set for testing");

  // Test 2: Check the exact logic from the workflow
  console.log("\n🔤 Test 2: Workflow Spelling Detection Logic");

  // This is the exact logic from the workflow
  const openaiApiKey = process.env.OPENAI_API_KEY;
  console.log(`OpenAI API Key available: ${!!openaiApiKey}`);

  if (openaiApiKey && openaiApiKey !== "mock-openai-key") {
    console.log("✅ Real OpenAI API key detected");

    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });

      // Test the exact spelling detection function
      console.log("\n🔍 Running spelling detection...");
      const spellingIssues = await checkSpellingWithOpenAI(
        openai,
        fileContent,
        "src/app/page.tsx"
      );

      console.log(`✅ Spelling detection completed`);
      console.log(`   Found ${spellingIssues.length} spelling issues:`);

      spellingIssues.forEach((issue, index) => {
        console.log(
          `   ${index + 1}. ${issue.identifier} → ${issue.suggestion} (${
            issue.reason
          })`
        );
      });

      // Test line finding logic
      console.log("\n📍 Test 3: Line Finding Logic");
      const lines = fileContent.split("\n");
      spellingIssues.forEach((issue) => {
        for (let i = 0; i < lines.length; i++) {
          const regex = new RegExp(`\\b${issue.identifier}\\b`);
          if (regex.test(lines[i])) {
            console.log(
              `✅ Found '${issue.identifier}' on line ${i + 1}: "${lines[
                i
              ].trim()}"`
            );
            break;
          }
        }
      });
    } catch (error) {
      console.log("❌ Spelling detection failed:", error.message);
      console.log("   Full error:", error);
    }
  } else {
    console.log("❌ No real OpenAI API key available for testing");
    console.log("   This is expected in local testing");
  }

  // Test 4: Check what the workflow should be doing
  console.log("\n📝 Test 4: Workflow Expected Behavior");
  console.log("The workflow should:");
  console.log("1. Check if OPENAI_API_KEY is set");
  console.log("2. If set, call OpenAI API for spelling detection");
  console.log("3. Parse the response and find line numbers");
  console.log("4. Create inline comments for each spelling issue");
  console.log("5. Post the review with comments");

  console.log(
    "\n🎯 If the workflow is running but not posting comments, check:"
  );
  console.log("1. GitHub Actions logs for error messages");
  console.log("2. OpenAI API response parsing");
  console.log("3. Line number detection logic");
  console.log("4. GitHub API comment posting");
}

debugWorkflowIssue().catch(console.error);
