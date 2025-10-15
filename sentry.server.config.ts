// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Ignore common errors that are not actionable
  ignoreErrors: [
    // Stripe webhook signature errors (expected for invalid webhooks)
    'Webhook signature verification failed',
    // Firebase permission errors (users trying to access unauthorized data)
    'Missing or insufficient permissions',
    // Rate limiting (expected behavior)
    'Rate limit',
  ],

  // Add server context
  beforeSend(event, hint) {
    // Add extra context for API routes
    if (event.request?.url) {
      event.tags = {
        ...event.tags,
        route_type: event.request.url.includes('/api/') ? 'api' : 'page',
      };
    }

    // Filter out localhost errors in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    return event;
  },
});
