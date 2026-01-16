const { Octokit } = require("@octokit/rest");
require("dotenv").config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Fetches the details of a file or directory from GitHub.
 * If it's a directory, it recursively fetches its contents.
 */
async function fetchRepoContents(owner, repo, path = "") {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(data)) {
      // It's a directory
      const contents = [];
      for (const item of data) {
        console.log(`[GitHub Service] Processing: ${item.path}`);
        if (item.type === "dir") {
          const children = await fetchRepoContents(owner, repo, item.path);
          contents.push({
            name: item.name,
            path: item.path,
            type: "dir",
            children,
          });
        } else {
          // It's a file, fetch its content
          try {
            const fileData = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: item.path,
            });

            // Handle binary files or files that don't have content property
            const content = fileData.data.content
              ? Buffer.from(fileData.data.content, "base64").toString("utf-8")
              : "[Non-text or too large to fetch directly]";

            contents.push({
              name: item.name,
              path: item.path,
              type: "file",
              content: content,
            });
          } catch (fileError) {
            console.error(`[GitHub Service] Error fetching file ${item.path}:`, fileError.message);
            contents.push({
              name: item.name,
              path: item.path,
              type: "file",
              content: `[Error fetching content: ${fileError.message}]`,
            });
          }
        }
      }
      return contents;
    } else {
      // It's a single file
      return {
        name: data.name,
        path: data.path,
        type: "file",
        content: data.content ? Buffer.from(data.content, "base64").toString("utf-8") : "[No content]",
      };
    }
  } catch (error) {
    console.error(`[GitHub Service Error] for ${path}:`, error.message);
    throw error;
  }
}

/**
 * Parses a GitHub URL to extract owner and repo.
 */
function parseGitHubUrl(url) {
  try {
    const parts = url.replace("https://github.com/", "").split("/");
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1].replace(".git", "") };
    }
  } catch (e) {
    return null;
  }
  return null;
}

module.exports = {
  fetchRepoContents,
  parseGitHubUrl,
};
