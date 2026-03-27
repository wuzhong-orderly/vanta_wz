import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { withBasePath } from './utils/base-path';
import { getRuntimeConfig } from './utils/runtime-config';

import './styles/index.css';

const IndexPage = lazy(() => import('./pages/Index'));
const PerpLayout = lazy(() => import('./pages/perp/Layout'));
const PerpIndex = lazy(() => import('./pages/perp/Index'));
const PerpSymbol = lazy(() => import('./pages/perp/Symbol'));
const PortfolioLayout = lazy(() => import('./pages/portfolio/Layout'));
const PortfolioIndex = lazy(() => import('./pages/portfolio/Index'));
const PortfolioPositions = lazy(() => import('./pages/portfolio/Positions'));
const PortfolioOrders = lazy(() => import('./pages/portfolio/Orders'));
const PortfolioAssets = lazy(() => import('./pages/portfolio/Assets'));
const PortfolioApiKey = lazy(() => import('./pages/portfolio/ApiKey'));
const PortfolioFee = lazy(() => import('./pages/portfolio/Fee'));
const PortfolioHistory = lazy(() => import('./pages/portfolio/History'));
const PortfolioSetting = lazy(() => import('./pages/portfolio/Setting'));
const MarketsLayout = lazy(() => import('./pages/markets/Layout'));
const MarketsIndex = lazy(() => import('./pages/markets/Index'));
const LeaderboardLayout = lazy(() => import('./pages/leaderboard/Layout'));
const LeaderboardIndex = lazy(() => import('./pages/leaderboard/Index'));
const RewardsLayout = lazy(() => import('./pages/rewards/Layout'));
const RewardsIndex = lazy(() => import('./pages/rewards/Index'));
const RewardsAffiliate = lazy(() => import('./pages/rewards/Affiliate'));
const VaultsLayout = lazy(() => import('./pages/vaults/Layout'));
const VaultsIndex = lazy(() => import('./pages/vaults/Index'));
const SwapLayout = lazy(() => import('./pages/swap/Layout'));
const SwapIndex = lazy(() => import('./pages/swap/Index'));
const PointsLayout = lazy(() => import('./pages/points/Layout'));
const PointsIndex = lazy(() => import('./pages/points/Index'));


async function loadRuntimeConfig() {
  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = withBasePath('/config.js');
    script.onload = () => {
      console.log('Runtime config loaded successfully');
      resolve();
    };
    script.onerror = () => {
      console.log('Runtime config not found, using build-time env vars');
      resolve();
    };
    document.head.appendChild(script);
  });
}

function loadAnalytics() {
  const analyticsScript = getRuntimeConfig('VITE_ANALYTICS_SCRIPT');

  if (analyticsScript) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(analyticsScript, 'text/html');
    const scripts = doc.querySelectorAll('script');

    scripts.forEach((originalScript) => {
      const newScript = document.createElement('script');

      Array.from(originalScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      if (originalScript.textContent) {
        newScript.textContent = originalScript.textContent;
      }

      document.head.appendChild(newScript);
    });
  }
}

const basePath = import.meta.env.BASE_URL || '/';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <IndexPage /> },
      {
        path: 'perp',
        element: <PerpLayout />,
        children: [
          { index: true, element: <PerpIndex /> },
          { path: ':symbol', element: <PerpSymbol /> },
        ],
      },
      {
        path: 'portfolio',
        element: <PortfolioLayout />,
        children: [
          { index: true, element: <PortfolioIndex /> },
          { path: 'positions', element: <PortfolioPositions /> },
          { path: 'orders', element: <PortfolioOrders /> },
          { path: 'assets', element: <PortfolioAssets /> },
          { path: 'api-key', element: <PortfolioApiKey /> },
          { path: 'fee', element: <PortfolioFee /> },
          { path: 'history', element: <PortfolioHistory /> },
          { path: 'setting', element: <PortfolioSetting /> },
        ],
      },
      {
        path: 'markets',
        element: <MarketsLayout />,
        children: [
          { index: true, element: <MarketsIndex /> },
        ],
      },
      {
        path: 'leaderboard',
        element: <LeaderboardLayout />,
        children: [
          { index: true, element: <LeaderboardIndex /> },
        ],
      },
      {
        path: 'rewards',
        element: <RewardsLayout />,
        children: [
          { index: true, element: <RewardsIndex /> },
          { path: 'affiliate', element: <RewardsAffiliate /> },
        ],
      },
      {
        path: 'vaults',
        element: <VaultsLayout />,
        children: [
          { index: true, element: <VaultsIndex /> },
        ],
      },
      {
        path: 'swap',
        element: <SwapLayout />,
        children: [
          { index: true, element: <SwapIndex /> },
        ],
      },
      {
        path: 'points',
        element: <PointsLayout />,
        children: [
          { index: true, element: <PointsIndex /> },
        ],
      },
    ],
  },
], { basename: basePath });

loadRuntimeConfig().then(() => {
  loadAnalytics();

  if (!localStorage.getItem('orderly_horizontal_markets_layout')) {
    localStorage.setItem('orderly_horizontal_markets_layout', 'hide');
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HelmetProvider>
        <RouterProvider router={router} />
      </HelmetProvider>
    </React.StrictMode>
  );
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(withBasePath('/sw.js'))
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

