# Rafith & Nishat — Wedding Invitation

A responsive React + TypeScript wedding invitation with a burgundy-and-gold royal design.

## Run it on macOS

1. Install Node.js LTS if you do not already have it: https://nodejs.org/
2. Open this folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open the local URL printed by Vite (usually `http://localhost:5173`).

To create the deployable website, run `npm run build`. Vite writes the finished site to the `dist` folder.

## Features

- Curtain cover opens only after the guest clicks **Open the invitation**.
- Live countdown to 15 March 2027 at 12:00 PM Bangladesh time.
- Photo gallery with a keyboard-accessible lightbox. Gallery photos are illustrative placeholders; replace them with your own permitted photos.
- Our-story timeline with sample copy that you can personalize.
- Wedding schedule section. Only the date and 12:00 PM time are currently set; other schedule items remain TBA to avoid inventing details.
- Google Maps directions link becomes active after setting `VENUE_ADDRESS` near the top of `src/App.tsx`.
- Background music button. Add a licensed MP3 at `public/music/wedding-melody.mp3` to enable playback.
- Guest wishes wall stored in the current browser's local storage. It is **not** a shared online guestbook until connected to a backend or database.
- Share link / native share sheet and social-preview metadata.
- Existing RSVP is still a front-end demo and does not transmit replies.

## Personalize it

Open `src/App.tsx` and edit:

- `VENUE_ADDRESS` once the location is confirmed. Example: `Convention Hall, Dhaka, Bangladesh`.
- `galleryPhotos` to use your own photo URLs.
- Story timeline copy in the `story-section`.
- Schedule text in the `schedule-list`.

For real shared guest wishes and real RSVP collection, connect a database/form service. Local storage is only for the same browser/device.

## Important sharing note

The page title, description, and social preview image are in `index.html`. Some social apps cache link previews; after publishing, use the platform's preview/debug tool if you need to refresh a cached preview.
