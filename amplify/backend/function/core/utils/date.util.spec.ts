import { isDstObserved, tzHasDst } from "./date.util";

const tzDST = 'America/Indiana/Indianapolis';

describe('DateUtil', () => {
  describe('tzHasDst', () => {
    describe('success', () => {
      it('should return true if tz support DST', () => {
        const tz = tzDST;
        const rs = tzHasDst(tz);
        expect(rs).toBeTruthy();
      });

      it('should return false if tz did not support DST', () => {
        const tz = 'Asia/Ho_Chi_Minh';
        const rs = tzHasDst(tz);
        expect(rs).toBeFalsy();
      });
    });
  });

  describe('isDstObserved', () => {
    let tz: string;
    beforeEach(() =>  {
      tz = tzDST;
    });

    describe('success', () => {
      it('should return true when the date is in DST', () => {
        const date = new Date("2022-04-01T00:00:00.000Z");
        const rs = isDstObserved(date, tz);
        expect(rs).toBeTruthy();
      });

      it('should return false when the date is in DST', () => {
        const date = new Date("2022-12-01T00:00:00.000Z");
        const rs = isDstObserved(date, tz);
        expect(rs).toBeFalsy();
      });
    });
  });
});