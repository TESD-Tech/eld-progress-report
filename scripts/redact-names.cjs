/**
 * redact-names.cjs
 * * A utility script to scrub sensitive names from JSON files
 * and output a beautified version.
 * * Usage: node redact-names.cjs <input-file> [output-file]
 */

const fs = require('fs');
const path = require('path');

// Massive list of fun names for maximum variety
const FUN_NAMES = [
  'Razzle', 'Jazz', 'Flip', 'Banana', 'Spark', 'Zippy', 'Quiz', 'Pickle', 
  'Fizz', 'Boop', 'Glimmer', 'Wobble', 'Sprout', 'Button', 'Noodle', 
  'Pounce', 'Bingo', 'Doodle', 'Turbo', 'Mochi', 'Aardvark', 'Albatross', 
  'Alligator', 'Alpaca', 'Ant', 'Anteater', 'Antelope', 'Armadillo', 
  'Baboon', 'Badger', 'Barracuda', 'Bat', 'Bear', 'Beaver', 'Bee', 
  'Bison', 'Boar', 'Buffalo', 'Butterfly', 'Camel', 'Capybara', 'Caribou', 
  'Cassowary', 'Cat', 'Caterpillar', 'Chamois', 'Cheetah', 'Chicken', 
  'Chimpanzee', 'Chinchilla', 'Chough', 'Clam', 'Cobra', 'Cockroach', 
  'Cod', 'Cormorant', 'Coyote', 'Crab', 'Crane', 'Crocodile', 'Crow', 
  'Curlew', 'Deer', 'Dinosaur', 'Dog', 'Dogfish', 'Dolphin', 'Dotterel', 
  'Dove', 'Dragonfly', 'Duck', 'Dugong', 'Dunlin', 'Eagle', 'Echidna', 
  'Eel', 'Eland', 'Elephant', 'Elk', 'Emu', 'Falcon', 'Ferret', 'Finch', 
  'Fish', 'Flamingo', 'Fly', 'Fox', 'Frog', 'Gaur', 'Gazelle', 'Gerbil', 
  'Giraffe', 'Gnat', 'Gnu', 'Goat', 'Goldfinch', 'Goldfish', 'Goose', 
  'Gorilla', 'Goshawk', 'Grasshopper', 'Grouse', 'Guanaco', 'Gull', 
  'Hamster', 'Hare', 'Hawk', 'Hedgehog', 'Heron', 'Herring', 'Hippo', 
  'Hornet', 'Horse', 'Hummingbird', 'Hyena', 'Ibex', 'Ibis', 'Jackal', 
  'Jaguar', 'Jay', 'Jellyfish', 'Kangaroo', 'Kingfisher', 'Koala', 
  'Kookaburra', 'Kouprey', 'Kudu', 'Lapwing', 'Lark', 'Lemur', 'Leopard', 
  'Lion', 'Llama', 'Lobster', 'Locust', 'Loris', 'Louse', 'Lyrebird', 
  'Magpie', 'Mallard', 'Manatee', 'Mandrill', 'Mantis', 'Marten', 
  'Meerkat', 'Mink', 'Mole', 'Mongoose', 'Monkey', 'Moose', 'Mosquito', 
  'Mouse', 'Mule', 'Narwhal', 'Newt', 'Nightingale', 'Octopus', 'Okapi', 
  'Opossum', 'Oryx', 'Ostrich', 'Otter', 'Owl', 'Oyster', 'Panther', 
  'Parrot', 'Partridge', 'Peafowl', 'Pelican', 'Penguin', 'Pheasant', 
  'Pig', 'Pigeon', 'Pony', 'Porcupine', 'Porpoise', 'Quail', 'Quelea', 
  'Quetzal', 'Rabbit', 'Raccoon', 'Rail', 'Ram', 'Rat', 'Raven', 
  'Reindeer', 'Rhino', 'Rook', 'Salamander', 'Salmon', 'Sandpiper', 
  'Sardine', 'Scorpion', 'Seahorse', 'Seal', 'Shark', 'Sheep', 'Shrew', 
  'Shrimp', 'Skunk', 'Snail', 'Snake', 'Sparrow', 'Spider', 'Spoonbill', 
  'Squid', 'Squirrel', 'Starling', 'Stingray', 'Stinkbug', 'Stork', 
  'Swallow', 'Swan', 'Tapir', 'Tarsier', 'Termite', 'Tiger', 'Toad', 
  'Trout', 'Turkey', 'Turtle', 'Viper', 'Vulture', 'Wallaby', 'Walrus', 
  'Wasp', 'Weasel', 'Whale', 'Wildcat', 'Wolf', 'Wolverine', 'Wombat', 
  'Woodcock', 'Woodpecker', 'Worm', 'Wren', 'Yak', 'Zebra', 'Apple', 
  'Apricot', 'Avocado', 'Berry', 'Cherry', 'Coconut', 'Date', 'Fig', 
  'Grape', 'Guava', 'Kiwi', 'Lemon', 'Lime', 'Lychee', 'Mango', 'Melon', 
  'Orange', 'Papaya', 'Peach', 'Pear', 'Plum', 'Quince'
];

/**
 * Returns a random name from the FUN_NAMES collection.
 */
function getRandomFunName() {
  return FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];
}

/**
 * Recursively traverses a JSON object to redact specific keys.
 * Also performs context-aware replacement for names found in strings.
 * @param {any} data - The piece of data to process.
 * @param {Array} replacements - List of { search, replace } pairs from parent context.
 * @returns {any} The redacted data.
 */
function redactData(data, replacements = []) {
  // 1. Handle Strings (Apply context-aware replacements)
  if (typeof data === 'string') {
    let result = data;
    for (const { search, replace } of replacements) {
      if (!search) continue;
      // Escape special characters for Regex
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      result = result.replace(regex, replace);
    }
    return result;
  }

  // 2. Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => redactData(item, replacements));
  }

  // 3. Handle Objects
  if (data !== null && typeof data === 'object') {
    const currentReplacements = [...replacements];
    let newFirstName = null;

    // Check if this object contains a first_name to redact
    if (typeof data.first_name === 'string') {
      newFirstName = getRandomFunName();
      // Add this name pair to the replacement context for all children of this object
      currentReplacements.push({ 
        search: data.first_name, 
        replace: newFirstName 
      });
    }

    return Object.keys(data).reduce((acc, key) => {
      if (key === 'first_name' && newFirstName) {
        acc[key] = newFirstName;
      } else if (key === 'last_name') {
        acc[key] = 'Tester';
      } else {
        // Process child fields with the current replacement context
        acc[key] = redactData(data[key], currentReplacements);
      }
      return acc;
    }, {});
  }

  // Return primitives as-is
  return data;
}

/**
 * Main execution block
 */
function main() {
  const [,, inputPath, outputPath] = process.argv;

  if (!inputPath) {
    console.error('Error: Please provide an input file path.');
    console.log('Usage: node redact-names.cjs <path/to/input.json> [output.json]');
    process.exit(1);
  }

  try {
    const absolutePath = path.resolve(inputPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const rawData = fs.readFileSync(absolutePath, 'utf8');
    const jsonContent = JSON.parse(rawData);

    const processedData = redactData(jsonContent);

    const outputString = JSON.stringify(processedData, null, 2);

    if (outputPath) {
      fs.writeFileSync(path.resolve(outputPath), outputString);
      console.log(`Success! Redacted JSON saved to: ${outputPath}`);
    } else {
      process.stdout.write(outputString + '\n');
    }

  } catch (error) {
    console.error(`Error processing JSON: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}