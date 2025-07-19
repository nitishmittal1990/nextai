// Simple test to verify workflow environment
console.log("🧪 Testing workflow environment...");

// Check environment variables
const requiredEnvVars = [
  "GITHUB_TOKEN",
  "OPENAI_API_KEY",
  "PR_NUMBER",
  "REPOSITORY",
  "PR_TITLE",
  "PR_BODY",
  "PR_AUTHOR",
];

console.log("\n📋 Environment Variables:");
requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

// Check if we're in a GitHub Actions environment
console.log("\n🔧 GitHub Actions Environment:");
console.log(`GITHUB_ACTIONS: ${process.env.GITHUB_ACTIONS || "false"}`);
console.log(`GITHUB_EVENT_NAME: ${process.env.GITHUB_EVENT_NAME || "not set"}`);
console.log(`GITHUB_WORKFLOW: ${process.env.GITHUB_WORKFLOW || "not set"}`);

// Test file access
console.log("\n📁 File Access Test:");
try {
  const fs = await import("fs");
  const prReviewScript = await fs.readFile(
    ".github/scripts/pr-review.js",
    "utf8"
  );
  console.log("✅ PR review script accessible");
  console.log(`   Size: ${prReviewScript.length} characters`);
} catch (error) {
  console.log("❌ Cannot access PR review script:", error.message);
}

console.log("\n🎯 Workflow should be ready to run!");
