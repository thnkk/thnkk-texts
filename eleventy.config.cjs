const markdownIt = require("markdown-it");
const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  const md = markdownIt({ html: true, breaks: true, linkify: true });
  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  eleventyConfig.addFilter("isoDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toISODate()
  );
  eleventyConfig.addFilter("readableDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("dd LLL yyyy")
  );

  eleventyConfig.addCollection("texts", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/texts/*.md")
      .sort((a, b) => b.date - a.date);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
};
