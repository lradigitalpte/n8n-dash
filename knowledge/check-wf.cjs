const fs = require("fs");
const wf = JSON.parse(fs.readFileSync("c:/Users/Admin/Desktop/trying/n8n-wht/whatagent-zumbaton-v2.json", "utf8"));
const fileCode = fs
  .readFileSync("c:/Users/Admin/Desktop/trying/n8n-wht/knowledge/build-prompt-copy-paste.js", "utf8")
  .replace(/^\/\/ Paste this entire file.*\n\n/, "");
const wfCode = wf.nodes.find((n) => n.name === "Build Prompt").parameters.jsCode;
console.log("Build Prompt matches copy-paste file:", wfCode.trim() === fileCode.trim());
console.log("Has Prepare KB Search Query node:", !!wf.nodes.find((n) => n.name === "Prepare KB Search Query"));
const search = wf.nodes.find((n) => n.name === "Search KB from Convex");
console.log("Search KB query uses Prepare node:", search.parameters.queryParameters.parameters.find((p) => p.name === "query").value.includes("Prepare KB Search Query"));
