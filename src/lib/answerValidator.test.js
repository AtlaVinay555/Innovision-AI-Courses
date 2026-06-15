import { describe, test, expect } from 'vitest';
import { isAnswerCorrect, normalizeForComparison, debugNormalization } from './answerValidator';

describe('Answer Validator - Comprehensive Test Suite', () => {
  
  // ========================================================================
  // TEST GROUP 1: NUMBER TO WORD CONVERSIONS
  // ========================================================================
  describe('Number-to-Word Conversions', () => {
    test('should match digit with word number', () => {
      expect(isAnswerCorrect('7', ['seven'])).toBe(true);
      expect(isAnswerCorrect('seven', ['7'])).toBe(true);
      expect(isAnswerCorrect('7', ['7'])).toBe(true);
    });

    test('should match various number formats', () => {
      expect(isAnswerCorrect('1', ['one', '1'])).toBe(true);
      expect(isAnswerCorrect('twenty', ['20'])).toBe(true);
      expect(isAnswerCorrect('one hundred', ['100'])).toBe(true);
      expect(isAnswerCorrect('one thousand', ['1000'])).toBe(true);
      expect(isAnswerCorrect('one million', ['1000000'])).toBe(true);
    });

    test('should handle ordinal numbers', () => {
      expect(isAnswerCorrect('1st', ['1'])).toBe(true);
      expect(isAnswerCorrect('2nd', ['2'])).toBe(true);
      expect(isAnswerCorrect('3rd', ['3'])).toBe(true);
      expect(isAnswerCorrect('4th', ['4'])).toBe(true);
    });

    test('should handle OSI model layers (common test case)', () => {
      // OSI model has 7 layers
      expect(isAnswerCorrect('7', ['7'])).toBe(true);
      expect(isAnswerCorrect('seven', ['7'])).toBe(true);
      expect(isAnswerCorrect('Seven', ['7'])).toBe(true);
      expect(isAnswerCorrect('SEVEN', ['7'])).toBe(true);
    });
  });

  // ========================================================================
  // TEST GROUP 2: ABBREVIATION EXPANSIONS
  // ========================================================================
  describe('Abbreviation Expansions', () => {
    test('should match abbreviations with full forms (Computing)', () => {
      expect(isAnswerCorrect('ML', ['machine learning'])).toBe(true);
      expect(isAnswerCorrect('ml', ['machine learning'])).toBe(true);
      expect(isAnswerCorrect('machine learning', ['ML'])).toBe(true);
      expect(isAnswerCorrect('AI', ['artificial intelligence'])).toBe(true);
      expect(isAnswerCorrect('API', ['application programming interface'])).toBe(true);
    });

    test('should match abbreviations with full forms (Networking)', () => {
      expect(isAnswerCorrect('P2P', ['peer to peer'])).toBe(true);
      expect(isAnswerCorrect('p2p', ['peer to peer'])).toBe(true);
      expect(isAnswerCorrect('HTTP', ['hypertext transfer protocol'])).toBe(true);
      expect(isAnswerCorrect('TCP', ['transmission control protocol'])).toBe(true);
      expect(isAnswerCorrect('UDP', ['user datagram protocol'])).toBe(true);
      expect(isAnswerCorrect('DNS', ['domain name system'])).toBe(true);
    });

    test('should match abbreviations with full forms (Science)', () => {
      expect(isAnswerCorrect('DNA', ['deoxyribonucleic acid'])).toBe(true);
      expect(isAnswerCorrect('RNA', ['ribonucleic acid'])).toBe(true);
      expect(isAnswerCorrect('ATP', ['adenosine triphosphate'])).toBe(true);
      expect(isAnswerCorrect('ADP', ['adenosine diphosphate'])).toBe(true);
    });

    test('should match frequency units', () => {
      expect(isAnswerCorrect('Hz', ['hertz'])).toBe(true);
      expect(isAnswerCorrect('KHz', ['kilohertz'])).toBe(true);
      expect(isAnswerCorrect('MHz', ['megahertz'])).toBe(true);
      expect(isAnswerCorrect('GHz', ['gigahertz'])).toBe(true);
    });
  });

  // ========================================================================
  // TEST GROUP 3: PUNCTUATION & SPACING VARIATIONS
  // ========================================================================
  describe('Punctuation & Spacing Variations', () => {
    test('should match hyphenated vs spaced versions', () => {
      expect(isAnswerCorrect('peer-to-peer', ['peer to peer'])).toBe(true);
      expect(isAnswerCorrect('peer to peer', ['peer-to-peer'])).toBe(true);
      expect(isAnswerCorrect('machine-learning', ['machine learning'])).toBe(true);
    });

    test('should match underscored vs spaced versions', () => {
      expect(isAnswerCorrect('peer_to_peer', ['peer to peer'])).toBe(true);
      expect(isAnswerCorrect('machine_learning', ['machine learning'])).toBe(true);
    });

    test('should handle multiple spacing variations', () => {
      expect(isAnswerCorrect('peer   to   peer', ['peer to peer'])).toBe(true);
      expect(isAnswerCorrect('machine  learning', ['machine learning'])).toBe(true);
    });

    test('should handle mixed punctuation', () => {
      expect(isAnswerCorrect('peer - to - peer', ['peertopeer'])).toBe(true);
      expect(isAnswerCorrect('machine-_learning', ['machine learning'])).toBe(true);
    });
  });

  // ========================================================================
  // TEST GROUP 4: NUMERICAL FORMATTING VARIATIONS
  // ========================================================================
  describe('Numerical Formatting Variations', () => {
    test('should match numbers with different formatting', () => {
      expect(isAnswerCorrect('1000000', ['1,000,000'])).toBe(true);
      expect(isAnswerCorrect('1,000,000', ['1000000'])).toBe(true);
      expect(isAnswerCorrect('1 000 000', ['1000000'])).toBe(true);
    });
  });

  // ========================================================================
  // TEST GROUP 5: MATHEMATICAL NOTATION
  // ========================================================================
  describe('Mathematical Notation', () => {
    test('should match scientific notation variations', () => {
      expect(isAnswerCorrect('1e6', ['1000000'])).toBe(true);
      expect(isAnswerCorrect('1E6', ['1000000'])).toBe(true);
      expect(isAnswerCorrect('10^6', ['1000000'])).toBe(true);
    });

    test('should handle power notation', () => {
      expect(isAnswerCorrect('2^3', ['8'])).toBe(true);
      expect(isAnswerCorrect('2**3', ['8'])).toBe(true);
    });

    test('should handle float and division notations', () => {
      expect(isAnswerCorrect('1/2', ['0.5'])).toBe(true);
      expect(isAnswerCorrect('0.5', ['1/2'])).toBe(true);
      expect(isAnswerCorrect('1/4', ['0.25'])).toBe(true);
    });

    test('should handle float/decimal scientific notation', () => {
      expect(isAnswerCorrect('1.5e3', ['1500'])).toBe(true);
      expect(isAnswerCorrect('2.5e-3', ['0.0025'])).toBe(true); // Now passes with float preservation!
    });
  });

  // ========================================================================
  // TEST GROUP 6: CASE INSENSITIVITY
  // ========================================================================
  describe('Case Insensitivity', () => {
    test('should ignore case variations by default', () => {
      expect(isAnswerCorrect('SEVEN', ['seven'])).toBe(true);
      expect(isAnswerCorrect('Seven', ['SEVEN'])).toBe(true);
      expect(isAnswerCorrect('HERTZ', ['hertz'])).toBe(true);
      expect(isAnswerCorrect('Megahertz', ['MEGAHERTZ'])).toBe(true);
    });

    test('should respect case sensitivity when enabled', () => {
      expect(isAnswerCorrect('Seven', ['seven'], true)).toBe(false);
      expect(isAnswerCorrect('seven', ['seven'], true)).toBe(true);
    });
  });

  // ========================================================================
  // TEST GROUP 7: COMPLEX REAL-WORLD EXAMPLES
  // ========================================================================
  describe('Complex Real-World Examples', () => {
    test('Computer Networks examples', () => {
      // Peer-to-peer variations
      expect(isAnswerCorrect('P2P', ['peer-to-peer'])).toBe(true);
      expect(isAnswerCorrect('p2p network', ['peer to peer network'])).toBe(true);

      // Protocol variations
      expect(isAnswerCorrect('TCP/IP', ['tcpip'])).toBe(true);
      expect(isAnswerCorrect('HTTP', ['hypertext transfer protocol'])).toBe(true);

      // Unit variations
      expect(isAnswerCorrect('100 Mbps', ['100mbps'])).toBe(true);
    });

    test('Physics examples', () => {
      // Frequency units
      expect(isAnswerCorrect('50 Hz', ['50hz'])).toBe(true);
      expect(isAnswerCorrect('1 MHz', ['1mhz'])).toBe(true);

      // Scientific notation
      expect(isAnswerCorrect('3e8', ['300000000'])).toBe(true);
    });

    test('Chemistry examples', () => {
      // Molecular formulas
      expect(isAnswerCorrect('H2O', ['H2O'])).toBe(true);
      expect(isAnswerCorrect('h2o', ['H2O'])).toBe(true);

      // Unit variations
      expect(isAnswerCorrect('1 kg', ['1kg'])).toBe(true);
      expect(isAnswerCorrect('1 000 ml', ['1000ml'])).toBe(true);
    });

    test('Mathematics examples', () => {
      // Number formats
      expect(isAnswerCorrect('seven', ['7'])).toBe(true);
      expect(isAnswerCorrect('1,000,000', ['1e6'])).toBe(true);

      // Mathematical terms
      expect(isAnswerCorrect('sqrt', ['square root'])).toBe(true);
      expect(isAnswerCorrect('sin', ['sine'])).toBe(true);
    });
  });

  // ========================================================================
  // TEST GROUP 8: EDGE CASES & NEGATIVE TESTS
  // ========================================================================
  describe('Edge Cases & Negative Tests', () => {
    test('should NOT match completely different answers', () => {
      expect(isAnswerCorrect('7', ['8'])).toBe(false);
      expect(isAnswerCorrect('apple', ['orange'])).toBe(false);
      expect(isAnswerCorrect('MHz', ['hertz'])).toBe(false);
    });

    test('should NOT match colliding float integer conversions (our plan fix)', () => {
      expect(isAnswerCorrect('0.75', ['0.25'])).toBe(false);
      expect(isAnswerCorrect('0.75', ['0'])).toBe(false);
      expect(isAnswerCorrect('0.25', ['0'])).toBe(false);
    });

    test('should handle empty inputs gracefully', () => {
      expect(isAnswerCorrect('', ['hertz'])).toBe(false);
      expect(isAnswerCorrect('hertz', [])).toBe(false);
      expect(isAnswerCorrect('hertz', null)).toBe(false);
      expect(isAnswerCorrect(null, ['hertz'])).toBe(false);
    });

    test('should handle whitespace-only inputs', () => {
      expect(isAnswerCorrect('   ', ['hertz'])).toBe(false);
      expect(isAnswerCorrect('hertz', ['   '])).toBe(false);
    });

    test('should match partial word variations carefully', () => {
      expect(isAnswerCorrect('machine', ['machine learning'])).toBe(false);
      expect(isAnswerCorrect('learning', ['machine learning'])).toBe(false);
    });

    test('should not match random "e" characters in normal words as math (our plan fix)', () => {
      // "the" has "e", "answer" has "e". They shouldn't get math evaluated as nothing.
      expect(normalizeForComparison('the answer is 10^6')).toEqual(['theansweris1000000']);
    });
  });

  // ========================================================================
  // TEST GROUP 9: MULTIPLE ACCEPTABLE ANSWERS
  // ========================================================================
  describe('Multiple Acceptable Answers', () => {
    test('should match any acceptable answer in array', () => {
      const acceptableAnswers = ['hertz', 'hz', 'Hz'];
      expect(isAnswerCorrect('HERTZ', acceptableAnswers)).toBe(true);
      expect(isAnswerCorrect('Hz', acceptableAnswers)).toBe(true);
      expect(isAnswerCorrect('hz', acceptableAnswers)).toBe(true);
    });

    test('should work with variations in acceptable answers', () => {
      const acceptableAnswers = ['peer to peer', 'peer-to-peer', 'p2p'];
      expect(isAnswerCorrect('P2P', acceptableAnswers)).toBe(true);
      expect(isAnswerCorrect('peer_to_peer', acceptableAnswers)).toBe(true);
      expect(isAnswerCorrect('PEER TO PEER', acceptableAnswers)).toBe(true);
    });
  });

  // ========================================================================
  // TEST GROUP 10: NORMALIZATION DEBUGGING
  // ========================================================================
  describe('Normalization Debugging', () => {
    test('should show normalization steps', () => {
      const result = debugNormalization('peer-to-peer');
      expect(result.original).toBe('peer-to-peer');
      expect(result.normalized).toBe('peertopeer');
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
    });

    test('should show abbreviation expansion steps', () => {
      const result = debugNormalization('ML');
      expect(result.normalized).toContain('machinelearning');
    });
  });
});
