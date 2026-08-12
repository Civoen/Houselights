export interface PatchNoteVersion {
  version: string;
  notes: string[];
}

// One entry per "give me all the files" request — add a new entry to the
// TOP of this array each time that happens. Precise per-version tracking
// starts at 1.0; everything built before this feature existed is bundled
// into that first entry rather than reconstructed after the fact.
export const PATCH_NOTES: PatchNoteVersion[] = [
  {
    version: "1.8",
    notes: [
      "Cover generation now supports up to 4 artists instead of 2, with each name sized independently so a short one isn't shrunk to match a longer one",
      "Added Upload/Replace and Delete buttons on the cover upload screen",
      "Generate cover now fits on screen without scrolling, and Use this cover sits in the same place as the Preview playlist button",
      "Fixed Settings incorrectly highlighting Playlists on the nav bar — nothing highlights while you're in Settings",
      "Lights up/down and Settings no longer animate in when opening a new page, since they never move or change",
      "Playlist descriptions now list the artists first, then the Houselights credit",
    ],
  },
  {
    version: "1.7",
    notes: [
      "Shrunk the cover image picker on the create screen — cover, title, description, and the button should now all fit on one screen without scrolling",
      "Added cover generation as an alternative to uploading a photo — pick a background color and up to 2 artists, and it renders an oversized rotated wordmark cover directly (no upload, no compression issues)",
    ],
  },
  {
    version: "1.6",
    notes: [
      "Added a banner when you're still editing an existing playlist, with a Cancel edit option, so it's always clear when saving will update that playlist instead of creating a new one",
    ],
  },
  {
    version: "1.5",
    notes: [
      "Edit now has a real Save changes option that overwrites the original playlist on Spotify, instead of always creating a new one — with Save as a new playlist instead if you want a copy",
      "Every button shape is now consistent — rounded rectangles throughout, including the filter and toggle buttons",
      "Removed swipe-to-delete on Playlists — the Delete button in each card handles it now, which also removed a few long-standing swipe-related bugs",
      "Removed icons from the Spotify/Copy link/Edit/Delete buttons on Playlists",
      "Fixed auto-generated playlist names/descriptions sometimes including artists you never added",
      "Renamed the Encore button to Stats and made it full-width and more prominent",
      "Songs are now indented under their artist on Preview, and the spectrum bar on New Event is thicker",
      "Most Popular/Setlist buttons now use a gradient built from that artist's own color instead of the app-wide gradient",
      "Added a View Playlists button to the success screen",
      "Fixed Next Up on Playlists still showing more than one result in some cases",
    ],
  },
  {
    version: "1.4",
    notes: [
      "Added Export/Import backup in Settings, so your history isn't only ever on one device",
      "Added a Colour vision section in Settings — Default, Red-green, and Blue-yellow modes, changing artist and Wristband colours to be easier to tell apart",
      "Wristbands now look like real wristbands — woven fabric band with a metallic beveled badge, instead of a flat colour block",
    ],
  },
  {
    version: "1.3",
    notes: [
      "Every button now uses the same rounded-rectangle shape — no more mix of fully circular and rounded-corner buttons",
      "Songs are now indented under their artist on Preview, instead of sitting flush with the artist row",
      "Settings: added Delete all playlists and Clear progress, plus this patch notes list",
      "Fixed Next Up on Playlists showing more than one upcoming show",
      "Fixed the gap between the last artist card and the disclaimer on New Event being too tight",
    ],
  },
  {
    version: "1.2",
    notes: [
      "Fixed opening a playlist in Spotify briefly showing a blank Safari screen and breaking the back button",
      "Fixed the swipe-to-delete red button's corners and shadow bleeding onto it while swiping",
      "Fixed Previous Events not staying in sync after deleting a playlist",
      "Fixed undo toasts being partially hidden behind the nav bar on Playlists and Preview",
      "Reconnecting Spotify from an error message now actually forces the permission screen again",
      "Cover image uploads are more reliable, and failures now show the real error instead of failing silently",
    ],
  },
  {
    version: "1.1",
    notes: [
      "Renamed Lanyards to Wristbands, with a new colorful curved-band icon for each one",
      "Wristbands now show a persistent description and can be tapped for a full-screen view",
      "Added the Encore stats page, reachable from Playlists",
      "Added a Setlist filter powered by setlist.fm, alongside Most popular",
      "Playlists cards can now be edited, deleted, and reordered with swipe and drag",
    ],
  },
  {
    version: "1.0",
    notes: [
      "Everything built before per-version notes existed — the New Event, Preview, and Playlists pages, Wristbands (as Lanyards), and the many design and bug fixes along the way.",
    ],
  },
];
