module.exports = function (eleventyConfig) {
  // Static assets: public/styles.css, public/script.js, public/downloads/*
  // are copied to the output root so URLs like /styles.css, /downloads/x.pdf work.
  eleventyConfig.addPassthroughCopy({ "public": "." });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["njk", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    serverOptions: {
      host: "0.0.0.0"
    }
  };
};
