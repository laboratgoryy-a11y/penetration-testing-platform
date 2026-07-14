import * as fc from 'fast-check';

/**
 * مثال على اختبار خاصية باستخدام fast-check
 * هذا الاختبار يوضح كيفية استخدام Property-Based Testing
 */

describe('Property-Based Testing Example', () => {
  test('string concatenation is associative', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
        // الخاصية: (a + b) + c === a + (b + c)
        const left = (a + b) + c;
        const right = a + (b + c);
        return left === right;
      }),
      { numRuns: 100 }
    );
  });

  test('array length after push increases by 1', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.integer(), (arr, value) => {
        const originalLength = arr.length;
        arr.push(value);
        return arr.length === originalLength + 1;
      }),
      { numRuns: 100 }
    );
  });

  test('reversing an array twice returns original', () => {
    fc.assert(
      fc.property(fc.array(fc.anything()), (arr) => {
        const reversed = [...arr].reverse().reverse();
        return JSON.stringify(reversed) === JSON.stringify(arr);
      }),
      { numRuns: 100 }
    );
  });
});
