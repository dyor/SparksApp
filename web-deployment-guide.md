# Web Deployment Guide

## Overview

Sparks can be deployed as a Progressive Web App (PWA) that works in browsers and can be installed on devices like a native app. This guide covers multiple deployment options.

## Build Configuration

### Web-Specific Settings (already configured in app.json)
```json
{
  "web": {
    "favicon": "./assets/favicon.png",
    "bundler": "metro",
    "output": "static"
  }
}
```

## Build Process

### Generate Web Build
```bash
# Build optimized web version
npm run build:web
# OR
npx expo export --platform web
```

**Output**: Static files in `dist/` folder ready for hosting

### Build Contents
- `dist/index.html` - Main entry point
- `dist/_expo/static/` - Optimized JavaScript and CSS bundles
- `dist/assets/` - Optimized images and icons
- `dist/manifest.json` - PWA manifest file

## Deployment Options

### 1. Netlify (Recommended)

#### Automatic Deployment from GitHub
1. **Connect Repository**
   - Go to [Netlify](https://netlify.com)
   - Click "Import from Git" → Select GitHub
   - Choose your Sparks repository

2. **Build Settings**
   ```
   Build command: npx expo export --platform web
   Publish directory: dist
   Node version: 18.x or higher
   ```

3. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy automatically
   - Get your URL: `https://[site-name].netlify.app`

#### Manual Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build:web

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### 2. Vercel

#### Automatic Deployment
1. **Import Project**
   - Go to [Vercel](https://vercel.com)
   - Click "New Project" → Import from GitHub
   - Select Sparks repository

2. **Configuration**
   ```
   Framework Preset: Other
   Build Command: npx expo export --platform web
   Output Directory: dist
   Install Command: npm install
   ```

3. **Deploy**
   - Click "Deploy"
   - Get your URL: `https://[project-name].vercel.app`

#### Manual Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Build the project
npm run build:web

# Deploy to Vercel
vercel --prod
```

### 3. GitHub Pages

#### Setup GitHub Actions (Automated)
Create `.github/workflows/deploy-web.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build web app
        run: npx expo export --platform web
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

#### Manual Deployment
```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts
"homepage": "https://[username].github.io/[repository-name]",
"predeploy": "npx expo export --platform web",
"deploy:gh-pages": "gh-pages -d dist"

# Deploy
npm run deploy:gh-pages
```

### 4. Firebase Hosting

#### Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init hosting
```

#### Configuration (firebase.json)
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/service-worker.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      }
    ]
  }
}
```

#### Deploy
```bash
# Build web app
npm run build:web

# Deploy to Firebase
firebase deploy --only hosting
```

### 5. AWS S3 + CloudFront

#### S3 Setup
1. Create S3 bucket with static website hosting enabled
2. Set bucket policy for public read access
3. Upload `dist/` contents to bucket

#### CloudFront Setup
1. Create CloudFront distribution
2. Point to S3 bucket origin
3. Configure custom error pages for SPA routing
4. Enable HTTPS with SSL certificate

## PWA Features

### Service Worker
Expo automatically generates a service worker for offline functionality:
- Caches static assets
- Enables offline browsing
- Provides "Add to Home Screen" functionality

### Web App Manifest
Auto-generated `manifest.json` includes:
```json
{
  "name": "Sparks",
  "short_name": "Sparks",
  "description": "Interactive micro-experiences",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#007AFF",
  "background_color": "#ffffff",
  "icons": [...]
}
```

## Custom Domain Setup

### Netlify Custom Domain
1. Add domain in Netlify dashboard
2. Configure DNS records:
   ```
   Type: CNAME
   Name: www
   Value: [site-name].netlify.app
   ```

### Vercel Custom Domain
1. Add domain in Vercel dashboard
2. Configure DNS records as provided by Vercel

### CloudFlare Integration
- Enable CloudFlare for additional performance
- Configure SSL/TLS encryption
- Set up caching rules

## Performance Optimization

### Build Optimizations (already configured)
- Tree shaking removes unused code
- Asset optimization compresses images
- Bundle splitting for faster loading

### Hosting Optimizations
```bash
# Enable gzip compression
# Set proper cache headers
# Use CDN for global distribution
# Enable HTTP/2
```

## Testing Web Deployment

### Local Testing
```bash
# Build and serve locally
npm run build:web
npx serve dist

# Test PWA features
# Lighthouse audit for performance
```

### Pre-Deployment Checklist
- [ ] All sparks work in web browsers
- [ ] Theme switching functions properly
- [ ] Touch/click interactions work on mobile browsers
- [ ] App installs as PWA on mobile devices
- [ ] Offline functionality works correctly
- [ ] Performance scores well in Lighthouse
- [ ] Responsive design works on all screen sizes
- [ ] No console errors in browser developer tools

## Browser Compatibility

### Supported Browsers
- **Chrome**: 80+
- **Safari**: 14+
- **Firefox**: 78+
- **Edge**: 80+

### Mobile Browsers
- **iOS Safari**: 14+
- **Chrome Mobile**: 80+
- **Samsung Internet**: 12+

## Monitoring and Analytics

### Performance Monitoring
```bash
# Install web-vitals for monitoring
npm install web-vitals

# Add to your web app for performance tracking
```

### Analytics Options
- Google Analytics 4
- Plausible Analytics (privacy-focused)
- Netlify Analytics
- Vercel Analytics

## Environment Variables

### Web-Specific Environment Setup
```bash
# Create .env file for web deployment
EXPO_PUBLIC_WEB_URL=https://your-domain.com
EXPO_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## Useful Commands Summary

```bash
# Build for web
npm run build:web

# Preview build locally
npx serve dist

# Deploy to Netlify (manual)
netlify deploy --prod --dir=dist

# Deploy to Vercel (manual)
vercel --prod

# Deploy to GitHub Pages
npm run deploy:gh-pages

# Deploy to Firebase
firebase deploy --only hosting
```

## Troubleshooting Common Issues

### Build Issues
- **Metro bundler errors**: Clear cache with `npx expo export --clear`
- **Asset loading issues**: Check file paths and case sensitivity
- **Large bundle size**: Enable tree shaking and optimize assets

### Deployment Issues
- **404 errors**: Configure SPA routing redirects
- **HTTPS issues**: Ensure SSL certificates are properly configured
- **PWA not installing**: Check manifest.json and service worker

### Performance Issues
- **Slow loading**: Optimize images and enable compression
- **Poor mobile experience**: Test responsive design thoroughly
- **Caching issues**: Configure proper cache headers

## SEO Optimization

### Meta Tags (already configured in Expo)
```html
<meta name="description" content="Interactive micro-experiences: spinning wheels, flashcards, and business simulations">
<meta name="keywords" content="games, education, interactive, decision maker, flashcards">
<meta name="viewport" content="width=device-width, initial-scale=1">
```

### Open Graph Tags
```html
<meta property="og:title" content="Sparks - Interactive Micro-Experiences">
<meta property="og:description" content="Spin wheels, study flashcards, run businesses">
<meta property="og:type" content="website">
<meta property="og:url" content="https://your-domain.com">
<meta property="og:image" content="https://your-domain.com/assets/icon.png">
```

## Support Resources

- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Netlify Documentation](https://docs.netlify.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)