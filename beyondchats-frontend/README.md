# BeyondChats Frontend

A modern, responsive React frontend for displaying articles from the BeyondChats Laravel API. Shows both original and enhanced versions of articles.

## Features

- 📰 **Article Display**: Beautiful card-based layout for articles
- ✨ **Dual View**: Toggle between original and enhanced versions
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- 🎨 **Modern UI**: Professional gradient design with smooth animations
- 🔄 **Real-time Updates**: Refresh button to fetch latest articles
- 📅 **Date Formatting**: Human-readable publication dates

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Laravel API running and accessible

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API URL (optional):**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000/api
   ```
   
   If not set, it defaults to `http://127.0.0.1:8000/api`

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
beyondchats-frontend/
├── src/
│   ├── components/
│   │   ├── ArticleCard.jsx      # Article card component
│   │   └── ArticleCard.css      # Article card styles
│   ├── App.jsx                   # Main app component
│   ├── App.css                   # App styles
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── index.html                    # HTML template
├── vite.config.js                # Vite configuration
└── package.json                  # Dependencies
```

## API Requirements

The frontend expects the Laravel API to have:

- `GET /api/articles` - Returns articles in this format:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "title": "Article Title",
        "slug": "article-slug",
        "excerpt": "Article content...",
        "url": "https://example.com/article",
        "published_at": "2024-01-01T00:00:00.000000Z"
      }
    ]
  }
  ```

## Features Explained

### Article Cards
- Click on any article card to expand and view details
- Shows publication date and enhanced badge if available
- Smooth animations and hover effects

### Dual View
- **Original Tab**: Shows the original article excerpt
- **Enhanced Tab**: Shows the AI-enhanced version (if available)
- Easy toggle between views

### Responsive Design
- **Desktop**: Multi-column grid layout
- **Tablet**: Adjusted column count
- **Mobile**: Single column, optimized for touch

## Customization

### Change API URL
Edit `src/App.jsx`:
```javascript
const API_BASE_URL = 'https://your-api-url.com/api'
```

Or set it in `.env`:
```env
VITE_API_BASE_URL=https://your-api-url.com/api
```

### Change Colors
Edit the gradient colors in `src/App.css` and `src/components/ArticleCard.css`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

## Troubleshooting

### API Connection Issues
- Ensure your Laravel API is running
- Check CORS settings in Laravel if accessing from different origin
- Verify the API URL in `.env` file

### No Articles Displayed
- Check browser console for errors
- Verify API response format matches expected structure
- Ensure API returns `success: true` in response

## Technologies Used

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Axios** - HTTP client
- **CSS3** - Styling with modern features

## License

ISC

