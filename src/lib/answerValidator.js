/**
 * ============================================================================
 * ANSWER VALIDATION UTILITY - FLEXIBLE & GENERALIZED
 * ============================================================================
 * 
 * This module provides intelligent answer validation for fill-in-the-blank
 * questions with support for:
 * - Case variations (hertz, HERTZ, Hertz)
 * - Punctuation variations (peer-to-peer, peer to peer, peer_to_peer)
 * - Number-word conversions (7, seven, 7th)
 * - Abbreviations (ML, machine learning, AI, IP)
 * - Unit equivalents (Hz, hertz, kilohertz)
 * - Spacing variations (1,000,000 vs 1000000)
 * - Mathematical notation (10^6, 1e6, 1E6, 2**3)
 * 
 * ============================================================================
 */

// ============================================================================
// 1. NUMBER-WORD MAPPING (One to Twenty, Tens, Hundreds, Thousands)
// ============================================================================
export const WORD_TO_NUMBER = {
  // Basic numbers
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  
  // Teens
  'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
  'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
  'eighteen': '18', 'nineteen': '19',
  
  // Multiples of 10
  'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50',
  'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90',
  
  // Large numbers
  'hundred': '100', 'thousand': '1000', 'million': '1000000',
  'billion': '1000000000', 'trillion': '1000000000000',
};

// ============================================================================
// 2. ABBREVIATION & UNIT MAPPING (Expands short forms to full names)
// ============================================================================
export const ABBREVIATION_MAP = {
  // Computing & Technology
  'ml': ['machine learning', 'milliliter'],
  'ai': 'artificial intelligence',
  'api': 'application programming interface',
  'http': 'hypertext transfer protocol',
  'https': 'hypertext transfer protocol secure',
  'url': 'uniform resource locator',
  'uri': 'uniform resource identifier',
  'json': 'javascript object notation',
  'xml': 'extensible markup language',
  'html': 'hypertext markup language',
  'css': 'cascading style sheets',
  'sql': 'structured query language',
  'dnn': 'deep neural network',
  'cnn': 'convolutional neural network',
  'rnn': 'recurrent neural network',
  'gpt': 'generative pre trained transformer',
  'ram': 'random access memory',
  'rom': 'read only memory',
  'cpu': 'central processing unit',
  'gpu': 'graphics processing unit',
  'ssd': 'solid state drive',
  'hdd': 'hard disk drive',
  'vpn': 'virtual private network',
  'dhcp': 'dynamic host configuration protocol',
  'dns': 'domain name system',
  'tcp': 'transmission control protocol',
  'udp': 'user datagram protocol',
  'ip': 'internet protocol',
  'ftp': 'file transfer protocol',
  'smtp': 'simple mail transfer protocol',
  'pop': 'post office protocol',
  'imap': 'internet message access protocol',
  'ssh': 'secure shell',
  'ssl': 'secure sockets layer',
  'tls': 'transport layer security',
  'tcpip': 'transmission control protocol internet protocol',
  
  // Networking
  'p2p': 'peer to peer',
  'wan': 'wide area network',
  'lan': 'local area network',
  'man': 'metropolitan area network',
  'pan': 'personal area network',
  'qos': 'quality of service',
  'nat': 'network address translation',
  'arp': 'address resolution protocol',
  'icmp': 'internet control message protocol',
  'igmp': 'internet group management protocol',
  
  // Frequency & Electronics
  'hz': 'hertz',
  'khz': 'kilohertz',
  'mhz': 'megahertz',
  'ghz': 'gigahertz',
  'thz': 'terahertz',
  'amp': 'ampere',
  'volt': 'voltage',
  'ohm': 'ohms',
  'db': 'decibel',
  'dbm': 'decibel milliwatt',
  
  // Physics & Chemistry
  'kg': 'kilogram',
  'g': 'gram',
  'mg': 'milligram',
  'l': 'liter',
  'c': 'celsius',
  'f': 'fahrenheit',
  'k': 'kelvin',
  'j': 'joule',
  'kj': 'kilojoule',
  'cal': 'calorie',
  'kcal': 'kilocalorie',
  'n': 'newton',
  'pa': 'pascal',
  'bar': 'bar',
  'psi': 'pounds per square inch',
  'atm': 'atmosphere',
  'v': 'volt',
  'a': 'ampere',
  'w': 'watt',
  'kw': 'kilowatt',
  'mw': 'megawatt',
  'gw': 'gigawatt',
  
  // Biology & Medicine
  'dna': 'deoxyribonucleic acid',
  'rna': 'ribonucleic acid',
  'atp': 'adenosine triphosphate',
  'adp': 'adenosine diphosphate',
  'nadh': 'nicotinamide adenine dinucleotide',
  'fadh2': 'flavin adenine dinucleotide',
  'gtp': 'guanosine triphosphate',
  'utp': 'uridine triphosphate',
  'ctp': 'cytidine triphosphate',
  'pcr': 'polymerase chain reaction',
  'mrna': 'messenger ribonucleic acid',
  'trna': 'transfer ribonucleic acid',
  'rrna': 'ribosomal ribonucleic acid',
  
  // Math & Statistics
  'sin': 'sine',
  'cos': 'cosine',
  'tan': 'tangent',
  'log': 'logarithm',
  'ln': 'natural logarithm',
  'exp': 'exponential',
  'sqrt': 'square root',
  'std': 'standard deviation',
  'var': 'variance',
  'avg': 'average',
  'max': 'maximum',
  'min': 'minimum',
  'gcd': 'greatest common divisor',
  'lcm': 'least common multiple',
  
  // General Abbreviations
  'etc': 'et cetera',
  'e.g.': 'for example',
  'i.e.': 'that is',
  'vs': 'versus',
  'ref': 'reference',
  'fig': 'figure',
  'eq': 'equation',
  'no': 'number',
  'dept': 'department',
  'org': 'organization',
};

// ============================================================================
// 3. MATHEMATICAL & NUMBER RECOGNITION
// ============================================================================
/**
 * Determines whether a given token represents a mathematical expression or a number.
 * Ensures we only evaluate mathematical entities rather than common words containing math-like letters.
 */
export const isMathOrNumber = (token) => {
  if (!token) return false;

  // Must contain at least one digit
  if (!/\d/.test(token)) return false;

  // Simple number (e.g. "1000", "-5", "3.14", "100.25")
  if (/^[+-]?\d+(?:\.\d+)?$/.test(token)) return true;

  // Scientific notation (e.g. "1e6", "2.5e-3")
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(token)) return true;

  // Potential mathematical expressions (e.g. "10^6", "2**3", "1/2")
  if (/^[\d+\-*/.()^]+$/.test(token)) return true;

  return false;
};

// ============================================================================
// 4. MATHEMATICAL NOTATION NORMALIZATION
// ============================================================================
/**
 * Converts various mathematical notations to a standard decimal format.
 * Retains high float precision and cleanly removes trailing zeros.
 * Examples:
 * - 10^6 → 1000000
 * - 1e6 → 1000000
 * - 1E6 → 1000000
 * - 2.5e-3 → 0.0025
 * - 1/2 → 0.5
 */
export const normalizeMathNotation = (str) => {
  if (!str) return '';

  // Handle scientific notation (1e6, 1E6, 1e+6, 1e-6)
  const scientificMatch = str.match(/^([+-]?\d+\.?\d*)[eE]([+-]?\d+)$/);
  if (scientificMatch) {
    const mantissa = parseFloat(scientificMatch[1]);
    const exponent = parseInt(scientificMatch[2]);
    const result = mantissa * Math.pow(10, exponent);
    return result.toFixed(10).replace(/\.?0+$/, ''); // Safe float representation, removes trailing zeros
  }

  // Handle power notation (10^6)
  let normalizedStr = str.replace(/\^/g, '**'); // Convert ^ to **
  
  try {
    // Safely evaluate simple mathematical expressions containing only digits and operators
    if (/^[\d+\-*/.().\s]+$/.test(normalizedStr)) {
      // eslint-disable-next-line no-eval
      const result = eval(normalizedStr);
      if (typeof result === 'number' && !isNaN(result)) {
        return result.toFixed(10).replace(/\.?0+$/, '');
      }
    }
  } catch {
    // If evaluation fails, return original
  }

  return str;
};

// ============================================================================
// 4.5 ABBREVIATION MULTI-EXPANSION GENERATOR
// ============================================================================
/**
 * Recursively generates all possible abbreviation expansions.
 * Handles homograph collisions (e.g. "ml" expanding to both "machine learning" and "milliliter").
 *
 * IMPORTANT: We use separate regex instances for testing (no `g` flag) and replacing (`g` flag).
 * JavaScript's RegExp with `g` flag advances `lastIndex` between `.test()` calls on the same
 * regex object, which causes subsequent tests on the same string to return false.
 */
export const expandAbbreviations = (str) => {
  let variations = [str];
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  for (const [key, value] of Object.entries(ABBREVIATION_MAP)) {
    const pattern = `(?<![a-zA-Z])${escapeRegExp(key)}(?![a-zA-Z])`;
    // Test regex (no `g` flag) — safe for repeated .test() calls without lastIndex issues
    const testRegex = new RegExp(pattern, 'i');
    // Replace regex (`g` flag) — used only for .replace() to substitute all occurrences
    const replaceRegex = new RegExp(pattern, 'gi');
    
    if (variations.some(v => testRegex.test(v))) {
      const nextVariations = [];
      const values = Array.isArray(value) ? value : [value];
      
      for (const variant of variations) {
        if (testRegex.test(variant)) {
          for (const val of values) {
            nextVariations.push(variant.replace(replaceRegex, val));
          }
        } else {
          nextVariations.push(variant);
        }
      }
      variations = nextVariations;
    }
  }
  
  return variations;
};

// ============================================================================
// 4.75 COMPOUND NUMBER WORD EVALUATION
// ============================================================================
/**
 * Evaluates compound number word sequences like "one hundred", "one thousand", "one million".
 * Uses multiplicative semantics: "one hundred" = 1 × 100 = 100.
 *
 * Algorithm: Scans tokens left to right. When a token is a number word:
 * - If it represents a multiplier (hundred, thousand, million, etc.) and we have
 *   an accumulated value, multiply them.
 * - Otherwise, add it to the running total.
 * Non-number tokens flush any accumulated number and pass through as-is.
 */
const MULTIPLIERS = {
  'hundred': 100,
  'thousand': 1000,
  'million': 1000000,
  'billion': 1000000000,
  'trillion': 1000000000000,
};

export const evaluateNumberWords = (words) => {
  const result = [];
  let currentNumber = null;  // Accumulated numeric value from contiguous number words
  let hasNumberWord = false; // Tracks if we're in a number-word sequence

  for (const word of words) {
    const cleanWord = word.replace(/,/g, '');
    const numberValue = WORD_TO_NUMBER[cleanWord];

    if (numberValue !== undefined) {
      const num = parseInt(numberValue, 10);

      if (MULTIPLIERS[cleanWord]) {
        // Multiplier word (hundred, thousand, etc.)
        if (currentNumber !== null && currentNumber !== 0) {
          currentNumber *= num;
        } else {
          // Standalone multiplier like just "hundred" = 100
          currentNumber = num;
        }
      } else {
        // Regular number word (one, two, ... twenty, thirty, etc.)
        if (currentNumber !== null) {
          // If previous was a complete multiplied value, flush and start new
          // e.g. "one hundred two" → 100, then start 2
          if (hasNumberWord && currentNumber >= num) {
            result.push(String(currentNumber));
            currentNumber = num;
          } else {
            currentNumber += num;
          }
        } else {
          currentNumber = num;
        }
      }
      hasNumberWord = true;
    } else {
      // Non-number word: flush any accumulated number
      if (currentNumber !== null) {
        result.push(String(currentNumber));
        currentNumber = null;
        hasNumberWord = false;
      }

      // Check for ordinal numbers (1st, 2nd, 3rd, etc.)
      const ordinalMatch = cleanWord.match(/^(\d+)(st|nd|rd|th)$/);
      if (ordinalMatch) {
        result.push(ordinalMatch[1]);
      } else if (isMathOrNumber(cleanWord)) {
        result.push(normalizeMathNotation(cleanWord));
      } else {
        result.push(cleanWord);
      }
    }
  }

  // Flush any remaining accumulated number
  if (currentNumber !== null) {
    result.push(String(currentNumber));
  }

  return result;
};

// ============================================================================
// 5. MAIN NORMALIZATION FUNCTION (Core Logic)
// ============================================================================
/**
 * Normalizes a string for comparison.
 * Returns an array of possible normalized strings due to potential abbreviation expansions.
 */
export const normalizeForComparison = (str) => {
  if (!str) return [];

  let normalized = str.trim().toLowerCase();

  // Step 1: Expand abbreviations first to handle multi-word variants and homographs
  const expandedVariants = expandAbbreviations(normalized);

  // Step 2: Normalize spacing, punctuation, and map tokens for each variation
  return expandedVariants.map(variant => {
    // Replace underscores with space
    let temp = variant.replace(/_/g, ' ');
    
    // Replace hyphens with space ONLY if not adjacent to digits (keeps negative numbers/exponents intact)
    temp = temp.replace(/(?<!\d)-(?!\d)/g, ' ');
    
    // Replace multiple spaces with a single space
    temp = temp.replace(/\s+/g, ' ');

    // Split into word tokens to process each individually
    const words = temp.split(/\s+/);
    
    // Evaluate compound number words (e.g., "one hundred" → "100")
    const processedWords = evaluateNumberWords(words);

    // Join words back and remove all remaining non-alphanumeric characters
    let result = processedWords.join('');
    result = result.replace(/[^\w]/g, ''); // Keep alphanumeric only
    
    return result;
  });
};

// ============================================================================
// 6. MAIN VALIDATION FUNCTION
// ============================================================================
/**
 * Determines if a user's answer is correct by comparing it against
 * acceptable answers using flexible normalization.
 */
export const isAnswerCorrect = (
  userAnswer,
  acceptableAnswers,
  caseSensitive = false
) => {
  if (userAnswer === undefined || userAnswer === null || !acceptableAnswers) {
    return false;
  }

  // Convert acceptableAnswers to array if it's a single string
  const answersArray = Array.isArray(acceptableAnswers)
    ? acceptableAnswers
    : [acceptableAnswers];

  if (answersArray.length === 0) {
    return false;
  }

  // If case-sensitive, compare directly after basic trimming
  if (caseSensitive) {
    const normUser = userAnswer.toString().trim();
    return answersArray.some(ans => {
      if (ans === undefined || ans === null) return false;
      return normUser === ans.toString().trim();
    });
  }

  // Normalize user's answer into possible variants
  const userVariants = normalizeForComparison(userAnswer.toString());
  if (userVariants.length === 0) {
    return false;
  }

  // Normalize all acceptable answers into possible variants
  const acceptableVariants = answersArray.flatMap(ans => {
    if (ans === undefined || ans === null) return [];
    return normalizeForComparison(ans.toString());
  });

  // Return true if there is any intersection between user variants and acceptable variants
  return userVariants.some(uv => acceptableVariants.includes(uv));
};

// ============================================================================
// 7. DEBUGGING UTILITY
// ============================================================================
export const debugNormalization = (answer) => {
  const steps = [];
  let current = answer;

  steps.push({ step: 'Original', value: current });

  if (current === undefined || current === null) {
    return { original: answer, normalized: '', steps };
  }

  current = current.toString().trim().toLowerCase();
  steps.push({ step: 'Trim & Lowercase', value: current });

  const expanded = expandAbbreviations(current);
  steps.push({ step: 'Abbreviation Expansions Generated', value: expanded });

  const finalVariants = expanded.map(variant => {
    let temp = variant.replace(/_/g, ' ');
    temp = temp.replace(/(?<!\d)-(?!\d)/g, ' ');
    temp = temp.replace(/\s+/g, ' ');
    
    const words = temp.split(/\s+/);
    const processedWords = evaluateNumberWords(words);

    let result = processedWords.join('');
    result = result.replace(/[^\w]/g, '');
    return result;
  });

  steps.push({ step: 'Final Normalized Variations', value: finalVariants });

  return {
    original: answer,
    normalized: finalVariants[0] || '', // Return the primary variant
    allVariants: finalVariants,
    steps,
  };
};

export default {
  normalizeForComparison,
  isAnswerCorrect,
  debugNormalization,
  WORD_TO_NUMBER,
  ABBREVIATION_MAP,
  isMathOrNumber,
  normalizeMathNotation,
  expandAbbreviations,
  evaluateNumberWords,
};
