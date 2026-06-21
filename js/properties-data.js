// js/properties-data.js
// Standard US-edition Monopoly board. Used to preload the `properties`
// subcollection of every new game. mortgageValue is the classic half-price
// baseline; once a property is actually mortgaged, mortgages.js tracks its
// own compounding value separately (see PRD mortgage rules).

export const BOARD_PROPERTIES = [
  // Brown
  { id: "mediterranean-ave", name: "Mediterranean Avenue", group: "brown", price: 60 },
  { id: "baltic-ave", name: "Baltic Avenue", group: "brown", price: 60 },
  // Light Blue
  { id: "oriental-ave", name: "Oriental Avenue", group: "lightblue", price: 100 },
  { id: "vermont-ave", name: "Vermont Avenue", group: "lightblue", price: 100 },
  { id: "connecticut-ave", name: "Connecticut Avenue", group: "lightblue", price: 120 },
  // Pink
  { id: "st-charles-pl", name: "St. Charles Place", group: "pink", price: 140 },
  { id: "states-ave", name: "States Avenue", group: "pink", price: 140 },
  { id: "virginia-ave", name: "Virginia Avenue", group: "pink", price: 160 },
  // Orange
  { id: "st-james-pl", name: "St. James Place", group: "orange", price: 180 },
  { id: "tennessee-ave", name: "Tennessee Avenue", group: "orange", price: 180 },
  { id: "new-york-ave", name: "New York Avenue", group: "orange", price: 200 },
  // Red
  { id: "kentucky-ave", name: "Kentucky Avenue", group: "red", price: 220 },
  { id: "indiana-ave", name: "Indiana Avenue", group: "red", price: 220 },
  { id: "illinois-ave", name: "Illinois Avenue", group: "red", price: 240 },
  // Yellow
  { id: "atlantic-ave", name: "Atlantic Avenue", group: "yellow", price: 260 },
  { id: "ventnor-ave", name: "Ventnor Avenue", group: "yellow", price: 260 },
  { id: "marvin-gardens", name: "Marvin Gardens", group: "yellow", price: 280 },
  // Green
  { id: "pacific-ave", name: "Pacific Avenue", group: "green", price: 300 },
  { id: "north-carolina-ave", name: "North Carolina Avenue", group: "green", price: 300 },
  { id: "pennsylvania-ave", name: "Pennsylvania Avenue", group: "green", price: 320 },
  // Dark Blue
  { id: "park-place", name: "Park Place", group: "darkblue", price: 350 },
  { id: "boardwalk", name: "Boardwalk", group: "darkblue", price: 400 },
  // Railroads
  { id: "reading-railroad", name: "Reading Railroad", group: "railroad", price: 200 },
  { id: "pennsylvania-railroad", name: "Pennsylvania Railroad", group: "railroad", price: 200 },
  { id: "bo-railroad", name: "B. & O. Railroad", group: "railroad", price: 200 },
  { id: "short-line", name: "Short Line", group: "railroad", price: 200 },
  // Utilities
  { id: "electric-company", name: "Electric Company", group: "utility", price: 150 },
  { id: "water-works", name: "Water Works", group: "utility", price: 150 },
];

export const GROUP_LABELS = {
  brown: "Brown",
  lightblue: "Light Blue",
  pink: "Pink",
  orange: "Orange",
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  darkblue: "Dark Blue",
  railroad: "Railroad",
  utility: "Utility",
};

export const STARTING_BALANCE = 1500;
