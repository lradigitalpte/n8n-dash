const fs = require("fs");

const wfPath = "c:/Users/Admin/Desktop/trying/n8n-wht/whatagent-zumbaton-v2.json";
const jsPath = "c:/Users/Admin/Desktop/trying/n8n-wht/knowledge/build-prompt-copy-paste.js";
const prepPath = "c:/Users/Admin/Desktop/trying/n8n-wht/knowledge/prepare-kb-search-query.js";

let raw = fs.readFileSync(wfPath, "utf8");
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
const wf = JSON.parse(raw);

const jsCode = fs
  .readFileSync(jsPath, "utf8")
  .replace(/^\/\/ Paste this entire file.*\n\n/, "");
wf.nodes.find((n) => n.name === "Build Prompt").parameters.jsCode = jsCode;

if (!wf.nodes.find((n) => n.name === "Prepare KB Search Query")) {
  const prepCode = fs
    .readFileSync(prepPath, "utf8")
    .replace(/^\/\/ Paste into n8n.*\n\/\/ Wire:.*\n\n/, "");
  wf.nodes.push({
    id: "prep_kb_query",
    name: "Prepare KB Search Query",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-120, 100],
    parameters: { jsCode: prepCode },
  });
  wf.connections["Load History from Convex"] = {
    main: [[{ node: "Prepare KB Search Query", type: "main", index: 0 }]],
  };
  wf.connections["Prepare KB Search Query"] = {
    main: [[{ node: "Search KB from Convex", type: "main", index: 0 }]],
  };
}

const search = wf.nodes.find((n) => n.name === "Search KB from Convex");
search.parameters.queryParameters.parameters.find((p) => p.name === "query").value =
  "={{ $('Prepare KB Search Query').item.json.searchQuery }}";
search.parameters.queryParameters.parameters.find((p) => p.name === "limit").value = "6";

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), "utf8");
console.log("Workflow patched OK");
