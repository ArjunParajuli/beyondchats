<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Models\Article;
use Illuminate\Support\Str;
use DOMDocument;
use DOMXPath;
use Carbon\Carbon;

class ScrapeBeyondChatsBlogs extends Command
{
    protected $signature = 'scrape:beyondchats-blogs';
    protected $description = 'Scrape 5 oldest blogs from BeyondChats (from last pages)';

    public function handle()
    {
        libxml_use_internal_errors(true);

        $this->info('Starting to scrape BeyondChats blogs...');

        try {
            // 1. Load main blog page to find pagination
            $this->info('Fetching main blog page...');
            $html = Http::timeout(30)->retry(3, 1000)->get('https://beyondchats.com/blogs/')->body();

            $dom = new DOMDocument();
            @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
            $xpath = new DOMXPath($dom);

            // 2. Find all pagination links and get the last page number
            $paginationLinks = $xpath->query("//a[contains(@class,'page-numbers')]");
            
            $lastPageUrl = 'https://beyondchats.com/blogs/';
            
            if ($paginationLinks->length > 0) {
                // Get all page number links
                $pageNumbers = [];
                foreach ($paginationLinks as $link) {
                    $href = $link->getAttribute('href');
                    // Extract page number from URL like /blogs/page/15/
                    if (preg_match('/\/page\/(\d+)\//', $href, $matches)) {
                        $pageNumbers[] = (int)$matches[1];
                    }
                }
                
                if (!empty($pageNumbers)) {
                    $lastPageNumber = max($pageNumbers);
                    $lastPageUrl = "https://beyondchats.com/blogs/page/{$lastPageNumber}/";
                    $this->info("Found last page: {$lastPageNumber}");
                }
            }

            // 3. Collect articles from last page backwards until we have 5
            $targetCount = 5;
            $currentPageNumber = !empty($pageNumbers) ? max($pageNumbers) : 1;
            $collectedArticles = [];

            // Start from the last page and go backwards
            while (count($collectedArticles) < $targetCount && $currentPageNumber >= 1) {
                $pageUrl = $currentPageNumber == 1 
                    ? 'https://beyondchats.com/blogs/' 
                    : "https://beyondchats.com/blogs/page/{$currentPageNumber}/";
                
                $this->info("Fetching page {$currentPageNumber}: {$pageUrl}");
                
                try {
                    $html = Http::timeout(30)->retry(3, 1000)->get($pageUrl)->body();
                    $dom = new DOMDocument();
                    @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
                    $xpath = new DOMXPath($dom);

                    // Get all article elements from this page
                    $articles = $xpath->query("//article");
                    
                    if ($articles->length === 0) {
                        $this->warn('No articles found. Trying alternative selector...');
                        $articles = $xpath->query("//main//article | //div[contains(@class, 'elementor-post')]");
                    }

                    $this->info("Found {$articles->length} articles on page {$currentPageNumber}");

                    // Process articles from this page
                    foreach ($articles as $article) {
                        if (count($collectedArticles) >= $targetCount) break 2;

                        try {
                            // Extract title and URL from the article link
                            $titleLink = $xpath->query(".//h2/a | .//h2//a | .//a[contains(@href, '/blogs/')]", $article)->item(0);
                            
                            if (!$titleLink) {
                                // Try finding any link in the article
                                $titleLink = $xpath->query(".//a[contains(@href, '/blogs/')]", $article)->item(0);
                            }

                            if (!$titleLink) {
                                continue;
                            }

                            $url = $titleLink->getAttribute('href');
                            
                            // Make sure URL is absolute
                            if (strpos($url, 'http') !== 0) {
                                $url = 'https://beyondchats.com' . $url;
                            }

                            // Extract title - try multiple selectors
                            $titleNode = $xpath->query(".//h2", $article)->item(0);
                            if (!$titleNode) {
                                $titleNode = $titleLink;
                            }
                            
                            $title = trim($titleNode->textContent);
                            if (empty($title)) {
                                continue;
                            }

                            // Extract excerpt/description
                            $excerpt = '';
                            $excerptNode = $xpath->query(".//p", $article)->item(0);
                            if ($excerptNode) {
                                $excerpt = trim($excerptNode->textContent);
                            }

                            // Extract published date
                            $publishedAt = null;
                            $dateNode = $xpath->query(".//time", $article)->item(0);
                            if ($dateNode) {
                                $dateText = trim($dateNode->textContent);
                                if (!empty($dateText)) {
                                    try {
                                        $publishedAt = Carbon::parse($dateText);
                                    } catch (\Exception $e) {
                                        $publishedAt = now();
                                    }
                                }
                            }
                            
                            if (!$publishedAt) {
                                $publishedAt = now();
                            }

                            // Add to collection
                            $collectedArticles[] = [
                                'url' => $url,
                                'title' => $title,
                                'slug' => Str::slug($title),
                                'excerpt' => $excerpt,
                                'published_at' => $publishedAt,
                            ];

                        } catch (\Exception $e) {
                            $this->warn("Error processing article: " . $e->getMessage());
                        }
                    }
                } catch (\Exception $e) {
                    $this->error("Error fetching page {$currentPageNumber}: " . $e->getMessage());
                }

                $currentPageNumber--;
            }

            // 4. Save collected articles to database
            $scrapedCount = 0;
            foreach ($collectedArticles as $articleData) {
                try {
                    Article::updateOrCreate(
                        ['url' => $articleData['url']],
                        $articleData
                    );

                    $scrapedCount++;
                    $this->info("✓ Scraped: {$articleData['title']}");
                } catch (\Exception $e) {
                    $this->error("Error saving article '{$articleData['title']}': " . $e->getMessage());
                }
            }

            $this->info("✅ Successfully scraped {$scrapedCount} oldest articles from BeyondChats.");

        } catch (\Exception $e) {
            $this->error("Error during scraping: " . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
