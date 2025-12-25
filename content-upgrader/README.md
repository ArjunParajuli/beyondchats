# Content Upgrader

A Node.js script that automatically enhances articles by analyzing top-ranking Google search results and using AI to improve content quality, formatting, and structure.

## Features

- 🔍 Fetches the latest article from Laravel API
- 🌐 Searches Google for the article title
- 📰 Scrapes content from top 2 blog/article results
- 🤖 Uses Google Gemini AI to enhance the article
- 📝 Updates the article via Laravel CRUD API
- 📚 Automatically adds citations to reference articles

## Prerequisites

- Node.js (v14 or higher)
- Laravel API running and accessible
- Google Gemini API key

## Important Note About Google Search

The script uses the `google-it` package to search Google, which may return 0 results if:
- Google is blocking automated requests (common)
- Rate limiting is in effect
- Network/firewall restrictions

**If you encounter "No search results" errors**, consider:
1. **Using Google Custom Search API** (requires API key) - more reliable but requires setup
2. **Adding delays between requests** - may help with rate limiting
3. **Using a proxy/VPN** - if your IP is blocked
4. **Manual URL input** - as a workaround (would require code modification)

The script will attempt retries with simplified queries, but Google's anti-bot measures are strict.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Edit `.env` and add your configuration:
   - `LARAVEL_API_BASE_URL`: Your Laravel API base URL (default: `http://localhost:8000/api`)
   - `GEMINI_API_KEY`: Your Google Gemini API key (get it from [Google AI Studio](https://makersuite.google.com/app/apikey))
   - `GOOGLE_SEARCH_API_KEY`: (Optional) Google Custom Search API key for reliable search results
   - `GOOGLE_SEARCH_ENGINE_ID`: (Optional) Google Custom Search Engine ID

### Setting Up Google Custom Search API (Recommended)

The `google-it` package often gets blocked by Google. For reliable search results, use Google Custom Search API:

1. **Create/Select a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Custom Search API (IMPORTANT):**
   - Go to [API Library](https://console.cloud.google.com/apis/library/customsearch.googleapis.com)
   - Select your project
   - Click **"Enable"** button
   - Wait a few minutes for the API to activate

3. **Get a Google API Key:**
   - Go to [Credentials](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" → "API Key"
   - Copy your API key
   - (Optional) Restrict the API key to "Custom Search API" for security

4. **Create a Custom Search Engine:**
   - Visit [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
   - Click "Add" to create a new search engine
   - In "Sites to search", enter `*` to search the entire web
   - Click "Create"
   - Go to "Setup" → "Basics" and copy your "Search engine ID"

5. **Add to `.env` file:**
   ```
   GOOGLE_SEARCH_API_KEY=your_api_key_here
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
   ```

**⚠️ Common Error:** If you see "Custom Search API has not been used in project...", you need to **enable the API** in step 2 above.

**Note:** Google Custom Search API has a free tier of 100 queries per day. For production use, you may need a paid plan.

## Usage

Run the script:
```bash
node index.js
```

## How It Works

1. **Fetch Latest Article**: Retrieves the most recent article from your Laravel API
2. **Google Search**: Searches Google for the article's title
3. **Filter Results**: Identifies the first 2 blog/article links (excludes social media, video sites, etc.)
4. **Scrape Content**: Extracts main content from the identified articles
5. **AI Enhancement**: Uses Google Gemini AI to analyze the reference articles and enhance the original article's style, formatting, and content
6. **Add Citations**: Automatically appends citations to the reference articles
7. **Update Article**: Publishes the enhanced article back to your Laravel API

## API Requirements

The script expects your Laravel API to have the following endpoints:

- `GET /api/articles` - List all articles (ordered by `published_at` desc)
- `PUT /api/articles/{id}` - Update an article

The article model should have at least these fields:
- `id`
- `title`
- `excerpt` (or `content` if available)
- `url`

## Notes

- The script filters out social media, video platforms, and e-commerce sites from Google results
- Content scraping uses intelligent selectors to extract main article content
- The LLM enhancement maintains the original article's core message while improving style and structure
- If your Laravel API has a `content` field, you may need to modify the `updateArticle` function to include it

## Error Handling

The script includes comprehensive error handling:
- Continues processing even if one article fails to scrape
- Provides detailed error messages
- Validates API responses

## License

ISC

