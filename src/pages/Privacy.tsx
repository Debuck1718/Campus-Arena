import React from 'react';
import { SEO } from '../components/SEO';

export function Privacy(): JSX.Element {
  return (
    <div className="container py-8">
      <SEO
        title="Privacy Policy • CampusArena"
        description="How CampusArena handles your data and privacy."
      />
      <h1 className="h2 mb-2">Privacy Policy</h1>
      <p className="text-gray-600 mb-4">
        We respect your privacy. This is a simplified policy for MVP purposes.
      </p>
      <ul className="list-disc ml-5 space-y-2 text-sm text-gray-700">
        <li>We store your account and profile information (username, platform) in Supabase.</li>
        <li>Uploaded images (avatars, match screenshots) are stored privately and served via signed URLs.</li>
        <li>We log basic actions to improve integrity and operations.</li>
        <li>You can request deletion of your account and related data by contacting support.</li>
      </ul>
      <p className="text-xs text-gray-500 mt-6">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}import React from 'react';
import { SEO } from '../components/SEO';

export function Privacy() {
  return (
    <div className="container py-8">
      <SEO title="Privacy Policy • CampusArena" description="How CampusArena handles your data and privacy." />
      <h1 className="h2 mb-2">Privacy Policy</h1>
      <p className="text-gray-600 mb-4">We respect your privacy. This is a simplified policy for MVP purposes.</p>
      <ul className="list-disc ml-5 space-y-2 text-sm text-gray-700">
        <li>We store your account and profile information (username, platform) in Supabase.</li>
        <li>Uploaded images (avatars, match screenshots) are stored privately and served via signed URLs.</li>
        <li>We log basic actions to improve integrity and operations.</li>
        <li>You can request deletion of your account and related data by contacting support.</li>
      </ul>
      <p className="text-xs text-gray-500 mt-6">Last updated: {new Date().toLocaleDateString()}</p>
    </div>
  );
}