import React from 'react';
import { SEO } from '../components/SEO';

export function Terms(): JSX.Element {
  return (
    <div className="container py-8">
      <SEO title="Terms of Service • CampusArena" description="The rules for using CampusArena." />
      <h1 className="h2 mb-2">Terms of Service</h1>
      <p className="text-gray-600 mb-4">
        By using CampusArena, you agree to these terms (MVP simplified).
      </p>
      <ul className="list-disc ml-5 space-y-2 text-sm text-gray-700">
        <li>Provide accurate information and respect other players.</li>
        <li>No cheating or fraudulent result submissions.</li>
        <li>Admins can remove users or results that violate rules.</li>
        <li>We may update these terms over time.</li>
      </ul>
      <p className="text-xs text-gray-500 mt-6">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}