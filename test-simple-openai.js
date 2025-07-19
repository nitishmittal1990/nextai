import OpenAI from "openai";

async function testSimpleOpenAI() {
  console.log("🧪 Testing simple OpenAI API call...");

  // Check if API key is available
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("❌ No OpenAI API key found in environment");
    console.log("   Set OPENAI_API_KEY environment variable to test");
    return;
  }

  console.log("✅ OpenAI API key found");
  console.log(`   Key starts with: ${apiKey.substring(0, 10)}...`);

  try {
    const openai = new OpenAI({ apiKey });

    // Test with a simple prompt
    console.log("\n🔍 Testing OpenAI API call...");
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content:
            "Check these words for spelling mistakes: usrName, usrAdress, isLogedIn. Respond with JSON array of issues.",
        },
      ],
      max_tokens: 200,
    });

    console.log("✅ OpenAI API call successful");
    console.log("Response:", response.choices[0].message.content);
  } catch (error) {
    console.log("❌ OpenAI API call failed:", error.message);
    if (error.response) {
      console.log("API Error details:", error.response.data);
    }
  }
}

testSimpleOpenAI().catch(console.error);
