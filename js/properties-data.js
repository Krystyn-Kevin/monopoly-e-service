// js/properties-data.js
// Standard IN-edition Monopoly board. 
// subcollection of every new game. mortgageValue is the classic half-price
// baseline; once a property is actually mortgaged, mortgages.js tracks its
// own compounding value separately (see PRD mortgage rules).

export const BOARD_PROPERTIES = [
  // Brown
  { id: "guwahati", name: "Guwahati", group: "brown", price: 60 },
  { id: "bhubaneshwar", name: "Bhubaneshwar", group: "brown", price: 60 },
  // Light Blue
  { id: "agra", name: "Agra", group: "lightblue", price: 100 },
  { id: "panaji", name: "Panaji", group: "lightblue", price: 100 },
  { id: "vadodara", name: "Vadodara", group: "lightblue", price: 120 },
  // Red
  { id: "lucknow", name: "Lucknow", group: "red", price: 220 },
  { id: "chandigarh", name: "Chandigarh", group: "red", price: 220 },
  { id: "jaipur", name: "Jaipur", group: "red", price: 240 },
    // Pink
  { id: "ludhiana", name: "Ludhiana", group: "pink", price: 140 },
  { id: "patna", name: "Patna", group: "pink", price: 140 },
  { id: "bhopal", name: "Bhopal", group: "pink", price: 160 },
  // Orange
  { id: "indore", name: "Indore", group: "orange", price: 180 },
  { id: "nagpur", name: "Nagpur", group: "orange", price: 180 },
  { id: "kochi", name: "Kochi", group: "orange", price: 200 },
  // Yellow
  { id: "pune", name: "Pune", group: "yellow", price: 260 },
  { id: "hyderabad", name: "Hyderabad", group: "yellow", price: 260 },
  { id: "ahmedabad", name: "Ahmedabad", group: "yellow", price: 280 },
  // Green
  { id: "kolkata", name: "Kolkata", group: "green", price: 300 },
  { id: "chennai", name: "Chennai", group: "green", price: 300 },
  { id: "bengaluru", name: "Bengaluru", group: "green", price: 320 },
  // Dark Blue
  { id: "new-delhi", name: "New Delhi", group: "darkblue", price: 350 },
  { id: "mumbai", name: "Mumbai", group: "darkblue", price: 400 },
  // Railways
  { id: "chennai-central", name: "Chennai Central Railway Station", group: "railways", price: 200 },
  { id: "howrah-rs", name: "Howrah Railways Station", group: "railways", price: 200 },
  { id: "new-del-rs", name: "New Delhi Railway Station", group: "railways", price: 200 },
  { id: "chhat-shiv-term", name: "Chhatrapati Shivaji Terminus", group: "railways", price: 200 },
  // Utilities
  { id: "electric-company", name: "Electric Company", group: "utility", price: 150 },
  { id: "water-works", name: "Water Works", group: "utility", price: 150 },
];

export const GROUP_LABELS = {
  brown: "Brown",
  lightblue: "Light Blue",
  orange: "Orange",
  red: "Red",
  pink: "Pink",
  yellow: "Yellow",
  green: "Green",
  darkblue: "Dark Blue",
  railways: "Railways",
  utility: "Utility",
};

export const STARTING_BALANCE = 1500;
