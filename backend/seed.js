const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Book = require("./src/models/Book");

dotenv.config();

const dummyBooks = [
  // --- FANTASY CLUSTER (Testing: Harry Potter should recommend Hobbit) ---
  {
    userId: "seed_user_1",
    authorName: "JK Rowling",
    title: "Harry Potter and the Sorcerer's Stone",
    desc: "A young boy discovers he is a wizard and attends a magical school called Hogwarts. He makes friends, fights trolls, and uncovers the mystery of the Sorcerer's Stone while facing the dark wizard Voldemort.",
    genres: ["fantasy", "magic", "young adult", "adventure"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/81iqZ2HHD-L.jpg",
    chapters: [{ title: "The Boy Who Lived", content: "Mr. and Mrs. Dursley..." }]
  },
  {
    userId: "seed_user_2",
    authorName: "JRR Tolkien",
    title: "The Hobbit",
    desc: "A reluctant hobbit named Bilbo Baggins goes on an adventure with a group of dwarves to reclaim their mountain home from a dragon named Smaug. He finds a magic ring along the way.",
    genres: ["fantasy", "adventure", "classic"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/91b0C2YNSrL.jpg",
    chapters: [{ title: "An Unexpected Party", content: "In a hole in the ground there lived a hobbit." }]
  },
  {
    userId: "seed_user_3",
    authorName: "JRR Tolkien",
    title: "The Fellowship of the Ring",
    desc: "Frodo Baggins inherits a powerful ring that could destroy the world. He must travel across Middle-earth to destroy it in the fires of Mount Doom, accompanied by a fellowship of heroes.",
    genres: ["fantasy", "adventure", "epic"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/91jBWB78qkL.jpg",
    chapters: [{ title: "A Long-Expected Party", content: "When Mr. Bilbo Baggins of Bag End..." }]
  },

  // --- DYSTOPIAN / SCI-FI CLUSTER ---
  {
    userId: "seed_user_4",
    authorName: "George Orwell",
    title: "1984",
    desc: "In a totalitarian future society, a man named Winston Smith works for the government rewriting history. He begins to rebel against the oppressive regime led by Big Brother and falls in love.",
    genres: ["scifi", "dystopian", "politics", "classic"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/71kxa1-0mfL.jpg",
    chapters: [{ title: "Part 1", content: "It was a bright cold day in April..." }]
  },
  {
    userId: "seed_user_5",
    authorName: "Aldous Huxley",
    title: "Brave New World",
    desc: "A futuristic society where people are genetically engineered and conditioned to be happy consumers. The story explores the dangers of technology and the loss of individuality.",
    genres: ["scifi", "dystopian", "philosophy"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/91D4YvdC0dL.jpg",
    chapters: [{ title: "Chapter 1", content: "A squat grey building of only thirty-four stories." }]
  },
  {
    userId: "seed_user_6",
    authorName: "Frank Herbert",
    title: "Dune",
    desc: "Set on the desert planet Arrakis, a young noble named Paul Atreides must navigate political betrayal and survival in a harsh environment. It involves spice, giant worms, and interstellar empires.",
    genres: ["scifi", "adventure", "epic", "space opera"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/91Fq9Amq0pL.jpg",
    chapters: [{ title: "Dune", content: "A beginning is the time for taking the most delicate care..." }]
  },

  // --- MYSTERY / THRILLER CLUSTER ---
  {
    userId: "seed_user_7",
    authorName: "Agatha Christie",
    title: "Murder on the Orient Express",
    desc: "Famous detective Hercule Poirot investigates a murder on a luxurious train. Trapped by a snowdrift, he must identify the killer among the passengers before they strike again.",
    genres: ["mystery", "crime", "thriller", "classic"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/81zE42gT3xL.jpg",
    chapters: [{ title: "The Important Passenger", content: "It was five o'clock on a winter's morning in Syria." }]
  },
  {
    userId: "seed_user_8",
    authorName: "Gillian Flynn",
    title: "Gone Girl",
    desc: "On her fifth wedding anniversary, a woman disappears. Her husband becomes the prime suspect as secrets from their marriage are revealed in a twist-filled psychological thriller.",
    genres: ["mystery", "thriller", "crime", "drama"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/81R5tL95XCL.jpg",
    chapters: [{ title: "Nick Dunne", content: "When I think of my wife, I always think of her head." }]
  },

  // --- ROMANCE / DRAMA CLUSTER ---
  {
    userId: "seed_user_9",
    authorName: "Jane Austen",
    title: "Pride and Prejudice",
    desc: "The story of Elizabeth Bennet and her complicated relationship with the wealthy, proud Mr. Darcy. A classic tale of love, reputation, and class in 19th century England.",
    genres: ["romance", "classic", "drama", "history"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/91HqOSt62HL.jpg",
    chapters: [{ title: "Chapter 1", content: "It is a truth universally acknowledged..." }]
  },
  {
    userId: "seed_user_10",
    authorName: "Nicholas Sparks",
    title: "The Notebook",
    desc: "An elderly man reads a love story from a notebook to a woman in a nursing home. It tells the tale of a young couple separated by war and class differences.",
    genres: ["romance", "drama"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/81p05G07hZL.jpg",
    chapters: [{ title: "Miracles", content: "Who am I? And how, I wonder, will this story end?" }]
  },

  // --- TECH / NON-FICTION (To test distinct separation) ---
  {
    userId: "seed_user_11",
    authorName: "Robert Martin",
    title: "Clean Code",
    desc: "A handbook of agile software craftsmanship. It teaches developers how to write better code, refactor existing code, and follow best practices in programming.",
    genres: ["tech", "education", "programming"],
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/41jEbK-jG+L.jpg",
    chapters: [{ title: "Clean Code", content: "The only valid measurement of code quality: WTFs/minute." }]
  }
];

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("DB Connected. Seeding...");

    // Clear old data safely (removes everything to ensure clean state)
    await Book.deleteMany({});
    console.log("Old data cleared.");

    // Insert new rich data
    await Book.insertMany(dummyBooks);
    console.log(`✅ Successfully seeded ${dummyBooks.length} books!`);

    process.exit();
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });