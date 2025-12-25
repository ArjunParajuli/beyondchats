import { useState, useEffect } from 'react'
import './ArticleCard.css'

function ArticleCard({ article, isExpanded, onClick }) {
  const [showOriginal, setShowOriginal] = useState(true)
  const [originalContent, setOriginalContent] = useState(null)
  const [loadingOriginal, setLoadingOriginal] = useState(false)

  const formatDate = (dateString) => {
    if (!dateString) return 'No date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Check if article has been enhanced (has enhanced_content field)
  const hasUpdate = article.enhanced_content && article.enhanced_content.length > 0

  // Fetch original content when switching to original tab
  useEffect(() => {
    if (isExpanded && showOriginal && article.url && !originalContent && !loadingOriginal) {
      // Note: Due to CORS, we can't fetch directly. Show message instead.
      setOriginalContent('original-available')
    }
  }, [isExpanded, showOriginal, article.url, originalContent, loadingOriginal])

  return (
    <div className={`article-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="article-header" onClick={onClick}>
        <div className="article-title-section">
          <h2 className="article-title">{article.title}</h2>
          <div className="article-meta">
            <span className="article-date">📅 {formatDate(article.published_at)}</span>
            {hasUpdate && (
              <span className="update-badge">✨ Enhanced</span>
            )}
          </div>
        </div>
        <button className="expand-btn">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="article-content">
          <div className="content-tabs">
            <button
              className={`tab ${showOriginal ? 'active' : ''}`}
              onClick={() => setShowOriginal(true)}
            >
              📄 Original
            </button>
            {hasUpdate && (
              <button
                className={`tab ${!showOriginal ? 'active' : ''}`}
                onClick={() => setShowOriginal(false)}
              >
                ✨ Enhanced Version
              </button>
            )}
          </div>

          <div className="content-body">
            {showOriginal ? (
              <div className="original-content">
                <div className="content-section">
                  <h3>📄 Original Article</h3>
                  <div className="original-info-box">
                    <p className="info-text">
                      This is the original version of the article before AI enhancement.
                      The original content is available at the source URL.
                    </p>
                    {article.excerpt && !hasUpdate && (
                      <div className="excerpt">
                        <p><strong>Current Excerpt:</strong></p>
                        <p>{article.excerpt.length > 300 ? `${article.excerpt.substring(0, 300)}...` : article.excerpt}</p>
                        <p className="note">(This appears to be the original excerpt)</p>
                      </div>
                    )}
                  </div>
                </div>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link original-link"
                  >
                    🔗 View Original Article Source
                  </a>
                )}
              </div>
            ) : (
              <div className="enhanced-content">
                <div className="content-section">
                  <h3>✨ Enhanced Version (AI-Updated)</h3>
                  <p className="enhanced-info">
                    This is the AI-enhanced version of the article, improved based on top-ranking Google search results.
                    The content has been reformatted and enhanced to match the style of top-performing articles.
                  </p>
                  {article.enhanced_content ? (
                    <div className="excerpt enhanced-excerpt">
                      {/* Render markdown/HTML formatting */}
                      {article.enhanced_content.includes('##') || article.enhanced_content.includes('**') || article.enhanced_content.includes('References') ? (
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: article.enhanced_content
                              .replace(/## (.*?)(\n|$)/g, '<h2>$1</h2>')
                              .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
                              .replace(/---/g, '<hr />')
                              .replace(/\n\n/g, '</p><p>')
                              .replace(/^/, '<p>')
                              .replace(/$/, '</p>')
                              .replace(/\n/g, '<br />')
                          }} 
                        />
                      ) : (
                        <div>
                          {article.enhanced_content.split('\n\n').map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="no-content">No enhanced content available yet. Run the content upgrader script to generate an enhanced version.</p>
                  )}
                </div>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link enhanced-link"
                  >
                    🔗 View Updated Article
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="article-footer">
            <div className="article-info">
              <span className="info-item">ID: {article.id}</span>
              {article.slug && (
                <span className="info-item">Slug: {article.slug}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArticleCard

