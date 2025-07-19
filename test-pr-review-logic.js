import {
  extractIdentifiers,
  checkSpellingWithOpenAI,
} from "./.github/scripts/pr-review.js";
import OpenAI from "openai";

// Test content with spelling mistakes
const testContent = `
export default function Home() {
  const usrName = "Test User";
  const usrAdress = "123 Main Street";
  const isLogedIn = true;
  const configuraton = { theme: "dark" };
  const authentification = "token123";
  const prefernces = { language: "en" };
  const validaton = "strict";
  const optimizaton = "performance";
  const integraton = "github";
}
`;

async function testPRReviewLogic() {
  console.log("🧪 Testing PR review logic...");

  // Test 1: Identifier extraction
  console.log("\n📋 Test 1: Identifier extraction");
  const identifiers = extractIdentifiers(testContent);
  console.log(`Found ${identifiers.length} identifiers:`, identifiers);

  // Test 2: OpenAI spelling check (if API key available)
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    console.log("\n🔤 Test 2: OpenAI spelling check");
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const spellingIssues = await checkSpellingWithOpenAI(
        openai,
        testContent,
        "test.tsx"
      );
      console.log(
        `Found ${spellingIssues.length} spelling issues:`,
        spellingIssues
      );

      // Test 3: Line finding
      console.log("\n📍 Test 3: Line finding");
      const lines = testContent.split("\n");
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

      // Test 4: Comment creation
      console.log("\n💬 Test 4: Comment creation");
      const fileLineComments = [];
      spellingIssues.forEach((issue) => {
        const lines = testContent.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const regex = new RegExp(`\\b${issue.identifier}\\b`);
          if (regex.test(lines[i])) {
            const lineNumber = i + 1;
            const commentBody = `🔤 **Spelling Issue:** \`${
              issue.identifier
            }\` → \`${issue.suggestion}\`\n\n**Reason:** ${
              issue.reason || "Possible typo in variable or identifier name."
            }\n\n**Suggestion:** Consider renaming to \`${
              issue.suggestion
            }\` for better code clarity.`;

            fileLineComments.push({
              path: "test.tsx",
              line: lineNumber,
              side: "RIGHT",
              body: commentBody,
            });

            console.log(`📝 Created comment for line ${lineNumber}:`);
            console.log(`  Path: test.tsx`);
            console.log(`  Line: ${lineNumber}`);
            console.log(`  Side: RIGHT`);
            console.log(`  Body: ${commentBody.substring(0, 100)}...`);
            break;
          }
        }
      });

      console.log(`\n📊 Summary: Created ${fileLineComments.length} comments`);
    } catch (error) {
      console.error("❌ OpenAI API error:", error.message);
    }
  } else {
    console.log("\n⚠️ OPENAI_API_KEY not set, skipping OpenAI tests");
  }

  // Test 5: Simulate GitHub API call structure
  console.log("\n🔧 Test 5: GitHub API call structure");
  const mockComments = [
    {
      path: "test.tsx",
      line: 3,
      side: "RIGHT",
      body: "🔤 **Spelling Issue:** `usrName` → `userName`\n\n**Reason:** Misspelling of 'userName'\n\n**Suggestion:** Consider renaming to `userName` for better code clarity.",
    },
  ];

  console.log("Mock GitHub API call:");
  console.log(
    JSON.stringify(
      {
        owner: "test",
        repo: "repo",
        pull_number: 1,
        body: "## 🤖 Automated PR Review\n\nFound spelling issues that have been highlighted inline.",
        event: "COMMENT",
        comments: mockComments,
      },
      null,
      2
    )
  );
}

testPRReviewLogic().catch(console.error);
