import {
  checkSpellingWithOpenAI,
  extractIdentifiers,
} from "./.github/scripts/pr-review.js";
import OpenAI from "openai";
import fs from "fs";

async function testOpenAISpelling() {
  console.log("🧪 Testing OpenAI spelling detection...");

  // Read the current file content
  const fileContent = fs.readFileSync("./src/app/page.tsx", "utf8");

  // Test 1: Check environment variables
  console.log("\n📋 Test 1: Environment Variables");
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    console.log("✅ OPENAI_API_KEY is set");
    console.log(`   Key starts with: ${openaiApiKey.substring(0, 10)}...`);
  } else {
    console.log("❌ OPENAI_API_KEY is NOT set");
    console.log("   This is why spelling detection is not working!");
    console.log("   Please add OPENAI_API_KEY to your repository secrets.");
    return;
  }

  // Test 2: Test identifier extraction
  console.log("\n📋 Test 2: Identifier Extraction");
  const identifiers = extractIdentifiers(fileContent);
  console.log(`✅ Extracted ${identifiers.length} identifiers`);
  console.log("   First 10 identifiers:", identifiers.slice(0, 10));

  // Test 3: Test OpenAI API connection
  console.log("\n🤖 Test 3: OpenAI API Connection");
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Test with a simple prompt first
    const testResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content:
            "Hello, this is a test. Please respond with 'API working' if you can see this message.",
        },
      ],
      max_tokens: 10,
    });

    console.log("✅ OpenAI API connection successful");
    console.log(`   Response: ${testResponse.choices[0].message.content}`);
  } catch (error) {
    console.log("❌ OpenAI API connection failed:", error.message);
    if (error.response) {
      console.log("   API Error details:", error.response.data);
    }
    return;
  }

  // Test 4: Test spelling detection
  console.log("\n🔤 Test 4: Spelling Detection");
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
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

    if (spellingIssues.length === 0) {
      console.log(
        "   ⚠️ No spelling issues found - this might indicate an issue with the detection logic"
      );
    }
  } catch (error) {
    console.log("❌ Spelling detection failed:", error.message);
    console.log("   Error details:", error);
  }

  console.log("\n🎯 Summary:");
  console.log(
    "If OpenAI API key is set and API connection works, spelling detection should work."
  );
  console.log(
    "If no spelling issues are found, there might be an issue with the detection logic."
  );
}

testOpenAISpelling().catch(console.error);
