# Readme is present individually for each project inside.

# Architecture:
<img width="721" height="621" alt="image" src="https://github.com/user-attachments/assets/ed4e778e-094d-4ad9-ae7f-daf0f224b314" />

Project Architecture:
Frontend (React)
The user interface of the project.
Displays the articles fetched from the backend API.
Sends requests to the Laravel API to get original and optimized articles.

Laravel API (Backend):
Handles all CRUD operations for articles.
Stores articles in the database.
Exposes endpoints for the frontend and Node.js optimizer script.
Stores article data, including title, content, slug, and timestamps.


Node.js Optimizer Script:
Automatically fetches the latest article from the Laravel API.
Searches the article’s title on Google.
Scrapes content from top-ranking external blogs.
Calls an LLM (Gemini API) to improve and update the original article.
Sends the optimized article back to the Laravel API for storage.

External APIs (Google Search API)

Google API: Finds top-ranking articles related to the original article.

Claude API: Processes the scraped content and generates an improved version of the article.
