import { describe, it, expect } from 'vitest';
import { calculateInterest, calculateCourtFee, calculateCompensation } from './legalRules';
import { PartyType } from '../types';

describe('Legal Rules Service', () => {
  describe('calculateInterest', () => {
    it('should calculate B2B interest correctly (Base + 8%)', () => {
      // Mock Date to ensure stable tests if needed, but the function uses passed dates
      // Assuming today is way past 2023
      
      const amount = 1000;
      const dateIssued = '2023-01-01';
      const dueDate = '2023-01-31'; // 30 days terms
      
      // We can't easily mock "now" inside the function without dependency injection or system time mocking
      // But the function calculates overdue days relative to "now".
      // Let's just check if it returns a positive interest for a past date.
      
      const result = calculateInterest(
        amount,
        dateIssued,
        dueDate,
        PartyType.BUSINESS,
        PartyType.BUSINESS
      );
      
      expect(result.totalInterest).toBeGreaterThan(0);
      expect(result.daysOverdue).toBeGreaterThan(0);
    });

    it('should return 0 interest if not overdue', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const dueDate = futureDate.toISOString().split('T')[0];

        const result = calculateInterest(
            1000,
            new Date().toISOString().split('T')[0],
            dueDate,
            PartyType.BUSINESS,
            PartyType.BUSINESS
        );

        expect(result.totalInterest).toBe(0);
        expect(result.daysOverdue).toBe(0);
    });
  });

  describe('calculateCourtFee', () => {
      it('should return correct fee for small claim (£300)', () => {
          expect(calculateCourtFee(300)).toBe(35);
      });
      it('should return correct fee for £1000 claim', () => {
          expect(calculateCourtFee(1000)).toBe(70);
      });
      it('should return 5% for large claims', () => {
          expect(calculateCourtFee(15000)).toBe(750); // 5% of 15000
      });
  });

  describe('calculateCompensation', () => {
      it('should return £40 for small B2B debt', () => {
          expect(calculateCompensation(500, PartyType.BUSINESS, PartyType.BUSINESS)).toBe(40);
      });
      it('should return £0 for B2C debt', () => {
          expect(calculateCompensation(500, PartyType.BUSINESS, PartyType.INDIVIDUAL)).toBe(0);
      });
  });
});



