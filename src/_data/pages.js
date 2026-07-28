const fs = require("fs");
const path = require("path");

module.exports = () => {
  const dir = path.join(__dirname, "../../content/pages");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const slug = file.replace(/\.json$/, "");
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    return { slug, ...data };
  });
};
