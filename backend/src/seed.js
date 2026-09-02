// backend/src/seed.js — Populate database with 1500 realistic books & 50 authors
const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

// ─── Inline Schemas (using actual collection names) ───
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String },
  authProvider: { type: String, default: "local" },
  avatar: { type: String, default: "" },
  profilePicture: { type: String, default: "" },
  coverPicture: { type: String, default: "" },
  bio: { type: String, default: "" },
  isPrivate: { type: Boolean, default: false },
  followers: [{ type: mongoose.Schema.Types.ObjectId }],
  followings: [{ type: mongoose.Schema.Types.ObjectId }],
  isAdmin: { type: Boolean, default: false },
  city: { type: String },
  from: { type: String },
  library: [{ type: mongoose.Schema.Types.ObjectId }],
  recommendedForYou: [{ type: mongoose.Schema.Types.ObjectId }],
  readingStats: {
    booksRead: { type: Number, default: 0 },
    totalPagesRead: { type: Number, default: 0 },
    favoriteGenres: [{ type: String }],
    readingStreak: { type: Number, default: 0 },
  },
  preferredLanguage: { type: String, default: "en" },
}, { timestamps: true });

const bookSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  authorName: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  desc: { type: String, default: "" },
  genres: [{ type: String, lowercase: true, trim: true }],
  cover: { type: String, default: "" },
  privacy: { type: String, default: "public" },
  chapters: [{ title: String, content: String, createdAt: { type: Date, default: Date.now } }],
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  year: { type: Number },
  isbn: { type: String },
  pages: { type: Number },
  language: { type: String, default: "en" },
  likes: [{ type: mongoose.Schema.Types.ObjectId }],
  views: { type: Number, default: 0 },
  addedByCount: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model("User", userSchema, "users");
const Book = mongoose.model("Book", bookSchema, "books");

// ─── Data ───
const FIRST = ["Elena","Marcus","Aisha","James","Sofia","Raj","Olivia","Chen","Isabella","Kwame","Luna","Noah","Priya","Liam","Mei","Omar","Zara","Felix","Amara","Diego","Harper","Yuki","Nadia","Ethan","Ingrid","Kofi","Vera","Axel","Fatima","Hugo","Leila","Sven","Anya","Rio","Cora","Ivan","Dalia","Fynn","Iris","Leo","Maya","Noel","Petra","Quinn","Rosa","Theo","Uma","Vince","Wren","Xander"];
const LAST = ["Blackwood","Morales","Okafor","Chen","Patel","Eriksson","Nakamura","Volkov","Santos","Kim","Adeyemi","Laurent","Novak","Sharma","Petrov","Ito","Okonkwo","Mueller","Fernandez","Liu","Johansson","Abbas","Popov","Silva","Tanaka","Kowalski","Hassan","Larsson","Dubois","Yamamoto","Andersen","Ruiz","Takahashi","Fischer","Gonzalez","Nkomo","Ivanov","Cruz","Schmidt","Alonso","Wagner","Costa","Becker","Torres","Hoffmann","Rivera","Schneider","Fox","Reed","Stone"];
const CITIES = ["New York","London","Tokyo","Paris","Mumbai","Lagos","Seoul","Berlin","Sao Paulo","Cairo","Toronto","Sydney","Stockholm","Nairobi","Barcelona","Amsterdam","Dubai","Singapore","Cape Town","Buenos Aires","Prague","Vienna","Helsinki","Oslo","Copenhagen"];
const GENRES = ["fantasy","romance","sci-fi","mystery","thriller","adventure","horror","poetry","historical fiction","literary fiction","dystopian","young adult","comedy","drama","crime"];

const BIOS = [
  "Bestselling author with a passion for storytelling that transcends genres.",
  "Award-winning novelist exploring the depths of the human condition.",
  "Former journalist turned fiction writer. Tea enthusiast.",
  "Weaving tales of magic and wonder since childhood.",
  "Writing stories that make you forget to sleep.",
  "Lover of words, keeper of secrets, teller of tales.",
  "Exploring the boundaries between reality and imagination.",
  "Turning coffee into prose, one chapter at a time.",
  "Published in 15 countries. Still learning new stories every day.",
  "Writing the books I wished I could read as a kid.",
];

const ADJ = ["Crimson","Silver","Golden","Forgotten","Eternal","Broken","Silent","Wild","Lost","Hidden","Shattered","Burning","Frozen","Wicked","Sacred","Cursed","Divine","Twisted","Hollow","Savage","Gentle","Dark","Bright","Pale","Midnight","Amber","Iron","Crystal","Velvet","Emerald","Obsidian","Sapphire","Starlit","Moonlit","Haunted","Enchanted","Ancient","Forbidden","Radiant","Restless"];
const NOUNS = ["shadow","fire","dream","storm","throne","crown","blade","heart","bone","stone","star","moon","sun","river","forest","mountain","ocean","garden","tower","bridge","mirror","door","window","key","clock","mask","ring","sword","shield","rose","wolf","raven","phoenix","dragon","secret","promise","memory","silence","echo","dawn","dusk","tide","flame","frost","wind","rain","song","tale","light","path"];
const PLACES = ["Avaloria","Thornwick","Eastmere","Silverhold","Ravensgate","Ashford","Winterhaven","Moondale","Stormreach","Ironbay","Venice","Marrakech","Kyoto","Edinburgh","Havana","Constantinople","Alexandria","Pompeii","Bruges","Isfahan","Prague","Lisbon","Shanghai","Nairobi","Oslo"];

function pick(a){return a[Math.floor(Math.random()*a.length)];}
function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function shuffle(a){return[...a].sort(()=>Math.random()-0.5);}

const TEMPLATES = [
  "The {a} {n} of {p}", "Chronicles of {p}", "{a} {n}s", "The Last {n}",
  "Realm of {a} {n}s", "The {n} Throne", "Shadows of {p}", "The {a} Prophecy",
  "Wings of {n}", "Song of the {a} {n}", "The Keeper of {n}s", "A Court of {a} {n}s",
  "The {n} Queen", "Echoes of {p}", "The Forgotten {n}", "Rise of the {n} King",
  "Beneath the {a} Sky", "The Enchanted {n}", "Legends of {p}", "Love in {p}",
  "The {a} Heart", "A Season of {n}s", "After the {n}", "The {n} Between Us",
  "Hearts of {p}", "Summer in {p}", "The {n} Promise", "Before We Were {a}",
  "All the {a} Things", "The {a} Frontier", "Beyond the {a} Void", "The {n} Protocol",
  "Signals from {p}", "Dark {n}", "The Infinity {n}", "The {n} Paradox",
  "The {a} Witness", "Murder at {p}", "The {n} Case", "The Silent {n}",
  "The {a} Suspect", "Midnight at the {n}", "The Vanishing {n}", "The {a} Hour",
  "No Way {a}", "The {n} Handler", "The {a} Game", "Run from {p}",
  "Behind {a} Doors", "The {a} Lie", "Journey to {p}", "The {a} Expedition",
  "Quest for the {a} {n}", "The {n} Hunter", "Into the {a} Wild", "Treasure of {p}",
  "Lost in {p}", "The {n} Explorer", "The {a} House", "Whispers in the {n}",
  "The {n} Within", "The Haunting of {p}", "Night {n}", "The {a} Ones",
  "The Bone {n}", "Red {n}", "{a} {n}s", "Verses from {p}", "The {a} Garden",
  "Letters to the {n}", "Songs of {a} {n}", "The {a} Empire", "Daughters of {p}",
  "The Queen of {n}s", "Letters from {p}", "The {a} Dynasty", "The Soldier's {n}",
  "A Crown of {n}s", "Secrets of {p}", "The Merchant of {p}", "The Silk {n}",
  "Children of {p}", "The {a} Life", "The Weight of {n}s", "The Anatomy of {n}",
  "The Invisible {n}", "Half of a {a} {n}", "An Ordinary {n}", "The Art of {n}",
  "Our {a} Days", "The {n} King", "Daughter of {n}s", "The {n} Whisperer",
  "City of {a} {n}s", "The Book of {a} {n}s", "Where the {n} Ends",
  "The {a} Road", "Under the {a} {n}", "Between {n} and {n}",
  "The Girl with the {a} {n}", "The Boy Who Found {n}",
];

function genTitle() {
  let t = pick(TEMPLATES);
  t = t.replace(/\{a\}/g, pick(ADJ));
  t = t.replace(/\{n\}/g, pick(NOUNS));
  t = t.replace(/\{p\}/g, pick(PLACES));
  return t;
}

function genDesc(genre, author) {
  const h = [
    `In this captivating ${genre} novel, ${author} weaves a tale that keeps you turning pages.`,
    `A masterfully crafted story exploring the depths of ${genre} fiction.`,
    `${author}'s latest work is a stunning achievement in ${genre} storytelling.`,
    `What begins as a simple story quickly evolves into something extraordinary.`,
    `Praised by critics and readers alike, this ${genre} masterpiece redefines expectations.`,
  ];
  const m = [
    `Set against a richly imagined backdrop, characters confront their deepest fears and desires.`,
    `With shimmering prose, every chapter reveals new layers of meaning and emotion.`,
    `The narrative unfolds with breathtaking precision, each twist more surprising than the last.`,
    `At its heart, this is a story about the choices that define us and the bonds that sustain us.`,
    `Through vivid characters and immersive world-building, readers are transported somewhere magical.`,
  ];
  const e = [
    `A must-read for fans of the genre.`,
    `You won't be able to put it down.`,
    `An unforgettable reading experience.`,
    `This is storytelling at its finest.`,
    `A book that stays with you long after the final page.`,
  ];
  return `${pick(h)} ${pick(m)} ${pick(e)}`;
}

function genChapter(num, total) {
  const openers = [
    "The ancient tower loomed against the twilight sky, its stones worn smooth by centuries of wind and rain. There was something about the way light fell across its weathered surface that made it seem alive, as though the building itself was watching, waiting for something long overdue.",
    "She hadn't expected to see him again, not after all these years, not in a place like this. The coffee shop was warm against the autumn chill, steam rising from porcelain cups, and for a moment everything felt suspended between memory and possibility.",
    "The ship's hull groaned as it entered the atmosphere of the uncharted planet. Warning lights flickered across the console, painting Dr. Chen's face in alternating shades of amber and red. She gripped the armrests and forced herself to breathe.",
    "The body was discovered at 6:47 AM by a jogger who would never run that route again. Detective Morrison arrived twenty minutes later, her coffee still untouched, her mind already cataloguing details that others would overlook entirely.",
    "She had exactly twelve minutes to escape before they realized she was gone. The corridor stretched ahead, fluorescent lights humming overhead, each shadow a potential threat. Her heartbeat was a drum in her ears.",
    "The day began like any other, which is perhaps why no one saw it coming. The morning commute, the familiar faces, the routines that had become so automatic they required no conscious thought whatsoever.",
    "There are moments in life that divide everything into before and after. Standing at the edge of the cliff, watching the sun sink below the horizon, she understood with sudden clarity that this was one of them.",
    "Dawn broke over the mountains, painting the snow-capped peaks in shades of gold and crimson. The valley below was still wrapped in mist, a world waiting to be born from the gray uncertainty of night.",
    "The letter arrived on a Tuesday morning, smelling faintly of lavender and old promises. She recognized the handwriting immediately, though it had been fifteen years since she had last seen it on paper.",
    "Rain had been falling steadily since morning, turning the cobblestone streets into mirrors that reflected a gray and endless sky. People hurried past with umbrellas and hunched shoulders, their thoughts as hidden as their faces.",
  ];
  const bodies = [
    "The silence stretched between them like a wire pulled taut, vibrating with unspoken words. Neither wanted to be the first to break it, as if speaking would make the situation irreversibly real. Outside, the world continued its indifferent turning, unaware of the small drama playing out behind closed doors. Minutes passed, each one heavier than the last, until the weight of them became unbearable.",
    "Time moved differently here, stretching and compressing in ways that defied the steady ticking of the clock on the wall. Hours could pass in what felt like minutes, and a single moment could expand to fill an entire afternoon. It was disorienting at first, but eventually, you learned to stop measuring and simply let yourself exist within the fluid boundaries of this strange new rhythm.",
    "The landscape unfolded before them in layers of color and shadow, each ridge revealing another valley, another possibility. The path they had chosen was not the easiest, but it was the one that felt right. Sometimes the most important journeys are the ones that take you furthest from where you planned to go, leading you instead to where you need to be.",
    "She turned the object over in her hands, feeling its weight, its texture, the way it caught the light at certain angles. It was unremarkable to look at, the kind of thing you might walk past a thousand times without noticing. But she knew better. She knew what it meant, what it represented, and why someone had gone to extraordinary lengths to hide it here.",
    "The conversation replayed in his mind like a song stuck on repeat, each word taking on new significance with every iteration. Had he missed something crucial? Had there been a clue hidden in the casual tone, a warning disguised as small talk? The more he analyzed it, the less certain he became of anything at all.",
    "The room was full of people, yet she had never felt more alone. Conversations swirled around her like currents in a river, fragments of laughter and gossip flowing past without pulling her in. She smiled when someone caught her eye, nodded at the right moments, but her mind was somewhere else entirely, lost in a maze of its own making.",
    "He had always believed that knowledge was power, but now he wondered if some things were better left unknown. The truth, once revealed, could not be unseen. It would change everything: his relationships, his career, his understanding of who he was and why he had made the choices that brought him to this moment.",
    "The garden was overgrown but beautiful in its wildness, a testament to nature's stubborn vitality. Roses climbed the stone walls in reckless profusion, their blooms heavy and fragrant. Ivy crept over the flagstone path, softening the hard edges, blurring the boundaries between what had been cultivated and what had been reclaimed.",
    "Music drifted from somewhere deeper in the building, a melody so familiar yet so distant that it seemed to come from another lifetime entirely. She closed her eyes and let it wash over her, each note unlocking a memory she thought she had safely filed away in the archives of the past.",
    "The marketplace was alive with color and sound, vendors calling out their wares in a dozen different languages, the air thick with the scent of spices and fresh bread. It was overwhelming and intoxicating in equal measure, a sensory feast that left no room for the worries she had carried with her from home.",
  ];
  const names = ["Prologue","The Beginning","New Dawn","Shadows Fall","The Journey","Into the Unknown","Revelations","The Turn","Rising Tide","The Storm","Breaking Point","Convergence","The Cost","Aftermath","New Horizons","Full Circle","Unraveling","The Truth","Resolution","Epilogue"];
  
  const cName = num === 1 ? "Prologue" : num === total ? "Epilogue" : names[num % names.length];
  const paras = [pick(openers)];
  for (let i = 0; i < randInt(2, 4); i++) paras.push(pick(bodies));
  if (num === total) paras.push("And with that, the story reached its conclusion. But endings, as they so often do, contained within them the seeds of new beginnings.");
  
  return { title: `Chapter ${num}: ${cName}`, content: paras.join("\n\n"), createdAt: new Date(Date.now() - randInt(0, 365*24*60*60*1000)) };
}

function genISBN() {
  let s = "978";
  for (let i = 0; i < 10; i++) s += Math.floor(Math.random() * 10);
  return s;
}

// ─── Main ───
async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected!\n");

  // Clean old seeded data (keep real users)
  const realEmails = ["test@test.com", "snehanagmoti2004@gmail.com"];
  const realUsers = await User.find({ email: { $in: realEmails } });
  const realIds = realUsers.map(u => u._id.toString());
  
  console.log("Cleaning old seed data...");
  await Book.deleteMany({ userId: { $nin: realIds } });
  await User.deleteMany({ email: { $nin: realEmails } });
  console.log("Done!\n");

  // Create 50 authors
  console.log("Creating 50 author accounts...");
  const bcrypt = require("bcrypt");
  const salt = await bcrypt.genSalt(10);
  const pw = await bcrypt.hash("author123", salt);
  
  const authorDocs = [];
  for (let i = 0; i < 50; i++) {
    const f = FIRST[i]; const l = LAST[i];
    const un = `${f.toLowerCase()}${l.toLowerCase()}`;
    authorDocs.push({
      username: un, email: `${un}@pluma.dev`, password: pw,
      authProvider: "local",
      avatar: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
      profilePicture: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
      bio: pick(BIOS), city: pick(CITIES), from: pick(CITIES),
      readingStats: { booksRead: randInt(5,200), totalPagesRead: randInt(500,50000), favoriteGenres: shuffle(GENRES).slice(0,3), readingStreak: randInt(0,365) },
    });
  }
  const authors = await User.insertMany(authorDocs);
  console.log(`Created ${authors.length} authors!\n`);

  // Create 1500 books in batches
  console.log("Generating 1500 books...");
  const BATCH = 100;
  let total = 0;
  const titles = new Set();
  
  for (let b = 0; b < 15; b++) {
    const batch = [];
    for (let i = 0; i < BATCH; i++) {
      const gi = b * BATCH + i;
      const auth = authors[gi % 50];
      const f = FIRST[gi % 50]; const l = LAST[(gi + 7) % 50];
      const genre = GENRES[b % 15];
      const gs = [genre];
      if (Math.random() > 0.5) { const g2 = pick(GENRES); if (g2 !== genre) gs.push(g2); }
      
      let title;
      let att = 0;
      do { title = genTitle(); att++; } while (titles.has(title) && att < 30);
      titles.add(title);
      
      const nc = randInt(3, 8);
      const chs = [];
      for (let c = 1; c <= nc; c++) chs.push(genChapter(c, nc));
      
      batch.push({
        userId: auth._id.toString(),
        authorName: `${f} ${l}`,
        title, desc: genDesc(genre, `${f} ${l}`), genres: gs,
        cover: `https://picsum.photos/seed/${genre.replace(/\s/g,"")}-${gi}/400/600`,
        privacy: "public", chapters: chs,
        rating: Math.round(randInt(25, 50)) / 10,
        ratingCount: randInt(10, 5000),
        year: randInt(2018, 2026), isbn: genISBN(),
        pages: randInt(120, 650), language: "en",
        views: randInt(50, 100000), addedByCount: randInt(0, 500),
        createdAt: new Date(Date.now() - randInt(0, 730*24*60*60*1000)),
      });
    }
    await Book.insertMany(batch);
    total += BATCH;
    console.log(`  Progress: ${total}/1500 (${Math.round(total/15)}%)`);
  }
  console.log(`Created ${total} books!\n`);

  // Populate libraries
  console.log("Populating libraries...");
  const allBooks = await Book.find({}).select("_id");
  const bids = allBooks.map(b => b._id);
  for (const a of authors) {
    await User.findByIdAndUpdate(a._id, { library: shuffle(bids).slice(0, randInt(5, 30)) });
  }
  const me = await User.findOne({ email: "snehanagmoti2004@gmail.com" });
  if (me) {
    await User.findByIdAndUpdate(me._id, { library: shuffle(bids).slice(0, 15) });
    console.log("  Added 15 books to snehanagmoti's library!");
  }
  
  const fc = await Book.countDocuments();
  const uc = await User.countDocuments();
  console.log(`\n===== SEED COMPLETE =====`);
  console.log(`  Users: ${uc}`);
  console.log(`  Books: ${fc}`);
  console.log(`  Genres: ${GENRES.length}`);
  console.log(`=========================\n`);
  
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e => { console.error("Seed failed:", e); process.exit(1); });
