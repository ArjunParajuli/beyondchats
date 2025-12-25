require('dotenv').config();
const axios = require('axios');
const googleIt = require('google-it');
const cheerio = require('cheerio');
const { GoogleGenAI } = require('@google/genai');

// Configuration
const LARAVEL_API_BASE_URL = process.env.LARAVEL_API_BASE_URL || 'http://localhost:8000/api';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Fetches the latest article from Laravel API
 */
async function fetchLatestArticle() {
    try {
        const apiUrl = `${LARAVEL_API_BASE_URL}/articles`;
        console.log('📰 Fetching latest article from Laravel API...');
        console.log(`   URL: ${apiUrl}`);
        
        const response = await axios.get(apiUrl, {
            timeout: 10000,
            validateStatus: function (status) {
                return status < 500; // Reject only if status is >= 500
            }
        });
        
        if (response.status >= 400) {
            throw new Error(`API returned status ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        if (!response.data.success || !response.data.data || response.data.data.length === 0) {
            throw new Error('No articles found in the API');
        }
        
        // Articles are ordered by published_at desc, so first one is latest
        const latestArticle = response.data.data[0];
        console.log(`✅ Found latest article: "${latestArticle.title}"`);
        
        return latestArticle;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error(`❌ Connection refused. Is your Laravel API running at ${LARAVEL_API_BASE_URL}?`);
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            console.error(`❌ Request timeout. The API at ${LARAVEL_API_BASE_URL} is not responding.`);
        } else if (error.response) {
            console.error(`❌ API Error (${error.response.status}):`, error.response.data);
        } else if (error.request) {
            console.error(`❌ No response received from ${LARAVEL_API_BASE_URL}`);
            console.error('   Make sure your Laravel API is running and accessible.');
        } else {
            console.error('❌ Error fetching latest article:', error.message);
        }
        console.error('   Full error:', error.code || error.message);
        throw error;
    }
}

/**
 * Fetches content from a URL
 */
async function fetchArticleContent(url) {
    try {
        console.log(`📄 Fetching content from: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 10000,
        });
        
        return response.data;
    } catch (error) {
        console.error(`❌ Error fetching content from ${url}:`, error.message);
        throw error;
    }
}

/**
 * Extracts main content from HTML using Cheerio
 */
function extractMainContent(html, url) {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, header, footer, aside, .sidebar, .advertisement, .ads').remove();
    
    // Try to find main content in common article containers
    let content = '';
    
    // Try article tag first
    const article = $('article').first();
    if (article.length > 0) {
        content = article.text().trim();
    } else {
        // Try common content selectors
        const selectors = [
            'main',
            '.content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '#content',
            '.main-content',
            '[role="main"]',
        ];
        
        for (const selector of selectors) {
            const element = $(selector).first();
            if (element.length > 0 && element.text().trim().length > 200) {
                content = element.text().trim();
                break;
            }
        }
        
        // Fallback to body if no specific content found
        if (!content || content.length < 200) {
            content = $('body').text().trim();
        }
    }
    
    // Clean up content
    content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
    
    return content;
}

/**
 * Searches Google using Custom Search API (preferred method)
 */
async function searchGoogleCustomSearchAPI(query) {
    try {
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: GOOGLE_SEARCH_API_KEY,
                cx: GOOGLE_SEARCH_ENGINE_ID,
                q: query,
                num: 10, // Get up to 10 results
            },
        });
        
        if (response.data.items && response.data.items.length > 0) {
            return response.data.items.map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet,
            }));
        }
        return [];
    } catch (error) {
        if (error.response) {
            const errorData = error.response.data?.error || {};
            const errorMessage = errorData.message || JSON.stringify(error.response.data);
            console.error('   Google Custom Search API error:', errorMessage);
            
            // Provide helpful guidance for common errors
            if (errorMessage.includes('has not been used') || errorMessage.includes('is disabled')) {
                console.error('\n   🔧 ACTION REQUIRED: Enable Custom Search API');
                console.error('   1. Visit: https://console.cloud.google.com/apis/library/customsearch.googleapis.com');
                console.error('   2. Select your project (ID: ' + (errorMessage.match(/project (\d+)/)?.[1] || 'your project') + ')');
                console.error('   3. Click "Enable"');
                console.error('   4. Wait a few minutes for the API to activate');
                console.error('   5. Run the script again\n');
            } else if (errorMessage.includes('API key not valid') || errorMessage.includes('invalid API key')) {
                console.error('\n   🔧 ACTION REQUIRED: Check your API key');
                console.error('   - Verify GOOGLE_SEARCH_API_KEY in your .env file');
                console.error('   - Ensure the API key has Custom Search API enabled\n');
            } else if (errorMessage.includes('invalid cx') || errorMessage.includes('Search Engine ID')) {
                console.error('\n   🔧 ACTION REQUIRED: Check your Search Engine ID');
                console.error('   - Verify GOOGLE_SEARCH_ENGINE_ID in your .env file');
                console.error('   - Get your ID from: https://programmablesearchengine.google.com/\n');
            }
        } else {
            console.error('   Google Custom Search API error:', error.message);
        }
        return [];
    }
}

/**
 * Searches Google for the article title and returns blog/article links
 */
async function searchGoogleForArticle(title) {
    try {
        console.log(`🔍 Searching Google for: "${title}"`);
        
        let results = [];
        
        // Try Google Custom Search API first (if configured)
        if (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID) {
            console.log('   Using Google Custom Search API...');
            results = await searchGoogleCustomSearchAPI(title);
            
            if (results.length > 0) {
                console.log(`   ✅ Found ${results.length} results via Custom Search API`);
            } else {
                console.log('   ⚠️  Custom Search API returned no results, falling back to google-it...');
            }
        }
        
        // Fallback to google-it if Custom Search API not configured or returned no results
        if (results.length === 0) {
            console.log('   Using google-it package (may be blocked by Google)...');
            try {
                const googleItResults = await googleIt({
                    query: title,
                    options: {
                        limit: 20,
                    },
                });
                
                if (Array.isArray(googleItResults) && googleItResults.length > 0) {
                    results = googleItResults;
                }
            } catch (googleError) {
                console.warn('   ⚠️  google-it package failed:', googleError.message);
            }
        }
        
        console.log(`   Found ${results.length} total search results`);
        
        // If no results, provide helpful guidance
        if (results.length === 0) {
            if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
                console.warn('   ⚠️  No results from Google. Consider using Google Custom Search API:');
                console.warn('      1. Get API key: https://developers.google.com/custom-search/v1/overview');
                console.warn('      2. Create Search Engine: https://programmablesearchengine.google.com/');
                console.warn('      3. Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID to .env');
            } else {
                console.warn('   ⚠️  No results from Google. This could be due to:');
                console.warn('      - Network issues');
                console.warn('      - Invalid API credentials');
                console.warn('      - Search Engine ID not configured correctly');
            }
        }
        
        // Filter for blog/article URLs (exclude social media, video sites, etc.)
        const excludedDomains = [
            'youtube.com',
            'youtu.be',
            'facebook.com',
            'twitter.com',
            'x.com',
            'instagram.com',
            'linkedin.com',
            'pinterest.com',
            'reddit.com',
            'tiktok.com',
            'vimeo.com',
            'amazon.com',
            'ebay.com',
            'wikipedia.org',
            'google.com',
            'bing.com',
            'yahoo.com',
        ];
        
        // Also exclude common file extensions that aren't articles
        const excludedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'];
        
        // Helper function to filter blog articles
        const filterBlogArticles = (resultsToFilter) => {
            return resultsToFilter
                .filter(result => {
                    if (!result.link) return false;
                    
                    const url = result.link.toLowerCase();
                    
                    // Exclude if it's a known non-blog domain
                    if (excludedDomains.some(domain => url.includes(domain))) {
                        return false;
                    }
                    
                    // Exclude if it's a file download
                    if (excludedExtensions.some(ext => url.includes(ext))) {
                        return false;
                    }
                    
                    // Exclude if it's just a hash anchor
                    if (url.includes('#') && url.split('#')[0] === url.split('#')[1]) {
                        return false;
                    }
                    
                    // Exclude very short URLs (likely not articles)
                    if (url.length < 20) {
                        return false;
                    }
                    
                    // Accept if it has common blog/article patterns (preferred)
                    const hasBlogPattern = url.includes('/blog/') || 
                                         url.includes('/article/') || 
                                         url.includes('/post/') ||
                                         url.includes('/news/') ||
                                         url.includes('/story/') ||
                                         url.includes('/entry/') ||
                                         url.match(/\/\d{4}\/\d{2}\//) || // Date-based URLs
                                         url.endsWith('.html');
                    
                    // Also accept if it doesn't look like a social media or e-commerce URL
                    // and has a reasonable structure (has path segments)
                    const hasPathStructure = (url.match(/\//g) || []).length >= 2;
                    
                    return hasBlogPattern || hasPathStructure;
                })
                .slice(0, 2); // Get first 2 blog/article links
        };
        
        // Filter results - be more lenient: exclude bad domains, but accept most others
        let blogArticles = filterBlogArticles(results);
        
        if (blogArticles.length === 0) {
            if (results.length > 0) {
                console.log('\n⚠️  Debug: All search results (before filtering):');
                results.slice(0, 10).forEach((result, index) => {
                    console.log(`   ${index + 1}. ${result.link || result.title || 'No link/title'}`);
                });
                console.log('\n   💡 All results were filtered out. The filtering criteria might be too strict.');
            } else {
                console.log('\n⚠️  No search results returned from Google.');
                console.log('   This is likely because:');
                console.log('   1. Google is blocking automated requests');
                console.log('   2. The google-it package needs configuration');
                console.log('   3. Network/firewall issues');
                console.log('\n   💡 Trying alternative: Using a simplified search query...');
                
                // Try a very simple search with just key terms
                const simpleQuery = title.split(' ').filter(word => word.length > 3).slice(0, 3).join(' ');
                if (simpleQuery && simpleQuery !== title) {
                    console.log(`   Retrying with simplified query: "${simpleQuery}"`);
                    try {
                        const retryResults = await googleIt({
                            query: simpleQuery,
                            options: { limit: 10 }
                        });
                        
                        if (Array.isArray(retryResults) && retryResults.length > 0) {
                            console.log(`   ✅ Got ${retryResults.length} results with simplified query`);
                            // Use these results instead and re-filter
                            blogArticles = filterBlogArticles(retryResults);
                        }
                    } catch (retryError) {
                        console.log('   ❌ Simplified query also failed');
                    }
                }
                
                if (blogArticles.length === 0) {
                    throw new Error('No blog/article links found. Google may be blocking automated requests. Consider using Google Custom Search API or providing URLs manually.');
                }
            }
        }
        
        console.log(`✅ Found ${blogArticles.length} relevant blog/article links`);
        blogArticles.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.link}`);
        });
        
        return blogArticles;
    } catch (error) {
        console.error('❌ Error searching Google:', error.message);
        throw error;
    }
}

/**
 * Scrapes content from multiple URLs
 */
async function scrapeArticles(urls) {
    const scrapedArticles = [];
    
    for (const urlObj of urls) {
        try {
            const url = urlObj.link || urlObj;
            console.log(`\n📖 Scraping article from: ${url}`);
            
            const html = await fetchArticleContent(url);
            const content = extractMainContent(html, url);
            
            if (content.length < 100) {
                console.warn(`⚠️  Warning: Content from ${url} seems too short (${content.length} chars)`);
            }
            
            scrapedArticles.push({
                url: url,
                title: urlObj.title || 'Untitled',
                content: content.substring(0, 5000), // Limit content length for LLM
            });
            
            console.log(`✅ Scraped ${content.length} characters from ${url}`);
        } catch (error) {
            console.error(`❌ Error scraping ${url}:`, error.message);
            // Continue with other articles even if one fails
        }
    }
    
    return scrapedArticles;
}

/**
 * Uses LLM to enhance the article based on reference articles
 */
async function enhanceArticleWithLLM(originalArticle, referenceArticles) {
    try {
        console.log('\n🤖 Enhancing article using LLM...');
        
        // Prepare reference content
        const referenceContent = referenceArticles.map((ref, index) => 
            `Reference Article ${index + 1} (${ref.url}):\n${ref.content}`
        ).join('\n\n---\n\n');
        
        // Get original content - preserve the original excerpt
        // We'll use it for the LLM prompt but won't overwrite it in the database
        let originalContent = originalArticle.excerpt || '';
        
        // If article has a URL and no excerpt, try to fetch its content
        if (originalArticle.url && !originalContent) {
            try {
                const html = await fetchArticleContent(originalArticle.url);
                originalContent = extractMainContent(html, originalArticle.url);
            } catch (error) {
                console.warn('⚠️  Could not fetch content from article URL, using excerpt');
            }
        }
        
        if (!originalContent || originalContent.length < 50) {
            throw new Error('Original article content is too short or missing');
        }
        
        console.log(`   Using original content (${originalContent.length} chars) for enhancement`);
        
        // Create prompt for LLM
        const prompt = `You are an expert content writer. Your task is to enhance and rewrite an article to match the style, formatting, and quality of top-ranking articles on Google.

ORIGINAL ARTICLE:
Title: ${originalArticle.title}
Content:
${originalContent.substring(0, 3000)}

REFERENCE ARTICLES (top-ranking articles from Google):
${referenceContent}

INSTRUCTIONS:
1. Analyze the writing style, structure, and formatting of the reference articles
2. Rewrite and enhance the original article to match the quality and style of the reference articles
3. Improve the formatting (use proper headings, paragraphs, lists where appropriate)
4. Enhance the content while maintaining the core message and information
5. Make it more engaging and well-structured
6. Ensure the content is comprehensive and valuable
7. Keep the original title or create a better one if needed

OUTPUT FORMAT:
- Provide the enhanced article content
- Use proper markdown formatting (headings, paragraphs, lists)
- Make it publication-ready
- Do NOT include the title in the output, only the content

Enhanced Article Content:`;

        // Try different model formats - the package may need 'models/' prefix or different model name
        let response;
        try {
            // Try with models/ prefix first (Gemini API format)
            response = await genAI.models.generateContent({
                model: 'models/gemini-1.5-flash',
                contents: prompt,
            });
        } catch (error) {
            // Fallback to gemini-2.0-flash (newer model)
            try {
                console.log('   Trying gemini-2.0-flash model...');
                response = await genAI.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt,
                });
            } catch (error2) {
                // Try with models/ prefix for 2.0
                try {
                    console.log('   Trying models/gemini-2.0-flash...');
                    response = await genAI.models.generateContent({
                        model: 'models/gemini-2.0-flash',
                        contents: prompt,
                    });
                } catch (error3) {
                    throw new Error(`All model attempts failed. Last error: ${error3.message}`);
                }
            }
        }
        
        // Extract text from response
        // The response structure from @google/genai may vary
        let enhancedContent = '';
        
        try {
            // Try response.text first (common in newer API versions)
            if (response.text && typeof response.text === 'string') {
                enhancedContent = response.text;
            }
            // Try candidates structure (standard Gemini API format)
            else if (response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate.content) {
                    // Check if content has parts array
                    if (candidate.content.parts && Array.isArray(candidate.content.parts)) {
                        enhancedContent = candidate.content.parts
                            .map(part => part.text || '')
                            .filter(text => text.length > 0)
                            .join('');
                    } else if (typeof candidate.content === 'string') {
                        enhancedContent = candidate.content;
                    } else if (candidate.content.text) {
                        enhancedContent = candidate.content.text;
                    }
                }
            }
            
            // If still no content, log the structure for debugging
            if (!enhancedContent) {
                console.warn('   ⚠️  Unexpected response structure. Attempting to find text...');
                console.warn('   Response keys:', Object.keys(response));
                
                // Try to find text in nested structures
                const findText = (obj, depth = 0) => {
                    if (depth > 5) return null; // Prevent infinite recursion
                    if (typeof obj === 'string' && obj.length > 100) return obj;
                    if (typeof obj === 'object' && obj !== null) {
                        for (const key in obj) {
                            if (key === 'text' || key === 'content') {
                                const val = obj[key];
                                if (typeof val === 'string' && val.length > 100) return val;
                            }
                            const found = findText(obj[key], depth + 1);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                
                const foundText = findText(response);
                if (foundText) {
                    enhancedContent = foundText;
                } else {
                    // Last resort: show structure for debugging
                    console.error('   Full response structure:', JSON.stringify(response, null, 2).substring(0, 1000));
                    throw new Error('Could not extract text from LLM response. Check the response structure above.');
                }
            }
        } catch (extractError) {
            console.error('   Error extracting content:', extractError.message);
            throw new Error(`Failed to extract content from LLM response: ${extractError.message}`);
        }
        
        console.log('✅ Article enhanced successfully');
        
        return enhancedContent;
    } catch (error) {
        console.error('❌ Error enhancing article with LLM:', error.message);
        throw error;
    }
}

/**
 * Adds citations to the article content
 */
function addCitations(content, referenceArticles) {
    let citations = '\n\n---\n\n## References\n\n';
    
    referenceArticles.forEach((ref, index) => {
        citations += `${index + 1}. [${ref.title || 'Source'}](${ref.url})\n`;
    });
    
    return content + citations;
}

/**
 * Updates the article via Laravel API
 */
async function updateArticle(articleId, updatedData) {
    try {
        console.log(`\n📤 Updating article (ID: ${articleId}) via Laravel API...`);
        
        const response = await axios.put(
            `${LARAVEL_API_BASE_URL}/articles/${articleId}`,
            updatedData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        );
        
        if (response.data.success) {
            console.log('✅ Article updated successfully!');
            console.log(`   Title: ${response.data.data.title}`);
            console.log(`   URL: ${response.data.data.url}`);
        } else {
            throw new Error('API returned success: false');
        }
        
        return response.data.data;
    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.data);
        } else {
            console.error('❌ Error updating article:', error.message);
        }
        throw error;
    }
}

/**
 * Main function to orchestrate the entire process
 */
async function main() {
    try {
        console.log('🚀 Starting Content Upgrader Process...\n');
        
        // Validate configuration
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set in .env file. Please add your Google Gemini API key.');
        }
        
        if (!LARAVEL_API_BASE_URL) {
            throw new Error('LARAVEL_API_BASE_URL is not set in .env file.');
        }
        
        console.log(`📋 Configuration:`);
        console.log(`   Laravel API: ${LARAVEL_API_BASE_URL}`);
        console.log(`   Gemini API Key: ${GEMINI_API_KEY.substring(0, 10)}...\n`);
        
        // Step 1: Fetch latest article
        const latestArticle = await fetchLatestArticle();
        
        // Step 2: Search Google for the article title
        let googleResults;
        try {
            googleResults = await searchGoogleForArticle(latestArticle.title);
        } catch (error) {
            // If search fails, try a more generic search query
            console.log('\n⚠️  Initial search failed, trying a more generic search...');
            try {
                const genericQuery = latestArticle.title.split(' ').slice(0, 5).join(' '); // Use first 5 words
                googleResults = await searchGoogleForArticle(genericQuery);
            } catch (retryError) {
                console.error('❌ Retry search also failed');
                throw new Error(`Could not find suitable articles. Original error: ${error.message}`);
            }
        }
        
        if (googleResults.length < 2) {
            console.warn(`⚠️  Warning: Found only ${googleResults.length} blog/article link(s). Proceeding with available links.`);
        }
        
        // Step 3: Scrape content from the top articles
        const scrapedArticles = await scrapeArticles(googleResults);
        
        if (scrapedArticles.length === 0) {
            throw new Error('Failed to scrape any articles from Google results');
        }
        
        console.log(`\n✅ Successfully scraped ${scrapedArticles.length} reference article(s)`);
        
        // Step 4: Enhance article using LLM
        const enhancedContent = await enhanceArticleWithLLM(latestArticle, scrapedArticles);
        
        // Step 5: Add citations
        const finalContent = addCitations(enhancedContent, scrapedArticles);
        
        // Step 6: Update the article via API
        // Save the enhanced content to the enhanced_content field
        // Keep the original excerpt unchanged so we can show both versions
        const updatedArticle = await updateArticle(latestArticle.id, {
            title: latestArticle.title, // Keep original title
            enhanced_content: finalContent, // Save full enhanced content
            // Keep original excerpt unchanged for comparison
        });
        
        console.log('\n✨ Content Upgrader Process Completed Successfully!');
        console.log(`\n📝 Enhanced article is now live at: ${updatedArticle.url || 'N/A'}`);
        
    } catch (error) {
        console.error('\n❌ Fatal Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the main function
if (require.main === module) {
    main();
}

module.exports = {
    fetchLatestArticle,
    searchGoogleForArticle,
    scrapeArticles,
    enhanceArticleWithLLM,
    updateArticle,
    main,
};

