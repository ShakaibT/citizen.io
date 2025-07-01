# Citizen Engagement App

A modern, secure platform for citizen engagement that helps users stay informed about their democracy through location-based political information.

## 🚀 Features

- **Location-Based Information**: Find your representatives and relevant legislation based on your address
- **Interactive Maps**: Explore states and counties with real-time data visualization
- **Secure Authentication**: Optional account creation with privacy-first design
- **Real-Time Updates**: Track bills, elections, and civic news
- **Mobile Responsive**: Works seamlessly on all devices
- **Dark/Light Mode**: Adaptive theming for user preference

## 🛡️ Security & Privacy

- **Privacy-First**: Minimal data collection, encrypted storage, no tracking
- **Secure Headers**: Comprehensive security headers prevent common attacks
- **API Security**: Restricted API keys and secure authentication
- **Compliance**: GDPR and CCPA compliant design
- **Transparency**: Clear privacy policy and data usage

See [SECURITY.md](./SECURITY.md) for detailed security documentation.

## 🏗️ Architecture

### Frontend
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components
- **Lucide React** icons

### Backend & APIs
- **US Census API** for political data (no API key required)
- **Supabase** for authentication and user data
- **Google Maps API** (optional) for address validation

### Key Components
- `USMap` - Interactive US map with state/county selection
- `LocationSetup` - Address validation and location selection
- `AuthProvider` - Secure authentication management
- `ThemeProvider` - Dark/light mode support

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd citizen-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp EXAMPLE.env.local .env.local
   ```
   
   Edit `.env.local` with your actual keys:
   ```env
   # Required for authentication
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   
   # Optional for enhanced address validation
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Copy the URL and anon key to your `.env.local`
3. Set up authentication providers as needed
4. Configure Row Level Security (RLS) policies

### Google Maps API (Optional)
1. Create a Google Cloud project
2. Enable the Maps JavaScript API and Places API
3. Create an API key and restrict it to your domain
4. Add the key to your `.env.local`

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Add environment variables in the Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- Ensure Node.js 18+ support
- Set environment variables
- Build with `npm run build`
- Start with `npm start`

## 📁 Project Structure

```
citizen-app/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── auth-provider.tsx # Authentication context
│   ├── location-setup.tsx # Location selection
│   ├── modern-us-map.tsx # Interactive map
│   └── theme-provider.tsx # Theme management
├── lib/                  # Utility libraries
│   ├── census-api.ts     # Census API integration
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Helper functions
├── hooks/                # Custom React hooks
├── styles/               # Additional styles
└── public/               # Static assets
```

## 🔌 API Routes

- `/api/census/*` - US Census Bureau data integration
- `/api/states-geojson` - State boundary data
- `/api/counties-geojson` - County boundary data

## 🧪 Development

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Tailwind CSS for consistent styling

### Testing
```bash
npm run lint        # Run ESLint
npm run build       # Test production build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines
- Follow TypeScript best practices
- Maintain security standards
- Update documentation for new features
- Test thoroughly before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and [SECURITY.md](./SECURITY.md)
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Security**: Email security@citizenapp.com for security concerns

## 🙏 Acknowledgments

- **US Census Bureau** for providing free, comprehensive political data
- **Supabase** for secure, scalable backend infrastructure
- **Vercel** for excellent deployment platform
- **Open Source Community** for the amazing tools and libraries

---

Built with ❤️ for democracy and civic engagement. # Latest deployment - Tue Jul  1 09:22:24 EDT 2025
