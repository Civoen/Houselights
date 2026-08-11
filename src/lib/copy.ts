// All user-facing text in the app lives here. Edit strings directly in this
// file (in the GitHub repo, or locally) to change wording anywhere in the
// app without touching component logic. Anything with {placeholders} like
// {name} is filled in with real data at runtime — keep those tokens intact,
// just reword the surrounding text.
//
// A few pieces of text are NOT here on purpose: things assembled from
// multiple dynamic parts (like "Removed {trackName}" toasts, or the
// per-artist error list) live next to the logic that builds them, since
// they're closer to behavior than copy. Everything else — titles, button
// labels, hints, placeholders, empty states — is here.

export const copy = {
  home: {
    tagline: "Create better playlists.",
    ctaConnect: "Connect Spotify",
  },

  lineup: {
    title: "Who's playing?",
    searchPlaceholder: "Search artists on Spotify",
    eventDateLabel: "Event date",
    eventDateOptional: "(optional)",

    playlistSizeLabel: "Playlist size",
    sizeModeSongs: "Songs",
    sizeModeTime: "Time",
    totalSongsLabel: "Total songs",
    totalTimeLabel: "Total length",
    timePreset30: "30 min",
    timePreset60: "1 hr",
    timePreset90: "1.5 hr",
    timePreset120: "2 hr",
    timePreset180: "3 hr",
    timePreset300: "5 hr",

    posterUploadIdle: "Upload a poster to auto-add artists",
    posterUploadLoading: "Reading poster...",
    posterFoundHeading: "Found on your poster",
    posterNoMatch: "No Spotify match found",
    posterCancel: "Cancel",
    posterAddOne: "Add",
    posterAddMany: "artists",

    connectPrompt: "Connect Spotify to search for artists.",
    connectButton: "Connect Spotify",
    searching: "Searching...",
    artistFallbackGenre: "Artist",

    lineupLabel: "Your lineup",
    dragHint: "Drag to reorder — whoever's on top is the headliner.",
    emptyLineup: "Search for an artist above to get started.",
    headlinerTag: "Headliner",
    estimateSuffix: "(estimate)",

    weightLabel: "Share",
    weightGoalSuffix: "goal",
    addSpecificSongs: "Add specific songs",
    pickedSongsLabel: "Picked songs",
    remove: "Remove",
    searchSongPlaceholder: "Search a song title",
    add: "Add",

    ctaPreview: "Preview playlist",
    shortfallDisclaimer: "A complete song list isn't always possible — some artists may come up short depending on what's available.",
    generatingPhrases: [
      "Checking the setlist...",
      "Finding the openers...",
      "Warming up...",
      "Counting songs...",
    ],
  },

  preview: {
    title: "How's this look?",
    emptyState: "Your lineup didn't return any tracks. Go back and adjust your filters or song counts.",
    previewHintPrefix: "Tap",
    previewHintSuffix: "next to a track to listen on Spotify before you commit to it.",
    hype: "Hype",
    headliner: "Headliner",
    random: "Random",
    addSong: "Add a song",
    searchSongPlaceholder: "Search a song title",
    add: "Add",
    createButton: "Create playlist",
  },

  create: {
    title: "New playlist",
    addCover: "Add cover",
    changeCover: "Change cover",
    playlistNameLabel: "Playlist name",
    descriptionLabel: "Description",
    doneButton: "Done",
    creatingPhrases: ["Packing the setlist...", "Sending it to Spotify...", "Almost there..."],
  },

  success: {
    title: "Added to Spotify",
    firstTitle: "Your first show, prepped 🎉",
    firstSuffix: "welcome to Houselights",
    openInSpotify: "Open in Spotify",
    buildAnother: "Build another",
    fallbackName: "Your playlist",
  },

  playlists: {
    title: "Playlists",
    subtitleEmpty: "Playlists you've already sent to Spotify",
    emptyMessage: "Nothing here yet — build your first lineup and it'll show up once it's live on Spotify.",
    buildLineupLink: "Build your lineup",
    open: "Open",
    copyLink: "Copy link",
    linkCopied: "Copied!",
    edit: "Edit",
    previewError: "Couldn't load that playlist. Try again.",
    previousEventsLabel: "Previous events",
    previousEventsEmpty: "No past shows yet.",
  },

  settings: {
    title: "Settings",
    accountLabel: "Account",
    checking: "Checking...",
    connected: "Connected to Spotify",
    notConnected: "Not connected",
    connectedNote: "Your session is active on this device.",
    notConnectedNote: "Connect from the home screen to build a lineup.",
    switchAccount: "Switch account",
    logout: "Log out",
    switchNote:
      "Switching account sends you back through Spotify's login screen, so you can sign in with a different account if you have more than one.",
  },

  nextUp: {
    title: "Next Up",
    subtitleEmpty: "Nothing on the horizon yet",
    subtitleSuffix: "on the horizon",
    emptyMessage: "No dated shows coming up — add a date next time you build a lineup and it'll show up here.",
    buildLineupLink: "Build your lineup",
  },

  nav: {
    newEvent: "New event",
    playlists: "Playlists",
    lanyards: "Lanyards",
  },

  lanyards: {
    title: "Lanyards",
  },

  filters: {
    popular: "Most popular",
    setlist: "Setlist",
  },
};
