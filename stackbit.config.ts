import { defineStackbitConfig, SiteMapEntry } from "@stackbit/types";
import { GitContentSource } from "@stackbit/cms-git";

const gitContentSource = new GitContentSource({
  rootPath: __dirname,
  contentDirs: ["content/pages"],
  models: [
    {
      name: "Page",
      type: "page",
      urlPath: "/{slug}",
      filePath: "content/pages/{slug}.json",
      fields: [
        { name: "title", type: "string", required: true, label: "Page title" },
        { name: "metaDescription", type: "string", label: "Meta description" },
        { name: "body", type: "markdown", label: "Page content", description: "Full page content, edited as rich text/HTML." }
      ]
    }
  ],
  assetsConfig: {
    referenceType: "static",
    staticDir: "public",
    uploadDir: "images",
    publicPath: "/"
  }
});

export default defineStackbitConfig({
  stackbitVersion: "~0.6.0",
  ssgName: "eleventy",
  nodeVersion: "18",
  devCommand: "npm run dev",
  experimental: {
    ssg: {
      proxyWebsockets: true,
      logPatterns: {
        up: ["Watching"]
      }
    }
  },
  customContentReload: true,
  contentSources: [gitContentSource],
  siteMap: ({ documents, models }): SiteMapEntry[] => {
    const pageModelNames = models.filter((m) => m.type === "page").map((m) => m.name);
    return documents
      .filter((document) => pageModelNames.includes(document.modelName))
      .map((document) => {
        // document.id is the file path, e.g. "content/pages/about.json"
        const slug = document.id.replace(/^content\/pages\//, "").replace(/\.json$/, "");
        const urlPath = slug === "index" ? "/" : `/${slug}`;
        return { urlPath, document } as SiteMapEntry;
      });
  }
});
