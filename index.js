const express = require("express");
const cors = require("cors");
const { fetchRepoContents, parseGitHubUrl } = require("./githubService");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Root route to serve the frontend
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// GET route to fetch all code from a GitHub repo
app.get("/api/fetch-code", async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "GitHub URL is required" });
    }

    const repoInfo = parseGitHubUrl(url);
    if (!repoInfo) {
        return res.status(400).json({ error: "Invalid GitHub URL. Please provide a link like: https://github.com/owner/repo" });
    }

    const { owner, repo } = repoInfo;

    try {
        console.log(`[API] Fetching code for ${owner}/${repo}...`);
        const code = await fetchRepoContents(owner, repo);
        console.log(`[API] Successfully fetched code for ${owner}/${repo}`);
        res.json({
            owner,
            repo,
            contents: code,
        });
    } catch (error) {
        console.error(`[API ERROR] Failed to fetch repository content for ${owner}/${repo}:`, error.message);
        const status = error.status || 500;
        const message = status === 403 ? "GitHub API Rate limit exceeded. Please add a GITHUB_TOKEN to .env" : error.message;

        res.status(status).json({
            error: "Failed to fetch repository content",
            message: message,
        });
    }
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
