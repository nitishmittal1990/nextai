import {
  checkSpellingWithOpenAI,
  extractIdentifiers,
} from "./.github/scripts/pr-review.js";
import OpenAI from "openai";

// Test content from the shop page
const testContent = `
const categories = ["All", "Elctronics", "Fshion", "Home & Kitchen", "Sports"];

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Shp</h1>
          </div>
        </div>
      </header>
    </div>
  );
}
`;

async function testSpellingDetection() {
  console.log("🧪 Testing spelling detection...");

  // Test identifier extraction
  console.log("\n📋 Extracting identifiers:");
  const identifiers = extractIdentifiers(testContent);
  console.log(`Found ${identifiers.length} identifiers:`, identifiers);

  // Test OpenAI spelling check (if API key is available)
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    console.log("\n🔤 Testing OpenAI spelling check:");
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
  } else {
    console.log("\n⚠️ OPENAI_API_KEY not found, skipping OpenAI test");
  }

  // Test line finding
  console.log("\n📍 Testing line finding:");
  const lines = testContent.split("\n");
  const testIdentifiers = ["Elctronics", "Fshion", "Shp"];

  for (const identifier of testIdentifiers) {
    for (let i = 0; i < lines.length; i++) {
      const regex = new RegExp(`\\b${identifier}\\b`);
      if (regex.test(lines[i])) {
        console.log(
          `Found '${identifier}' on line ${i + 1}: "${lines[i].trim()}"`
        );
        break;
      }
    }
  }
}

testSpellingDetection().catch(console.error);
