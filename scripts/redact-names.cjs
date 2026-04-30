/**
 * redact-names.js
 * * A utility script to scrub sensitive names from JSON files
 * and output a beautified version.
 * * Usage: node redact-names.js <input-file> [output-file]
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
 * @param {any} data - The piece of data to process.
 * @returns {any} The redacted data.
 */
function redactData(data) {
  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => redactData(item));
  }

  // Handle Objects
  if (data !== null && typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      const value = data[key];

      if (key === 'first_name') {
        acc[key] = getRandomFunName();
      } else if (key === 'last_name') {
        acc[key] = 'Tester';
      } else {
        // Deeply process nested objects or arrays
        acc[key] = redactData(value);
      }

      return acc;
    }, {});
  }

  // Return primitives (strings, numbers, booleans, null) as-is
  return data;
}

/**
 * Main execution block
 */
function main() {
  const [,, inputPath, outputPath] = process.argv;

  if (!inputPath) {
    console.error('Error: Please provide an input file path.');
    console.log('Usage: node redact-names.js <path/to/input.json> [output.json]');
    process.exit(1);
  }

  try {
    // 1. Read and parse the file
    const absolutePath = path.resolve(inputPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const rawData = fs.readFileSync(absolutePath, 'utf8');
    const jsonContent = JSON.parse(rawData);

    // 2. Process the data
    const processedData = redactData(jsonContent);

    // 3. Stringify with 2-space indentation (beautify)
    const outputString = JSON.stringify(processedData, null, 2);

    // 4. Output to file or stdout
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

// Ensure the script runs only when executed directly
if (require.main === module) {
  main();
}