import { extractIdentifiers } from "./.github/scripts/pr-review.js";
import fs from "fs";

console.log("🔍 Debugging workflow execution...");

// Test 1: Check if we can access the PR review script
console.log("\n📁 Test 1: File Access");
try {
  const scriptContent = fs.readFileSync(".github/scripts/pr-review.js", "utf8");
  console.log("✅ PR review script accessible");
  console.log(`   Size: ${scriptContent.length} characters`);
} catch (error) {
  console.log("❌ Cannot access PR review script:", error.message);
  process.exit(1);
}

// Test 2: Check current file content
console.log("\n📄 Test 2: Current File Content");
try {
  const pageContent = fs.readFileSync("src/app/page.tsx", "utf8");
  console.log("✅ Page content accessible");
  console.log(`   Size: ${pageContent.length} characters`);

  // Look for spelling mistakes
  const lines = pageContent.split("\n");
  const spellingMistakes = ["Serch", "usrName", "usrAdress", "isLogedIn"];

  console.log("\n🔤 Spelling Mistakes Found:");
  spellingMistakes.forEach((mistake) => {
    for (let i = 0; i < lines.length; i++) {
      const regex = new RegExp(`\\b${mistake}\\b`);
      if (regex.test(lines[i])) {
        console.log(
          `✅ Found '${mistake}' on line ${i + 1}: "${lines[i].trim()}"`
        );
        break;
      }
    }
  });
} catch (error) {
  console.log("❌ Cannot access page content:", error.message);
}

// Test 3: Test identifier extraction
console.log("\n📋 Test 3: Identifier Extraction");
try {
  const pageContent = fs.readFileSync("src/app/page.tsx", "utf8");
  const identifiers = extractIdentifiers(pageContent);
  console.log(`✅ Extracted ${identifiers.length} identifiers`);
  console.log("   First 10 identifiers:", identifiers.slice(0, 10));
} catch (error) {
  console.log("❌ Identifier extraction failed:", error.message);
}

// Test 4: Simulate workflow environment
console.log("\n🔧 Test 4: Workflow Environment Simulation");
const mockEnv = {
  GITHUB_TOKEN: "mock-token",
  OPENAI_API_KEY: "mock-openai-key",
  PR_NUMBER: "14",
  REPOSITORY: "nitishmittal1990/nextai",
  PR_TITLE: "feat: add spelling mistakes",
  PR_BODY: "Testing spelling detection",
  PR_AUTHOR: "nitishmittal1990",
};

console.log("Mock environment variables:");
Object.entries(mockEnv).forEach(([key, value]) => {
  console.log(`   ${key}: ${value.substring(0, 10)}...`);
});

console.log("\n🎯 Workflow should be able to run with these settings!");
console.log("\n📝 Next steps:");
console.log("1. Check GitHub Actions tab in your repository");
console.log('2. Look for "Automated PR Review" workflow');
console.log("3. If not running, try manual trigger");
console.log("4. Check workflow logs for errors");
