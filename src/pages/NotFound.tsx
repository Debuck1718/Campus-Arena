import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export function NotFound(): JSX.Element {
  return (
    <div className="container py-10">
      <SEO title="404 • CampusArena" description="Page not found" />
      <h1 className="h2 mb-2">Page not found</h1>
      <p className="text-gray-600 mb-4">The page you are looking for does not exist.</p>
      <Link to="/" className="text-primary-600 hover:underline">
        Go back home
      </Link>
    </div>
  );
}