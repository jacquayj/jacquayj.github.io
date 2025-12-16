# Half-Life Calculator

A web-based calculator for tracking and visualizing the decay of substances based on their half-life. Built with React, TypeScript, and Recharts.

## Features

- **Track Multiple Doses**: Record doses with timestamps, amounts, and units (μg, mg, g, IU)
- **Real-time Calculations**: Automatically calculates current active levels based on exponential decay
- **Interactive Chart**: Visualize substance levels over time with detailed hover tooltips
- **Custom Half-Life**: Configure the half-life duration for any substance
- **Dose History**: View and manage all recorded doses in an organized table

## Live Demo

Visit the live application at: [https://jacquayj.github.io](https://jacquayj.github.io)

## Development

### Prerequisites

- Node.js 20 or higher
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Recharts** - Data visualization
- **GitHub Actions** - Automated deployment to GitHub Pages

## How It Works

The calculator uses the exponential decay formula:

```
Remaining Amount = Initial Amount × (0.5) ^ (Time Elapsed / Half-Life)
```

For multiple doses, it calculates the remaining amount from each dose at the current time and sums them together to get the total active level.

## License

MIT
