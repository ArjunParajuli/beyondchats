import { useState, useEffect } from 'react'
import axios from 'axios'
import ArticleCard from './components/ArticleCard'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${API_BASE_URL}/articles`)
      
      if (response.data.success) {
        setArticles(response.data.data)
      } else {
        setError('Failed to fetch articles')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch articles')
      console.error('Error fetching articles:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleArticleClick = (article) => {
    setSelectedArticle(selectedArticle?.id === article.id ? null : article)
  }

  if (loading) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading articles...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="container">
          <div className="error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={fetchArticles} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>📰 BeyondChats Articles</h1>
          <p className="subtitle">Original and Enhanced Content</p>
          <button onClick={fetchArticles} className="refresh-btn">
            🔄 Refresh
          </button>
        </header>

        {articles.length === 0 ? (
          <div className="empty-state">
            <p>No articles found. Check your API connection.</p>
          </div>
        ) : (
          <div className="articles-grid">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                isExpanded={selectedArticle?.id === article.id}
                onClick={() => handleArticleClick(article)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App

