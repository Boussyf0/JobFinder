# JobHub - Modern Job Search Platform

A modern, responsive job search platform built with Next.js, TypeScript, and Tailwind CSS. This frontend application connects to a Flask backend API to provide a seamless job search experience.

## Features

- 🔍 **Advanced Search**: Search jobs by keywords, location, and various filters
- 💼 **Job Listings**: Browse through thousands of job postings with detailed information
- 🌐 **Remote Filter**: Easily filter for remote-friendly positions
- ❤️ **Save Jobs**: Save interesting jobs for later review
- 📝 **Resume Matching**: Match your resume with job descriptions to find the best opportunities
- 📊 **Skills Analysis**: Auto-detection of skills from job descriptions
- 📱 **Responsive Design**: Optimized for all devices from mobile to desktop

## Getting Started

### Prerequisites

- Node.js 16.8+ and npm/yarn
- Backend API running (see main project README)

### Installation

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Configure the environment:
   - Make sure the backend API is running on port 5000
   - The API proxy is already configured in `next.config.ts`

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
ui/
├── public/            # Static files
├── src/
│   ├── app/           # App router pages
│   ├── components/    # UI components
│   │   ├── atoms/     # Smallest UI elements
│   │   ├── molecules/ # Combinations of atoms
│   │   └── organisms/ # Larger UI sections
│   ├── lib/           # Utility functions and API client
│   └── types/         # TypeScript type definitions
├── tailwind.config.ts # Tailwind CSS configuration
└── next.config.ts     # Next.js configuration
```

## Component Architecture

This project follows the Atomic Design principles with components organized into:

- **Atoms**: Fundamental building blocks like buttons, inputs, and badges
- **Molecules**: Groups of atoms functioning together, like search inputs and job cards
- **Organisms**: Complex UI sections composed of molecules and atoms, like headers and search result grids

## API Integration

The UI communicates with the backend through an API client (`src/lib/api.ts`) that abstracts all API calls and provides type-safe functions for fetching data.

## Technologies Used

- **Next.js**: React framework for server-rendered applications
- **TypeScript**: For type safety and better developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: For smooth animations
- **Lucide React**: Modern icon library
- **Axios**: For HTTP requests

## License

This project is part of a larger job search platform solution. See the main project README for license information.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
