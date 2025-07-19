// Test script for PR review functionality
import OpenAI from "openai";

// Mock environment variables for testing
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || "your-github-token-here";
process.env.OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || "your-openai-api-key-here";
process.env.PR_NUMBER = process.env.PR_NUMBER || "1";
process.env.REPOSITORY = process.env.REPOSITORY || "your-username/your-repo";

async function testPRReview() {
  console.log("🧪 Testing PR Review Script...");
  console.log("Environment variables:");
  console.log(
    `  GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? "✅ Set" : "❌ Not set"}`
  );
  console.log(
    `  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Not set"}`
  );
  console.log(`  PR_NUMBER: ${process.env.PR_NUMBER}`);
  console.log(`  REPOSITORY: ${process.env.REPOSITORY}`);

  if (
    !process.env.GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN === "your-github-token-here"
  ) {
    console.log("\n❌ Please set your GitHub token:");
    console.log("export GITHUB_TOKEN=your-actual-token");
    console.log("export PR_NUMBER=your-pr-number");
    console.log("export REPOSITORY=your-username/your-repo");
    return;
  }

  try {
    // Import and run the actual PR review script
    const { run } = await import("./.github/scripts/pr-review.js");
    await run();
  } catch (error) {
    console.error("❌ Error running PR review:", error);
  }
}

// Test the spelling check function separately
async function testSpellingCheck() {
  console.log("\n🔤 Testing Spelling Check Function...");

  if (
    !process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY === "your-openai-api-key-here"
  ) {
    console.log("❌ Please set your OpenAI API key to test spelling checks:");
    console.log("export OPENAI_API_KEY=your-actual-openai-key");
    return;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Test with some sample code that has potential spelling issues
  const testCode = `
const usrName = "test";
const userAdress = "123 Main St";
const isLogedIn = true;
const configuraton = { theme: "dark" };
const authentification = "token123";
  `;

  console.log("Testing with sample code:");
  console.log(testCode);

  try {
    // Import the function from the PR review script
    const { checkSpellingWithOpenAI } = await import(
      "./.github/scripts/pr-review.js"
    );
    const issues = await checkSpellingWithOpenAI(openai, testCode, "test.js");

    console.log(`\nFound ${issues.length} spelling issues:`);
    issues.forEach((issue, index) => {
      console.log(
        `  ${index + 1}. ${issue.identifier} → ${issue.suggestion} (${
          issue.reason
        })`
      );
    });
  } catch (error) {
    console.error("❌ Error testing spelling check:", error);
  }
}

// Main test function
async function runTests() {
  console.log("🚀 Starting PR Review Tests...\n");

  // Test 1: Check environment setup
  await testPRReview();

  // Test 2: Test spelling check (if OpenAI key is available)
  if (
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key-here"
  ) {
    await testSpellingCheck();
  }

  console.log("\n✅ Tests completed!");
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
